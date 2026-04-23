import pandas as pd
from sqlalchemy.orm import Session
from app.models import Attempt, Answer, EventLog

def get_progress(user_id: int, db: Session):
    attempts = db.query(Attempt).filter(
        Attempt.user_id == user_id,
        Attempt.finished_at != None
    ).order_by(Attempt.finished_at).all()
    if not attempts:
        return []
    rows = []
    for a in attempts:
        pct = round((a.score / a.total) * 100) if a.total > 0 else 0
        rows.append({"date": a.finished_at.strftime("%Y-%m-%d"), "test_id": a.test_id, "score_pct": pct})
    df = pd.DataFrame(rows)
    grouped = df.groupby("date")["score_pct"].mean().reset_index()
    grouped["score_pct"] = grouped["score_pct"].round(1)
    return grouped.to_dict(orient="records")

def get_topic_errors(user_id: int, db: Session):
    answers = db.query(Answer).join(
        Attempt, Answer.attempt_id == Attempt.id
    ).filter(Attempt.user_id == user_id).all()
    if not answers:
        return []
    rows = [{"question_id": a.question_id, "is_correct": a.is_correct} for a in answers]
    df = pd.DataFrame(rows)
    stats = df.groupby("question_id")["is_correct"].agg(["sum", "count"]).reset_index()
    stats.columns = ["question_id", "correct", "total"]
    stats["error_rate"] = ((1 - stats["correct"] / stats["total"]) * 100).round(1)
    stats = stats[stats["error_rate"] > 0].sort_values("error_rate", ascending=False)
    return stats.head(5).to_dict(orient="records")

def get_recommendations(user_id: int, db: Session):
    errors = get_topic_errors(user_id, db)
    recs = []
    for e in errors:
        if e["error_rate"] >= 60:
            recs.append({"question_id": e["question_id"], "message": f"Вопрос #{e['question_id']}: высокий процент ошибок ({e['error_rate']}%) — повторите тему"})
        elif e["error_rate"] >= 30:
            recs.append({"question_id": e["question_id"], "message": f"Вопрос #{e['question_id']}: есть ошибки ({e['error_rate']}%) — стоит потренироваться"})
    return recs

def get_funnel(db: Session):
    from app.models import EventTypeEnum
    total_start = db.query(EventLog).filter(EventLog.event_type == EventTypeEnum.start_test).count()
    total_finish = db.query(EventLog).filter(EventLog.event_type == EventTypeEnum.finish_test).count()
    rate = round((total_finish / total_start) * 100, 1) if total_start > 0 else 0
    return {"started": total_start, "finished": total_finish, "conversion_rate": rate}

def get_question_errors(user_id: int, question_id: int, db: Session):
    answers = db.query(Answer).join(
        Attempt, Answer.attempt_id == Attempt.id
    ).filter(
        Attempt.user_id == user_id,
        Answer.question_id == question_id,
        Answer.is_correct == False
    ).all()
    result = []
    for a in answers:
        attempt = db.query(Attempt).filter(Attempt.id == a.attempt_id).first()
        result.append({
            "attempt_id": a.attempt_id,
            "selected_option_id": a.selected_option_id,
            "date": attempt.finished_at.strftime("%Y-%m-%d %H:%M") if attempt.finished_at else None
        })
    return result
