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

def get_cohort_retention(db: Session):
    from app.models import EventTypeEnum
    reg_events = db.query(EventLog.user_id, EventLog.timestamp).filter(
        EventLog.event_type == EventTypeEnum.registered
    ).all()
    if not reg_events:
        return []

    reg_df = pd.DataFrame(reg_events, columns=["user_id", "reg_date"])
    reg_df["reg_date"] = pd.to_datetime(reg_df["reg_date"])
    reg_df["cohort_week"] = reg_df["reg_date"].dt.to_period("W").apply(lambda p: p.start_time.strftime("%Y-%m-%d"))

    activity = db.query(Attempt.user_id, Attempt.finished_at).filter(Attempt.finished_at != None).all()
    act_df = pd.DataFrame(activity, columns=["user_id", "activity_date"])
    act_df["activity_date"] = pd.to_datetime(act_df["activity_date"]) if not act_df.empty else pd.to_datetime(pd.Series([], dtype="object"))

    merged = reg_df.merge(act_df, on="user_id", how="left")
    merged["activity_date"] = pd.to_datetime(merged["activity_date"])
    # Когорта задана календарной неделей регистрации, поэтому и W1/W2/... считаем
    # по календарным неделям активности, а не скользящими 7 днями от личного
    # времени регистрации — иначе воскресный регистрант, активный в понедельник,
    # попадал бы в W0, хотя календарно это уже следующая неделя когорты.
    cohort_start = pd.to_datetime(merged["cohort_week"])
    activity_week_start = merged["activity_date"].dt.to_period("W").dt.start_time
    merged["week_diff"] = (activity_week_start - cohort_start).dt.days // 7

    cohorts = reg_df.groupby("cohort_week")["user_id"].nunique().reset_index()
    cohorts.columns = ["cohort_week", "cohort_size"]

    # Неделя, которая ещё не наступила, — это не 0% retention, а «рано считать»:
    # такие ячейки отдаём как null, чтобы heatmap не показывал фиктивный ноль.
    current_week_start = pd.Timestamp.utcnow().tz_localize(None).to_period("W").start_time

    result = []
    for _, row in cohorts.sort_values("cohort_week").iterrows():
        week = row["cohort_week"]
        size = row["cohort_size"]
        cohort_users = reg_df[reg_df["cohort_week"] == week]["user_id"]
        weeks_elapsed = (current_week_start - pd.to_datetime(week)).days // 7
        entry = {"cohort_week": week, "cohort_size": int(size)}
        for w in range(5):
            if w > weeks_elapsed:
                entry[f"W{w}"] = None
                continue
            active_users = merged[
                (merged["cohort_week"] == week) &
                (merged["week_diff"] == w) &
                (merged["user_id"].isin(cohort_users))
            ]["user_id"].nunique()
            entry[f"W{w}"] = round(active_users / size * 100, 1) if size > 0 else 0
        result.append(entry)
    return result

def get_activation_funnel(db: Session):
    from app.models import EventTypeEnum

    reg = db.query(EventLog.user_id, EventLog.timestamp).filter(
        EventLog.event_type == EventTypeEnum.registered
    ).all()
    if not reg:
        return {"registered": 0, "started_first_test": 0, "finished_first_test": 0, "returned_7d": 0}

    reg_df = pd.DataFrame(reg, columns=["user_id", "reg_date"])
    reg_df["reg_date"] = pd.to_datetime(reg_df["reg_date"])
    registered_count = reg_df["user_id"].nunique()

    starts = db.query(EventLog.user_id, EventLog.timestamp).filter(
        EventLog.event_type == EventTypeEnum.start_test
    ).all()
    start_df = pd.DataFrame(starts, columns=["user_id", "event_date"])
    if not start_df.empty:
        start_df["event_date"] = pd.to_datetime(start_df["event_date"])
        first_start = start_df.groupby("user_id")["event_date"].min().reset_index()
        first_start.columns = ["user_id", "first_start_date"]
    else:
        first_start = pd.DataFrame(columns=["user_id", "first_start_date"])

    merged = reg_df.merge(first_start, on="user_id", how="left")
    started_count = merged["first_start_date"].notna().sum()

    attempts = db.query(Attempt.user_id, Attempt.finished_at).filter(Attempt.finished_at != None).all()
    att_df = pd.DataFrame(attempts, columns=["user_id", "finished_at"])
    if not att_df.empty:
        att_df["finished_at"] = pd.to_datetime(att_df["finished_at"])
        first_finish = att_df.groupby("user_id")["finished_at"].min().reset_index()
        first_finish.columns = ["user_id", "first_finish_date"]
    else:
        first_finish = pd.DataFrame(columns=["user_id", "first_finish_date"])

    merged = merged.merge(first_finish, on="user_id", how="left")
    finished_count = merged["first_finish_date"].notna().sum()

    if not att_df.empty:
        all_activity = att_df.merge(reg_df, on="user_id", how="inner")
        all_activity["days_diff"] = (all_activity["finished_at"] - all_activity["reg_date"]).dt.days
        returned = all_activity[all_activity["days_diff"] > 0]
        returned_within_7d = returned[returned["days_diff"] <= 7]["user_id"].nunique()
    else:
        returned_within_7d = 0

    return {
        "registered": int(registered_count),
        "started_first_test": int(started_count),
        "finished_first_test": int(finished_count),
        "returned_7d": int(returned_within_7d),
    }

