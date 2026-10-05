# Memory & State Management

## Frontend (React)
1. **React State (`useState`):** Used for standard UI interactions (modal toggles, active tabs, form inputs, `imgPreview`, `result`).
2. **React Refs (`useRef`):** Critically used for high-frequency computer vision loops (MediaPipe) and real-time set tracking:
   - `poseRef` & `handsRef`: Hold MediaPipe model instances.
   - `videoRef` & `canvasRef`: Direct DOM refs for frame capturing and 3D laser mesh rendering.
   - `liveTrackerRef`: Tracks live set counts, rep states, rest timer gaps, and waiting signals without triggering React re-renders.
   - `workoutStatsRef`: Maintains current set/rep count state for instant database logging upon set completion.
3. **Local Storage:** `fitnessUserId` is stored in the browser's `localStorage` to persist user sessions without requiring a full JWT authentication flow.

## Backend (FastAPI & SQLite)
- **Stateless API Gateway:** Every request carries explicit payload data (Base64 image strings, user IDs, or workout vitals).
- **Persistent Database Schemas:** 
  - `DailyWorkout.diet_data`: Persists scientific vision meal logs containing `daily_calories`, `serving_weight_g`, `macros` (protein, carbs, fats), itemized `ingredients` array (with name, weight_g, calories, macros), and `scientific_notes`.
  - `DailyWorkout.workout_data`: Persists exercise volume, sets, reps, form scores, and critique notes.
  - `DiscomfortLog`: Logs active pain reports, severity, and AI Doctor/Trainer safety adaptations.
