import os
import json
import re
import time
import urllib.request
import urllib.error
from dotenv import load_dotenv

load_dotenv()

def _repair_json(s: str) -> str:
    # Quote unquoted ranges like "reps": 6-8 -> "reps": "6-8", "reps": Failure -> "reps": "Failure"
    s = re.sub(r'("reps"\s*:\s*)([0-9]+\s*-\s*[0-9]+|Failure|failure)', r'\1"\2"', s)
    s = re.sub(r'("rest(_s)?"\s*:\s*)(\d+)(?=\s*[,}])', r'\1"\3s"', s)
    s = s.strip()
    if s.startswith("```"):
        s = s.strip("`")
        if s.startswith("json"):
            s = s[4:]
        s = s.strip()
    return s

def _deep_parse(obj):
    # If model double-encodes inner objects as strings, parse them
    if isinstance(obj, dict):
        return {k: _deep_parse(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_deep_parse(v) for v in obj]
    if isinstance(obj, str):
        t = obj.strip()
        if (t.startswith("{") and t.endswith("}")) or (t.startswith("[") and t.endswith("]")):
            try:
                return _deep_parse(json.loads(_repair_json(t)))
            except Exception:
                return obj
    return obj

def generate_plan(user_data, history_data, plan_type="1-day", workout_split=None, target_day=None, discomfort_logs=None):
    split_txt = ""
    try:
        if workout_split and workout_split.get("schedule"):
            sched = workout_split.get("schedule") or {}
            if target_day and sched.get(target_day):
                split_txt = f"\n    - Custom split '{workout_split.get('splitLabel', '')}': today ({target_day}) train {', '.join(sched.get(target_day) or [])}. Respect this split."
            else:
                split_txt = f"\n    - Custom split '{workout_split.get('splitLabel', '')}': {sched}. Respect it when picking body parts."
    except Exception:
        split_txt = ""
    day_txt = f"\n    - Plan day: {target_day}." if target_day else ""
    diet_txt = ""
    try:
        cui = getattr(user_data, "diet_cuisine", None)
        dty = getattr(user_data, "diet_type", None)
        if cui or dty:
            diet_txt = f"\n    - Diet: cuisine '{cui or 'Generic Indian'}', habit '{dty or 'No Preference'}'. Write all meals in that cuisine."
    except Exception:
        diet_txt = ""

    discomfort_txt = ""
    if discomfort_logs and len(discomfort_logs) > 0:
        disc_lines = []
        for d in discomfort_logs:
            ex = getattr(d, 'exercise_name', d.get('exercise_name') if isinstance(d, dict) else '')
            feel = getattr(d, 'feeling_description', d.get('feeling_description') if isinstance(d, dict) else '')
            sev = getattr(d, 'severity', d.get('severity') if isinstance(d, dict) else '')
            rec = getattr(d, 'ai_recommendation', d.get('ai_recommendation') if isinstance(d, dict) else {}) or {}
            subs = rec.get('safe_substitutions', []) if isinstance(rec, dict) else []
            sub_str = ", ".join(subs) if subs else "safer alternative exercises"
            disc_lines.append(f"- Reported Pain/Discomfort during '{ex}': '{feel}' (Severity: {sev}). Doctor/Trainer Rec: Avoid aggravating '{ex}'. Use substitutes: {sub_str}.")
        
        discomfort_txt = f"""
    CRITICAL HEALTH & SAFETY ADAPTATIONS (ACTIVE USER DISCOMFORTS LOGGED):
    {chr(10).join(disc_lines)}
    SAFETY MANDATE: You MUST modify today's workout plan to protect the athlete! Exclude or modify aggravating exercises, replace them with safer alternatives, or focus on non-injured body parts. Add a key "adapted_for_discomfort" inside "workout_plan" object with a short summary string describing how the plan was modified to keep the athlete safe.
    """

    prompt = f"""
    You are an expert AI personal trainer, doctor, and nutritionist. Return valid json only.
    
    User Profile & Vitals:
    - Goal: {user_data.goal} (Experience: {user_data.experience_level})
    - Target Timeframe to Achieve Goal: {user_data.target_timeframe}
    - Equipment Available: {user_data.equipment}
    - Age: {user_data.age} | Gender: {user_data.gender}
    - Initial Weight: {user_data.weight} | Initial Height: {user_data.height}
    - Body Fat/Structure: {getattr(user_data, 'body_fat', 'Unknown')}
    - Blood Pressure: {user_data.blood_pressure} | Blood Group: {user_data.blood_group}
    - Medical Conditions / Injuries: {user_data.medical_conditions}{split_txt}{day_txt}{diet_txt}{discomfort_txt}
    
    History of last 7 days (Includes Daily Weight, Diet Followed, Supplements, and Workouts):
    {history_data}
    
    Based on their specific health vitals, injuries, goals, AND their strict target timeframe ({user_data.target_timeframe}), generate a {plan_type} plan.
    IMPORTANT: If they have a tight timeframe, significantly adjust the intensity of the workout and macro strictly to ensure they meet their goal within that time limit. Pick specific body parts and exact workouts.
    Return json object with exactly two root keys: "workout_plan" and "diet_chart".
    "workout_plan" must be an object (not a string) like {{"day": "{target_day or 'Monday'}", "focus": "...", "adapted_for_discomfort": "...", "exercises": [{{"name": "...", "sets": 4, "reps": "8-10", "rest": "90s"}}]}}.
    "diet_chart" must be an object like {{"daily_calories": 2000, "meals": [{{"name": "Breakfast", "meal": "..."}}, {{"name": "Lunch", "meal": "..."}}]}}. All reps/rest values must be quoted strings.
    """
    
    api_key = os.getenv("GROQ_API_KEY")
    model = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
    
    # Fallback mock data in case of errors
    def _get_mock(err):
        return {
            "API_ERROR": f"Groq API failed: {err} (Showing Mock Data)",
            "workout_plan": {
                "day": "Monday",
                "focus": "Upper Body Strength",
                "exercises": [
                    {"name": "Barbell Bench Press", "sets": 4, "reps": "8-10", "rest": "90s"},
                    {"name": "Incline Dumbbell Press", "sets": 3, "reps": "10-12", "rest": "60s"},
                    {"name": "Pull-ups", "sets": 3, "reps": "Failure", "rest": "60s"}
                ]
            },
            "diet_chart": {
                "daily_calories": 2800,
                "macros": {"protein": "160g", "carbs": "300g", "fats": "70g"},
                "meals": [
                    {"name": "Breakfast", "meal": "Oatmeal with whey protein and berries"},
                    {"name": "Lunch", "meal": "Chicken breast, brown rice, and broccoli"},
                    {"name": "Dinner", "meal": "Salmon, sweet potato, and asparagus"}
                ]
            }
        }

    if not api_key:
        return _get_mock("GROQ_API_KEY is missing from your backend/.env file!")

    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a fitness expert. Return valid json object only with keys 'workout_plan' (object) and 'diet_chart' (object). No markdown, no stringified nesting. All reps values must be json strings like \"8-10\"."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3
    }
    
    content = ""
    try:
        req = urllib.request.Request(
            url, 
            data=json.dumps(payload).encode('utf-8'), 
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}',
                'User-Agent': 'FitnessTracker/1.0'
            }
        )
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            content = result["choices"][0]["message"]["content"].strip()
            
            # Clean markdown formatting if model adds it
            if content.startswith("```"):
                content = content.strip("`")
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()
                
            try:
                parsed = json.loads(_repair_json(content))
            except json.JSONDecodeError:
                # Try to salvage Groq failed_generation style output
                parsed = json.loads(_repair_json(content), strict=False)
            return _deep_parse(parsed)
            
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        print(f"Groq API HTTP Error: HTTP {e.code}: {body[:2000]}")
        # Try to salvage failed_generation payload instead of mock
        try:
            err_json = json.loads(body)
            fg = err_json.get("error", {}).get("failed_generation", "")
            if fg:
                try:
                    salvaged = _deep_parse(json.loads(_repair_json(fg)))
                    if isinstance(salvaged, dict) and "workout_plan" in salvaged:
                        return salvaged
                except Exception as se:
                    print(f"Failed to salvage failed_generation: {se}")
        except Exception:
            pass
        return _get_mock(f"HTTP {e.code}: {body[:500]}")
        
    except json.JSONDecodeError as e:
        print(f"Failed to parse Groq JSON. Raw output: {content[:2000]}")
        return _get_mock(f"JSON Parsing Error: {str(e)}")
        
    except Exception as e:
        print(f"Error calling Groq: {e}")
        return _get_mock(str(e))

