import pandas as pd
from sqlalchemy.orm import Session
from app.models import Attempt, Answer, EventLog
from datetime import datetime

def get_progress(user_id: int, db: Session):
    attempts = db.query(Attempt).filter(
        Attempt.user_id == user_id, Attempt.finished_at != None
    ).order_by(Attempt.finished_at).all()
    if not attempts:
        return []
    rows = [{"date": a.finished_at.strftime("%Y-%m-%d"), "score_pct": round((a.score/a.total)*100) if a.total > 0 else 0} for a in attempts]
    df = pd.DataFrame(rows)
    grouped = df.groupby("date")["score_pct"].mean().reset_index()
    grouped["score_pct"] = grouped["score_pct"].round(1)
    return grouped.to_dict(orient="records")

def get_topic_errors(user_id: int, db: Session):
    answers = db.query(Answer).join(Attempt, Answer.attempt_id == Attempt.id).filter(Attempt.user_id == user_id).all()
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

def get_question_errors(user_id: int, question_id: int, db: Session):
    answers = db.query(Answer).join(Attempt, Answer.attempt_id == Attempt.id).filter(
        Attempt.user_id == user_id, Answer.question_id == question_id, Answer.is_correct == False
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

def get_funnel(db: Session):
    from app.models import EventTypeEnum
    total_start = db.query(EventLog).filter(EventLog.event_type == EventTypeEnum.start_test).count()
    total_finish = db.query(EventLog).filter(EventLog.event_type == EventTypeEnum.finish_test).count()
    rate = round((total_finish / total_start) * 100, 1) if total_start > 0 else 0
    return {"started": total_start, "finished": total_finish, "conversion_rate": rate}

def get_retention(db: Session):
    attempts = db.query(Attempt).filter(Attempt.finished_at != None).all()
    if not attempts:
        return {"d1": 0, "d7": 0, "total_users": 0}
    rows = [{"user_id": a.user_id, "date": a.finished_at.date().isoformat()} for a in attempts]
    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    first_seen = df.groupby("user_id")["date"].min().reset_index()
    first_seen.columns = ["user_id", "first_date"]
    df = df.merge(first_seen, on="user_id")
    df["day_diff"] = (df["date"] - df["first_date"]).dt.days
    total = df["user_id"].nunique()
    d1_users = df[df["day_diff"] >= 1]["user_id"].nunique()
    d7_users = df[df["day_diff"] >= 7]["user_id"].nunique()
    return {
        "total_users": total,
        "d1": round(d1_users / total * 100, 1) if total > 0 else 0,
        "d7": round(d7_users / total * 100, 1) if total > 0 else 0
    }

def get_question_difficulty(db: Session):
    answers = db.query(Answer).all()
    if not answers:
        return {"too_easy": [], "too_hard": [], "normal": []}
    rows = [{"question_id": a.question_id, "is_correct": a.is_correct} for a in answers]
    df = pd.DataFrame(rows)
    stats = df.groupby("question_id")["is_correct"].agg(["sum", "count"]).reset_index()
    stats.columns = ["question_id", "correct", "total"]
    stats = stats[stats["total"] >= 3]
    stats["correct_rate"] = (stats["correct"] / stats["total"] * 100).round(1)
    too_easy = stats[stats["correct_rate"] >= 90][["question_id", "correct_rate", "total"]].to_dict(orient="records")
    too_hard = stats[stats["correct_rate"] <= 20][["question_id", "correct_rate", "total"]].to_dict(orient="records")
    normal = stats[(stats["correct_rate"] > 20) & (stats["correct_rate"] < 90)][["question_id", "correct_rate", "total"]].to_dict(orient="records")
    return {"too_easy": too_easy, "too_hard": too_hard, "normal": normal}

def get_daily_activity(db: Session):
    attempts = db.query(Attempt).filter(Attempt.finished_at != None).all()
    if not attempts:
        return []
    rows = [{"date": a.finished_at.strftime("%Y-%m-%d")} for a in attempts]
    df = pd.DataFrame(rows)
    counts = df.groupby("date").size().reset_index(name="count")
    return counts.tail(30).to_dict(orient="records")

def get_dau_mau(db: Session):
    from datetime import date, timedelta
    attempts = db.query(Attempt).filter(Attempt.finished_at != None).all()
    if not attempts:
        return {"dau": 0, "mau": 0, "ratio": 0, "dau_history": []}
    today = date.today()
    month_ago = today - timedelta(days=30)
    day_ago = today - timedelta(days=1)
    dau_users = set(a.user_id for a in attempts if a.finished_at.date() >= day_ago)
    mau_users = set(a.user_id for a in attempts if a.finished_at.date() >= month_ago)
    dau = len(dau_users)
    mau = len(mau_users)
    ratio = round(dau / mau * 100, 1) if mau > 0 else 0
    rows = [{"date": a.finished_at.strftime("%Y-%m-%d"), "user_id": a.user_id} for a in attempts if a.finished_at.date() >= month_ago]
    if rows:
        df = pd.DataFrame(rows)
        dau_hist = df.groupby("date")["user_id"].nunique().reset_index()
        dau_hist.columns = ["date", "users"]
        dau_history = dau_hist.to_dict(orient="records")
    else:
        dau_history = []
    return {"dau": dau, "mau": mau, "ratio": ratio, "dau_history": dau_history}

def get_funnel_by_test(db: Session):
    from app.models import EventTypeEnum
    starts = db.query(EventLog.test_id, EventLog.user_id).filter(EventLog.event_type == EventTypeEnum.start_test).all()
    finishes = db.query(EventLog.test_id, EventLog.user_id).filter(EventLog.event_type == EventTypeEnum.finish_test).all()
    if not starts:
        return []
    start_df = pd.DataFrame(starts, columns=["test_id", "user_id"]).groupby("test_id").size().reset_index(name="started")
    finish_df = pd.DataFrame(finishes, columns=["test_id", "user_id"]).groupby("test_id").size().reset_index(name="finished") if finishes else pd.DataFrame(columns=["test_id", "finished"])
    df = start_df.merge(finish_df, on="test_id", how="left").fillna(0)
    df["finished"] = df["finished"].astype(int)
    df["conversion"] = (df["finished"] / df["started"] * 100).round(1)
    df = df.sort_values("started", ascending=False)
    return df.head(10).to_dict(orient="records")

def get_score_distribution(db: Session):
    attempts = db.query(Attempt).filter(Attempt.finished_at != None, Attempt.total > 0).all()
    if not attempts:
        return {"avg": 0, "median": 0, "distribution": []}
    scores = [round(a.score / a.total * 100) for a in attempts]
    df = pd.DataFrame({"score": scores})
    avg = round(df["score"].mean(), 1)
    median = round(df["score"].median(), 1)
    bins = [0, 20, 40, 60, 80, 100]
    labels = ["0-20", "21-40", "41-60", "61-80", "81-100"]
    df["bucket"] = pd.cut(df["score"], bins=bins, labels=labels, include_lowest=True)
    dist = df.groupby("bucket", observed=True).size().reset_index(name="count")
    return {"avg": avg, "median": median, "distribution": dist.to_dict(orient="records")}

def get_dropoff(db: Session):
    from app.models import EventTypeEnum
    answers = db.query(Answer).join(Attempt, Answer.attempt_id == Attempt.id).all()
    if not answers:
        return []
    rows = [{"attempt_id": a.attempt_id, "question_id": a.question_id} for a in answers]
    df = pd.DataFrame(rows)
    total_attempts = df["attempt_id"].nunique()
    q_counts = df.groupby("question_id")["attempt_id"].nunique().reset_index()
    q_counts.columns = ["question_id", "reached"]
    q_counts["reach_rate"] = (q_counts["reached"] / total_attempts * 100).round(1)
    q_counts = q_counts.sort_values("question_id")
    return q_counts.to_dict(orient="records")
