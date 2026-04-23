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
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
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
    db.commit()
    db.refresh(attempt)
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

@app.get("/analytics/funnel")
def funnel(user=Depends(require_admin), db: Session = Depends(get_db)):
    return analytics.get_funnel(db)

@app.get("/analytics/group/{test_id}")
def group_report(test_id: int, student_ids: str = "", user=Depends(require_teacher), db: Session = Depends(get_db)):
    ids = [int(i) for i in student_ids.split(",") if i.strip().isdigit()]
    q = db.query(Attempt).filter(Attempt.test_id == test_id, Attempt.finished_at != None)
    if ids:
        q = q.filter(Attempt.user_id.in_(ids))
    attempts = q.all()
    if not attempts:
        return {"test_id": test_id, "total_attempts": 0, "avg_score": 0, "distribution": []}
    scores = []
    for a in attempts:
        pct = round((a.score / a.total) * 100) if a.total > 0 else 0
        scores.append(pct)
    avg = round(sum(scores) / len(scores), 1)
    above70 = sum(1 for s in scores if s >= 70)
    below70 = len(scores) - above70
    return {
        "test_id": test_id,
        "total_attempts": len(scores),
        "avg_score": avg,
        "passed": above70,
        "failed": below70,
        "distribution": {
            "0-49": sum(1 for s in scores if s < 50),
            "50-69": sum(1 for s in scores if 50 <= s < 70),
            "70-89": sum(1 for s in scores if 70 <= s < 90),
            "90-100": sum(1 for s in scores if s >= 90),
        }
    }

@app.get("/analytics/question-errors/{question_id}")
def question_errors(question_id: int, user=Depends(get_user), db: Session = Depends(get_db)):
    return analytics.get_question_errors(user["id"], question_id, db)