def _normalize_food_data(data: dict) -> dict:
    if not isinstance(data, dict):
        return data

    def _to_num(val, default=0.0):
        if val is None:
            return default
        if isinstance(val, (int, float)):
            return float(val)
        try:
            clean_str = re.sub(r"[^\d.]", "", str(val))
            return float(clean_str) if clean_str else default
        except Exception:
            return default

    food_name = (
        data.get("food_name") or
        data.get("dish_name") or
        data.get("name") or
        data.get("dish") or
        data.get("food") or
        "Scanned Meal"
    )

    raw_ingredients = data.get("ingredients") or []
    if isinstance(raw_ingredients, dict):
        raw_ingredients = [{"name": k, **(v if isinstance(v, dict) else {"calories": v})} for k, v in raw_ingredients.items()]
    elif isinstance(raw_ingredients, str):
        raw_ingredients = [{"name": raw_ingredients, "weight_g": 0, "calories": 0}]

    normalized_ingredients = []
    total_ing_weight = 0
    total_ing_cals = 0
    total_ing_p = 0.0
    total_ing_c = 0.0
    total_ing_f = 0.0
    total_ing_fiber = 0.0

    for idx, ing in enumerate(raw_ingredients):
        if isinstance(ing, str):
            ing = {"name": ing}
        elif not isinstance(ing, dict):
            continue

        name = (
            ing.get("name") or
            ing.get("ingredient") or
            ing.get("item") or
            ing.get("food_item") or
            ing.get("food") or
            ing.get("title") or
            f"Component #{idx + 1}"
        )

        weight_g = round(_to_num(ing.get("weight_g") or ing.get("weight") or ing.get("grams") or ing.get("portion_g") or ing.get("mass_g"), 0))
        calories = round(_to_num(ing.get("calories") or ing.get("estimated_calories") or ing.get("kcal") or ing.get("calorie") or ing.get("cals"), 0))
        protein_g = round(_to_num(ing.get("protein_g") or ing.get("protein") or ing.get("prot_g"), 0), 1)
        carbs_g = round(_to_num(ing.get("carbs_g") or ing.get("carbs") or ing.get("carb_g") or ing.get("carbohydrates"), 0), 1)
        fats_g = round(_to_num(ing.get("fats_g") or ing.get("fat_g") or ing.get("fats") or ing.get("fat"), 0), 1)
        fiber_g = round(_to_num(ing.get("fiber_g") or ing.get("fiber") or ing.get("dietary_fiber"), 0), 1)
        sugar_g = round(_to_num(ing.get("sugar_g") or ing.get("sugar") or ing.get("sugars"), 0), 1)

        if weight_g > 0:
            calories_per_g = round(calories / weight_g, 2)
            calories_per_100g = round((calories / weight_g) * 100, 1)
        else:
            calories_per_g = round(_to_num(ing.get("calories_per_g"), 0.0), 2)
            calories_per_100g = round(_to_num(ing.get("calories_per_100g"), 0.0), 1)

        total_ing_weight += weight_g
        total_ing_cals += calories
        total_ing_p += protein_g
        total_ing_c += carbs_g
        total_ing_f += fats_g
        total_ing_fiber += fiber_g

        vitamins = ing.get("vitamins") or []
        if isinstance(vitamins, str):
            vitamins = [vitamins]
        minerals = ing.get("minerals") or []
        if isinstance(minerals, str):
            minerals = [minerals]

        health_benefits = str(ing.get("health_benefits") or ing.get("benefits") or ing.get("benefit") or ing.get("notes") or "").strip()

        normalized_ingredients.append({
            "name": name,
            "weight_g": int(weight_g),
            "calories": int(calories),
            "calories_per_g": calories_per_g,
            "calories_per_100g": calories_per_100g,
            "protein_g": protein_g,
            "carbs_g": carbs_g,
            "fats_g": fats_g,
            "fiber_g": fiber_g,
            "sugar_g": sugar_g,
            "vitamins": vitamins,
            "minerals": minerals,
            "health_benefits": health_benefits
        })

    serving_weight_g = round(_to_num(data.get("serving_weight_g") or data.get("total_weight_g") or data.get("weight_g") or data.get("weight"), total_ing_weight))
    if serving_weight_g == 0 and total_ing_weight > 0:
        serving_weight_g = total_ing_weight

    estimated_calories = round(_to_num(data.get("estimated_calories") or data.get("calories") or data.get("total_calories") or data.get("kcal"), total_ing_cals))
    if estimated_calories == 0 and total_ing_cals > 0:
        estimated_calories = total_ing_cals

    protein_g = round(_to_num(data.get("protein_g") or data.get("protein"), total_ing_p), 1)
    carbs_g = round(_to_num(data.get("carbs_g") or data.get("carbs"), total_ing_c), 1)
    fats_g = round(_to_num(data.get("fats_g") or data.get("fats") or data.get("fat_g"), total_ing_f), 1)
    fiber_g = round(_to_num(data.get("fiber_g") or data.get("fiber"), total_ing_fiber), 1)
    sugar_g = round(_to_num(data.get("sugar_g") or data.get("sugar"), 0), 1)

    if serving_weight_g > 0:
        calories_per_g = round(estimated_calories / serving_weight_g, 2)
        calories_per_100g = round((estimated_calories / serving_weight_g) * 100, 1)
    else:
        calories_per_g = round(_to_num(data.get("calories_per_g"), 0.0), 2)
        calories_per_100g = round(_to_num(data.get("calories_per_100g"), 0.0), 1)

    vitamins = data.get("vitamins") or []
    if isinstance(vitamins, str):
        vitamins = [vitamins]
    minerals = data.get("minerals") or []
    if isinstance(minerals, str):
        minerals = [minerals]

    glycemic_index = str(data.get("glycemic_index") or "Low to Medium").strip()
    health_score = int(_to_num(data.get("health_score"), 90))
    confidence = str(data.get("confidence") or "High Vision Confidence - Complete Gram & Macro Breakdown").strip()
    scientific_notes = str(data.get("scientific_notes") or "").strip()

    return {
        "food_name": food_name,
        "serving_weight_g": int(serving_weight_g),
        "estimated_calories": int(estimated_calories),
        "calories_per_g": calories_per_g,
        "calories_per_100g": calories_per_100g,
        "protein_g": protein_g,
        "carbs_g": carbs_g,
        "fats_g": fats_g,
        "fiber_g": fiber_g,
        "sugar_g": sugar_g,
        "vitamins": vitamins,
        "minerals": minerals,
        "glycemic_index": glycemic_index,
        "health_score": health_score,
        "confidence": confidence,
        "scientific_notes": scientific_notes,
        "ingredients_detected_count": len(normalized_ingredients),
        "ingredients": normalized_ingredients
    }

