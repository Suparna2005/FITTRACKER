# Tools & Technology Stack

## Frontend (Client)
- **Framework:** React 18
- **Build Tool:** Vite (for fast HMR and optimized builds)
- **Styling:** Tailwind CSS (utility-first, responsive design)
- **Charting:** Recharts (SVG-based data visualization)
- **Edge AI:** Google MediaPipe (Pose & Hands modules for 30+ FPS zero-latency tracking in the browser)

## Backend (Server)
- **Framework:** FastAPI (Python)
- **Server:** Uvicorn (ASGI server)
- **Database:** SQLite
- **Networking:** CORS Middleware (for cross-origin requests from Vite)

## External APIs & Cloud AI
- **LLM Provider:** Groq
- **Vision Models:** `llama-3.2-11b-vision` (Primary), `qwen-2.5-vl` (Fallback)
