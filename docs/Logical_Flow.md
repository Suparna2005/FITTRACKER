# Logical Flows & State Machines

## 1. AI Form Coach - Biomechanical Repetition State Machine

The AI Form Coach operates on a strict multi-stage finite state machine (FSM) designed to prevent false rep counts caused by posture shifts, sitting down, typing, camera jitter, or finger movements.

```mermaid
stateDiagram-v2
    [*] --> IdleSetup: Start Camera Feed
    IdleSetup --> ReadyLockout: Starting Lockout Posture Held (>= 4 frames)
    IdleSetup --> IdleSetup: Posture Shift / Sitting / Relaxed (< 4 frames)

    ReadyLockout --> ActiveMovement: Angular Excursion Initiated (>= 40°)
    
    ActiveMovement --> PeakInflection: Reaches Depth / Parallel (Squat <= 100°, Curl <= 56°)
    ActiveMovement --> IncompleteDepth: Reverses Direction Early (> 155°)
    ActiveMovement --> BadFormViolation: Form Break (Spine Rounded, Elbows Flared, Chest Collapsed)
    
    PeakInflection --> ReturningToLockout: Trajectory Reverses Toward Start
    BadFormViolation --> ReturningToLockout: Movement Continues (Flagged repFormValid = false)
    
    IncompleteDepth --> IdleSetup: Reject as "NO REP: INCOMPLETE DEPTH"
    
    ReturningToLockout --> QualityEvaluation: Full Lockout Angle Reached
    
    state QualityEvaluation <<choice>>
    QualityEvaluation --> RepCounted: Duration >= 1.0s AND repFormValid == true
    QualityEvaluation --> NoRepRejected: Duration < 1.0s OR repFormValid == false
    
    RepCounted --> IdleSetup: Increment Rep + Harmonic Chime (587Hz -> 880Hz)
    NoRepRejected --> IdleSetup: No Rep Warning Tone (220Hz -> 140Hz)
    
    IdleSetup --> RestingGap: No Movement for 8 Seconds
    RestingGap --> WaitingForSignal: Target Set = Current Set + 1
    WaitingForSignal --> IdleSetup: Hand Signal Held (10 frames) OR Voice "Start Set"
```

---

### 1.1 Starting Posture Calibration Gate (`READY` Hold)
Before any repetition can begin:
1. MediaPipe Pose must detect all relevant landmarks with confidence score $> 0.60$.
2. The user must hold the **locked-out starting posture** for at least **4 consecutive frames (~150ms)**:
   - **Squats:** `kneeAngle > 160°` AND `torsoAngle >= 70°`.
   - **Bicep Curls:** `elbowAngle > 148°` AND `upperArmAngle <= 30°` (elbow pinned to ribs).
   - **Deadlifts:** `hipAngle > 165°` AND `spineAngle >= 145°`.
   - **Overhead Press:** `elbowAngle < 85°` with wrists at shoulder rack height AND `spineAngle >= 148°`.
   - **Lunges:** Both knees locked upright (`kneeAngle > 160°`).
3. If this condition is not met (e.g. the user is seated in a chair, typing, or moving around), the tracker remains in `IDLE` and **cannot initiate a repetition**.

---

### 1.2 Kinetic Multi-Frame Exercise Auto-Classifier
When in **Auto-Detect** mode:
1. MediaPipe analyzes active limb arrangement:
   - Upper body only in frame $\to$ checks for Overhead Press (wrists above head) or Bicep Curl (pinned elbows).
   - Full body in frame $\to$ checks for Lunges (asymmetrical knee height), Deadlifts (deep hip hinge with soft knees), or Squats (deep synchronous knee flexion).
2. Pushes classification candidate into a 15-frame rolling buffer.
3. When $\ge 6$ frames agree on an exercise, updates `activeExercise` and synchronizes the UI badge: `AI RECOGNIZING: [EXERCISE]`.

---

### 1.3 Debounced Hand Gesture Signal Flow
1. When between sets or in rest mode, the tracker enters `WaitingForSignal` state with `waitingForSignal = Math.min(setCount, 5)`.
2. MediaPipe Hands calculates distance from wrist (landmark 0) to fingertips (landmarks 8, 12, 16, 20) and pinky base to thumb (landmark 4) to count raised fingers.
3. If `detected_fingers === waitingForSignal` for **10 consecutive frames (~350ms)**, the set unlocks (`waitingForSignal = 0`) and transitions to `IDLE` setup.
4. Hand tracking is **completely isolated from repetition counting** and never increments reps.

---

## 2. Hardened Google OAuth 2.0 Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant GoogleAuth as Google Tokeninfo API
    participant DB as PostgreSQL Database
    
    User->>Frontend: Clicks "Sign in with Google"
    Frontend->>Frontend: Google Identity Services renders Google popup
    User->>Frontend: Authenticates with Google Account
    Frontend->>Frontend: Receives cryptographic Google JWT credential token
    Frontend->>Backend: POST /google_login/ { credential: "JWT_TOKEN" }
    Backend->>GoogleAuth: GET https://oauth2.googleapis.com/tokeninfo?id_token=JWT_TOKEN
    GoogleAuth-->>Backend: Token payload (email, name, sub, aud, email_verified)
    Backend->>Backend: Verifies aud matches GOOGLE_CLIENT_ID & email_verified == true
    Backend->>DB: Queries user by email
    alt User exists
        DB-->>Backend: Existing User Record
    else User does not exist
        Backend->>DB: Inserts new User with Google profile info
        DB-->>Backend: Newly Provisioned User Record
    end
    Backend-->>Frontend: HTTP 200 OK with User JSON profile
    Frontend->>Frontend: Stores user profile in state & localStorage
    Frontend->>User: Reroutes to authenticated Dashboard
```

---

## 3. Scientific Auto-Food Logger Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Groq_Vision as Groq Vision LLM
    participant DB as PostgreSQL Database
    
    User->>Frontend: Snaps photo of plate via camera / upload
    Frontend->>Frontend: Resizes & compresses image to Base64
    Frontend->>Backend: POST /analyze_vision/ (mode: 'food', image: Base64)
    Backend->>Groq_Vision: Prompt (Gram Weights, Ingredients & Macro breakdown) + Base64
    Groq_Vision-->>Backend: JSON (serving_weight_g, calories, macros, ingredients array, scientific_notes)
    Backend-->>Frontend: Parsed Scientific Nutrition JSON
    Frontend->>User: Displays Gram Weight Badge, Macro Cards, Ingredient Table & Bio Diagnostics
    User->>Frontend: Clicks "SAVE TO PROFILE"
    Frontend->>Backend: POST /log_food/ (user_id, food_name, calories, macros, serving_weight_g, ingredients)
    Backend->>DB: Persists meal into DailyWorkout.diet_data in PostgreSQL
    DB-->>Backend: Confirmation
    Backend-->>Frontend: HTTP 200 OK (Persisted)
```
