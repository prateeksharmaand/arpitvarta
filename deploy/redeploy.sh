#!/bin/bash
# =============================================================
# ArpitVarta — Redeploy After Code Changes
#
# Run on the VPS after pushing new commits:
#   cd /opt/arpitvarta && bash deploy/redeploy.sh [service ...]
#
# With no arguments, pulls latest code and rebuilds every service.
# Pass one or more service names to rebuild only those, e.g.:
#   bash deploy/redeploy.sh backend web
#
# For first-time VPS setup (Docker install, SSL certs, env files),
# use deploy/deploy.sh instead — this script assumes that already ran.
# =============================================================

set -e

APP_DIR="/opt/arpitvarta"
BRANCH="main"
SERVICES=("$@")

cd "$APP_DIR"

echo "[1/3] Pulling latest code (origin/$BRANCH)..."
git fetch origin
git reset --hard "origin/$BRANCH"

echo "[2/3] Building and starting services..."
if [ ${#SERVICES[@]} -eq 0 ]; then
  docker compose up -d --build
else
  docker compose up -d --build "${SERVICES[@]}"
fi

echo "[3/3] Restarting nginx to pick up any routing/dependency changes..."
docker compose restart nginx

echo ""
echo "  Waiting for services to settle..."
sleep 5
docker compose ps

echo ""
echo "=============================="
echo "  Redeploy Complete!"
echo "=============================="
