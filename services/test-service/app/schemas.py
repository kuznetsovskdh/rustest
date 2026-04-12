from pydantic import BaseModel
from enum import Enum
from typing import List, Optional

class DifficultyEnum(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"

class OptionCreate(BaseModel):
    text: str
    is_correct: bool = False

class OptionResponse(BaseModel):
    id: int
    text: str
    is_correct: bool
    class Config:
        from_attributes = True

class QuestionCreate(BaseModel):
    text: str
    options: List[OptionCreate]

class QuestionResponse(BaseModel):
    id: int
    text: str
    options: List[OptionResponse]
    class Config:
        from_attributes = True

class TestCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    difficulty: DifficultyEnum = DifficultyEnum.medium
    timer_seconds: int = 300

class TestResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    category: str
    difficulty: DifficultyEnum
    timer_seconds: int
    is_published: bool
    created_by: int
    questions: List[QuestionResponse] = []
    class Config:
        from_attributes = True

class TestListResponse(BaseModel):
    id: int
    title: str
    category: str
    difficulty: DifficultyEnum
    timer_seconds: int
    is_published: bool
    class Config:
        from_attributes = True
