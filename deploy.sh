#!/bin/bash

# Mini-Mart 2 Deployment Script (In-Place)
# Domain: minimart.ourspaces.net
# Uses: nginx reverse proxy + PM2 process manager

set -e

echo "=============================================="
echo "  Mini-Mart 2 Deployment Script (In-Place)"
echo "  Domain: minimart.ourspaces.net"
echo "=============================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Project directories (in-place)
PROJECT_DIR="$PWD"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
DIST_DIR="$FRONTEND_DIR/dist"

# Get absolute path for nginx
ABS_PATH="$(cd "$PROJECT_DIR" && pwd)"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root: sudo ./deploy.sh"
    exit 1
fi

log_info "Starting in-place deployment..."

# ============================================
# Step 1: Build frontend
# ============================================
log_info "Building frontend for production..."
cd "$FRONTEND_DIR"
npm install --legacy-peer-deps
npm run build

# ============================================
# Step 2: Install backend dependencies
# ============================================
log_info "Installing backend dependencies..."
cd "$BACKEND_DIR"
npm install

# ============================================
# Step 3: Configure and start PM2
# ============================================
log_info "Starting backend with PM2..."

cd "$BACKEND_DIR"

# Check if PM2 ecosystem config exists
if [ -f "$PROJECT_DIR/ecosystem.config.js" ]; then
    pm2 start "$PROJECT_DIR/ecosystem.config.js"
else
    # Start directly
    pm2 start server.js --name minimart-backend
fi

# Save PM2 process list for restart on boot
pm2 save

# ============================================
# Step 4: Configure nginx
# ============================================
log_info "Configuring nginx..."

# Create nginx config
cat > /etc/nginx/sites-available/minimart << NGINXCONF
server {
    listen 80;
    server_name minimart.ourspaces.net;

    # Frontend (static files - in-place)
    location / {
        root $ABS_PATH/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:5000/api/health;
    }
}
NGINXCONF

# Enable the site
if [ ! -L /etc/nginx/sites-enabled/minimart ]; then
    ln -s /etc/nginx/sites-available/minimart /etc/nginx/sites-enabled/minimart
fi

# Test and reload nginx
log_info "Testing nginx configuration..."
nginx -t

log_info "Reloading nginx..."
systemctl reload nginx

# ============================================
# Step 5: Final status
# ============================================
echo ""
echo "=============================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=============================================="
echo ""
echo "  URL: http://minimart.ourspaces.net"
echo "  API: http://minimart.ourspaces.net/api"
echo ""
echo "Useful commands:"
echo "  pm2 status           - Check app status"
echo "  pm2 logs            - View logs"
echo "  pm2 restart all    - Restart app"
echo ""
echo "=============================================="