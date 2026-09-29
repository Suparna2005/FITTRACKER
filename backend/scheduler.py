from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from database import SessionLocal
import models
import ai_service
import sms_service
import datetime

def process_due_workouts():
    # Get current time in HH:MM format
    current_time = datetime.datetime.now().strftime("%H:%M")
    
    db: Session = SessionLocal()
    try:
        # Find users whose preferred notification time matches the current time exactly
        users = db.query(models.User).filter(models.User.notification_time == current_time).all()
        
        for user in users:
            print(f"[{current_time}] Generating and sending workout for {user.name}...")
            
            # Skip if user has no phone number
            if not user.phone_number:
                continue
                
            # Get user's history
            history = db.query(models.DailyWorkout).filter(models.DailyWorkout.user_id == user.id).all()
            
            # Generate the plan
            plan = ai_service.generate_plan(user, history, "1-day")
            
            # Save it to database
            new_plan = models.DailyWorkout(
                user_id=user.id,
                workout_data=plan.get("workout_plan", {}),
                diet_data=plan.get("diet_chart", {})
            )
            db.add(new_plan)
            db.commit()
            
            # Format SMS message
            workout_json = plan.get("workout_plan", {})
            diet_json = plan.get("diet_chart", {})
            
            sms_text = f"Good morning {user.name}! Here is your AI Plan for today:\n\n"
            sms_text += f"🏋️‍♂️ Workout ({workout_json.get('focus', 'Full Body')}):\n"
            for ex in workout_json.get("exercises", []):
                sms_text += f"- {ex.get('name')}: {ex.get('sets')}x{ex.get('reps')}\n"
                
            sms_text += f"\n🍎 Diet Goal ({diet_json.get('daily_calories', 2000)} cal):\n"
            sms_text += f"Hit your macros! Remember to log your progress tonight."
            
            # Send SMS
            sms_service.send_sms(user.phone_number, sms_text)
            
    except Exception as e:
        print(f"Scheduler Error: {e}")
    finally:
        db.close()

def start_scheduler():
    scheduler = BackgroundScheduler()
    # Runs EVERY MINUTE to check if any user wants a text right now
    scheduler.add_job(process_due_workouts, 'cron', minute='*')
    scheduler.start()
    print("Background SMS Scheduler Started! Polling every minute to text users at their custom time.")
