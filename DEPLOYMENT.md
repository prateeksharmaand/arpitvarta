# ArpitVarta — Deployment Guide

---

## Local Docker Setup (Development)

Run the entire stack locally — no VPS, no SSL needed.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git

### 1. Clone the repo

```bash
git clone https://github.com/prateeksharmaand/arpitvarta.git
cd arpitvartaapp
```

### 2. Configure backend env

Create `backend/.env.local` from the example and add your Razorpay / Agora / Gemini keys (all optional locally — the app falls back to demo payments and keyword-based AI routing):

```bash
cp backend/.env.example backend/.env.local
```

### 3. Start all services

```bash
docker compose -f docker-compose.local.yml up -d --build
```

### 4. Access the apps

| Service | URL |
|---------|-----|
| Website | http://localhost |
| Professional Portal | http://localhost/professional-portal |
| Admin Portal | http://localhost/admin |
| Backend API | http://localhost/api |
| Backend direct | http://localhost:3000 |
| PostgreSQL | localhost:5432 |

Seed demo data with `docker compose -f docker-compose.local.yml exec backend npm run seed`, then log in as `admin@arpitvarta.com` / `Admin@1234` (change it immediately on any shared environment).

### 5. For Flutter apps pointing to local backend

Pass the backend address at build/run time — no code changes needed:

```bash
flutter run --dart-define=API_HOST=http://10.0.2.2:3000        # Android emulator
flutter run --dart-define=API_HOST=http://localhost:3000       # iOS simulator
flutter run --dart-define=API_HOST=http://192.168.1.x:3000     # physical device on your Wi-Fi
```

### 6. Useful local commands

```bash
# View logs
docker compose -f docker-compose.local.yml logs -f backend

# Restart backend after code change
docker compose -f docker-compose.local.yml up -d --build backend

# Stop everything
docker compose -f docker-compose.local.yml down

# Stop + delete all data
docker compose -f docker-compose.local.yml down -v

# DB shell
docker compose -f docker-compose.local.yml exec db psql -U arpitvarta_user -d arpitvarta_db
```

---

## Architecture

| Component | Tech | URL |
|-----------|------|-----|
| User App | Flutter (Android) | — |
| Professional App | Flutter (Android) | — |
| Agent Onboarding App | Flutter (Android) | — |
| Professional Portal (Web) | React + Vite | https://www.arpitvarta.com |
| Admin Portal (Web) | React + Vite | https://www.arpitvarta.com/admin |
| Backend API | Node.js + Express | https://api.arpitvarta.com |
| Database | PostgreSQL 15 | Internal (Docker) |
| Hosting | VPS (Docker Compose) | /opt/arpitvarta |

---

## Server Stack

All services run via **Docker Compose** on a single VPS:

```
nginx          → reverse proxy + SSL (ports 80/443)
backend        → Node.js API (internal port 3000)
professional     → Professional Portal nginx (internal port 80)
admin          → Admin Portal nginx (internal port 80)
db             → PostgreSQL 15 (internal port 5432)
```

---

## First-Time VPS Setup

```bash
ssh root@YOUR_VPS_IP
cd /opt
bash <(curl -fsSL https://raw.githubusercontent.com/prateeksharmaand/arpitvarta/main/deploy/deploy.sh)
```

The deploy script:
1. Installs Docker + Docker Compose
2. Clones the repo to `/opt/arpitvarta`
3. Creates `.env` and `backend/.env` if missing
4. Issues Let's Encrypt SSL certs for `arpitvarta.com` and `api.arpitvarta.com`
5. Builds and starts all Docker services

---

## Redeploy After Code Changes

```bash
cd /opt/arpitvarta
bash deploy/redeploy.sh
```

Equivalent to, and safe to run manually instead:

```bash
cd /opt/arpitvarta
git fetch origin
git reset --hard origin/main
docker compose up -d --build
docker compose restart nginx
```

### Rebuild only specific services

```bash
bash deploy/redeploy.sh backend        # Backend API only
bash deploy/redeploy.sh web            # ArpitVarta consumer site only
bash deploy/redeploy.sh professional     # Professional portal only
bash deploy/redeploy.sh admin          # Admin portal only
```

---

## Environment Files

### `/opt/arpitvarta/.env` (Docker Compose variables)

```env
DOMAIN=arpitvarta.com
API_DOMAIN=api.arpitvarta.com
VITE_API_URL=https://api.arpitvarta.com
DB_NAME=arpitvarta_db
DB_USER=arpitvarta_user
DB_PASSWORD=your_db_password
```

### `/opt/arpitvarta/backend/.env` (Backend secrets)

