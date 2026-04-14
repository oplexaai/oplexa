#!/bin/bash
# ============================================================
#  Oplexa Full-Stack EC2 Deploy Script — Ubuntu 22.04
#  Deploys: API server + Web app + configures Nginx
#
#  Usage:
#    GROQ_API_KEY=gsk_xxx DOMAIN=oplexa.in bash deploy_ec2.sh
#
#  For Expo APK build (run locally after deploy):
#    EXPO_PUBLIC_API_URL=https://oplexa.in eas build --platform android
# ============================================================
set -e

DOMAIN="${DOMAIN:-oplexa.in}"
APP_DIR="/home/ubuntu/oplexa-api"
WEB_DIR="/home/ubuntu/oplexa-web"
DB_NAME="oplexa_db"
DB_USER="oplexa_user"
DB_PASS="${DB_PASS:-$(openssl rand -hex 16)}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
GROQ_KEY="${GROQ_API_KEY:-}"
NODE_PORT=4000

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── 1. System packages ───────────────────────────────────────
log "Updating system..."
sudo apt-get update -qq
sudo apt-get install -y -qq curl wget git nginx certbot python3-certbot-nginx postgresql postgresql-contrib ufw

# ── 2. Node.js 20 ────────────────────────────────────────────
if ! command -v node &>/dev/null || [[ "$(node -v)" < "v20" ]]; then
  log "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
log "Node: $(node -v)  NPM: $(npm -v)"

# ── 3. PM2 + pnpm ────────────────────────────────────────────
sudo npm install -g pm2 pnpm --silent
log "PM2: $(pm2 -v)  pnpm: $(pnpm -v)"

# ── 4. PostgreSQL ─────────────────────────────────────────────
log "Configuring PostgreSQL..."
sudo systemctl enable --now postgresql

sudo -u postgres psql <<SQLEOF
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

\c ${DB_NAME}

CREATE TABLE IF NOT EXISTS oplexa_users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone VARCHAR(20),
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
SQLEOF
log "PostgreSQL ready: ${DB_NAME}"

DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"

# ── 5. API app directory ──────────────────────────────────────
log "Setting up API directory..."
sudo mkdir -p $APP_DIR
sudo chown ubuntu:ubuntu $APP_DIR

cat > $APP_DIR/package.json <<'PKGJSON'
{
  "name": "oplexa-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node --enable-source-maps dist/index.mjs"
  },
  "dependencies": {
    "@google/genai": "^1.46.0",
    "bcryptjs": "^3.0.3",
    "cors": "^2",
    "drizzle-orm": "^0.44.2",
    "express": "^5",
    "jsonwebtoken": "^9.0.3",
    "pg": "^8.16.0",
    "pino": "^9",
    "pino-http": "^10"
  }
}
PKGJSON

# ── 6. .env file ──────────────────────────────────────────────
log "Writing .env..."
cat > $APP_DIR/.env <<ENVEOF
PORT=${NODE_PORT}
DATABASE_URL=${DATABASE_URL}
SESSION_SECRET=${JWT_SECRET}
GROQ_API_KEY=${GROQ_KEY}
NODE_ENV=production
ALLOWED_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}
ENVEOF
warn ".env written — add your GROQ_API_KEY if not set"

# ── 7. Copy API source ────────────────────────────────────────
log "Copying API source files..."
if [ -d "/tmp/oplexa-src" ]; then
  cp -r /tmp/oplexa-src/. $APP_DIR/
  cd $APP_DIR
  npm install --silent
  log "API dependencies installed"
else
  warn "No /tmp/oplexa-src found — upload API build manually to $APP_DIR"
fi

# ── 8. Web app static files ───────────────────────────────────
log "Setting up web app directory..."
sudo mkdir -p $WEB_DIR
sudo chown ubuntu:ubuntu $WEB_DIR

if [ -d "/tmp/oplexa-web" ]; then
  cp -r /tmp/oplexa-web/. $WEB_DIR/
  log "Web app files copied to $WEB_DIR"
