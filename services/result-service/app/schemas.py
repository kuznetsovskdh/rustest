from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class AnswerInput(BaseModel):
    question_id: int
    selected_option_id: int
    is_correct: bool

class StartAttemptRequest(BaseModel):
    test_id: int

class FinishAttemptRequest(BaseModel):
    answers: List[AnswerInput]

class AnswerResponse(BaseModel):
    question_id: int
    selected_option_id: int
    is_correct: bool
    class Config:
        from_attributes = True

class AttemptResponse(BaseModel):
    id: int
    user_id: int
    test_id: int
    score: int
    total: int
    started_at: datetime
    finished_at: Optional[datetime]
    answers: List[AnswerResponse] = []
    eh_variant_id: Optional[int] = None
    class Config:
        from_attributes = True

class EventLogRequest(BaseModel):
    test_id: Optional[int] = None
    question_id: Optional[int] = None
    event_type: str
    is_correct: Optional[bool] = None