def analyze_vision_image(base64_image: str, mode: str = "food"):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return {"error": "GROQ_API_KEY is missing"}

    prompts = {
        "food": (
            "Identify this food dish accurately (including global and Indian dishes like Biryani, Paneer Tikka, Dosa, Dal, Roti, etc.). "
            "Return ONLY a compact raw JSON object (no markdown, no backticks, no extra text): "
            "{\"food_name\": \"exact dish name\", \"serving_weight_g\": 0, \"estimated_calories\": 0, \"protein_g\": 0, \"carbs_g\": 0, \"fats_g\": 0, \"fiber_g\": 0, \"sugar_g\": 0, "
            "\"vitamins\": [\"Vit A\", \"Vit C\", \"Vit B12\"], \"minerals\": [\"Iron\", \"Calcium\", \"Zinc\"], \"glycemic_index\": \"Medium\", \"health_score\": 80, \"confidence\": \"96% Vision Match\", "
            "\"scientific_notes\": \"Nutrient-rich traditional recipe.\", "
            "\"ingredients\": [{\"name\": \"...\", \"weight_g\": 0, \"calories\": 0, \"protein_g\": 0, \"carbs_g\": 0, \"fats_g\": 0, \"fiber_g\": 0}]}"
        ),
        "equipment": "Analyze this image of a gym or workout area. Return a raw JSON object (no markdown, no backticks) with keys: 'detected_equipment' (array of strings, e.g. ['Dumbbells', 'Bench', 'Cable Machine']), 'environment_type' (string, e.g. 'Home Gym', 'Commercial Gym', 'Hotel Gym'), and 'suggested_workout_focus' (string).",
        "physique": "Describe the person in the image. Return a raw JSON object (no markdown) with keys: 'estimated_body_fat_percentage' (string, e.g. '22-25%'), 'obesity_count' (string, e.g. '22-25% (Optimal Healthy Range)' or '32% (Stage 1 Obesity)'), 'body_type_category' (string, choose one: Shredded, Athletic, Fit, Average, Heavy, Obese), and 'notable_features' (string).",
        "form": "Analyze the exercise form in this image. Identify the exercise. If they are holding a barbell or dumbbell, pay extremely close attention to their grip (horizontal/vertical, overhand/underhand) and flag any grip mistakes. If they are empty-handed, just critique their body posture. Return a raw JSON object (no markdown) with keys: 'detected_exercise' (string), 'form_score' (integer out of 100), 'critique' (string, focus on posture and grip), and 'correction_advice' (string)."
    }

    # Dynamically select active vision model
    active_vision_model = "qwen/qwen3.8-27b"
    try:
        m_req = urllib.request.Request(
            "https://api.groq.com/openai/v1/models", 
            headers={"Authorization": f"Bearer {api_key}", "User-Agent": "FitnessTracker/1.0"}
        )
        with urllib.request.urlopen(m_req) as m_res:
            m_data = json.loads(m_res.read().decode('utf-8'))
            models = [m["id"] for m in m_data.get("data", [])]
            vision_models = [m for m in models if "vision" in m.lower() or "qwen" in m.lower() or "vl" in m.lower()]
            if vision_models:
                active_vision_model = next((m for m in vision_models if "qwen" in m.lower()), vision_models[0])
    except Exception as e:
        print(f"Could not fetch models: {e}")

    url = "https://api.groq.com/openai/v1/chat/completions"
    token_limits = {"equipment": 350, "physique": 350, "form": 350, "food": 500}
    payload = {
        "model": active_vision_model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompts.get(mode, prompts["food"])},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                ]
            }
        ],
        "temperature": 0.1,
        "max_tokens": token_limits.get(mode, 500)
    }

    req_data = json.dumps(payload).encode('utf-8')
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}',
        'User-Agent': 'FitnessTracker/1.0'
    }

    err_msg = ""
    # Attempt up to 4 times with smart backoff on 429/503 rate limits
    for attempt in range(1, 5):
        try:
            req = urllib.request.Request(url, data=req_data, headers=headers)
            with urllib.request.urlopen(req, timeout=35) as response:
                result = json.loads(response.read().decode('utf-8'))
                content = result["choices"][0]["message"]["content"].strip()
                
                # Use robust repair logic
                parsed = None
                try:
                    parsed = _deep_parse(json.loads(_repair_json(content)))
                except Exception as pe:
                    print(f"Failed strict parsing, falling back to basic: {pe}")
                    cleaned = content
                    if cleaned.startswith("```"):
                        cleaned = cleaned.strip("`")
                        if cleaned.startswith("json"):
                            cleaned = cleaned[4:]
                        cleaned = cleaned.strip()
                    parsed = json.loads(cleaned)

                if isinstance(parsed, dict):
                    if mode == "food":
                        return _normalize_food_data(parsed)
                    return parsed

        except urllib.error.HTTPError as he:
            error_body = he.read().decode('utf-8', errors='replace')
            err_msg = f"HTTP {he.code}: {error_body}"
            print(f"Vision API Error (Attempt {attempt}): {err_msg}")
            if he.code in (429, 503) and attempt < 4:
                m = re.search(r"try again in ([0-9.]+)s", error_body)
                wait_sec = (float(m.group(1)) + 0.6) if m else (2.0 * attempt)
                print(f"Vision API rate limited/busy. Backing off {wait_sec:.1f}s before attempt #{attempt+1}...")
                time.sleep(wait_sec)
                continue
            break
        except Exception as e:
            err_msg = str(e)
            print(f"Vision API Error (Attempt {attempt}): {err_msg}")
            if attempt < 4:
                time.sleep(1.5 * attempt)
                continue
            break
        
    # Return actionable error instead of deceptive mock data
    return {
        "error": "AI Vision service is momentarily busy with high traffic. Please tap Scan or Upload again in a moment."
    }