else
  warn "No /tmp/oplexa-web found — upload built web files manually to $WEB_DIR"
  warn "Build locally with: pnpm --filter @workspace/dr-nisha run build"
  warn "Then upload: scp -r artifacts/dr-nisha/dist/public/* ubuntu@EC2_IP:${WEB_DIR}/"
fi

# ── 9. Nginx config ───────────────────────────────────────────
log "Configuring nginx..."
sudo tee /etc/nginx/sites-available/oplexa <<NGINXCONF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    # Streaming / SSE support
    proxy_read_timeout 300;
    proxy_connect_timeout 60;
    proxy_send_timeout 300;

    # Gzip
    gzip on;
    gzip_types text/plain application/json application/javascript text/css text/xml;

    # ── API proxy ──────────────────────────────────────────────
    location /api/ {
        proxy_pass http://127.0.0.1:${NODE_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # SSE / streaming
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;

        # CORS — allows Expo mobile app to call from any origin
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET,POST,PUT,PATCH,DELETE,OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type,Authorization,Accept" always;
        if (\$request_method = OPTIONS) { return 204; }
    }

    # ── Health check ───────────────────────────────────────────
    location /health {
        proxy_pass http://127.0.0.1:${NODE_PORT}/health;
    }

    # ── Web app static files ───────────────────────────────────
    location / {
        root ${WEB_DIR};
        index index.html;
        # SPA fallback — React Router
        try_files \$uri \$uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }

    # ── Long-cache for assets ──────────────────────────────────
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        root ${WEB_DIR};
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }
}
NGINXCONF

sudo ln -sf /etc/nginx/sites-available/oplexa /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
log "Nginx configured"

# ── 10. Firewall ───────────────────────────────────────────────
log "Setting up firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# ── 11. PM2 process ───────────────────────────────────────────
if [ -f "$APP_DIR/dist/index.mjs" ]; then
  log "Starting API with PM2..."
  cd $APP_DIR
  pm2 delete oplexa-api 2>/dev/null || true
  pm2 start npm --name "oplexa-api" -- run start
  pm2 save
  sudo pm2 startup systemd -u ubuntu --hp /home/ubuntu
else
  warn "API dist not found — start manually: cd $APP_DIR && pm2 start npm --name oplexa-api -- run start"
fi

# ── 12. SSL ────────────────────────────────────────────────────
if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "localhost" ]; then
  warn "To enable HTTPS, run:"
  warn "  sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos -m your@email.com"
fi

# ── Done ──────────────────────────────────────────────────────
EC2_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_EC2_IP")
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Oplexa Full Stack Deployed!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Website:      http://${DOMAIN}             (serves web app)"
echo -e "  API:          http://${DOMAIN}/api         (proxied to Node.js)"
echo -e "  Health:       http://${DOMAIN}/health"
echo -e "  PM2 status:   pm2 status"
echo -e "  API logs:     pm2 logs oplexa-api"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Point DNS A record: ${DOMAIN} → ${EC2_IP}"
echo -e "  2. Enable HTTPS:  sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo ""
echo -e "${YELLOW}Upload web app build (run on your machine):${NC}"
echo -e "  pnpm --filter @workspace/dr-nisha run build"
echo -e "  scp -r artifacts/dr-nisha/dist/public/. ubuntu@${EC2_IP}:${WEB_DIR}/"
echo ""
echo -e "${YELLOW}Upload API build (run on your machine):${NC}"
echo -e "  pnpm --filter @workspace/api-server run build"
echo -e "  scp -r artifacts/api-server/dist ubuntu@${EC2_IP}:${APP_DIR}/"
echo ""
echo -e "${YELLOW}Build Expo Android APK (run on your machine):${NC}"
echo -e "  EXPO_PUBLIC_API_URL=https://${DOMAIN} eas build --platform android"
echo ""
echo -e "  DB: ${DATABASE_URL}"
