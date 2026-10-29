#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " Starting Fitness Tracker Outward Server Deployment"
echo " Host: 187.127.178.161 | Assigned Port: 3010 (UFW Open)"
echo " Path: /home/airesearcher/projects/Fitness_Tracker"
echo "=========================================================="

PROJECT_DIR="/home/airesearcher/projects/Fitness_Tracker"
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# 1. Ensure backend/.env exists
mkdir -p backend
if [ ! -f "backend/.env" ]; then
    echo "Creating backend/.env configuration..."
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
    else
        cat << 'EOF' > backend/.env
DATABASE_URL=sqlite:///./fitness_tracker.db
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
GOOGLE_CLIENT_ID=125158095092-f3lq0t79bh98glf7hlq7td2scee0m34f.apps.googleusercontent.com
EOF
    fi
    echo "backend/.env prepared."
fi

# 2. Determine Docker Compose command
COMPOSE_CMD="docker compose"
if ! command -v docker compose &> /dev/null; then
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        echo "Docker not found. Falling back to native standalone runner..."
        chmod +x start_standalone.sh
        exec ./start_standalone.sh
    fi
fi

echo "Using compose command: $COMPOSE_CMD"

# 3. Pull latest changes if this is a git clone
if [ -d ".git" ]; then
    echo "Updating repository from origin main..."
    git fetch origin main || true
    git reset --hard origin/main || true
fi

# 4. Stop existing containers
echo "Stopping existing Fitness Tracker containers (if any)..."
$COMPOSE_CMD down || true

# 5. Build and launch with assigned ports (Frontend: 3010, Backend: 3011)
echo "Building and starting multi-container stack on ports 3010 & 3011..."
FRONTEND_PORT=3010 BACKEND_PORT=3011 $COMPOSE_CMD up -d --build

# 6. Verify health
echo "Waiting 5 seconds for services to initialize..."
sleep 5

echo "--- Running Container Status ---"
docker ps --filter "name=fitness_tracker"

echo "=========================================================="
echo "  FITNESS TRACKER DEPLOYED SUCCESSFULLY!"
echo "  Frontend Web UI  : http://187.127.178.161:3010"
echo "  Backend API Docs : http://187.127.178.161:3010/docs"
echo "  Direct API Port  : http://187.127.178.161:3011/docs"
echo "=========================================================="
