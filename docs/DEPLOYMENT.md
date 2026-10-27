# Production & Local Deployment Guide

This guide provides comprehensive instructions for deploying IronForge AI in both local development environments and multi-container production environments (Docker + Nginx + PostgreSQL + HTTPS).

---

## 🌐 Production Server Information

- **Host IP:** `30.31.32.136`
- **Frontend URL (Local / Campus HTTPS):** [https://30.31.32.136](https://30.31.32.136)
- **Public Mobile App URL (Any Phone / Cloudflare Tunnel):** [https://camel-accessibility-philip-examine.trycloudflare.com](https://camel-accessibility-philip-examine.trycloudflare.com)
- **API Swagger Documentation:** [https://30.31.32.136/docs](https://30.31.32.136/docs)
- **Internal Backend Port:** `8000` (Reverse proxied via Nginx)
- **Database:** PostgreSQL 15 on port `5432`
- **Current Production Frontend Bundle:** `dist/assets/index-CfkJw-aZ.js`

---

## 🔐 Environment Configuration

Create a `backend/.env` file with the following variables:

```env
# Cloud Vision LLM Inference
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.2-11b-vision

# Google OAuth 2.0 Security
GOOGLE_CLIENT_ID=125158095092-f3lq0t79bh98glf7hlq7td2scee0m34f.apps.googleusercontent.com

# PostgreSQL Database (Production)
DATABASE_URL=postgresql://postgres:SuparnaPassword2026@postgres:5432/fitness_tracker

# Optional: Email Service Credentials (for automated reports)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SENDER_EMAIL=your_email@gmail.com
SENDER_PASSWORD=your_app_password
```

---

## 🐳 Docker Multi-Container Production Stack

IronForge AI is containerized into three primary services orchestrated via `docker-compose.yml`:

```mermaid
graph TD
    User([Client Web Browser]) -->|HTTPS :443| Nginx[ironforge_frontend / Nginx Proxy]
    User -.->|HTTP :80 Redirect| Nginx
    Nginx -->|Static Assets| SPA[Vite React Dist SPA]
    Nginx -->|Reverse Proxy /api, /docs, /auth| FastAPI[ironforge_backend :8000]
    FastAPI -->|PostgreSQL Connection| DB[(ironforge_db PostgreSQL 15)]
    FastAPI -->|HTTPS Inference| Groq[Groq Vision API]
```

### 1. `ironforge_db` (PostgreSQL 15 Alpine)
- Persistent volume: `pgdata:/var/lib/postgresql/data`
- Port: `5432:5432`

### 2. `ironforge_backend` (FastAPI / Python 3.10)
- Asynchronous ASGI server running on `uvicorn main:app --host 0.0.0.0 --port 8000`
- Exposes REST endpoints for vision analysis, user profiles, workouts, diets, and authentication.

### 3. `ironforge_frontend` (Nginx + React 18 SPA)
- Multi-stage Docker build:
  1. **Build Stage:** `node:20-alpine` runs `npm install && npm run build`
  2. **Serving Stage:** `nginx:alpine` copies `/dist` to `/usr/share/nginx/html`
- Automatically generates self-signed TLS/SSL certificate with OpenSSL for HTTPS termination:
  ```dockerfile
  RUN apk add --no-cache openssl && \
      mkdir -p /etc/nginx/certs && \
      openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
      -keyout /etc/nginx/certs/selfsigned.key \
      -out /etc/nginx/certs/selfsigned.crt \
      -subj "/C=US/ST=State/L=City/O=IronForgeAI/OU=IT/CN=30.31.32.136"
  ```
- Nginx configuration (`nginx.conf`) enforces:
  - Automatic HTTP port 80 to HTTPS port 443 redirection (`return 301 https://$host$request_uri;`)
  - TLSv1.2 and TLSv1.3 with secure ciphers
  - Reverse proxy routing for `/api/`, `/docs`, `/openapi.json`, `/auth/`, `/log_food/`, `/log_workout/`, etc. to `http://backend:8000`

---

## 🚀 Deploying to Production

### Method A: Fast SFTP Asset Sync (Zero Downtime)
For rapid frontend updates without rebuilding the Docker container:
```bash
# 1. Compile the production bundle
npm --prefix frontend run build

# 2. Upload compiled /dist directly into Nginx web root and reload Nginx
python scratch/deploy_dist_fast.py
```
This script uploads the production assets directly to `/opt/ironforge-ai/frontend/dist` on `30.31.32.136` via SFTP and copies them into the running `ironforge_frontend` container (`/usr/share/nginx/html`), immediately reloading Nginx in under 5 seconds.

### Method B: Complete Multi-Container Rebuild
For backend schema, dependency, or configuration changes:

1. **SSH into the Server:**
   ```bash
   ssh root@30.31.32.136
   ```

2. **Navigate to App Directory:**
   ```bash
   cd /opt/ironforge-ai
   ```

3. **Pull Latest Code:**
   ```bash
   git pull origin main
   ```

4. **Rebuild & Restart Containers:**
   ```bash
   # Rebuild frontend
   docker-compose build frontend
   docker rm -f ironforge_frontend
   docker-compose up -d --no-deps frontend

   # If backend changed:
   docker-compose build backend
   docker-compose up -d --no-deps backend
   ```

5. **Verify Running Containers:**
   ```bash
   docker ps
   curl -k -sI https://localhost
   ```

---

## 💻 Local Development Setup

### Backend Gateway
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend Engine
```bash
cd frontend
npm install
npm run dev
```

---

## 🔒 Browser & Device Hardware Permissions

- **Webcam Access (`navigator.mediaDevices.getUserMedia`):**
  - **Critical:** Modern web browsers (Chrome, Edge, Safari, Firefox) **only permit webcam access over secure contexts (`https://` or `http://localhost`)**.
  - Accessing `https://30.31.32.136` satisfies this requirement.
  - When accessing via IP address with self-signed SSL, click **Advanced $\to$ Proceed to 30.31.32.136 (unsafe)** on initial visit to trust the certificate and unlock camera capabilities.
- **Microphone Access (`SpeechRecognition`):**
  - Required for hands-free voice commands ("start set 1", "set 2", "go").
  - Must be granted upon browser prompt.
