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
- `latestHandLandmarksRef`: Holds latest detected hand landmarks across asynchronous frames to enable atomic, single-pass rendering in `poseRef.onResults` without canvas wipes.
- `cameraFacing`: React state (`'user'` vs `'environment'`) managing front selfie vs rear wide camera selection.
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
    readyHoldFrames: 0,        // Setup calibration lockout counter
    postureStatus: 'RIGHT'     // 'RIGHT', 'WRONG', 'CALIBRATING'
  }
  ```
- `workoutStatsRef`: Maintains current set/rep count state for instant database synchronization upon completing or closing sets.

### 1.3 Dynamic Weight & Macronutrient Calibration Engine
In `VisionHub.jsx`, the user can calibrate portion weights, which dynamically recalculates nutritional macros using intrinsic caloric and macronutrient densities:
- `activeModeRef`: A persistent React ref holding the active Vision Hub mode (`'food'`, `'form'`, `'physique'`, `'equipment'`) ensuring asynchronous image uploads correctly route to the expected backend model.
- `handleTotalWeightChange(newTotalWeight)`: Scales all ingredients and dish macros proportionally:
  $$\text{Scale Ratio } R = \frac{\text{New Total Weight}}{\text{Old Total Weight}}$$
  $$\text{Ingredient Weight}_{\text{new}} = \text{Ingredient Weight}_{\text{old}} \times R$$
  $$\text{Ingredient Calories}_{\text{new}} = \text{Ingredient Weight}_{\text{new}} \times \text{calories\_per\_g}$$
  Intrinsic caloric density ($\text{kcal/g}$) and macronutrient ratios remain scale-invariant.
- `handleIngredientWeightChange(index, newWeightVal)`: Adjusts a single ingredient's weight while holding its intrinsic nutrient density constant:
  $$\text{Ingredient Calories} = \text{Weight}_g \times \text{calories\_per\_g}$$
  $$\text{Ingredient Protein} = \text{Weight}_g \times \left(\frac{\text{Protein}_g}{\text{Base Weight}_g}\right)$$
  Automatically re-aggregates total dish weight, total calories, macronutrients, and plate mass shares in real-time.
- `fileInputRef`: Manages hidden `<input type="file" />` element triggered by `handleUploadClick` or fallback triggers.

### 1.4 Browser & UI Preference State
- `fitnessUserId`: Retains athlete authentication context across page refreshes and browser restarts.
- `profileForm.email_notifications_enabled`: Controls real-time toggle state (`"true"` vs `"false"`). Synchronized optimistically on toggle click via `toggleEmailNotifications(overrideVal)` with automated toast feedback and database persistence.
- `inboxOpen`: Controls modal visibility for the in-app notification center, featuring a direct one-click toggle button for email delivery preferences.

### 1.5 Professional Design System & Iconography Standards
- **Brainware University Branding:** The application's top navigation and authentication hero components utilize the official high-resolution circular Brainware University seal, housed in a rounded circular container with subtle gold/white borders, seamlessly uniting academic research credibility with the high-tech IronForge athletic visual identity.
- **Vector Primitives Over Unicode Emojis:** All UI components adhere to a strict athletic SaaS aesthetic using sleek SVG stroke icons and styled semantic tags (`<span className="badge">`, `<div className="status-dot">`).
- **Clean Card Topography:** Cards in `WorkoutSplitBuilder.jsx` display clean typography and active selection borders (`✓ Selected`) without emoji icons.
- **Micro-Indicators:** Real-time state indicators (camera warnings, severity dots, rep form validation) use high-contrast color codes (`#C7F36B` Volt Lime, `#54D8CF` Electric Teal, `#EF4444` Crimson) rather than cartoon emojis.

---

## 2. Backend & Database Persistence (FastAPI & PostgreSQL)

The backend operates as an asynchronous, stateless service where each request provides complete context. Persistent state is maintained within PostgreSQL 15 (production) or SQLite (development):

- **User Accounts (`users`):** Stores identity credentials, Google OAuth profile identifiers (`sub`), hashed/custom passwords, physiological parameters, dietary preferences, and delivery options (`email_notifications_enabled`: `"true"` or `"false"`). Auto-migrated on startup via schema introspection. Supports password recovery and linking for OAuth-originated accounts.
- **Notification Preferences (`PUT /users/{user_id}/notification_preferences`):** Dedicated endpoint enabling athletes to toggle email dispatch without altering their personal profile.
- **Workout Logs (`daily_workouts.workout_data`):** Records exercise names, sets, reps, form scores, and critique notes.
- **Diet Logs (`daily_workouts.diet_data`):** Stores complete nutritional ledgers, including total portion mass in grams (`serving_weight_g`), calories, energy density metrics (`calories_per_g`, `calories_per_100g`), macronutrient splits (protein, carbs, fats, fiber, sugar), itemized ingredient breakdowns with individual weights and densities, and bio-diagnostic summaries.
- **Discomfort Logs (`discomfort_logs`):** Retains athlete pain reports, severity ratings, and AI Doctor/Physical Trainer adaptation recommendations.
- **Training Splits (`workout_plans`):** Stores weekly muscle allocations and custom training schedules.
- **Notifications (`notifications`):** In-app notification center logs. Every daily plan generated by the scheduler or on-demand trigger is saved here with `channel="app"`, guaranteeing access within the app even when emails are turned off.

