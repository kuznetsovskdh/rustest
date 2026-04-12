from sqlalchemy import Column, Integer, String, Enum
from app.database import Base
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
