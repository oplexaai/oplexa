#!/bin/bash
# ============================================================
#  Oplexa EC2 Deploy Script — GitHub Based
#  Ubuntu 22.04 | Node 20 | PostgreSQL | Nginx | PM2 | SSL
#
#  Run this directly on your EC2 terminal:
#
#  curl -fsSL https://raw.githubusercontent.com/oplexaai/oplexa/main/deploy_ec2.sh | \
#    GROQ_API_KEY=gsk_xxx bash
#
#  OR after git clone:
#    GROQ_API_KEY=gsk_xxx bash deploy_ec2.sh
# ============================================================
set -e

GITHUB_REPO="https://github.com/oplexaai/oplexa.git"
DOMAIN="${DOMAIN:-oplexa.in}"
DEPLOY_DIR="/home/ubuntu/oplexa"
DB_NAME="oplexa_db"
DB_USER="oplexa_user"
DB_PASS="${DB_PASS:-$(openssl rand -hex 16)}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
GROQ_KEY="${GROQ_API_KEY:-}"
NODE_PORT=4000
EMAIL="${EMAIL:-contact@oplexa.in}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${CYAN}[i]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Oplexa EC2 Deployment Starting...     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""

# ── 1. System packages ───────────────────────────────────────
log "Updating system packages..."
sudo apt-get update -qq
sudo apt-get install -y -qq curl wget git nginx certbot python3-certbot-nginx \
  postgresql postgresql-contrib ufw build-essential

# ── 2. Node.js 20 ────────────────────────────────────────────
if ! command -v node &>/dev/null || [[ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 20 ]]; then
  log "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - >/dev/null
  sudo apt-get install -y nodejs >/dev/null
fi
log "Node: $(node -v)  NPM: $(npm -v)"

# ── 3. pnpm + PM2 ────────────────────────────────────────────
sudo npm install -g pnpm pm2 --silent
log "pnpm: $(pnpm -v)  PM2: $(pm2 -v)"

# ── 4. PostgreSQL ─────────────────────────────────────────────
log "Configuring PostgreSQL..."
sudo systemctl enable --now postgresql

# Check if DB already exists (re-deploy scenario)
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" 2>/dev/null || echo "0")

if [ "$DB_EXISTS" != "1" ]; then
  sudo -u postgres psql <<SQLEOF
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
  ELSE
    ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
SQLEOF
  log "PostgreSQL database created: ${DB_NAME}"
else
  # Still update password
  sudo -u postgres psql -c "ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASS}';" 2>/dev/null || true
  warn "Database ${DB_NAME} already exists — skipping create"
fi

# Create tables
sudo -u postgres psql -d ${DB_NAME} <<SQLEOF
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
log "Database tables ready"

DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"

# ── 5. Clone or update repo ───────────────────────────────────
log "Fetching latest code from GitHub..."
if [ -d "${DEPLOY_DIR}/.git" ]; then
  cd ${DEPLOY_DIR}
  git fetch origin
  git reset --hard origin/main
  log "Code updated from GitHub"
else
  git clone ${GITHUB_REPO} ${DEPLOY_DIR}
  cd ${DEPLOY_DIR}
  log "Repository cloned"
fi

# ── 6. Write .env for API server ──────────────────────────────
log "Writing API environment config..."
cat > ${DEPLOY_DIR}/artifacts/api-server/.env <<ENVEOF
PORT=${NODE_PORT}
DATABASE_URL=${DATABASE_URL}
SESSION_SECRET=${JWT_SECRET}
GROQ_API_KEY=${GROQ_KEY}
NODE_ENV=production
ALLOWED_ORIGINS=https://${DOMAIN},https://www.${DOMAIN},http://${DOMAIN}
ENVEOF

# Also save deploy config for future re-deploys
cat > ${DEPLOY_DIR}/.deploy-config <<DEPLOYEOF
DB_PASS=${DB_PASS}
JWT_SECRET=${JWT_SECRET}
DATABASE_URL=${DATABASE_URL}
DEPLOYEOF
chmod 600 ${DEPLOY_DIR}/.deploy-config
log ".env saved"

