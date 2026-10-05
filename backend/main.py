from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models, ai_service, scheduler
from pydantic import BaseModel
from typing import List, Optional

# Create tables
models.Base.metadata.create_all(bind=engine)

# ── Lightweight auto-migration for all optional user columns (postgres + sqlite) ──
def _ensure_user_food_columns():
    try:
        from sqlalchemy import inspect, text
        insp = inspect(engine)
        if "users" not in insp.get_table_names():
            return
        existing = {c["name"] for c in insp.get_columns("users")}
        # All columns defined in User model
        user_cols = [col.name for col in models.User.__table__.columns]
        for col in user_cols:
            if col not in existing:
                try:
                    with engine.begin() as conn:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} VARCHAR"))
                    print(f"Auto-added missing column '{col}' to users table.")
                except Exception as e:
                    print(f"Migration skipped for {col}: {e}")
    except Exception as e:
        print(f"Column ensure skipped: {e}")

_ensure_user_food_columns()

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

    # Optional food / cuisine preference (drives diet chart)
    diet_cuisine: Optional[str] = "Generic Indian"
    diet_type: Optional[str] = "No Preference"
    body_fat: Optional[str] = None

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

class PasswordReset(BaseModel):
    identifier: str
    new_password: str

@app.post("/reset_password/")
def reset_password(data: PasswordReset, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(
        (models.User.phone_number == data.identifier) | (models.User.email == data.identifier)
    ).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Account not found.")
    
    db_user.password = data.new_password
    db.commit()
    return {"status": "success", "message": "Password reset successfully."}

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

class FoodLogRequest(BaseModel):
    user_id: int
    food_name: str
    calories: int
    protein_g: Optional[int] = 0
    carbs_g: Optional[int] = 0
    fats_g: Optional[int] = 0
    serving_weight_g: Optional[int] = 0
    ingredients: Optional[List[dict]] = None
    scientific_notes: Optional[str] = None
    date: Optional[str] = None

@app.post("/log_food/")
def log_food(log: FoodLogRequest, db: Session = Depends(get_db)):
    import datetime
    log_date = log.date or datetime.date.today().isoformat()
    
    ing_summary = ""
    if log.ingredients:
        ing_parts = [f"{i.get('name', 'Item')} ({i.get('weight_g', 0)}g - {i.get('calories', 0)} kcal)" for i in log.ingredients]
        ing_summary = " | Ingredients: " + ", ".join(ing_parts)

    weight_str = f" ({log.serving_weight_g}g total weight)" if log.serving_weight_g else ""
    food_note = f"[Scientific Vision Food Log] {log.food_name}{weight_str}: {log.calories} kcal (Protein: {log.protein_g}g, Carbs: {log.carbs_g}g, Fats: {log.fats_g}g){ing_summary}"
    
    db_workout = models.DailyWorkout(
        user_id=log.user_id,
        workout_data={
            "date": log_date,
            "volume": 0,
            "notes": food_note,
            "exercises": []
        },
        diet_data={
            "daily_calories": log.calories,
            "serving_weight_g": log.serving_weight_g or 0,
            "macros": {
                "protein": f"{log.protein_g}g",
                "carbs": f"{log.carbs_g}g",
                "fats": f"{log.fats_g}g"
            },
            "ingredients": log.ingredients or [],
            "scientific_notes": log.scientific_notes or "",
            "meals": [
                {"name": f"Vision Scanned Meal ({log.serving_weight_g or 'N/A'}g)", "meal": f"{log.food_name} — {log.calories} kcal"}
            ]
        },
        status="completed"
    )
    db.add(db_workout)
    db.commit()
    return {"status": "success", "message": f"Successfully logged {log.food_name} ({log.serving_weight_g or 'N/A'}g, {log.calories} kcal) to database!"}

class WorkoutLogRequest(BaseModel):
    user_id: int
    exercise_name: str
    sets: int
    reps: int
    weight: Optional[int] = 0
    form_score: Optional[int] = 100
    critique: Optional[str] = "Good form"
    date: Optional[str] = None

@app.post("/log_workout/")
def log_workout(req: WorkoutLogRequest, db: Session = Depends(get_db)):
    import datetime
    log_date = req.date or datetime.date.today().isoformat()
    db_workout = models.DailyWorkout(
        user_id=req.user_id,
        workout_data={
            "date": log_date,
            "volume": req.sets * req.reps * req.weight,
            "notes": f"[AI Form Coach] Score: {req.form_score}/100. Critique: {req.critique}",
            "exercises": [{
                "name": req.exercise_name,
                "sets": req.sets,
                "reps": req.reps,
                "weight": req.weight
            }]
        },
        status="completed"
    )
    db.add(db_workout)
    db.commit()
    return {"status": "success", "message": f"Logged {req.sets} sets of {req.exercise_name}!"}

@app.post("/generate_plan/")
def generate_user_plan(user_id: int, plan_type: str = "1-day", use_split: bool = True, day: Optional[str] = None, db: Session = Depends(get_db)):
    import datetime as _dt
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

    # ── Optional custom split: latest saved plan drives today's muscles ──
    # Fully optional: if use_split=False or no split saved → AI auto-picks body parts.
    workout_split = None
    if use_split:
        latest = db.query(models.WorkoutPlan).filter(models.WorkoutPlan.user_id == user.id).order_by(models.WorkoutPlan.created_at.desc()).first()
        if latest and latest.schedule and any(latest.schedule.values()):
            workout_split = {
                "splitLabel": latest.split_label,
                "splitType": latest.split_type,
                "schedule": latest.schedule,
            }

    target_day = day or _dt.datetime.now().strftime("%A")

    # Fetch active discomfort logs from the last 14 days
    active_discomforts = db.query(models.DiscomfortLog).filter(
        models.DiscomfortLog.user_id == user.id,
        models.DiscomfortLog.status == "active"
    ).order_by(models.DiscomfortLog.created_at.desc()).limit(5).all()

    plan = ai_service.generate_plan(user, history, plan_type, workout_split=workout_split, target_day=target_day, discomfort_logs=active_discomforts)

    # persist split + calorie context with the generated day so history maintains intake-vs-burn
    wp = dict(plan.get("workout_plan", {}) or {})
    dc = dict(plan.get("diet_chart", {}) or {})
    if workout_split:
        wp["split_used"] = {
            "label": workout_split.get("splitLabel"),
            "day": target_day,
            "muscles": (workout_split.get("schedule") or {}).get(target_day, []),
        }
    try:
        burn = wp.get("calories_burned")
        burn = int(float(str(burn))) if burn is not None else None
    except Exception:
        burn = None
    if burn is None:
        burn = 0 if len(wp.get("exercises") or []) == 0 else 120 + 70 * len(wp.get("exercises") or [])
        wp["calories_burned"] = burn
    try:
        intake = dc.get("daily_calories", dc.get("calories"))
        intake = int(float(str(intake))) if intake is not None else None
    except Exception:
        intake = None
    plan["calorie_summary"] = {
        "day": target_day,
        "intake": intake,
        "burned": burn,
        "net": (intake - burn) if isinstance(intake, int) else None,
    }
    new_plan = models.DailyWorkout(
        user_id=user.id,
        workout_data=wp,
        diet_data=dc
    )
    db.add(new_plan)
    db.commit()

    # ── Auto-delivery: SMS/Email to mobile + in-app inbox (no manual step) ──
    try:
        auto_msg = _format_plan_message(user, {"workout_plan": wp, "diet_chart": dc})
        
        sent_channels = []
        
        # 1. SMS
        if user.phone_number:
            try:
                import sms_service
                sms_service.send_sms(user.phone_number, auto_msg)
                sent_channels.append("SMS")
            except Exception as e:
                print(f"auto SMS skipped: {e}")
                
        # 2. Email
        if getattr(user, "email", None):
            try:
                import email_service
                html_body = "<pre style='font-family:sans-serif;white-space:pre-wrap'>" + auto_msg.replace("&", "&amp;").replace("<", "&lt;") + "</pre>"
                email_service.send_email(user.email, f"Today's AI Plan — {target_day}", html_body, html=True)
                sent_channels.append("Email")
            except Exception as e:
                print(f"auto Email skipped: {e}")
                
        # 3. Inbox
        if sent_channels:
            sms_note = f"sent via {' & '.join(sent_channels)}"
            try:
                _inbox(db, user.id, f"Today's AI Plan — {target_day} ({sms_note})", auto_msg, channel="auto")
            except Exception as e:
                print(f"inbox write skipped: {e}")
        else:
            sms_note = "no valid contact methods or failed"
            try:
                _inbox(db, user.id, f"Today's AI Plan — {target_day} ({sms_note})", auto_msg, channel="auto")
            except Exception as e:
                print(f"inbox write skipped: {e}")
                
    except Exception as e:
        print(f"auto-delivery skipped: {e}")

    return plan

@app.get("/users/{user_id}/history")
def get_history(user_id: int, date: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.DailyWorkout).filter(models.DailyWorkout.user_id == user_id)
    if date:
        import datetime
        start = datetime.datetime.strptime(date, "%Y-%m-%d")
        end = start + datetime.timedelta(days=1)
        query = query.filter(models.DailyWorkout.date >= start, models.DailyWorkout.date < end)
    return query.all()

@app.get("/users/")
def list_users(db: Session = Depends(get_db)):
    users = db.query(models.User).order_by(models.User.id.desc()).limit(200).all()
    return [
        {"id": u.id, "name": u.name, "email": u.email,
         "phone_number": u.phone_number, "goal": u.goal,
         "notification_time": u.notification_time}
        for u in users
    ]


def _format_plan_message(user, plan: dict) -> str:
    import datetime as _dt
    w = plan.get("workout_plan", {}) or {}
    d = plan.get("diet_chart", {}) or {}
    hour = _dt.datetime.now().hour
    greeting = "Good morning" if hour < 12 else ("Good afternoon" if hour < 17 else "Good evening")
    lines = [f"{greeting} {user.name}! Your IronForge AI plan for {w.get('day', 'today')}:"]
    lines.append(f"\nWorkout — {w.get('focus', 'Training')}"
                 + (f" (~{w.get('calories_burned')} kcal burn)" if w.get("calories_burned") is not None else "") + ":")
    for ex in (w.get("exercises") or [])[:8]:
        lines.append(f"- {ex.get('name')}: {ex.get('sets')}x{ex.get('reps')}")
    if not (w.get("exercises") or []):
        lines.append("- Rest / Recovery day")
    lines.append(f"\nDiet — {d.get('daily_calories', d.get('calories', ''))} kcal"
                 + (f" ({d.get('cuisine', '')})" if d.get("cuisine") else "") + ":")
    for m in (d.get("meals") or [])[:5]:
        m_name = m.get('name') or m.get('time') or 'Meal'
        lines.append(f"- {m_name}: {m.get('meal', '')}")
    if not d.get("meals"):
        for k in ["breakfast", "lunch", "dinner", "snack"]:
            if k in d:
                lines.append(f"- {k.capitalize()}: {d[k]}")
    lines.append("\nLog tonight's session in the app. Crush it!")
    return "\n".join(lines)


class NotifyIn(BaseModel):
    user_id: int
    channels: List[str] = ["sms", "email"]  # any of sms / email
    subject: Optional[str] = "Your IronForge AI Plan"
    message: Optional[str] = None  # if empty → auto-built from latest plan
    use_latest_plan: Optional[bool] = True


@app.post("/notify/")
def notify_user(payload: NotifyIn, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    channels = [c.lower() for c in (payload.channels or [])]
    message = (payload.message or "").strip()
    if not message and payload.use_latest_plan:
        latest = db.query(models.DailyWorkout).filter(
            models.DailyWorkout.user_id == user.id).order_by(
            models.DailyWorkout.id.desc()).first()
        if latest:
            message = _format_plan_message(user, {
                "workout_plan": latest.workout_data or {},
                "diet_chart": latest.diet_data or {},
            })
    if not message:
        raise HTTPException(status_code=400, detail="Nothing to send — provide a message or generate a plan first.")

    subject = payload.subject or "Your IronForge AI Plan"
    result = {}
    sent_successfully = False
    
    if "sms" in channels:
        if not user.phone_number:
            result["sms"] = {"status": "skipped", "detail": "User has no phone number"}
        else:
            import sms_service
            try:
                sms_service.send_sms(user.phone_number, message)
                result["sms"] = {"status": "sent", "to": user.phone_number}
                sent_successfully = True
            except Exception as e:
                result["sms"] = {"status": "failed", "detail": str(e)}
                
    if "email" in channels:
        if not user.email:
            result["email"] = {"status": "skipped", "detail": "User has no email"}
        else:
            import email_service
            try:
                html_body = "<pre style='font-family:sans-serif;white-space:pre-wrap'>" + message.replace("&", "&amp;").replace("<", "&lt;") + "</pre>"
                result["email"] = {**email_service.send_email(user.email, subject, html_body, html=True), "to": user.email}
                sent_successfully = True
            except Exception as e:
                result["email"] = {"status": "failed", "detail": str(e)}
                
    if not result:
        raise HTTPException(status_code=400, detail="Choose at least one channel: sms / email")
        
    # Only land in the zero-key inbox if at least one channel was sent successfully,
    # or if we were skipping because no contact info was available (fallback to inbox).
    # If the user specifically wanted sms but it failed, don't show it in the inbox.
    should_inbox = sent_successfully or all(r.get("status") == "skipped" for r in result.values())
    
    if should_inbox:
        try:
            _inbox(db, user.id, subject, message, channel="manual")
        except Exception as e:
            print(f"inbox write skipped: {e}")
            
    return {"user": user.name, "channels": result}

class WorkoutPlanIn(BaseModel):
    splitType: Optional[str] = "custom"
    splitLabel: Optional[str] = "Custom"
    mode: Optional[str] = "custom"
    daysPerWeek: Optional[int] = 0
    schedule: Optional[dict] = {}

@app.post("/workout_plans/")
def save_workout_plan(user_id: Optional[int] = None, plan: WorkoutPlanIn = None, db: Session = Depends(get_db)):
    # body may be the plan itself when user_id passed as query param
    data = plan.dict() if plan else {}
    row = models.WorkoutPlan(
        user_id=user_id,
        split_type=data.get("splitType", "custom"),
        split_label=data.get("splitLabel", "Custom"),
        mode=data.get("mode", "custom"),
        days_per_week=data.get("daysPerWeek", 0),
        schedule=data.get("schedule", {}),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

@app.get("/users/{user_id}/workout_plans")
def get_workout_plans(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.WorkoutPlan).filter(models.WorkoutPlan.user_id == user_id).order_by(models.WorkoutPlan.created_at.desc()).all()


# ── Zero-key inbox: automatic, no Twilio/SMTP needed ──
@app.get("/users/{user_id}/notifications")
def get_notifications(user_id: int, limit: int = 20, db: Session = Depends(get_db)):
    rows = db.query(models.Notification).filter(
        models.Notification.user_id == user_id).order_by(
        models.Notification.id.desc()).limit(limit).all()
    unread = db.query(models.Notification).filter(
        models.Notification.user_id == user_id,
        models.Notification.is_read == 0).count()
    return {"unread": unread, "items": [
        {"id": r.id, "title": r.title, "body": r.body, "channel": r.channel,
         "is_read": bool(r.is_read), "created_at": str(r.created_at)} for r in rows]}

@app.get("/clear_test_data")
def clear_test_data(db: Session = Depends(get_db)):
    """Wipes all test data except the User profiles."""
    try:
        db.query(models.DailyWorkout).delete()
        db.query(models.Notification).delete()
        db.query(models.WorkoutPlan).delete()
        db.commit()
        return {"status": "success", "message": "All test workout data, notifications, and plans have been deleted. Your user login is safe!"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}


@app.post("/notifications/{notif_id}/read")
def mark_notification_read(notif_id: int, db: Session = Depends(get_db)):
    row = db.query(models.Notification).filter(models.Notification.id == notif_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    row.is_read = 1
    db.commit()
    return {"status": "ok"}


@app.post("/users/{user_id}/notifications/read-all")
def mark_all_read(user_id: int, db: Session = Depends(get_db)):
    db.query(models.Notification).filter(
        models.Notification.user_id == user_id,
        models.Notification.is_read == 0).update({"is_read": 1})
    db.commit()
    return {"status": "ok"}


@app.delete("/notifications/{notif_id}")
def delete_notification(notif_id: int, db: Session = Depends(get_db)):
    row = db.query(models.Notification).filter(models.Notification.id == notif_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(row)
    db.commit()
    return {"status": "ok"}


class VisionRequest(BaseModel):
    image_base64: str
    mode: Optional[str] = "food"

@app.post("/analyze_vision/")
def analyze_vision_image(req: VisionRequest):
    return ai_service.analyze_vision_image(req.image_base64, req.mode)

@app.post("/analyze_food_image/")
def analyze_food_image(req: VisionRequest):
    return ai_service.analyze_vision_image(req.image_base64, "food")


def _inbox(db, user_id: int, title: str, body: str, channel: str = "auto"):
    db.add(models.Notification(user_id=user_id, title=title, body=body, channel=channel))
    db.commit()


# ── Discomfort & Injury Recovery Endpoints ──
class DiscomfortLogCreate(BaseModel):
    user_id: int
    exercise_name: str
    feeling_description: str
    severity: Optional[str] = "Moderate"
    timing: Optional[str] = "During exercise"

@app.post("/log_discomfort/")
def log_discomfort(payload: DiscomfortLogCreate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Analyze with AI Doctor & Trainer engine
    recommendation = ai_service.analyze_discomfort(
        user, 
        payload.exercise_name, 
        payload.feeling_description, 
        payload.severity, 
        payload.timing
    )
    
    log_row = models.DiscomfortLog(
        user_id=user.id,
        exercise_name=payload.exercise_name,
        feeling_description=payload.feeling_description,
        severity=payload.severity,
        timing=payload.timing,
        ai_recommendation=recommendation,
        status="active"
    )
    db.add(log_row)
    db.commit()
    db.refresh(log_row)
    
    # Auto inbox advisory notification
    try:
        cause = recommendation.get('probable_cause', '')[:120]
        doc_adv = recommendation.get('doctor_advice', '')[:120]
        trn_adv = recommendation.get('trainer_advice', '')[:120]
        body = f"AI Health Advisory — {payload.exercise_name} ({payload.severity} Discomfort):\n\n" \
               f"🩺 Probable Cause: {cause}...\n\n" \
               f"💊 Doctor Advice: {doc_adv}...\n\n" \
               f"🏋️‍♂️ Trainer Form Cue: {trn_adv}...\n\n" \
               f"⚡ Tomorrow's workout plan will automatically adapt to protect this area."
        _inbox(db, user.id, f"🚨 AI Medical Advisory: {payload.exercise_name}", body, channel="health")
    except Exception as e:
        print(f"Failed to write discomfort notification: {e}")
        
    return log_row

@app.get("/users/{user_id}/discomfort_logs")
def get_discomfort_logs(user_id: int, status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.DiscomfortLog).filter(models.DiscomfortLog.user_id == user_id)
    if status:
        query = query.filter(models.DiscomfortLog.status == status)
    return query.order_by(models.DiscomfortLog.created_at.desc()).all()

@app.delete("/discomfort_logs/{log_id}")
def delete_discomfort_log(log_id: int, db: Session = Depends(get_db)):
    row = db.query(models.DiscomfortLog).filter(models.DiscomfortLog.id == log_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Discomfort log not found")
    db.delete(row)
    db.commit()
    return {"status": "ok"}


class AudioPayload(BaseModel):
    audio_base64: str

@app.post("/transcribe_audio_base64/")
def transcribe_audio_base64(payload: AudioPayload):
    import base64
    try:
        audio_bytes = base64.b64decode(payload.audio_base64)
        result = ai_service.transcribe_audio(audio_bytes, "audio.webm")
        return result
    except Exception as e:
        print(f"Error in transcribe_audio_base64: {e}")
        return {"error": str(e)}


