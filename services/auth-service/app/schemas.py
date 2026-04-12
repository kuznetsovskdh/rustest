from pydantic import BaseModel, EmailStr
from enum import Enum

class RoleEnum(str, Enum):
    guest = "guest"
    user = "user"
    teacher = "teacher"
    admin = "admin"

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: RoleEnum

    class Config:
        from_attributes = True
