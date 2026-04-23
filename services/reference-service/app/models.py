from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Rule(Base):
    __tablename__ = "rules"
    id = Column(Integer, primary_key=True)
    topic = Column(String, nullable=False)
    subtopic = Column(String, nullable=True)
    title = Column(String, nullable=False)
    explanation = Column(Text, nullable=False)
    examples = relationship("RuleExample", back_populates="rule", cascade="all, delete")

class RuleExample(Base):
    __tablename__ = "rule_examples"
    id = Column(Integer, primary_key=True)
    rule_id = Column(Integer, ForeignKey("rules.id"), nullable=False)
    correct = Column(String, nullable=False)
    incorrect = Column(String, nullable=True)
    comment = Column(String, nullable=True)
    rule = relationship("Rule", back_populates="examples")
