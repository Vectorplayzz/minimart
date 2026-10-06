# Mini-Mart 2 Deployment Instructions

## Quick Start

Run the deployment script:

```bash
sudo chmod +x deploy.sh
sudo ./deploy.sh
```

## Manual Deployment (Alternative)

If you prefer to deploy manually:

### 1. Build Frontend
```bash
cd frontend
npm install --legacy-peer-deps
npm run build
```

### 2. Start Backend
```bash
cd backend
npm install
pm2 start server.js --name minimart-backend
pm2 save
```

### 3. Configure Nginx

Create `/etc/nginx/sites-available/minimart`:
```nginx
server {
    listen 80;
    server_name minimart.ourspaces.net;

    location / {
        root /home/user/minimart/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and reload nginx:
```bash
sudo ln -s /etc/nginx/sites-available/minimart /etc/nginx/sites-enabled/minimart
sudo nginx -t
sudo systemctl reload nginx
```

## Post-Deployment

- **URL:** http://minimart.ourspaces.net
- **API:** http://minimart.ourspaces.net/api
- **Health Check:** http://minimart.ourspaces.net/health

## PM2 Commands
```bash
pm2 status           # Check status
pm2 logs             # View logs
pm2 restart all      # Restart app
pm2 delete all       # Stop and remove
```

## Stop Deployment
```bash
pm2 delete all
sudo rm /etc/nginx/sites-enabled/minimart
sudo systemctl reload nginx
```
