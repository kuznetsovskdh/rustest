from pydantic import BaseModel
from typing import List, Optional

class RuleExampleCreate(BaseModel):
    correct: str
    incorrect: Optional[str] = None
    comment: Optional[str] = None

class RuleExampleResponse(BaseModel):
    id: int
    correct: str
    incorrect: Optional[str]
    comment: Optional[str]
    class Config:
        from_attributes = True

class RuleCreate(BaseModel):
    topic: str
    subtopic: Optional[str] = None
    title: str
    explanation: str
    examples: List[RuleExampleCreate] = []

class RuleResponse(BaseModel):
    id: int
    topic: str
    subtopic: Optional[str]
    title: str
    explanation: str
    examples: List[RuleExampleResponse] = []
    class Config:
        from_attributes = True

class RuleListResponse(BaseModel):
    id: int
    topic: str
    subtopic: Optional[str]
    title: str
    class Config:
        from_attributes = True
