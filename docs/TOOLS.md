# Tools & Technology Stack

## 1. Frontend Client Stack
- **Framework:** React 18 (Single Page Application)
- **Build Engine & Bundler:** Vite (for fast Hot Module Replacement and production bundling)
- **Styling & Design System:** Tailwind CSS (utility-first, responsive layouts, glassmorphism, animated synthwave 3D laser meshes)
- **Edge Computer Vision:** 
  - Google MediaPipe Pose (`@0.5.1675469404`) & Hands (`@0.4.1675469240`) modules for 60-FPS zero-latency 3D skeletal landmark tracking in the browser.
  - MediaPipe Lite (`modelComplexity: 0`) optimized for mobile devices without WebGL context loss.
  - Synchronized single-pass canvas rendering pipeline (`latestHandLandmarksRef`) with cyan bones (`#38bdf8`) and yellow fingertips (`#facc15`).
- **Biomechanical Angle Engine:** Real-time trigonometric joint visualizer (`drawYellowAngleSignal`) rendering glowing `#facc15` joint rings, angular arcs, live degree badges, and a bottom HUD strip.
- **Dynamic Posture Evaluation Engine:** Real-time posture status classification (`🟢 RIGHT POSTURE` vs `🔴 WRONG POSTURE` vs `⚪ CALIBRATING FORM`) with glowing boundary alerts and audio coaching.
- **Acoustic Engine:** Web Audio API (real-time procedural audio synthesis for repetition and form feedback)
- **Voice AI Engine:** Web SpeechRecognition API (continuous hands-free voice command recognition)
- **Identity & Authentication:** Google Identity Services SDK (`accounts.id.initialize`, `renderButton`)
- **Data Analytics & Charts:** Recharts (SVG-based reactive visualization for workout volume, intensity, and calorie balance)
- **Icons:** Lucide React

---

## 2. Backend API Stack
- **Framework:** FastAPI (Python 3.10+)
- **ASGI Web Server:** Uvicorn (asynchronous event loop server)
- **ORM & Data Mapping:** SQLAlchemy (with connection pooling)
- **Data Validation & Serialization:** Pydantic
- **HTTP Client:** Requests (with custom user-agent headers to interface with external APIs)
- **Security & Authentication:** Google OAuth 2.0 cryptographic tokeninfo endpoint integration

---

## 3. Database Layer
- **Production Database:** PostgreSQL 15 Alpine (managed in the `ironforge_db` Docker container with persistent volumes)
- **Development Database:** SQLite (`fitness_tracker.db` via SQLAlchemy for zero-config local runs)
- **Driver:** `psycopg2-binary` (PostgreSQL adapter)

---

## 4. Cloud Multimodal AI & Vision Inference
- **Inference Provider:** Groq Cloud API
- **Vision Models:**
  - Primary: `llama-3.2-11b-vision`
  - Fallback: `qwen-2.5-vl`
- **Capabilities:**
  - Portion weight estimation in grams (`g`)
  - Itemized ingredient breakdown with individual weights and macros
  - Nutritional density and bio-diagnostics
  - Body composition & obesity estimation from physical silhouettes
  - Spatial gym equipment cataloging and split generation

---

## 5. Production Infrastructure & Security
- **Reverse Proxy & Web Server:** Nginx Alpine
- **Encryption:** OpenSSL 2048-bit TLS/SSL certificates (`/etc/nginx/certs/`)
- **Traffic Routing:** Automatic HTTP Port 80 to HTTPS Port 443 redirection; reverse proxy forwarding to FastAPI (`http://backend:8000`)
- **Cloudflare Tunnel (`cloudflared`):** Active zero-warning secure public HTTPS ingress for instant smartphone access (`https://camel-accessibility-philip-examine.trycloudflare.com`)
- **Containerization:** Docker & Docker Compose
- **Production Server:** Linux Host `30.31.32.136`
