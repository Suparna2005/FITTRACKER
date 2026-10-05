# Deployment Guide

## Local Development Setup
1. **Backend Gateway:**
   ```bash
   cd backend
   pip install fastapi uvicorn requests sqlalchemy python-dotenv
   uvicorn main:app --reload --port 8000
   ```
2. **Frontend Engine:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Environment Configuration
Ensure your `backend/.env` contains the required keys:
```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-20b
```

## Browser & Device Permissions
- **Camera Access (`getUserMedia`):** Required for Vision Hub modules (Form Coach, Food Logger, Physique Estimator, Equipment Scanner). Must be served over HTTPS in production.
- **Microphone Access (`SpeechRecognition`):** Required for hands-free voice command set initialization ("start set 1", "set 2", "go").

## Production Deployment Strategy

### Frontend (Vercel / Netlify)
- Change the `API_URL` in the frontend source code from `http://localhost:8000` to your production backend URL.
- Connect your GitHub repository to Vercel.
- Build Command: `npm run build`
- Output Directory: `dist`

### Backend (Render / Heroku)
- Create a `requirements.txt` file (`pip freeze > requirements.txt`).
- Add a `Procfile` if using Heroku: `web: uvicorn main:app --host 0.0.0.0 --port $PORT`
- Set your `GROQ_API_KEY` in the environment variables of your hosting provider.
- **Database Note:** SQLite (`fitness_tracker.db`) handles local development out of the box. For scaled production, migrate SQLAlchemy bindings to PostgreSQL to prevent lock contention.
