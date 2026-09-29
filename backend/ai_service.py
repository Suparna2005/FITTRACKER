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

def generate_plan(user_data, history_data, plan_type="1-day"):
    prompt = f"""
    You are an expert AI personal trainer, doctor, and nutritionist. Return valid json only.
    
    User Profile & Vitals:
    - Goal: {user_data.goal} (Experience: {user_data.experience_level})
    - Target Timeframe to Achieve Goal: {user_data.target_timeframe}
    - Equipment Available: {user_data.equipment}
    - Age: {user_data.age} | Gender: {user_data.gender}
    - Initial Weight: {user_data.weight} | Initial Height: {user_data.height}
    - Blood Pressure: {user_data.blood_pressure} | Blood Group: {user_data.blood_group}
    - Medical Conditions / Injuries: {user_data.medical_conditions}
    
    History of last 7 days (Includes Daily Weight, Diet Followed, Supplements, and Workouts):
    {history_data}
    
    Based on their specific health vitals, injuries, goals, AND their strict target timeframe ({user_data.target_timeframe}), generate a {plan_type} plan.
    IMPORTANT: If they have a tight timeframe, significantly adjust the intensity of the workout and macro strictly to ensure they meet their goal within that time limit. Pick specific body parts and exact workouts.
    Return json object with exactly two root keys: "workout_plan" and "diet_chart".
    "workout_plan" must be an object (not a string) like {{"day": "Monday", "focus": "...", "exercises": [{{"name": "...", "sets": 4, "reps": "8-10", "rest": "90s"}}]}}.
    "diet_chart" must be an object (not a string). All reps/rest values must be quoted strings.
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
                    {"time": "8:00 AM", "meal": "Oatmeal with whey protein and berries"},
                    {"time": "1:00 PM", "meal": "Chicken breast, brown rice, and broccoli"},
                    {"time": "7:00 PM", "meal": "Salmon, sweet potato, and asparagus"}
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
