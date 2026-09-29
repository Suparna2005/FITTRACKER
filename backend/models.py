from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Float
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    phone_number = Column(String, unique=True, index=True)
    password = Column(String)
    goal = Column(String)
    experience_level = Column(String)
    equipment = Column(String)
    notification_time = Column(String, default="06:00")
    target_timeframe = Column(String, nullable=True)
    
    # Advanced Health Metrics
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    weight = Column(String, nullable=True)
    height = Column(String, nullable=True)
    blood_pressure = Column(String, nullable=True)
    blood_group = Column(String, nullable=True)
    medical_conditions = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class DailyWorkout(Base):
    __tablename__ = "daily_workouts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(DateTime, default=datetime.datetime.utcnow)
    workout_data = Column(JSON) # AI generated workout
    diet_data = Column(JSON) # AI generated diet chart
    status = Column(String, default="pending")
