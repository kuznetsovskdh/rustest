from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from jose import jwt, JWTError
from datetime import datetime
from app.database import Base, engine, get_db
from app.models import Attempt, Answer, EventLog, EventTypeEnum
from app.schemas import StartAttemptRequest, FinishAttemptRequest, AttemptResponse
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

@app.post("/attempts/start", response_model=AttemptResponse)
def start_attempt(data: StartAttemptRequest, user=Depends(get_user), db: Session = Depends(get_db)):
    attempt = Attempt(user_id=user["id"], test_id=data.test_id)
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    log = EventLog(user_id=user["id"], test_id=data.test_id, event_type=EventTypeEnum.start_test)
    db.add(log)
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
