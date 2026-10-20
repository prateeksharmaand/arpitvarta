# ArpitVarta

A marketplace that connects people with verified professionals of **any field** — doctors, lawyers, chartered accountants, financial advisors, therapists, career coaches, tutors, fitness experts, tech consultants and more — over paid per-minute **chat, voice and video** consultations.

Built on the GrahVarta platform (same architecture, payments, calling and real-time engine), re-purposed from astrology to professional services.

## What's in the repo

| Folder | What it is | Stack |
|---|---|---|
| `backend/` | REST API + Socket.io real-time engine (consultations, per-minute billing, wallet, live sessions, AI assistant) | Node 20, Express, PostgreSQL |
| `web/` | Consumer website — browse by profession, AI assistant, chat/call, wallet | React 18, Vite, Tailwind |
| `professional-portal/` | Web portal for professionals — profile & credentials, consultations, live, earnings, withdrawals | React 18, Vite, Tailwind |
| `admin-portal/` | Admin dashboard — users, professional verification, categories, transactions, withdrawals, applications | React 18, Vite, Tailwind |
| `user_app/` | Mobile app for clients (`com.arpitvarta.user`) | Flutter |
| `professional_app/` | Mobile app for professionals — "ArpitVarta Pro" (`com.arpitvarta.pro`) | Flutter |
| `onboarding_app/` | Lightweight app for professionals to apply to join (`com.arpitvarta.onboarding`) | Flutter |
| `docker/`, `deploy/` | Nginx + Docker Compose production setup | |

## Key features

- **Profession categories** (admin-managed): Doctors, Lawyers, CAs, Financial Advisors, Therapists, Career Coaches, Tutors, Fitness & Nutrition, Tech, Business, Real Estate & Architects, Veterinarians, Astrology & Spiritual, Other — each with sub-specialities used for filters and matching.
- **Professional profiles** with profession title, qualifications, license/registration number, organisation, city, languages, specialisations, verification documents and a *Verified* badge set by admins.
- **AI assistant** (Gemini, server-side): the user describes a problem in plain words → gets the right category, urgency (incl. emergency → call 112), safe first steps, questions to ask, and matching professionals. Falls back to keyword routing if the AI is unavailable. Professionals can also draft their bio with AI.
- **Consultations**: chat (Socket.io), voice & video (Agora), queueing, per-minute billing from the wallet (80% to the professional), chat threads, reviews.
- **Wallet & payments** via Razorpay with recharge bonus offers and subscription plans; professional withdrawals (UPI / bank) with admin approval.
- **Live sessions** with tips, a **community** feed with moderation, push notifications (FCM).
- **Onboarding pipeline**: apply via the onboarding app → admin reviews in *Applications* → one click creates the professional account and emails credentials.

## Run everything locally

Prerequisites: Node 20+, PostgreSQL 15+, Flutter 3.x (for the apps).

```bash
# 1. Database
createuser arpitvarta_user --pwprompt          # use: arpitvarta_local
createdb arpitvarta_db -O arpitvarta_user
psql -d arpitvarta_db -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'

# 2. Backend  (http://localhost:3000)
cd backend
cp .env.example .env        # then fill in keys (see "Keys" below)
npm install
npm run migrate             # schema + categories, plans, recharge offers
npm run seed                # demo admin, user and 20 professionals
npm run dev

# 3. Web apps (each in its own terminal)
cd web && npm install && npm run dev                    # http://localhost:5174
cd professional-portal && npm install && npm run dev    # http://localhost:5173/professional-portal/
cd admin-portal && npm install && npm run dev           # http://localhost:5175/admin/

# 4. Mobile apps — point them at your local backend
cd user_app && flutter run --dart-define=API_HOST=http://10.0.2.2:3000          # Android emulator
cd professional_app && flutter run --dart-define=API_HOST=http://localhost:3000 # iOS simulator
```

Demo logins created by `npm run seed`:

| Role | Email | Password |
|---|---|---|
| Admin | admin@arpitvarta.com | Admin@1234 |
| User (₹1000 wallet) | user@arpitvarta.com | Demo@1234 |
| Professionals | pro1@arpitvarta.com … pro20@arpitvarta.com | Demo@1234 |

## Keys

All secrets live in `backend/.env` (gitignored) — never in the web bundle or the apps.

| Variable | Notes |
|---|---|
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Same Razorpay account as GrahVarta. Blank = demo mode (wallet top-ups succeed instantly). |
| `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` | Same Agora project as GrahVarta (the App ID is also embedded in the web call hook and Flutter call screens). |
| `GEMINI_API_KEY` | Powers the AI assistant and AI bio writer. Blank/invalid = keyword fallback. |
| `FIREBASE_SERVICE_ACCOUNT(_PROFESSIONAL)` | Needs a new ArpitVarta Firebase project. Put the apps' `google-services.json` in `user_app/android/app/` and `professional_app/android/app/` to enable push; without them the apps build and run without push. |
| `SMTP_*` | For professional welcome emails. Blank = emails are printed to the backend console. |

## Deploying

See [DEPLOYMENT.md](DEPLOYMENT.md) — Docker Compose on a single VPS behind Nginx with Let's Encrypt (`deploy/deploy.sh` for first-time setup, `deploy/redeploy.sh` for updates).
