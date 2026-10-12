# Tools & Technology Stack

## 1. Frontend Client Stack
- **Framework:** React 18 (Single Page Application)
- **Build Engine & Bundler:** Vite (for fast Hot Module Replacement and production bundling)
- **Styling & Design System:** Tailwind CSS (utility-first, responsive layouts, glassmorphism, animated synthwave 3D laser meshes)
- **Edge Computer Vision:** Google MediaPipe (Pose & Hands modules for 60-FPS zero-latency 3D skeletal landmark tracking in the browser)
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
- **Containerization:** Docker & Docker Compose
- **Production Server:** Linux Host `30.31.32.136`
