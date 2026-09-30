from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from database import SessionLocal
import models
import ai_service
import sms_service
import email_service
import datetime

def _build_message(user, plan):
    workout_json = plan.get("workout_plan", {}) or {}
    diet_json = plan.get("diet_chart", {}) or {}
    burn = workout_json.get("calories_burned")
    kcal = diet_json.get("daily_calories", diet_json.get("calories", 2000))
    cuisine = diet_json.get("cuisine", "")

    hour = datetime.datetime.now().hour
    greeting = "Good morning" if hour < 12 else ("Good afternoon" if hour < 17 else "Good evening")
    sms_text = f"{greeting} {user.name}! Here is your AI Plan for today:\n\n"
    sms_text += f"Workout ({workout_json.get('focus', 'Full Body')})"
    sms_text += f" — ~{burn} kcal burn:\n" if burn is not None else ":\n"
    for ex in workout_json.get("exercises", []) or []:
        sms_text += f"- {ex.get('name')}: {ex.get('sets')}x{ex.get('reps')}\n"
    if not (workout_json.get("exercises") or []):
        sms_text += "- Rest / Recovery day\n"

    sms_text += f"\nDiet Goal ({kcal} cal" + (f", {cuisine}" if cuisine else "") + "):\n"
    for m in (diet_json.get("meals") or [])[:5]:
        m_name = m.get('name') or m.get('time') or 'Meal'
        sms_text += f"- {m_name}: {m.get('meal', '')}\n"
    if not diet_json.get("meals"):
        for k in ["breakfast", "lunch", "dinner", "snack"]:
            if k in diet_json:
                sms_text += f"- {k.capitalize()}: {diet_json[k]}\n"
    sms_text += f"\nHit your macros! Remember to log your progress tonight."
    return sms_text

def process_due_workouts():
    # Get current time in HH:MM format
    current_time = datetime.datetime.now().strftime("%H:%M")
    
    db: Session = SessionLocal()
    try:
        # Find users whose preferred notification time matches the current time exactly
        users = db.query(models.User).filter(models.User.notification_time == current_time).all()
        
        for user in users:
            print(f"[{current_time}] Generating and sending workout for {user.name}...")
            
            # Skip if user has no reachable contact
            if not user.phone_number and not getattr(user, "email", None):
                continue
                
            # Get user's history
            history = db.query(models.DailyWorkout).filter(models.DailyWorkout.user_id == user.id).all()

            # Same inputs as the manual Generate button: latest custom split + cuisine on the user row
            workout_split = None
            latest_split = db.query(models.WorkoutPlan).filter(
                models.WorkoutPlan.user_id == user.id).order_by(
                models.WorkoutPlan.created_at.desc()).first()
            if latest_split and latest_split.schedule and any(latest_split.schedule.values()):
                workout_split = {
                    "splitLabel": latest_split.split_label,
                    "splitType": latest_split.split_type,
                    "schedule": latest_split.schedule,
                }
            today = datetime.datetime.now().strftime("%A")

            # Generate the plan (split + cuisine aware)
            plan = ai_service.generate_plan(user, history, "1-day",
                                            workout_split=workout_split, target_day=today)
            
            # Save it to database
            new_plan = models.DailyWorkout(
                user_id=user.id,
                workout_data=plan.get("workout_plan", {}),
                diet_data=plan.get("diet_chart", {})
            )
            db.add(new_plan)
            db.commit()

            # Build the daily message (workout + diet + calories)
            sms_text = _build_message(user, plan)

            sent_successfully = False

            # 2) SMS (mock-prints when Twilio keys are missing)
            if user.phone_number:
                try:
                    sms_service.send_sms(user.phone_number, sms_text)
                    sent_successfully = True
                except Exception as e:
                    print(f"Scheduler SMS failed: {e}")

            # 3) Email too (mock-prints when SMTP is missing)
            if getattr(user, "email", None):
                try:
                    html_body = "<pre style='font-family:sans-serif;white-space:pre-wrap'>" + sms_text.replace("&", "&amp;").replace("<", "&lt;") + "</pre>"
                    email_service.send_email(user.email, f"Your IronForge AI Plan — {datetime.datetime.now().strftime('%A')}", html_body, html=True)
                    sent_successfully = True
                except Exception as e:
                    print(f"Scheduler Email failed: {e}")

            # 1) Zero-key inbox — Only save if sent successfully or if user has no contact methods
            if sent_successfully or (not user.phone_number and not getattr(user, "email", None)):
                try:
                    db.add(models.Notification(
                        user_id=user.id,
                        title=f"Today's AI Plan — {datetime.datetime.now().strftime('%A')}",
                        body=sms_text,
                        channel="auto"))
                    db.commit()
                except Exception as e:
                    print(f"inbox write skipped: {e}")
            
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
