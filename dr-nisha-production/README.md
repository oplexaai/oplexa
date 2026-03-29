# Dr. Nisha — Medical AI Chatbot

A Gemini-powered medical chatbot with conversation history, dark mode, and multi-language support (English / Hindi / Hinglish).

---

## Requirements

| Tool | Version |
|------|---------|
| Node.js | 20 or higher |
| npm | 9 or higher |
| PostgreSQL | 13 or higher |

---

## Setup Instructions

### Step 1 — Install Node.js dependencies

```bash
npm install
```

### Step 2 — Create a `.env` file

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Then edit `.env` with a text editor:

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `GEMINI_API_KEY` | Google Gemini AI API key | https://aistudio.google.com/apikey |
| `DATABASE_URL` | PostgreSQL connection string | Your VPS or hosting panel |
| `NODE_ENV` | Must be set to `production` | — |
| `PORT` | Port to run the server on (default: 3000) | — |
| `SESSION_SECRET` | Random secret string | https://generate-secret.vercel.app/32 |

### Step 3 — Set up the PostgreSQL database

Run these SQL commands in your PostgreSQL database to create the required tables:

```sql
CREATE TABLE IF NOT EXISTS conversations (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT 'New Consultation',
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id              SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id),
  role            TEXT NOT NULL,
  content         TEXT NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Step 4 — Start the server

```bash
npm start
```

The app will be available at: `http://your-server-ip:3000`

---

## Running with PM2 (Recommended for VPS)

To keep the server running after you disconnect:

```bash
npm install -g pm2
pm2 start server.mjs --name dr-nisha
pm2 save
pm2 startup
```

---

## Nginx Reverse Proxy (Optional)

If you want to serve on port 80 with a domain name, add this Nginx config:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        # Required for SSE (streaming AI responses)
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
```

---

## Notes

- The AI will only answer medical/health questions — it will reject all off-topic queries.
- Responses are streamed in real-time using Server-Sent Events (SSE).
- Language is auto-detected — works in English, Hindi, and Hinglish.
- User sessions are stored in localStorage (no server-side login required).
- Conversation history is persisted in your PostgreSQL database.
