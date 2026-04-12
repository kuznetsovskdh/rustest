from sqlalchemy import Column, Integer, Boolean, ForeignKey, DateTime, String, Enum
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum

class EventTypeEnum(str, enum.Enum):
    start_test = "start_test"
    answer_question = "answer_question"
    finish_test = "finish_test"
    timeout = "timeout"

class Attempt(Base):
    __tablename__ = "attempts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False)
    test_id = Column(Integer, nullable=False)
    score = Column(Integer, default=0)
    total = Column(Integer, default=0)
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
    answers = relationship("Answer", back_populates="attempt", cascade="all, delete")

class Answer(Base):
    __tablename__ = "answers"
    id = Column(Integer, primary_key=True)
    attempt_id = Column(Integer, ForeignKey("attempts.id"), nullable=False)
    question_id = Column(Integer, nullable=False)
    selected_option_id = Column(Integer, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    attempt = relationship("Attempt", back_populates="answers")

class EventLog(Base):
    __tablename__ = "event_logs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=True)
    test_id = Column(Integer, nullable=True)
    question_id = Column(Integer, nullable=True)
    event_type = Column(Enum(EventTypeEnum), nullable=False)
    is_correct = Column(Boolean, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
