#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " Starting Fitness Tracker on Port 3010 (Direct Mode)"
echo " No Docker Required! Works with standard Python 3"
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. Setup virtualenv if not present
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv || virtualenv venv || sudo apt-get install -y python3-venv python3-pip
    python3 -m venv venv
fi

source venv/bin/activate

# 2. Install backend dependencies
echo "Installing/verifying backend dependencies..."
pip install --upgrade pip
pip install -r backend/requirements.txt

# 3. Create backend/.env if missing
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
fi

# 4. Launch FastAPI server on port 3010
echo "=========================================================="
echo "  FITNESS TRACKER LAUNCHED!"
echo "  Web UI & API : http://187.127.178.161:3010"
echo "  Swagger Docs : http://187.127.178.161:3010/docs"
echo "=========================================================="
cd backend
python3 -m uvicorn main:app --host 0.0.0.0 --port 3010

