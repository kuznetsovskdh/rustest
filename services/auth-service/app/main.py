from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import Base, engine, get_db
from app.models import User, RoleEnum
from app.schemas import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.auth import hash_password, verify_password, create_token, get_current_user

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Auth Service", redirect_slashes=False)

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
