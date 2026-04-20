from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum

class DifficultyEnum(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"

class Test(Base):
    __tablename__ = "tests"
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    category = Column(String, nullable=False)
    difficulty = Column(Enum(DifficultyEnum), default=DifficultyEnum.medium)
    timer_seconds = Column(Integer, default=300)
    is_published = Column(Boolean, default=False)
    created_by = Column(Integer, nullable=False)
    questions = relationship("Question", back_populates="test", cascade="all, delete")
    links = relationship("TestLink", back_populates="test", cascade="all, delete")

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True)
    test_id = Column(Integer, ForeignKey("tests.id"), nullable=False)
    text = Column(Text, nullable=False)
    test = relationship("Test", back_populates="questions")
    options = relationship("Option", back_populates="question", cascade="all, delete")

class Option(Base):
    __tablename__ = "options"
    id = Column(Integer, primary_key=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    text = Column(String, nullable=False)
    is_correct = Column(Boolean, default=False)
    question = relationship("Question", back_populates="options")

class TestLink(Base):
    __tablename__ = "test_links"
    id = Column(Integer, primary_key=True)
    token = Column(String, unique=True, nullable=False)
    test_id = Column(Integer, ForeignKey("tests.id"), nullable=False)
    created_by = Column(Integer, nullable=False)
    label = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    test = relationship("Test", back_populates="links")
