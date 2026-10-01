import os
import json
import re
import urllib.request
import urllib.error
from dotenv import load_dotenv

load_dotenv()

def _repair_json(s: str) -> str:
    # Quote unquoted ranges like "reps": 6-8 -> "reps": "6-8", "reps": Failure -> "reps": "Failure"
    s = re.sub(r'("reps"\s*:\s*)([0-9]+\s*-\s*[0-9]+|Failure|failure)', r'\1"\2"', s)
    s = re.sub(r'("rest(_s)?"\s*:\s*)(\d+)(?=\s*[,}])', r'\1"\3s"', s)
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

def generate_plan(user_data, history_data, plan_type="1-day", workout_split=None, target_day=None):
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
    - Medical Conditions / Injuries: {user_data.medical_conditions}{split_txt}{day_txt}{diet_txt}
    
    History of last 7 days (Includes Daily Weight, Diet Followed, Supplements, and Workouts):
    {history_data}
    
    Based on their specific health vitals, injuries, goals, AND their strict target timeframe ({user_data.target_timeframe}), generate a {plan_type} plan.
    IMPORTANT: If they have a tight timeframe, significantly adjust the intensity of the workout and macro strictly to ensure they meet their goal within that time limit. Pick specific body parts and exact workouts.
    Return json object with exactly two root keys: "workout_plan" and "diet_chart".
    "workout_plan" must be an object (not a string) like {{"day": "{target_day or 'Monday'}", "focus": "...", "exercises": [{{"name": "...", "sets": 4, "reps": "8-10", "rest": "90s"}}]}}.
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

def analyze_vision_image(base64_image: str, mode: str = "food"):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return {"error": "GROQ_API_KEY is missing"}

    prompts = {
        "food": "Analyze this food image. Return a raw JSON object (no markdown, no backticks) with keys: 'food_name' (string), 'estimated_calories' (integer), 'protein_g' (integer), 'carbs_g' (integer), 'fats_g' (integer), and 'confidence' (string).",
        "equipment": "Analyze this image of a gym or workout area. Return a raw JSON object (no markdown, no backticks) with keys: 'detected_equipment' (array of strings, e.g. ['Dumbbells', 'Bench', 'Cable Machine']), 'environment_type' (string, e.g. 'Home Gym', 'Commercial Gym', 'Hotel Gym'), and 'suggested_workout_focus' (string).",
        "physique": "Describe the person in the image. Return a raw JSON object (no markdown) with keys: 'estimated_body_fat_percentage' (string, e.g. '12-15%'), 'body_type_category' (string, choose one: Shredded, Athletic, Fit, Average, Heavy, Obese), and 'notable_features' (string).",
        "form": "Analyze the exercise form in this image. Identify the exercise. If they are holding a barbell or dumbbell, pay extremely close attention to their grip (horizontal/vertical, overhand/underhand) and flag any grip mistakes. If they are empty-handed, just critique their body posture. Return a raw JSON object (no markdown) with keys: 'detected_exercise' (string), 'form_score' (integer out of 100), 'critique' (string, focus on posture and grip), and 'correction_advice' (string)."
    }
    # Dynamically find the active vision model
    active_vision_model = "llama-3.2-11b-vision" # Default to the current production model
    try:
        m_req = urllib.request.Request(
            "https://api.groq.com/openai/v1/models", 
            headers={"Authorization": f"Bearer {api_key}", "User-Agent": "FitnessTracker/1.0"}
        )
        with urllib.request.urlopen(m_req) as m_res:
            m_data = json.loads(m_res.read().decode('utf-8'))
            models = [m["id"] for m in m_data.get("data", [])]
            vision_models = [m for m in models if "vision" in m.lower() or "qwen" in m.lower()]
            if vision_models:
                # Prefer 11b if available, otherwise just grab the first one
                active_vision_model = next((m for m in vision_models if "11b" in m), vision_models[0])
    except Exception as e:
        print(f"Could not fetch models: {e}")

    url = "https://api.groq.com/openai/v1/chat/completions"
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
        "temperature": 0.2,
        "max_tokens": 1024
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
            
            # Use the robust repair logic
            try:
                parsed = _deep_parse(json.loads(_repair_json(content)))
                if isinstance(parsed, dict):
                    return parsed
            except Exception as pe:
                print(f"Failed strict parsing, falling back to basic: {pe}")
                if content.startswith("```"):
                    content = content.strip("`")
                    if content.startswith("json"):
                        content = content[4:]
                    content = content.strip()
                return json.loads(content)
            
    except urllib.error.HTTPError as he:
        error_body = he.read().decode('utf-8')
        err_msg = f"HTTP {he.code}: {error_body}"
        print(f"Vision API Error: {err_msg}")
    except Exception as e:
        err_msg = str(e)
        print(f"Vision API Error: {err_msg}")
        
    # Return fallback mock data based on mode
    if mode == "physique":
        return {
            "body_type_category": "Average",
            "estimated_body_fat_percentage": "22-25%",
            "notable_features": "Mock Data (API Error or Safety Refusal)"
        }
    elif mode == "equipment":
        return {
            "environment_type": "Home Workout Space",
            "detected_equipment": ["Dumbbells", "Yoga Mat"],
            "suggested_workout_focus": "Dumbbell HIIT (Mock Data)"
        }
    elif mode == "form":
        return {
            "detected_exercise": "API Error (Mock)",
            "form_score": 0,
            "critique": f"API FAILED: {err_msg}",
            "correction_advice": "The Vision model refused to process this image or crashed."
        }
    else:
        return {
            "food_name": "API Error (Mock)",
                "estimated_calories": 450,
                "protein_g": 42,
                "carbs_g": 45,
                "fats_g": 8,
                "confidence": "Mock Fallback (API Error)"
            }

