# Oplexa — India's No.1 AI Assistant

> **Stack**: React + Vite (Web) · Expo React Native (Mobile) · Express API · PostgreSQL · Groq AI

---

## Project Structure

```
oplexa/
├── artifacts/
│   ├── api-server/          # Express.js backend API
│   ├── dr-nisha/            # React + Vite web frontend
│   └── oplexa/              # Expo React Native mobile app
├── lib/
│   └── db/                  # Drizzle ORM schema (shared)
├── schema.sql               # Database schema (CREATE TABLE)
├── backup.sql               # Full database backup (schema + data)
└── README.md                # This file
```

---

## Quick Setup on New Replit

### Step 1 — Fork / Import
1. Open [Replit](https://replit.com) → **Create Repl** → **Import from GitHub**
2. URL: `https://github.com/oplexaai/oplexa`

### Step 2 — Add Secrets (Environment Variables)
Go to **Secrets** tab and add:

| Secret Name       | Value                                      |
|-------------------|--------------------------------------------|
| `GROQ_API_KEY`    | Your Groq API key from console.groq.com    |
| `SESSION_SECRET`  | Any random 32-char string                  |
| `DATABASE_URL`    | Auto-filled by Replit PostgreSQL (see below)|

### Step 3 — Setup PostgreSQL Database
In Replit Shell run:
```bash
# Create database schema
psql $DATABASE_URL -f schema.sql

# OR restore full backup (with sample users)
psql $DATABASE_URL -f backup.sql
```

### Step 4 — Install Dependencies
```bash
pnpm install
```

### Step 5 — Start the App
All workflows auto-start. Or manually:
```bash
# API Server (port 8080)
pnpm --filter @workspace/api-server run dev

# Web Frontend (React + Vite)
pnpm --filter @workspace/dr-nisha run dev

# Mobile App (Expo)
pnpm --filter @workspace/oplexa run dev
```

---

## Environment Variables Reference

### API Server (`artifacts/api-server/.env`)
```env
PORT=8080
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SESSION_SECRET=your_random_secret_here
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
NODE_ENV=development
```

### Web Frontend (`artifacts/dr-nisha/.env`)
```env
VITE_API_URL=http://localhost:8080
```

### Mobile App (`artifacts/oplexa/.env`)
```env
EXPO_PUBLIC_API_URL=https://oplexa.in
EXPO_PUBLIC_DOMAIN=your-replit-domain.replit.dev
```

---

## Features

| Feature | Web | Mobile |
|---------|-----|--------|
| JWT Authentication (Login/Register) | ✅ | ✅ |
| AI Chat with Groq (llama-3.3-70b) | ✅ | ✅ |
| Image Upload + Vision AI (Llama 4) | ✅ | ✅ |
| Chat History (local + DB sync) | ✅ | ✅ |
| Pin / Delete Conversations | ✅ | ✅ |
| Profile Page (name, bio, avatar) | ✅ | ✅ |
| Admin Panel (users + AI training) | ✅ | — |
| Dark Theme (Black + Red) | ✅ | ✅ |
| Streaming Responses | ✅ | ✅ |

---

## Admin Panel

- URL: `/admin` (web only)
- Only visible to users with `is_admin = true`
- **Users Tab**: View, edit, delete all users, toggle admin
- **AI Training Tab**: Set personality, system prompt, restrictions (live in ~30s, no redeploy)

To make a user admin:
```sql
UPDATE oplexa_users SET is_admin = true WHERE email = 'your@email.com';
```

---

## Deploy to EC2 (Production — oplexa.in)

### First Time Setup on EC2
```bash
# Clone repo
git clone https://github.com/oplexaai/oplexa /home/ubuntu/oplexa
cd /home/ubuntu/oplexa
pnpm install

# Setup PostgreSQL
sudo -u postgres psql -f schema.sql

# Create .env file
cp artifacts/api-server/.env.example artifacts/api-server/.env
# Edit .env with your values

# Build and start
cd artifacts/api-server && pnpm run build
cd /home/ubuntu/oplexa && PORT=3000 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/dr-nisha run build
mkdir -p artifacts/api-server/dist/public
cp -r artifacts/dr-nisha/dist/public/* artifacts/api-server/dist/public/

# Start with PM2
cd artifacts/api-server
set -a && source .env && set +a
pm2 start node --name "oplexa-api" -- --enable-source-maps ./dist/index.mjs
pm2 save --force
```

### Update / Redeploy
```bash
cd /home/ubuntu/oplexa && git pull origin main
cd artifacts/api-server && pnpm run build
cd /home/ubuntu/oplexa && PORT=3000 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/dr-nisha run build
mkdir -p artifacts/api-server/dist/public
cp -r artifacts/dr-nisha/dist/public/* artifacts/api-server/dist/public/
pm2 restart oplexa-api
```

---

## Mobile APK Build (Android)

```bash
cd artifacts/oplexa

# Preview build (APK)
eas build --profile preview --platform android

# Production build (AAB for Play Store)
eas build --profile production --platform android
```

**EAS Config:**
- Expo account: `oplexaai`
- Project ID: `4a77dcc0-b536-4dec-a4f7-75e065ad0f2f`

---

## Database Schema Overview

```sql
oplexa_users         -- User accounts (auth, profile, is_admin)
oplexa_conversations -- Chat sessions linked to users
oplexa_messages      -- Messages within conversations
oplexa_ai_config     -- Admin AI training settings (1 row)
```

See `schema.sql` for full CREATE TABLE statements.
See `backup.sql` for schema + sample data restore.

---

## Tech Stack Details

| Layer | Technology |
|-------|-----------|
| Web Frontend | React 19, Vite 7, Wouter (routing), ReactMarkdown |
| Mobile | Expo SDK 54, React Native 0.81, Expo Router 6 |
| Backend | Express 5, Node.js 24, TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| AI | Groq API — llama-3.3-70b-versatile (text), meta-llama/llama-4-scout-17b-16e-instruct (vision) |
| Auth | JWT tokens, bcrypt password hashing |
| Deployment | AWS EC2 (t3.small), Nginx reverse proxy, PM2 |

---

## GitHub

Repository: [https://github.com/oplexaai/oplexa](https://github.com/oplexaai/oplexa)

---

*Oplexa — India's No.1 AI Assistant*
