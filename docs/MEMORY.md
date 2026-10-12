# Memory & State Management

## 1. Frontend Client State (React 18 & Browser Engine)

IronForge AI utilizes a carefully segregated state architecture to balance high-frequency, 60-FPS computer vision loops with responsive React UI rendering:

### 1.1 React Component State (`useState`)
Used exclusively for user interface toggles and asynchronous data displays to prevent unnecessary re-rendering during active video processing:
- `activeMode`: Current Vision Hub tool (`'form'`, `'food'`, `'physique'`, `'gym'`).
- `showCamera`: Controls full-screen camera viewport mounting.
- `selectedExercise`: User's manual selection from the exercise dropdown (or `'Auto-Detect'`).
- `detectedExerciseDisplay`: Live classification badge updated by the kinetic multi-frame classifier (`'Squat'`, `'Bicep Curl'`, `'Deadlift'`, `'Overhead Press'`, `'Lunges'`).
- `realtimeWarning`: Current visual prompt banner (e.g. `"READY: SQUAT DOWN WITH CONTROL"`, `"BAD FORM: KEEP CHEST UP!"`).
- `isVoiceActive`, `voiceTranscript`: Real-time speech recognition status and captured command text.
- `result`, `loading`, `imgPreview`: Multimodal Cloud AI inspection results and thumbnail previews.

### 1.2 Direct React References (`useRef`)
Critical for running zero-latency computer vision and biomechanics without triggering React component re-renders:
- `poseRef` & `handsRef`: Hold instantiated Google MediaPipe model pipelines.
- `streamRef`: Manages the active `MediaStream` hardware camera connection.
- `videoRef`, `canvasRef`, `canvasOverlayRef`: Direct DOM nodes for 60-FPS frame processing, video rendering, and skeletal overlay canvas painting.
- `liveTrackerRef`: The mutable biomechanical engine state:
  ```javascript
  {
    setCount: 1,
    repCount: 0,
    waitingForSignal: 1,
    isResting: false,
    restStartTime: 0,
    lastRepTime: Date.now(),
    lastCountedRepTimestamp: 0,
    repStage: 'IDLE',          // 'IDLE', 'READY', 'ECCENTRIC', 'INFLECTION', 'CONCENTRIC'
    repStartTime: 0,
    inflectionStartTime: 0,
    repFormValid: true,
    badFormReason: '',
    smoothedAngles: {},        // Exponential moving average angle buffer
    exerciseHistory: [],       // Rolling 15-frame classifier buffer
    activeExercise: 'Squat',
    consecutiveSignalFrames: 0,// Hand gesture debounce counter
    readyHoldFrames: 0         // Setup calibration lockout counter
  }
  ```
- `workoutStatsRef`: Maintains current set/rep count state for instant database synchronization upon completing or closing sets.

### 1.3 Browser Persistence (`localStorage`)
- `fitnessUserId`: Retains athlete authentication context across page refreshes and browser restarts.

---

## 2. Backend & Database Persistence (FastAPI & PostgreSQL)

The backend operates as an asynchronous, stateless service where each request provides complete context. Persistent state is maintained within PostgreSQL 15 (production) or SQLite (development):

- **User Accounts (`users`):** Stores identity credentials, Google OAuth profile identifiers (`sub`), physiological parameters, and dietary preferences.
- **Workout Logs (`daily_workouts.workout_data`):** Records exercise names, sets, reps, form scores, and critique notes.
- **Diet Logs (`daily_workouts.diet_data`):** Stores complete nutritional ledgers, including total portion mass in grams (`serving_weight_g`), calories, macronutrient splits, itemized ingredient breakdowns with individual weights, and bio-diagnostic summaries.
- **Discomfort Logs (`discomfort_logs`):** Retains athlete pain reports, severity ratings, and AI Doctor/Physical Trainer adaptation recommendations.
- **Training Splits (`workout_plans`):** Stores weekly muscle allocations and custom training schedules.
- **Notifications (`notifications`):** In-app notification center logs.
