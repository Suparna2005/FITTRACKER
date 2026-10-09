#!/bin/bash
set -e

echo "=========================================="
echo " Starting IronForge AI Deployment"
echo " Target IP: 30.31.32.136"
echo "=========================================="

# Update package lists
apt-get update -y

# Install Docker & Docker Compose
echo "Installing Docker and dependencies..."
apt-get install -y curl git docker.io docker-compose || apt-get install -y docker.io docker-compose-plugin || true

# If docker-compose is missing, download binary directly
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Installing Docker Compose standalone binary..."
    curl -SL https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-x86_64 -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Enable and start Docker service
systemctl enable --now docker || service docker start || true

# Determine compose command
COMPOSE_CMD="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker compose"
fi

# Stop existing containers if running
$COMPOSE_CMD down || true

# Build and start services in detached mode
echo "Building and launching containers..."
$COMPOSE_CMD up -d --build

echo "=========================================="
echo " IronForge AI successfully deployed!"
echo " Web UI: http://30.31.32.136"
echo " API Docs: http://30.31.32.136:8000/docs"
echo "=========================================="
