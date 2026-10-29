"""
IronForge AI - Fast Production Deployment Script
Deploys compiled frontend/dist and backend updates directly to server 30.31.32.136
"""

import os
import sys
import time
import paramiko
import urllib.request
import ssl

SERVER_IP = "30.31.32.136"
SERVER_USER = "root"
SERVER_PASS = "Brainware@2026"
REMOTE_ROOT = "/opt/ironforge-ai"
LOCAL_ROOT = os.path.dirname(os.path.abspath(__file__))

print("==================================================")
print(f"DEPLOYING TO PRODUCTION SERVER {SERVER_IP}")
print("==================================================")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(SERVER_IP, port=22, username=SERVER_USER, password=SERVER_PASS, timeout=15)
sftp = client.open_sftp()

def ensure_remote_dir(remote_dir):
    dirs_to_create = []
    current = remote_dir
    while current not in ('', '/'):
        try:
            sftp.stat(current)
            break
        except FileNotFoundError:
            dirs_to_create.append(current)
            current = os.path.dirname(current)
    for d in reversed(dirs_to_create):
        try:
            sftp.mkdir(d)
        except Exception:
            pass

def sftp_upload_dir(local_dir, remote_dir):
    ensure_remote_dir(remote_dir)
    for root, dirs, files in os.walk(local_dir):
        rel_path = os.path.relpath(root, local_dir)
        target_dir = os.path.normpath(os.path.join(remote_dir, rel_path)).replace('\\', '/')
        ensure_remote_dir(target_dir)
        for f in files:
            local_file = os.path.join(root, f)
            remote_file = (target_dir + '/' + f).replace('\\', '/')
            sftp.put(local_file, remote_file)

# 1. Upload frontend/dist
print("--- 1. Uploading Compiled Frontend Dist ---")
local_dist = os.path.join(LOCAL_ROOT, "frontend", "dist")
remote_dist = f"{REMOTE_ROOT}/frontend/dist"
sftp_upload_dir(local_dist, remote_dist)

# 2. Upload source files for reference
print("--- 2. Uploading Source Updates ---")
sftp.put(os.path.join(LOCAL_ROOT, "frontend", "src", "App.jsx"), f"{REMOTE_ROOT}/frontend/src/App.jsx")
sftp.put(os.path.join(LOCAL_ROOT, "backend", "ai_service.py"), f"{REMOTE_ROOT}/backend/ai_service.py")

# 3. Synchronize assets into running Docker containers
print("--- 3. Injecting Assets into Docker Containers & Reloading ---")
sync_cmds = [
    f"docker cp {REMOTE_ROOT}/frontend/dist/. ironforge_frontend:/usr/share/nginx/html/",
    "docker exec ironforge_frontend nginx -s reload",
    f"docker cp {REMOTE_ROOT}/backend/ai_service.py ironforge_backend:/app/ai_service.py",
    "docker restart ironforge_backend"
]

for cmd in sync_cmds:
    stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
    stdout.channel.recv_exit_status()

sftp.close()
client.close()

print("--- 4. Verification Probe ---")
time.sleep(2)
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request(f"https://{SERVER_IP}", headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
    html = resp.read().decode('utf-8')
    if "index-CGM8LhD2.js" in html:
        print(f"VERIFICATION SUCCESS: Production server {SERVER_IP} is active and serving latest bundle!")
    else:
        print("Probe warning: latest bundle tag not found.")

print("==================================================")
print("DEPLOYMENT COMPLETE!")
print("==================================================")
