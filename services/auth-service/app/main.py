from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.database import Base, engine, get_db
from app.models import User, RoleEnum, TeacherStudent, Notification
from app.schemas import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.auth import hash_password, verify_password, create_token, get_current_user

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Auth Service", redirect_slashes=False)

class NotificationResponse(BaseModel):
    id: int
    from_user_id: int
    to_user_id: int
    type: str
    payload: Optional[str]
    is_read: bool
    class Config:
        from_attributes = True

class InviteRequest(BaseModel):
    student_ids: List[int]
    payload: Optional[str] = None

@app.post("/auth/register", response_model=TokenResponse)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=data.email, hashed_password=hash_password(data.password), name=data.name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"access_token": create_token({"sub": str(user.id), "role": user.role})}

@app.post("/auth/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.is_frozen:
        raise HTTPException(status_code=403, detail="Account is frozen")
    return {"access_token": create_token({"sub": str(user.id), "role": user.role})}

@app.get("/auth/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return user

@app.get("/auth/users", response_model=List[UserResponse])
def get_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Admin only")
    return db.query(User).all()

@app.patch("/auth/users/{user_id}/role")
def update_role(user_id: int, role: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Admin only")
    if role not in [r.value for r in RoleEnum]:
        raise HTTPException(status_code=400, detail="Invalid role")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = role
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email, "role": user.role}

@app.patch("/auth/users/{user_id}/freeze")
def toggle_freeze(user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Admin only")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot freeze yourself")
    user.is_frozen = not user.is_frozen
    db.commit()
    return {"id": user.id, "is_frozen": user.is_frozen}

@app.get("/auth/students", response_model=List[UserResponse])
def get_my_students(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in (RoleEnum.teacher, RoleEnum.admin):
        raise HTTPException(status_code=403, detail="Teacher only")
    ids = [l.student_id for l in db.query(TeacherStudent).filter(TeacherStudent.teacher_id == current_user.id).all()]
    return db.query(User).filter(User.id.in_(ids)).all()

@app.post("/auth/students/{student_id}")
def add_student(student_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in (RoleEnum.teacher, RoleEnum.admin):
        raise HTTPException(status_code=403, detail="Teacher only")
    if not db.query(User).filter(User.id == student_id).first():
        raise HTTPException(status_code=404, detail="User not found")
    if db.query(TeacherStudent).filter(TeacherStudent.teacher_id == current_user.id, TeacherStudent.student_id == student_id).first():
        raise HTTPException(status_code=400, detail="Already added")
    db.add(TeacherStudent(teacher_id=current_user.id, student_id=student_id))
    db.commit()
    return {"ok": True}

@app.delete("/auth/students/{student_id}")
def remove_student(student_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in (RoleEnum.teacher, RoleEnum.admin):
        raise HTTPException(status_code=403, detail="Teacher only")
    db.query(TeacherStudent).filter(TeacherStudent.teacher_id == current_user.id, TeacherStudent.student_id == student_id).delete()
    db.commit()
    return {"ok": True}

@app.get("/auth/students/all", response_model=List[UserResponse])
def get_all_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in (RoleEnum.teacher, RoleEnum.admin):
        raise HTTPException(status_code=403, detail="Teacher only")
    return db.query(User).filter(User.role == RoleEnum.user).all()

@app.get("/auth/notifications", response_model=List[NotificationResponse])
def get_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Notification).filter(Notification.to_user_id == current_user.id).order_by(Notification.created_at.desc()).all()

@app.post("/auth/notifications/invite-student/{student_id}")
def invite_student(student_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in (RoleEnum.teacher, RoleEnum.admin):
        raise HTTPException(status_code=403, detail="Teacher only")
    db.add(Notification(from_user_id=current_user.id, to_user_id=student_id,
                        type="invite_student", payload=str(current_user.id)))
    db.commit()
    return {"ok": True}

@app.post("/auth/notifications/invite-test")
def invite_test(data: InviteRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in (RoleEnum.teacher, RoleEnum.admin):
        raise HTTPException(status_code=403, detail="Teacher only")
    for sid in data.student_ids:
        db.add(Notification(from_user_id=current_user.id, to_user_id=sid,
                            type="invite_test", payload=data.payload))
    db.commit()
    return {"ok": True, "sent": len(data.student_ids)}

@app.patch("/auth/notifications/{notif_id}/read")
def mark_read(notif_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == notif_id, Notification.to_user_id == current_user.id).first()
    if n:
        n.is_read = True
        db.commit()
    return {"ok": True}
