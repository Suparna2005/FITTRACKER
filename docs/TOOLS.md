# Tools & Technology Stack

## Frontend (Client)
- **Framework:** React 18
- **Build Tool:** Vite (for fast HMR and optimized builds)
- **Styling:** Tailwind CSS (utility-first, responsive design, glassmorphism, animated 3D spatial mesh overlays)
- **Charting:** Recharts (SVG-based data visualization)
- **Edge AI:** Google MediaPipe (Pose & Hands modules for 30+ FPS zero-latency tracking in the browser)
- **Voice AI Engine:** Web SpeechRecognition API (continuous listening for hands-free workout set triggering)

## Backend (Server)
- **Framework:** FastAPI (Python)
- **Server:** Uvicorn (ASGI server)
- **ORM & Database:** SQLAlchemy + SQLite (`users`, `daily_workouts`, `workout_plans`, `discomfort_logs`, `notifications`)
- **Networking:** CORS Middleware & custom `User-Agent: FitnessTracker/1.0` headers to bypass bot blocks

## External APIs & Cloud AI
- **LLM Provider:** Groq API
- **Vision Models:** `llama-3.2-11b-vision` (Primary), `qwen-2.5-vl` (Fallback) for sub-second image reasoning, scientific portion gram estimation, itemized ingredient parsing, body fat estimation, and equipment detection.