def analyze_discomfort(user_data, exercise_name: str, feeling_description: str, severity: str = "Moderate", timing: str = "During exercise"):
    """
    Analyzes workout pain/discomfort from both a Medical Doctor and Physical Trainer perspective.
    Returns JSON object with:
    - probable_cause (string)
    - doctor_advice (string)
    - trainer_advice (string)
    - safe_substitutions (list of strings)
    - next_day_plan_adjustment (string)
    """
    api_key = os.getenv("GROQ_API_KEY")
    model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    
    # Check for Emergency Red Flags (e.g. Chest Pain, Dizziness, Shortness of Breath)
    lower_desc = (feeling_description or "").lower()
    if any(k in lower_desc for k in ["chest pain", "heart", "dizziness", "shortness of breath", "blackout", "numbness", "passing out"]):
        return {
            "probable_cause": f"🚨 EMERGENCY MEDICAL RED FLAG: Chest pain or cardiovascular distress reported during {exercise_name} ('{feeling_description}'). This is NOT a routine muscle soreness issue and requires immediate medical evaluation.",
            "doctor_advice": f"🚨 STOP ALL EXERCISE IMMEDIATELY! Sit or lie down in a cool, ventilated area. If chest tightness, pressure, radiating arm/jaw pain, or shortness of breath persists for more than a few minutes, CALL EMERGENCY SERVICES (911/112) OR GO TO THE NEAREST EMERGENCY ROOM IMMEDIATELY. Do not attempt further lifting or physical exertion.",
            "trainer_advice": f"All weight training sessions for {exercise_name} and other lifts are SUSPENDED IMMEDIATELY. Prioritize a complete medical evaluation by a licensed physician before returning to the gym.",
            "safe_substitutions": ["Complete Rest & Hydration", "Physician Medical Clearance", "Gentle Controlled Walking (Post-Clearance Only)"],
            "next_day_plan_adjustment": "Workout plans are automatically PAUSED until medical clearance is completed."
        }

    prompt = f"""
    You are an expert Sports Medicine Physician (Doctor) and Biomechanics Strength Coach (Trainer).
    An athlete reported a physical problem / pain / discomfort while exercising:
    
    Athlete Profile:
    - Age: {getattr(user_data, 'age', 'Unknown')} | Gender: {getattr(user_data, 'gender', 'Unknown')}
    - Goal: {getattr(user_data, 'goal', 'General Fitness')} | Experience: {getattr(user_data, 'experience_level', 'Intermediate')}
    - Known Medical Conditions: {getattr(user_data, 'medical_conditions', 'None')}
    
    Discomfort Report:
    - Exercise Performed: {exercise_name}
    - Sensation / Problem Description: {feeling_description}
    - Pain/Severity Level: {severity}
    - Timing: {timing}
    
    Provide a dual Medical Doctor & Physical Trainer assessment. Return ONLY a valid raw JSON object (no markdown, no string backticks) with keys:
    1. "probable_cause": Clear explanation of why this pain/discomfort is occurring (biomechanical strain, form collapse, tendon stress, joint friction, etc.).
    2. "doctor_advice": Medical treatment & safety guidance (e.g. R.I.C.E. protocol, ice/heat therapy, rest duration, hydration, and RED FLAG warning signs when to seek immediate emergency/doctor care).
    3. "trainer_advice": Practical gym form corrections and cues (e.g., stance width, elbow angle, grip width, eccentric tempo, load drop).
    4. "safe_substitutions": Array of 3-4 safe alternative exercises that target similar muscles without stressing the affected joint/area.
    5. "next_day_plan_adjustment": Clear statement of how tomorrow's workout plan will be adapted to allow recovery while keeping progress.
    """
    
    mock_response = {
        "probable_cause": f"Biomechanical strain or acute joint friction during {exercise_name} ('{feeling_description}'). Likely due to form collapse, excessive load, or inadequate warm-up.",
        "doctor_advice": f"Follow the R.I.C.E protocol (Rest, Ice for 15-20 min, Compression, Elevation). Avoid heavy loading on this area for 24-48 hours. Seek medical attention if pain worsens or swelling develops.",
        "trainer_advice": f"For {exercise_name}, drop working weight by 25-30%. Focus on strict spinal alignment, engage core stability before initiating reps, and control the 3-second eccentric phase.",
        "safe_substitutions": [f"Goblet / Neutral-grip alternative to {exercise_name}", "Dumbbell Supported Movement", "Bodyweight Tempo Reps"],
        "next_day_plan_adjustment": f"Tomorrow's AI plan will automatically avoid direct heavy strain on {exercise_name}, substitute safer movements, and prioritize non-injured body parts."
    }

    if not api_key:
        return mock_response
        
    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a dual Sports Medicine Doctor and Master Trainer. Return valid raw JSON object only. No markdown."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3
    }
    
    try:
        req = urllib.request.Request(
            url, 
            data=json.dumps(payload).encode('utf-8'), 
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}',
                'User-Agent': 'FitnessTracker/1.0'
            }
        )
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            content = result["choices"][0]["message"]["content"].strip()
            if content.startswith("```"):
                content = content.strip("`")
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()
            parsed = json.loads(_repair_json(content))
            return _deep_parse(parsed)
    except Exception as e:
        print(f"Error calling Groq for discomfort analysis: {e}")
        return mock_response


