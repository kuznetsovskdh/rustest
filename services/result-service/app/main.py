from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from jose import jwt, JWTError
from datetime import datetime
from app.database import Base, engine, get_db
from app.models import Attempt, Answer, EventLog, EventTypeEnum
from app.schemas import StartAttemptRequest, FinishAttemptRequest, AttemptResponse
from app import analytics
import os

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Result Service", redirect_slashes=False)

SECRET_KEY = os.getenv("JWT_SECRET", "secret")
ALGORITHM = "HS256"

def get_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(authorization.split(" ")[1], SECRET_KEY, algorithms=[ALGORITHM])
        return {"id": int(payload["sub"]), "role": payload["role"]}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_admin(user=Depends(get_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user

def require_teacher(user=Depends(get_user)):
    if user["role"] not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Teacher or admin only")
    return user

@app.post("/attempts/start", response_model=AttemptResponse)
def start_attempt(data: StartAttemptRequest, user=Depends(get_user), db: Session = Depends(get_db)):
    attempt = Attempt(user_id=user["id"], test_id=data.test_id)
    db.add(attempt); db.commit(); db.refresh(attempt)
    db.add(EventLog(user_id=user["id"], test_id=data.test_id, event_type=EventTypeEnum.start_test))
    db.commit()
    return attempt

@app.post("/attempts/{attempt_id}/finish", response_model=AttemptResponse)
def finish_attempt(attempt_id: int, data: FinishAttemptRequest, user=Depends(get_user), db: Session = Depends(get_db)):
    attempt = db.query(Attempt).filter(Attempt.id == attempt_id, Attempt.user_id == user["id"]).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    for a in data.answers:
        db.add(Answer(attempt_id=attempt_id, question_id=a.question_id,
                      selected_option_id=a.selected_option_id, is_correct=a.is_correct))
        db.add(EventLog(user_id=user["id"], test_id=attempt.test_id,
                        question_id=a.question_id, event_type=EventTypeEnum.answer_question,
                        is_correct=a.is_correct))
    attempt.score = sum(1 for a in data.answers if a.is_correct)
    attempt.total = len(data.answers)
    attempt.finished_at = datetime.utcnow()
    db.add(EventLog(user_id=user["id"], test_id=attempt.test_id, event_type=EventTypeEnum.finish_test))
    db.commit(); db.refresh(attempt)
    return attempt

@app.get("/attempts/my", response_model=List[AttemptResponse])
def my_attempts(user=Depends(get_user), db: Session = Depends(get_db)):
    return db.query(Attempt).filter(Attempt.user_id == user["id"]).all()

@app.get("/attempts/{attempt_id}", response_model=AttemptResponse)
def get_attempt(attempt_id: int, user=Depends(get_user), db: Session = Depends(get_db)):
    attempt = db.query(Attempt).filter(Attempt.id == attempt_id, Attempt.user_id == user["id"]).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return attempt

@app.get("/analytics/progress")
def progress(user=Depends(get_user), db: Session = Depends(get_db)):
    return analytics.get_progress(user["id"], db)

@app.get("/analytics/errors")
def errors(user=Depends(get_user), db: Session = Depends(get_db)):
    return analytics.get_topic_errors(user["id"], db)

@app.get("/analytics/recommendations")
def recommendations(user=Depends(get_user), db: Session = Depends(get_db)):
    return analytics.get_recommendations(user["id"], db)

@app.get("/analytics/question-errors/{question_id}")
def question_errors(question_id: int, user=Depends(get_user), db: Session = Depends(get_db)):
    return analytics.get_question_errors(user["id"], question_id, db)

@app.get("/analytics/group/{test_id}")
def group_report(test_id: int, student_ids: str = "", user=Depends(require_teacher), db: Session = Depends(get_db)):
    ids = [int(i) for i in student_ids.split(",") if i.strip().isdigit()]
    q = db.query(Attempt).filter(Attempt.test_id == test_id, Attempt.finished_at != None)
    if ids:
        q = q.filter(Attempt.user_id.in_(ids))
    attempts = q.all()
    if not attempts:
        return {"test_id": test_id, "total_attempts": 0, "avg_score": 0, "passed": 0, "failed": 0, "distribution": {"0-49": 0, "50-69": 0, "70-89": 0, "90-100": 0}}
    scores = [round((a.score/a.total)*100) if a.total > 0 else 0 for a in attempts]
    avg = round(sum(scores)/len(scores), 1)
    return {
        "test_id": test_id, "total_attempts": len(scores), "avg_score": avg,
        "passed": sum(1 for s in scores if s >= 70), "failed": sum(1 for s in scores if s < 70),
        "distribution": {
            "0-49": sum(1 for s in scores if s < 50),
            "50-69": sum(1 for s in scores if 50 <= s < 70),
            "70-89": sum(1 for s in scores if 70 <= s < 90),
            "90-100": sum(1 for s in scores if s >= 90),
        }
    }

@app.get("/analytics/funnel")
def funnel(user=Depends(require_admin), db: Session = Depends(get_db)):
    return analytics.get_funnel(db)

@app.get("/analytics/retention")
def retention(user=Depends(require_admin), db: Session = Depends(get_db)):
    return analytics.get_retention(db)

@app.get("/analytics/question-difficulty")
def question_difficulty(user=Depends(require_admin), db: Session = Depends(get_db)):
    return analytics.get_question_difficulty(db)

@app.get("/analytics/daily-activity")
def daily_activity(user=Depends(require_admin), db: Session = Depends(get_db)):
    return analytics.get_daily_activity(db)

@app.get("/analytics/dau-mau")
def dau_mau(user=Depends(require_admin), db: Session = Depends(get_db)):
    return analytics.get_dau_mau(db)

@app.get("/analytics/funnel-by-test")
def funnel_by_test(user=Depends(require_admin), db: Session = Depends(get_db)):
    return analytics.get_funnel_by_test(db)

@app.get("/analytics/score-distribution")
def score_distribution(user=Depends(require_admin), db: Session = Depends(get_db)):
    return analytics.get_score_distribution(db)

@app.get("/analytics/dropoff")
def dropoff(user=Depends(require_admin), db: Session = Depends(get_db)):
    return analytics.get_dropoff(db)

@app.get("/attempts/my/detailed")
def my_attempts_detailed(user=Depends(get_user), db: Session = Depends(get_db)):
    attempts = db.query(Attempt).filter(Attempt.user_id == user["id"]).order_by(Attempt.started_at.desc()).all()
    result = []
    for a in attempts:
        pct = round((a.score / a.total) * 100) if a.total > 0 else 0
        result.append({
            "id": a.id, "test_id": a.test_id, "score": a.score, "total": a.total,
            "score_pct": pct, "started_at": a.started_at.isoformat() if a.started_at else None,
            "finished_at": a.finished_at.isoformat() if a.finished_at else None
        })
    return result

from fastapi.responses import StreamingResponse
import io

@app.get("/analytics/export")
def export_analytics(user=Depends(require_admin), db: Session = Depends(get_db)):
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment

    wb = openpyxl.Workbook()

    # Лист 1: Воронка
    ws1 = wb.active
    ws1.title = "Воронка"
    ws1.append(["Метрика", "Значение"])
    funnel = analytics.get_funnel(db)
    ws1.append(["Начали тест", funnel["started"]])
    ws1.append(["Завершили тест", funnel["finished"]])
    ws1.append(["Конверсия %", funnel["conversion_rate"]])

    # Лист 2: Retention
    ws2 = wb.create_sheet("Retention")
    ws2.append(["Метрика", "Значение"])
    ret = analytics.get_retention(db)
    ws2.append(["Всего пользователей", ret["total_users"]])
    ws2.append(["D1 retention %", ret["d1"]])
    ws2.append(["D7 retention %", ret["d7"]])

    # Лист 3: DAU/MAU
    ws3 = wb.create_sheet("DAU_MAU")
    ws3.append(["Метрика", "Значение"])
    dm = analytics.get_dau_mau(db)
    ws3.append(["DAU", dm["dau"]])
    ws3.append(["MAU", dm["mau"]])
    ws3.append(["DAU/MAU ratio %", dm["ratio"]])
    ws3.append([])
    ws3.append(["Дата", "Уникальных пользователей"])
    for row in dm["dau_history"]:
        ws3.append([row["date"], row["users"]])

    # Лист 4: Сложность вопросов
    ws4 = wb.create_sheet("Сложность вопросов")
    ws4.append(["ID вопроса", "% правильных", "Всего ответов", "Категория"])
    diff = analytics.get_question_difficulty(db)
    for q in diff["too_hard"]:
        ws4.append([q["question_id"], q["correct_rate"], q["total"], "Слишком сложный"])
    for q in diff["normal"]:
        ws4.append([q["question_id"], q["correct_rate"], q["total"], "Нормальный"])
    for q in diff["too_easy"]:
        ws4.append([q["question_id"], q["correct_rate"], q["total"], "Слишком лёгкий"])

    # Лист 5: Активность
    ws5 = wb.create_sheet("Активность")
    ws5.append(["Дата", "Попыток"])
    for row in analytics.get_daily_activity(db):
        ws5.append([row["date"], row["count"]])

    # Лист 6: Воронка по тестам
    ws6 = wb.create_sheet("Воронка по тестам")
    ws6.append(["ID теста", "Начали", "Завершили", "Конверсия %"])
    for row in analytics.get_funnel_by_test(db):
        ws6.append([row["test_id"], row["started"], row["finished"], row["conversion"]])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=rutest_analytics.xlsx"})

@app.get("/analytics/export-raw")
def export_raw(user=Depends(require_admin), db: Session = Depends(get_db)):
    import openpyxl
    import io

    wb = openpyxl.Workbook()

    ws1 = wb.active
    ws1.title = "Попытки пользователей"
    ws1.append(["ID попытки", "ID пользователя", "ID теста", "Баллов", "Всего вопросов", "% правильных", "Начало", "Конец"])
    attempts = db.query(Attempt).all()
    for a in attempts:
        pct = round((a.score / a.total) * 100, 1) if a.total > 0 else 0
        ws1.append([
            a.id, a.user_id, a.test_id, a.score, a.total, pct,
            a.started_at.strftime("%Y-%m-%d %H:%M") if a.started_at else "",
            a.finished_at.strftime("%Y-%m-%d %H:%M") if a.finished_at else ""
        ])

    ws2 = wb.create_sheet("Ответы пользователей")
    ws2.append(["ID ответа", "ID попытки", "ID пользователя", "ID вопроса", "ID выбранного варианта", "Правильно"])
    answers = db.query(Answer).join(Attempt, Answer.attempt_id == Attempt.id).all()
    for a in answers:
        attempt = db.query(Attempt).filter(Attempt.id == a.attempt_id).first()
        ws2.append([a.id, a.attempt_id, attempt.user_id if attempt else "", a.question_id, a.selected_option_id, "Да" if a.is_correct else "Нет"])

    ws3 = wb.create_sheet("События")
    ws3.append(["ID", "ID пользователя", "ID теста", "ID вопроса", "Тип события", "Правильно", "Время"])
    events = db.query(EventLog).order_by(EventLog.timestamp.desc()).limit(5000).all()
    for e in events:
        ws3.append([
            e.id, e.user_id, e.test_id, e.question_id,
            e.event_type.value if hasattr(e.event_type, 'value') else str(e.event_type),
            "Да" if e.is_correct else ("Нет" if e.is_correct is False else ""),
            e.timestamp.strftime("%Y-%m-%d %H:%M") if e.timestamp else ""
        ])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=rutest_raw_data.xlsx"})
