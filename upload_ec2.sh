#!/bin/bash
# ============================================================
#  Oplexa — Build locally and upload to EC2
#  Run from project root after deploy_ec2.sh has run on EC2
#
#  Usage:
#    EC2_IP=13.204.53.195 KEY=dr-nisha-key.pem bash upload_ec2.sh
# ============================================================
set -e

EC2_IP="${EC2_IP:-13.204.53.195}"
KEY="${KEY:-dr-nisha-key.pem}"
EC2_USER="ubuntu"
APP_DIR="/home/ubuntu/oplexa-api"
WEB_DIR="/home/ubuntu/oplexa-web"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }

SSH="ssh -i $KEY $EC2_USER@$EC2_IP"
SCP="scp -i $KEY"

log "Building API server..."
pnpm --filter @workspace/api-server run build

log "Building web app..."
BASE_PATH=/ PORT=3000 pnpm --filter @workspace/dr-nisha run build

log "Uploading API dist to EC2..."
$SCP -r artifacts/api-server/dist $EC2_USER@$EC2_IP:$APP_DIR/

log "Uploading web app to EC2..."
$SSH "mkdir -p $WEB_DIR"
$SCP -r artifacts/dr-nisha/dist/public/. $EC2_USER@$EC2_IP:$WEB_DIR/

log "Restarting API server on EC2..."
$SSH "cd $APP_DIR && pm2 restart oplexa-api || pm2 start npm --name oplexa-api -- run start && pm2 save"

echo ""
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Upload complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo ""
echo -e "  Website:  http://${EC2_IP}   (web app)"
echo -e "  API:      http://${EC2_IP}/api"
echo ""
echo -e "${YELLOW}Build Expo APK after deployment:${NC}"
echo -e "  cd artifacts/oplexa"
echo -e "  EXPO_PUBLIC_API_URL=https://oplexa.in eas build --platform android"
echo ""