def get_churn_risk_users(db: Session, days_threshold: int = 14, user_ids=None):
    from datetime import timedelta
    q = db.query(Attempt.user_id, Attempt.finished_at).filter(Attempt.finished_at != None)
    if user_ids:
        q = q.filter(Attempt.user_id.in_(user_ids))
    attempts = q.all()
    if not attempts:
        return []

    df = pd.DataFrame(attempts, columns=["user_id", "finished_at"])
    df["finished_at"] = pd.to_datetime(df["finished_at"])

    counts = df.groupby("user_id").size().reset_index(name="attempt_count")
    regular_users = counts[counts["attempt_count"] >= 2]["user_id"]

    last_activity = df.groupby("user_id")["finished_at"].max().reset_index()
    last_activity.columns = ["user_id", "last_activity"]

    cutoff = datetime.utcnow() - timedelta(days=days_threshold)

    at_risk = last_activity[
        (last_activity["user_id"].isin(regular_users)) &
        (last_activity["last_activity"] < cutoff)
    ].sort_values("last_activity")

    result = []
    for _, row in at_risk.iterrows():
        result.append({
            "user_id": int(row["user_id"]),
            "last_activity": row["last_activity"].strftime("%Y-%m-%d %H:%M"),
            "days_inactive": (datetime.utcnow() - row["last_activity"]).days,
        })
    return result

def get_funnel_by_test_segmented(db: Session, segment_by: str = None):
    from app.models import EventTypeEnum
    from sqlalchemy import text

    starts = db.query(EventLog.test_id, EventLog.user_id).filter(EventLog.event_type == EventTypeEnum.start_test).all()
    finishes = db.query(EventLog.test_id, EventLog.user_id).filter(EventLog.event_type == EventTypeEnum.finish_test).all()
    if not starts:
        return []

    start_df = pd.DataFrame(starts, columns=["test_id", "user_id"])
    finish_df = pd.DataFrame(finishes, columns=["test_id", "user_id"]) if finishes else pd.DataFrame(columns=["test_id", "user_id"])

    if not segment_by or segment_by == "none":
        s = start_df.groupby("test_id").size().reset_index(name="started")
        f = finish_df.groupby("test_id").size().reset_index(name="finished") if not finish_df.empty else pd.DataFrame(columns=["test_id", "finished"])
        df = s.merge(f, on="test_id", how="left").fillna(0)
        df["finished"] = df["finished"].astype(int)
        df["conversion"] = (df["finished"] / df["started"] * 100).round(1)
        df["segment"] = "all"
        df = df.sort_values("started", ascending=False)
        return df.head(10).to_dict(orient="records")

    if segment_by == "has_teacher":
        rows = db.execute(text("SELECT DISTINCT student_id FROM teacher_students")).fetchall()
        with_teacher_ids = set(r[0] for r in rows)
        start_df["segment"] = start_df["user_id"].apply(lambda u: "with_teacher" if u in with_teacher_ids else "independent")
        if not finish_df.empty:
            finish_df["segment"] = finish_df["user_id"].apply(lambda u: "with_teacher" if u in with_teacher_ids else "independent")
    elif segment_by == "role":
        rows = db.execute(text("SELECT id, role FROM users")).fetchall()
        role_map = {r[0]: r[1] for r in rows}
        start_df["segment"] = start_df["user_id"].map(lambda u: role_map.get(u, "unknown"))
        if not finish_df.empty:
            finish_df["segment"] = finish_df["user_id"].map(lambda u: role_map.get(u, "unknown"))
    else:
        return []

    s = start_df.groupby(["test_id", "segment"]).size().reset_index(name="started")
    f = finish_df.groupby(["test_id", "segment"]).size().reset_index(name="finished") if not finish_df.empty else pd.DataFrame(columns=["test_id", "segment", "finished"])
    df = s.merge(f, on=["test_id", "segment"], how="left").fillna(0)
    df["finished"] = df["finished"].astype(int)
    df["conversion"] = (df["finished"] / df["started"] * 100).round(1)
    df = df.sort_values("started", ascending=False)
    return df.head(20).to_dict(orient="records")

def get_dropoff_segmented(db: Session, segment_by: str = None):
    from sqlalchemy import text

    rows = db.query(Answer.attempt_id, Answer.question_id, Attempt.user_id).join(
        Attempt, Answer.attempt_id == Attempt.id
    ).all()
    if not rows:
        return []

    df = pd.DataFrame(rows, columns=["attempt_id", "question_id", "user_id"])

    if not segment_by or segment_by == "none":
        total_attempts = df["attempt_id"].nunique()
        q_counts = df.groupby("question_id")["attempt_id"].nunique().reset_index()
        q_counts.columns = ["question_id", "reached"]
        q_counts["reach_rate"] = (q_counts["reached"] / total_attempts * 100).round(1)
        q_counts["segment"] = "all"
        return q_counts.sort_values("question_id").to_dict(orient="records")

    if segment_by == "has_teacher":
        teacher_rows = db.execute(text("SELECT DISTINCT student_id FROM teacher_students")).fetchall()
        with_teacher_ids = set(r[0] for r in teacher_rows)
        df["segment"] = df["user_id"].apply(lambda u: "with_teacher" if u in with_teacher_ids else "independent")
    elif segment_by == "role":
        role_rows = db.execute(text("SELECT id, role FROM users")).fetchall()
        role_map = {r[0]: r[1] for r in role_rows}
        df["segment"] = df["user_id"].map(lambda u: role_map.get(u, "unknown"))
    else:
        return []

    result = []
    for seg, seg_df in df.groupby("segment"):
        total_attempts = seg_df["attempt_id"].nunique()
        q_counts = seg_df.groupby("question_id")["attempt_id"].nunique().reset_index()
        q_counts.columns = ["question_id", "reached"]
        q_counts["reach_rate"] = (q_counts["reached"] / total_attempts * 100).round(1)
        q_counts["segment"] = seg
        result.extend(q_counts.sort_values("question_id").to_dict(orient="records"))
    return result