def transcribe_audio_groq(audio_bytes: bytes, filename: str = "audio.webm") -> dict:
    """Transcribes audio using Groq's high-speed Whisper AI (whisper-large-v3-turbo) and GROQ_API_KEY."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return {"error": "GROQ_API_KEY is missing from backend/.env file!"}

    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    
    body = bytearray()
    
    # Model: whisper-large-v3-turbo
    body.extend(f"--{boundary}\r\n".encode('utf-8'))
    body.extend(b'Content-Disposition: form-data; name="model"\r\n\r\n')
    body.extend(b'whisper-large-v3-turbo\r\n')
    
    # Fitness prompt guide for maximum accuracy on set numbers
    body.extend(f"--{boundary}\r\n".encode('utf-8'))
    body.extend(b'Content-Disposition: form-data; name="prompt"\r\n\r\n')
    body.extend(b'Fitness workout voice commands: start set 1, start set 2, set 3, set 4, set 5, go, begin, next set\r\n')
    
    # Language
    body.extend(f"--{boundary}\r\n".encode('utf-8'))
    body.extend(b'Content-Disposition: form-data; name="language"\r\n\r\n')
    body.extend(b'en\r\n')
    
    # File content
    body.extend(f"--{boundary}\r\n".encode('utf-8'))
    body.extend(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode('utf-8'))
    body.extend(b'Content-Type: audio/webm\r\n\r\n')
    body.extend(audio_bytes)
    body.extend(b'\r\n')
    
    # End boundary
    body.extend(f"--{boundary}--\r\n".encode('utf-8'))

    req = urllib.request.Request(
        url,
        data=bytes(body),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": f"multipart/form-data; boundary={boundary}"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        print("Groq Audio API HTTP Error:", err_body)
        return {"error": f"Groq Whisper API HTTP {e.code}: {err_body}"}
    except Exception as e:
        print("Groq Audio API Error:", e)
        return {"error": str(e)}


def transcribe_audio_deepgram(audio_bytes: bytes, mime_type: str = "audio/webm") -> dict:
    """Transcribes audio using Deepgram's Nova-3 AI model (model=nova-3) and DEEPGRAM_API_KEY."""
    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        return {"error": "DEEPGRAM_API_KEY is missing from backend/.env file!"}

    # Deepgram Nova-3 REST API endpoint
    url = "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&language=en"

    req = urllib.request.Request(
        url,
        data=audio_bytes,
        headers={
            "Authorization": f"Token {api_key.strip()}",
            "Content-Type": mime_type
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as resp:
            res_data = json.loads(resp.read().decode('utf-8'))
            transcript = ""
            try:
                transcript = res_data["results"]["channels"][0]["alternatives"][0]["transcript"]
            except Exception:
                transcript = ""
            return {"text": transcript, "model": "Deepgram Nova-3", "raw": res_data}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        print("Deepgram Nova-3 HTTP Error:", err_body)
        return {"error": f"Deepgram Nova-3 API HTTP {e.code}: {err_body}"}
    except Exception as e:
        print("Deepgram Nova-3 Error:", e)
        return {"error": str(e)}


def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> dict:
    """Smart Speech AI Router: Tries Deepgram Nova-3 first if DEEPGRAM_API_KEY exists, else falls back to Groq Whisper."""
    deepgram_key = os.getenv("DEEPGRAM_API_KEY")
    if deepgram_key and deepgram_key.strip():
        res = transcribe_audio_deepgram(audio_bytes)
        if "text" in res and res["text"]:
            return res
        elif "error" not in res:
            return res
            
    # Fallback to Groq Whisper AI (whisper-large-v3-turbo)
    return transcribe_audio_groq(audio_bytes, filename)




