# Mini-Mart 2 Deployment Guide

## Domain: minimart.ourspaces.net

This guide walks you through deploying Mini-Mart 2 to a Linux server with nginx reverse proxy and PM2 process manager.

---

## Prerequisites

- **nginx** installed and running on the server
- **PM2** installed (`npm install -g pm2`)
- **Node.js** (v18+) installed
- **Domain**: minimart.ourspaces.net pointing to your server IP

---

## Quick Deploy (One Command)

After setting up your server, simply run:

```bash
./deploy.sh
```

This script will:
1. Build the frontend for production
2. Start the backend with PM2
3. Configure nginx
4. Restart nginx

---

## Manual Deployment Steps

If you prefer to do it step by step:

### Step 1: Build Frontend

```bash
cd frontend
npm install
npm run build
```

The built files will be in `frontend/dist/`

### Step 2: Start Backend with PM2

```bash
cd backend
npm install

# Start with PM2
pm2 start ecosystem.config.js

# Or directly:
pm2 start server.js --name minimart-backend
```

### Step 3: Configure nginx

Create `/etc/nginx/sites-available/minimart.conf`:

```nginx
server {
    listen 80;
    server_name minimart.ourspaces.net;

    # Frontend (static files)
    location / {
        root /var/www/minimart/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support (if needed)
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Then enable the site:

```bash
# Link to sites-enabled
sudo ln -s /etc/nginx/sites-available/minimart.conf /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Copy Frontend Build Files

```bash
sudo cp -r frontend/dist/* /var/www/minimart/dist/
```

---

## PM2 Commands

```bash
# View logs
pm2 logs minimart-backend

# Restart
pm2 restart minimart-backend

# Stop
pm2 stop minimart-backend

# Status
pm2 status

# Auto-start on boot
pm2 startup
pm2 save
```

---

## Troubleshooting

### Check if backend is running
```bash
curl http://localhost:5000/api/health
```

### Check nginx logs
```bash
sudo tail -f /var/log/nginx/error.log
```

### Check PM2 logs
```bash
pm2 logs --lines 50
```

### Restart everything
```bash
pm2 restart all
sudo systemctl reload nginx
```

---

## Project Files

- `deploy.sh` - Main deployment script
- `ecosystem.config.js` - PM2 configuration
- `nginx/minimart.conf` - nginx configuration template