from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models, ai_service, scheduler
from pydantic import BaseModel
from typing import List, Optional

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Fitness Tracker API")

@app.on_event("startup")
def on_startup():
    scheduler.start_scheduler()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserCreate(BaseModel):
    name: str
    email: str
    phone_number: str
    password: str
    
    # These will be filled out after login
    goal: Optional[str] = "Build Muscle"
    experience_level: Optional[str] = "Beginner"
    equipment: Optional[str] = "Full Gym"
    notification_time: Optional[str] = "06:00"
    target_timeframe: Optional[str] = None
    
    # Optional Health Data
    age: Optional[int] = None
    gender: Optional[str] = None
    weight: Optional[str] = None
    height: Optional[str] = None
    blood_pressure: Optional[str] = None
    blood_group: Optional[str] = None
    medical_conditions: Optional[str] = None

class WorkoutImport(BaseModel):
    user_id: int
    workouts: List[dict]

class UserLogin(BaseModel):
    identifier: str
    password: str

class ExerciseLog(BaseModel):
    name: str
    sets: int
    reps: int
    weight: int

class ManualLog(BaseModel):
    user_id: int
    date: str
    volume: int
    notes: str
    workout_time: Optional[str] = None
    supplements: Optional[str] = None
    diet_followed: Optional[str] = None
    weight_today: Optional[str] = None
    height_today: Optional[str] = None
    exercises: List[ExerciseLog] = []

@app.post("/users/")
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = models.User(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.put("/users/{user_id}")
def update_user(user_id: int, user_update: dict, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    for key, value in user_update.items():
        if hasattr(db_user, key):
            setattr(db_user, key, value)
            
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/login/")
def login_user(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(
        (models.User.phone_number == user.identifier) | (models.User.email == user.identifier)
    ).first()
    if not db_user or db_user.password != user.password:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return db_user

@app.post("/log_history/")
def log_history(log: ManualLog, db: Session = Depends(get_db)):
    db_workout = models.DailyWorkout(
        user_id=log.user_id,
        workout_data={
            "date": log.date,
            "volume": log.volume, 
            "workout_time": log.workout_time,
            "supplements": log.supplements,
            "diet_followed": log.diet_followed,
            "weight_today": log.weight_today,
            "height_today": log.height_today,
            "notes": log.notes, 
            "exercises": [ex.dict() for ex in log.exercises]
        },
        status="completed"
    )
    db.add(db_workout)
    db.commit()
    return {"status": "success"}

@app.post("/generate_plan/")
def generate_user_plan(user_id: int, plan_type: str = "1-day", db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    # Auto-create user for demo purposes if it doesn't exist
    if not user:
        user = models.User(
            name="Demo User",
            phone_number="555-000-1111",
            goal="Build Muscle",
            experience_level="Intermediate",
            equipment="Full Gym"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    history = db.query(models.DailyWorkout).filter(models.DailyWorkout.user_id == user.id).all()
    
    plan = ai_service.generate_plan(user, history, plan_type)
    
    new_plan = models.DailyWorkout(
        user_id=user.id,
        workout_data=plan.get("workout_plan", {}),
        diet_data=plan.get("diet_chart", {})
    )
    db.add(new_plan)
    db.commit()
    
    return plan

@app.get("/users/{user_id}/history")
def get_history(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.DailyWorkout).filter(models.DailyWorkout.user_id == user_id).all()
