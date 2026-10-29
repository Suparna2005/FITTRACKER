# 🌐 Outward-Facing Production Server Deployment Guide

## 📋 Server Specification
- **Host IP:** `187.127.178.161`
- **SSH Login:** `ssh airesearcher@187.127.178.161`
- **Assigned Path:** `/home/airesearcher/projects/Fitness_Tracker`
- **Assigned Port Range:** `3010` - `3014`
- **Public Open Port (UFW):** `3010/tcp` (Frontend + API Gateway)
- **Direct Backend Port:** `3011` (Internal / Reverse Proxied)

---

## 🚀 Step-by-Step Deployment Commands

### Step 1: Connect via SSH
Open PowerShell or your terminal and run:
```bash
ssh airesearcher@187.127.178.161
```
*(Enter your password when prompted)*

---

### Step 2: Go to the Project Directory & Pull the Latest Code
Run:
```bash
mkdir -p /home/airesearcher/projects/Fitness_Tracker
cd /home/airesearcher/projects/Fitness_Tracker

# If the folder is empty:
git clone https://github.com/AIRDC-BWU/FitnessTracker.git .

# If the folder already has files:
git fetch origin main
git reset --hard origin/main
```

---

### Step 3: Run the 1-Click Production Deployment Script
We have configured an automated script that handles `.env` creation, Docker orchestration, and port mapping:
```bash
chmod +x deploy_outward_server.sh
./deploy_outward_server.sh
```

---

### Step 4: Verify Running Docker Containers
Run:
```bash
docker ps
```
You should see:
1. `fitness_tracker_frontend` listening on `0.0.0.0:3010->80/tcp`
2. `fitness_tracker_backend` listening on `0.0.0.0:3011->8000/tcp`
3. `fitness_tracker_db` (PostgreSQL 15 on internal network)

---

### Step 5: Access the Application
- **Frontend App (Laptop & Mobile Phone):** [http://187.127.178.161:3010](http://187.127.178.161:3010)
- **Backend Swagger API Docs:** [http://187.127.178.161:3010/docs](http://187.127.178.161:3010/docs)