# ── 7. Install dependencies & build API ───────────────────────
log "Installing dependencies (this may take a minute)..."
cd ${DEPLOY_DIR}
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

log "Building API server..."
cd ${DEPLOY_DIR}
pnpm --filter @workspace/api-server run build
log "API server built"

# ── 8. Build Web app ──────────────────────────────────────────
log "Building web app..."
cd ${DEPLOY_DIR}
PORT=3000 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/dr-nisha run build
log "Web app built"

# ── 9. PM2 — start/restart API ───────────────────────────────
log "Starting API server with PM2..."
cd ${DEPLOY_DIR}/artifacts/api-server
pm2 delete oplexa-api 2>/dev/null || true
pm2 start node --name "oplexa-api" -- --enable-source-maps ./dist/index.mjs
pm2 save
# Auto-start PM2 on reboot
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true
log "PM2 running"

# ── 10. Nginx config ──────────────────────────────────────────
log "Configuring Nginx..."
WEB_DIST="${DEPLOY_DIR}/artifacts/dr-nisha/dist/public"

sudo tee /etc/nginx/sites-available/oplexa > /dev/null <<NGINXCONF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    # Increase body size for profile photo uploads (base64)
    client_max_body_size 15M;

    # Streaming / SSE
    proxy_read_timeout 300;
    proxy_connect_timeout 60;
    proxy_send_timeout 300;

    # Gzip
    gzip on;
    gzip_types text/plain application/json application/javascript text/css text/xml;

    # ── API ──────────────────────────────────────────────────
    location /api/ {
        proxy_pass http://127.0.0.1:${NODE_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET,POST,PUT,PATCH,DELETE,OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type,Authorization,Accept" always;
        if (\$request_method = OPTIONS) { return 204; }
    }

    # ── Health ───────────────────────────────────────────────
    location /health {
        proxy_pass http://127.0.0.1:${NODE_PORT}/health;
    }

    # ── Static assets (long cache) ───────────────────────────
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        root ${WEB_DIST};
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    # ── SPA ──────────────────────────────────────────────────
    location / {
        root ${WEB_DIST};
        index index.html;
        try_files \$uri \$uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }
}
NGINXCONF

sudo ln -sf /etc/nginx/sites-available/oplexa /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
log "Nginx configured"

# ── 11. Firewall ──────────────────────────────────────────────
log "Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# ── 12. SSL (Let's Encrypt) ───────────────────────────────────
if command -v certbot &>/dev/null; then
  log "Setting up HTTPS with Let's Encrypt..."
  if sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} \
      --non-interactive --agree-tos -m ${EMAIL} 2>/dev/null; then
    log "HTTPS enabled!"
  else
    warn "SSL setup failed — DNS may not be pointing to this server yet"
    warn "Once DNS is set, run: sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
  fi
fi

# ── Done! ─────────────────────────────────────────────────────
EC2_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       Oplexa Deployed Successfully!       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}EC2 IP:${NC}       ${EC2_IP}"
echo -e "  ${CYAN}Website:${NC}      https://${DOMAIN}"
echo -e "  ${CYAN}API:${NC}          https://${DOMAIN}/api"
echo -e "  ${CYAN}Health:${NC}       https://${DOMAIN}/health"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "  pm2 status              — API process status"
echo -e "  pm2 logs oplexa-api     — Live API logs"
echo -e "  pm2 restart oplexa-api  — Restart API"
echo ""
echo -e "${YELLOW}GoDaddy DNS — add these A records:${NC}"
echo -e "  Type: A   Name: @    Value: ${EC2_IP}   TTL: 600"
echo -e "  Type: A   Name: www  Value: ${EC2_IP}   TTL: 600"
echo ""
echo -e "${YELLOW}Build Expo APK (run on your local machine):${NC}"
echo -e "  EXPO_PUBLIC_API_URL=https://${DOMAIN} eas build --platform android"
echo ""
echo -e "  DB URL: ${DATABASE_URL}"