```env
PORT=3000
NODE_ENV=production

DB_HOST=db
DB_PORT=5432
DB_NAME=arpitvarta_db
DB_USER=arpitvarta_user
DB_PASSWORD=your_db_password

JWT_SECRET=your_random_64_char_secret
JWT_EXPIRES_IN=30d

APP_URL=https://api.arpitvarta.com
FRONTEND_URL=https://arpitvarta.com
CORS_ORIGIN=https://arpitvarta.com,https://www.arpitvarta.com

# Same Razorpay account and Agora project as GrahVarta
RAZORPAY_KEY_ID=rzp_live_xxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_certificate

# AI assistant (server-side only)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
AI_FREE_DAILY_LIMIT=5

# Welcome emails for newly activated professionals
SMTP_HOST=smtp.hostinger.com
SMTP_USER=support@arpitvarta.com
SMTP_PASS=your_smtp_password

# Firebase Admin SDK — paste full service account JSON as single line
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"arpitvarta-pro",...}
FIREBASE_SERVICE_ACCOUNT_PROFESSIONAL={"type":"service_account","project_id":"arpitvarta-pro",...}

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

---

## Database

### Connect to DB

```bash
docker compose exec db psql -U arpitvarta_user -d arpitvarta_db
```

### Run migrations manually

```bash
docker compose exec backend node migrations/runAll.js
```

Migrations run automatically on backend startup. Each migration runs **exactly once** (tracked in `_migrations` table).

### Backup

```bash
docker compose exec db pg_dump -U arpitvarta_user arpitvarta_db > backup_$(date +%Y%m%d).sql
```

### Restore

```bash
cat backup.sql | docker compose exec -T db psql -U arpitvarta_user -d arpitvarta_db
```

---

## Flutter App Builds

### Prerequisites

- Flutter SDK (latest stable)
- Android Studio + SDK API 36 + NDK `28.2.13676358`
- Keystore files placed in each app's `android/` folder (not in git)

### User App

```bash
cd user_app
flutter pub get
flutter build apk --release --split-per-abi
# Output: build/app/outputs/flutter-apk/
```

### Professional App

```bash
cd professional_app
flutter pub get
flutter build apk --release --split-per-abi
```

### Onboarding App

```bash
cd onboarding_app
flutter pub get
flutter build apk --release --split-per-abi
```

### Keystore files (not in git)

Create **new** upload keystores for the ArpitVarta apps — do not reuse GrahVarta's signing keys:

```bash
keytool -genkey -v -keystore android/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Then add `android/key.properties` (gitignored) to each app:
```
storePassword=<your password>
keyPassword=<your password>
keyAlias=upload
storeFile=upload-keystore.jks
```

---

## Firebase Setup

Create a new Firebase project for ArpitVarta and register `com.arpitvarta.user` and `com.arpitvarta.pro`. Download each app's `google-services.json` into its `android/app/` folder (the Gradle build enables the Google Services plugin only when that file exists) and put the Admin SDK service-account JSON in `FIREBASE_SERVICE_ACCOUNT` / `FIREBASE_SERVICE_ACCOUNT_PROFESSIONAL`.

Required files (not in git):
- `user_app/android/app/google-services.json`
- `professional_app/android/app/google-services.json`
- `onboarding_app/android/app/google-services.json`

### Push Notifications

FCM uses the Firebase Admin SDK on the backend.
- Generate a service account key from Firebase Console → Project Settings → Service Accounts
- Set as `FIREBASE_SERVICE_ACCOUNT` in `backend/.env`
- If professional app uses a separate project key, set `FIREBASE_SERVICE_ACCOUNT_PROFESSIONAL`

### Troubleshooting FCM

```bash
# Check if tokens are registered
docker compose exec db psql -U arpitvarta_user -d arpitvarta_db \
  -c "SELECT user_id, app_type, LEFT(token,20) as token FROM push_tokens;"

# Clear stale tokens (users re-register on next app open)
docker compose exec db psql -U arpitvarta_user -d arpitvarta_db \
  -c "DELETE FROM push_tokens;"

# Check FCM errors in logs
docker compose logs backend --tail=100 | grep FCM
```

If you see `invalid_grant (Invalid JWT Signature)`:
```bash
# Sync server time
apt-get install -y ntpdate && ntpdate -u pool.ntp.org
docker compose restart backend
```

---

## SSL Certificates

Certificates are auto-issued via Let's Encrypt during first deploy.

### Manual renewal

```bash
certbot renew
docker compose restart nginx
```

Auto-renewal is set up via cron/systemd timer by the deploy script.

---

## Useful Commands

```bash
# View all running services
docker compose ps

# View backend logs (live)
docker compose logs -f backend

# View all logs
docker compose logs -f

# Restart a service
docker compose restart backend

# Shell into backend container
docker compose exec backend sh

# Shell into DB
docker compose exec db psql -U arpitvarta_user -d arpitvarta_db

# Full redeploy
git pull origin main && docker compose up -d --build && docker compose restart nginx
```

---

## Service URLs

| Service | URL |
|---------|-----|
| Professional Portal | https://www.arpitvarta.com |
| Admin Portal | https://www.arpitvarta.com/admin |
| Backend API | https://api.arpitvarta.com |
| WebSocket | wss://api.arpitvarta.com/socket.io |
