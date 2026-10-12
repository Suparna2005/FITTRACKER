# Product Requirements Document (PRD)

## Product Name
**IronForge AI — Next-Generation Vision-Powered Fitness & Nutrition Intelligence**

**Version:** 2.0 (Production Live)  
**Host URL:** [https://30.31.32.136](https://30.31.32.136)  
**API Documentation:** [https://30.31.32.136/docs](https://30.31.32.136/docs)  
**Status:** Completed & Deployed  

---

## 1. Product Vision & Objective
To deliver the world's most advanced, autonomous AI gym companion. IronForge AI bridges the gap between physical exercise and digital intelligence by combining **on-device edge computer vision** with **cloud multimodal Large Language Models**. The application eliminates manual logging by observing workouts in real-time, verifying full range of motion and strict form before repetitions count, estimating nutrition portion weights down to the gram, and dynamically adapting programs based on physical discomfort or equipment availability.

---

## 2. Target Audience
- **Strength & Physique Athletes:** Requiring precise repetition tracking, form integrity verification, and injury prevention.
- **Fitness Enthusiasts & Gymgoers:** Needing frictionless, hands-free workout logging while exercising with phones on benches or tripods.
- **Nutrition-Conscious Individuals:** Requiring rapid, scientific food analysis without manually searching databases for generic entries.
- **Travelers & Mobile Athletes:** Needing workout plans constructed around the exact equipment available in hotel or unfamiliar gyms.

---

## 3. Core Feature Specifications

### 3.1 AI Form Coach & Biomechanical Repetition Engine
- **Setup Calibration Gate (`READY` Hold):** 
  - Prevents false rep counting from camera noise, casual body shifts, sitting down, typing, or finger twitches.
  - Requires the user to hold a verified, locked-out starting posture for $\ge 4$ consecutive frames (~150ms) before movement can initiate.
- **Kinetic Multi-Frame Exercise Auto-Classifier:**
  - In **Auto-Detect** mode, MediaPipe evaluates kinetic limb patterns across a 15-frame rolling window.
  - Dynamically classifies active movements (Squats, Bicep Curls, Deadlifts, Overhead Press, Lunges) with a live UI confidence badge.
- **Strict 4-Phase Range of Motion (ROM) State Machine:**
  - Full movement cycle required: $\text{Setup} \to \text{Eccentric/Concentric} \to \text{Peak Inflection Depth} \to \text{Lockout}$.
  - Reversing direction before hitting parallel/depth triggers `⚠️ NO REP: INCOMPLETE DEPTH`.
- **Anti-Jitter & Form Disqualification:**
  - Total repetition duration must be $\ge 1.0\text{ s}$ ($1000\text{ ms}$) to disqualify rapid noise or twitches.
  - Real-time form monitoring invalidates reps on spinal rounding, flared elbows, collapsed chest, or valgus knees as `❌ NO REP` without incrementing the counter.
- **Acoustic Real-Time Feedback:** Web Audio API triggers melodic harmonic chimes (587Hz $\to$ 880Hz) on verified reps and warning tones on form violations.
- **Debounced Hand Gesture Controls:** Requires holding gestures steadily for $\ge 10$ consecutive frames (~350ms) to trigger set starts, fully isolated from repetition counters.
- **Voice AI Commands:** Browser `SpeechRecognition` triggers sets hands-free ("start set 1", "set 2", "go").

### 3.2 Scientific Vision Auto-Food Logger
- **Gram-Level Portion Weight Estimation:** Multimodal Vision LLMs estimate total dish weight in **grams (`g`)** and calories (`kcal`).
- **Itemized Ingredient Breakdown:** Identifies every component on the plate, detailing individual mass (`g`), calories, and macronutrient contributions (Protein, Carbs, Fats) with proportional mass-share bars.
- **Bio-Diagnostic Nutritional Density Analysis:** Provides glycemic index diagnostics, micronutrient estimates, and fiber profiles.
- **Database Persistence:** Scanned nutrition logs sync directly to `DailyWorkout.diet_data` in PostgreSQL.

### 3.3 Physique & Obesity Estimator
- Analyzes physical silhouettes to estimate body fat percentage ranges, muscularity index, and obesity classification stages.

### 3.4 Spatial Gym Equipment Scanner
- Scans room environments to catalog available dumbbells, barbells, benches, and cables, automatically constructing equipment-tailored training splits.

### 3.5 AI Doctor & Physical Trainer Adaptation Hub
- Captures athlete discomfort reports (exercise name, timing, severity).
- AI Doctor/Trainer engine rewrites training splits to substitute safe, non-injurious exercise alternatives.

### 3.6 Hardened Google OAuth 2.0 & Authentication
- Google Identity Services integration with one-click sign-in.
- Cryptographic backend verification of Google JWT credential tokens (`credential: str`) via Google's `oauth2.googleapis.com/tokeninfo`.
- Automated athlete account provisioning. Strict rejection of email spoofing attempts.

### 3.7 Production HTTPS & Docker Infrastructure
- Live on `https://30.31.32.136` with OpenSSL 2048-bit TLS/SSL certificates and automatic HTTP-to-HTTPS redirection.
- Multi-container Docker Compose stack (`ironforge_frontend`, `ironforge_backend`, `ironforge_db`).
