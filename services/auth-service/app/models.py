from sqlalchemy import Column, Integer, String, Enum, Boolean, DateTime
from app.database import Base
from datetime import datetime
import enum

class RoleEnum(str, enum.Enum):
    guest = "guest"
    user = "user"
    teacher = "teacher"
    admin = "admin"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.user)
    is_frozen = Column(Boolean, default=False)

class TeacherStudent(Base):
    __tablename__ = "teacher_students"
    id = Column(Integer, primary_key=True)
    teacher_id = Column(Integer, nullable=False)
    student_id = Column(Integer, nullable=False)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    from_user_id = Column(Integer, nullable=False)
    to_user_id = Column(Integer, nullable=False)
    type = Column(String, nullable=False)
    payload = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
