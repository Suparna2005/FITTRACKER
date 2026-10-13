# IronForge AI: The Ultimate Vision-Powered Fitness Companion

[![Production Status](https://img.shields.io/badge/Production-Live%20HTTPS-brightgreen)](https://30.31.32.136)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite-61DAFB)](https://react.dev/)
[![MediaPipe](https://img.shields.io/badge/Edge%20AI-MediaPipe%20Pose%20%26%20Hands-FF6F00)](https://developers.google.com/mediapipe)
[![Docker](https://img.shields.io/badge/Deployment-Docker%20Compose-2496ED)](https://www.docker.com/)

---

## 🚀 Live Production Access
- **Production URL (Campus Network):** [https://30.31.32.136](https://30.31.32.136) (Secured with TLS/SSL Nginx reverse proxy; HTTP auto-redirects to HTTPS)
- **Public Mobile App URL (Any Phone / 4G / 5G):** [https://idaho-ion-congratulations-questions.trycloudflare.com](https://idaho-ion-congratulations-questions.trycloudflare.com)
- **Interactive API Documentation:** [https://30.31.32.136/docs](https://30.31.32.136/docs) (Swagger UI)

---

## 📌 Project Overview
**IronForge AI** is a state-of-the-art, proactive AI fitness tracking and coaching platform that unites edge computer vision and cloud multimodal Large Language Models (LLMs) to transform how athletes train, eat, and progress. 

Unlike traditional fitness apps that demand tedious manual logging, IronForge AI acts as an **autonomous, proactive gym companion**. It continuously tracks your form, verifies full range of motion, logs reps only when execution is biomechanically perfect, identifies and calculates nutrition down to the gram, and adapts workouts based on discomfort or available equipment.

### Core Architecture: Hybrid Edge/Cloud AI
1. **Edge AI (Zero Latency, Complete Privacy):** Real-time biomechanics—including 33-point 3D skeletal tracking, joint trigonometry, setup posture calibration, rep counting FSM, and gesture recognition—run directly in the browser via Google MediaPipe at 60 FPS without streaming video over the network.
2. **Cloud AI (Multimodal Reasoning):** Complex contextual tasks—such as estimating portion weight in grams, parsing itemized ingredient macros, silhouette body composition diagnostics, and spatial gym mesh analysis—are processed in sub-second inference via Groq Cloud Vision (`Llama 3.2 Vision` / `Qwen 2.5 VL`).

---

## ⚡ Core Features & Modules

### 1. 🤖 Precision AI Form Coach & Rep Counter
- **Setup Calibration Gate (`READY` Hold):** Prevents false reps from casual shifts, sitting down, typing, or finger twitches. Athletes must hold a verified, locked-out starting posture for $\ge 4$ consecutive frames (~150ms) to calibrate.
- **Dynamic Multi-Frame Exercise Classifier:** In **Auto-Detect** mode, MediaPipe votes over a 15-frame rolling window to identify active exercises (Squats, Bicep Curls, Deadlifts, Overhead Press, Lunges) with a live UI confidence badge.
- **Strict 4-Phase Rep FSM:** Reps require a full biomechanical cycle:
  $$\text{Setup / Lockout} \longrightarrow \text{Eccentric / Concentric} \longrightarrow \text{Peak Inflection Depth} \longrightarrow \text{Return to Lockout}$$
  Reversing early without reaching parallel/depth flags `⚠️ NO REP: INCOMPLETE DEPTH`.
- **Anti-Jitter & Form Disqualification:** 
  - Minimum rep duration threshold of $\ge 1.0\text{ s}$ ($1000\text{ ms}$) filters camera noise and rapid twitches.
  - Active posture monitoring disqualifies bad reps (e.g. rounded spine, flared elbows, collapsed chest, valgus knees) as `❌ NO REP` without incrementing the counter.
- **Acoustic Feedback:** Web Audio API triggers melodic harmonic chimes on perfect reps and warning tones on form violations.
- **Debounced Hand Gesture Controls:** Hold up fingers for $\ge 10$ steady frames (~350ms) to unlock sets hands-free (1 finger for Set 1, 2 for Set 2, etc.). Isolated from rep counts.

### 2. 📸 Scientific Auto-Food Logger (Grams, Calories/Gram & Density Breakdown)
- **Dual Ingestion (Live Camera & Photo Upload):** Athletes can snap live pictures via webcam or upload smartphone gallery photos directly via the `📁 UPLOAD PHOTO` button with automatic client-side resolution scaling.
- **Interactive Weight Customization & Dynamic Recalculation:** Athletes can edit the **Total Meal Weight** or any individual **Ingredient Weight** (in grams). The system instantly recomputes calories, protein, carbs, fats, fiber, and sugars based on intrinsic calories-per-gram density ratios.
- **Gram-Level Portion Weight & Calorie Density:** Estimates total mass in **grams (`g`)**, total calories (`kcal`), **calories per gram (`kcal/g`)**, and energy density per 100g (`kcal/100g`).
- **Itemized Ingredient Breakdown:** Identifies every component on the plate, detailing individual weight (`g`), calories, and energy density (`kcal/g` & `kcal/100g`).
- **Complete Macro & Micronutrient Profile:** Delivers granular breakdown of Protein, Carbohydrates, Fats, Dietary Fiber, and Sugars with mass-share proportion bars.
- **Nutritional Density & Bio-Diagnostics:** Generates glycemic index (GI) diagnostics, vitamin & mineral profiles, and clinical nutritional density notes saved directly to your daily diet ledger.
- **High-Resolution Payload Support:** Nginx configured with `client_max_body_size 50M` and extended proxy timeouts to handle high-resolution 4K smartphone food photos without 413 entity errors.

### 3. 🧬 Physique & Obesity Estimator
- Upload a photo or stand before the camera; AI estimates body fat percentage, muscularity index, and obesity classification by analyzing physical silhouettes.

### 4. 🏋️‍♂️ Spatial Equipment Scanner
- Point your camera around any gym or hotel fitness room. Spatial recognition catalogs available dumbbells, barbells, benches, and machines, generating a customized split tailored to the accessible equipment.

### 5. 🏥 AI Doctor & Physical Trainer Adaptation Hub
- Athletes can log pain or discomfort with timing and severity.
- Intelligent adaptation engine rewrites workout splits, substituting non-injurious alternatives for aggravating movements.

### 6. 🔐 Hardened Dual-Mode Authentication & Credential Management
- **One-Click Google OAuth 2.0:** Powered by Google Identity Services with client ID configuration loaded dynamically from backend environment.
- **Cryptographic Server-Side Verification:** Strict token validation on `POST /google_login/` against Google's tokeninfo API.
- **Native Email & Password Support:** Fast local sign-in and sign-up with unique email and phone number validation.
- **Seamless Password Linking:** Google OAuth accounts can set or update custom passwords during sign-up or login without getting locked out.
- **Self-Service Password Reset (`POST /reset_password/`):** Full recovery flow via "Forgot Password?" allowing users to reset their password with verified credentials.
- **Graceful Error Handling:** Replaces unhandled database integrity crashes with actionable error messages.

### 7. 📬 Flexible Daily Delivery & In-App Notification Center
- **Email Delivery On/Off Toggle:** Athletes can switch off recurring daily emails if they prefer viewing workouts and meal plans exclusively inside the app.
- **Always-Available In-App Feed:** Disabling email delivery never silences notifications; all AI-generated routines and daily splits are continuously deposited into the user's interactive notification inbox (accessible via the bell icon).
- **Dual-Control Convenience:** Toggle your preferences in Section IV of the Profile dashboard or via the 1-click quick-toggle button inside the Notification Inbox modal.

---


## 🏗️ Technical Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, Recharts |
| **Edge AI** | Google MediaPipe (Pose & Hands), Web Audio API, Web Speech API |
| **Backend API** | FastAPI (Python 3.10+), Uvicorn, SQLAlchemy, Pydantic |
| **Database** | PostgreSQL 15 (Production Docker) / SQLite (Development) |
| **Cloud AI** | Groq Multimodal Vision API (`llama-3.2-11b-vision`, `qwen-2.5-vl`) |
| **Web Server / Reverse Proxy**| Nginx with TLS/SSL encryption, HTTP-to-HTTPS redirect |
| **Containerization** | Docker, Docker Compose |

---

## 💻 Local Development Setup

### 1. Prerequisites
- Node.js 18+ & npm
- Python 3.10+
- Git

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt  # Or: pip install fastapi uvicorn requests sqlalchemy python-dotenv psycopg2-binary
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🐳 Docker Production Deployment

To run the complete production stack (PostgreSQL + FastAPI + Nginx HTTPS):

```bash
# Clone the repository
git clone https://github.com/Suparna2005/FITTRACKER.git
cd FITTRACKER

# Configure environment keys in backend/.env
# GROQ_API_KEY=your_key
# GOOGLE_CLIENT_ID=your_google_client_id

# Launch with Docker Compose
docker-compose up -d --build
```

Access the application at `https://localhost` or your server's IP address (`https://30.31.32.136`).
