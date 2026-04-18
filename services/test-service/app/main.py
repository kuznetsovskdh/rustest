from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from jose import jwt, JWTError
from app.database import Base, engine, get_db
from app.models import Test, Question, Option
from app.schemas import TestCreate, TestResponse, TestListResponse, QuestionCreate
import os

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Test Service", redirect_slashes=False)

SECRET_KEY = os.getenv("JWT_SECRET", "secret")
ALGORITHM = "HS256"

def get_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {"id": int(payload["sub"]), "role": payload["role"]}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_admin(user=Depends(get_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user

@app.post("/tests", response_model=TestResponse)
def create_test(data: TestCreate, user=Depends(require_admin), db: Session = Depends(get_db)):
    test = Test(**data.model_dump(), created_by=user["id"])
    db.add(test)
    db.commit()
    db.refresh(test)
    return test

@app.post("/tests/{test_id}/questions", response_model=TestResponse)
def add_question(test_id: int, data: QuestionCreate, user=Depends(require_admin), db: Session = Depends(get_db)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    question = Question(test_id=test_id, text=data.text)
    db.add(question)
    db.flush()
    for opt in data.options:
        db.add(Option(question_id=question.id, text=opt.text, is_correct=opt.is_correct))
    db.commit()
    db.refresh(test)
    return test

@app.patch("/tests/{test_id}/publish", response_model=TestResponse)
def publish_test(test_id: int, user=Depends(require_admin), db: Session = Depends(get_db)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    test.is_published = True
    db.commit()
    db.refresh(test)
    return test

@app.patch("/tests/{test_id}/hide", response_model=TestResponse)
def hide_test(test_id: int, user=Depends(require_admin), db: Session = Depends(get_db)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    test.is_published = False
    db.commit()
    db.refresh(test)
    return test

@app.put("/tests/{test_id}", response_model=TestResponse)
def update_test(test_id: int, data: TestCreate, user=Depends(require_admin), db: Session = Depends(get_db)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    for k, v in data.model_dump().items():
        setattr(test, k, v)
    db.commit()
    db.refresh(test)
    return test

@app.delete("/tests/{test_id}/questions/{question_id}", response_model=TestResponse)
def delete_question(test_id: int, question_id: int, user=Depends(require_admin), db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.id == question_id, Question.test_id == test_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(question)
    db.commit()
    test = db.query(Test).filter(Test.id == test_id).first()
    return test

@app.get("/tests", response_model=List[TestListResponse])
def list_tests(category: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Test).filter(Test.is_published == True)
    if category:
        q = q.filter(Test.category == category)
    return q.all()

@app.get("/tests/all", response_model=List[TestListResponse])
def list_all_tests(user=Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(Test).all()

@app.get("/tests/{test_id}", response_model=TestResponse)
def get_test(test_id: int, db: Session = Depends(get_db)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    return test
