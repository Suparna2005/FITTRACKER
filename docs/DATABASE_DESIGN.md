# Database Design & Schema

The application currently utilizes **SQLite** for lightweight, serverless data persistence, managed via FastAPI.

## Entity Relationship Model

### 1. Users Table
- `id` (UUID, Primary Key)
- `name` (String)
- `age` (Integer)
- `weight` (Float)
- `height` (Float)
- `goal` (String: e.g., 'Lose Weight', 'Build Muscle')
- `experience_level` (String)
- `notification_time` (String)

### 2. Workouts Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key -> Users.id)
- `date` (Date)
- `duration_mins` (Integer)
- `focus_muscle` (String)
- `total_volume_kg` (Float)

### 3. Exercises Table
- `id` (UUID, Primary Key)
- `workout_id` (UUID, Foreign Key -> Workouts.id)
- `exercise_name` (String)
- `sets` (Integer)
- `reps` (Integer)
- `form_score` (Float, 0-100 based on AI Form Coach)

### 4. Food Logs Table (Stored inside DailyWorkout.diet_data)
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key -> Users.id)
- `date` (Date)
- `food_name` (String)
- `serving_weight_g` (Integer - Total estimated portion weight in grams)
- `calories` (Integer)
- `protein_g` (Float)
- `carbs_g` (Float)
- `fats_g` (Float)
- `ingredients` (JSON Array - Itemized breakdown of ingredients with name, weight_g, calories, and macros)
- `scientific_notes` (Text - Nutritional density & bio-diagnostic assessment)
