# Deployment Guide

## Local Development Setup
1. **Backend:**
   ```bash
   cd backend
   pip install fastapi uvicorn requests
   uvicorn main:app --reload --port 8000
   ```
2. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Production Deployment (Recommended Strategy)

### Frontend (Vercel / Netlify)
- Change the `API_URL` in the frontend source code from `http://localhost:8000` to your production backend URL.
- Connect your GitHub repository to Vercel.
- Build Command: `npm run build`
- Output Directory: `dist`

### Backend (Render / Heroku)
- Create a `requirements.txt` file (`pip freeze > requirements.txt`).
- Add a `Procfile` if using Heroku: `web: uvicorn main:app --host 0.0.0.0 --port $PORT`
- Set your `GROQ_API_KEY` in the environment variables of your hosting provider.
- **Note:** For production, it is highly recommended to migrate from SQLite to **PostgreSQL** to prevent database locks and data loss during ephemeral server restarts.
