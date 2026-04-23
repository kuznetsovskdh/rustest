from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from jose import jwt, JWTError
from app.database import Base, engine, get_db
from app.models import Rule, RuleExample
from app.schemas import RuleCreate, RuleResponse, RuleListResponse
import os

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Reference Service", redirect_slashes=False)

SECRET_KEY = os.getenv("JWT_SECRET", "secret")
ALGORITHM = "HS256"

def require_admin(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(authorization.split(" ")[1], SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin only")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/rules", response_model=List[RuleListResponse])
def list_rules(topic: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Rule)
    if topic:
        q = q.filter(Rule.topic == topic)
    return q.all()

@app.get("/rules/topics")
def list_topics(db: Session = Depends(get_db)):
    topics = db.query(Rule.topic).distinct().all()
    return [t[0] for t in topics]

@app.get("/rules/{rule_id}", response_model=RuleResponse)
def get_rule(rule_id: int, db: Session = Depends(get_db)):
    rule = db.query(Rule).filter(Rule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule

@app.post("/rules", response_model=RuleResponse)
def create_rule(data: RuleCreate, admin=Depends(require_admin), db: Session = Depends(get_db)):
    rule = Rule(topic=data.topic, subtopic=data.subtopic, title=data.title, explanation=data.explanation)
    db.add(rule)
    db.flush()
    for ex in data.examples:
        db.add(RuleExample(rule_id=rule.id, correct=ex.correct, incorrect=ex.incorrect, comment=ex.comment))
    db.commit()
    db.refresh(rule)
    return rule

@app.put("/rules/{rule_id}", response_model=RuleResponse)
def update_rule(rule_id: int, data: RuleCreate, admin=Depends(require_admin), db: Session = Depends(get_db)):
    rule = db.query(Rule).filter(Rule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    rule.topic = data.topic
    rule.subtopic = data.subtopic
    rule.title = data.title
    rule.explanation = data.explanation
    db.query(RuleExample).filter(RuleExample.rule_id == rule_id).delete()
    for ex in data.examples:
        db.add(RuleExample(rule_id=rule.id, correct=ex.correct, incorrect=ex.incorrect, comment=ex.comment))
    db.commit()
    db.refresh(rule)
    return rule

@app.delete("/rules/{rule_id}")
def delete_rule(rule_id: int, admin=Depends(require_admin), db: Session = Depends(get_db)):
    rule = db.query(Rule).filter(Rule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(rule)
    db.commit()
    return {"ok": True}
