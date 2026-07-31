# Resuming.io Email Engagement Platform - Nginx + PM2 Deployment Guide

## 1. Directory Setup on VPS (mail.resuming.io)

```bash
mkdir -p /var/www/mail/client
mkdir -p /var/www/mail/server
```

## 2. Nginx Configuration (/etc/nginx/sites-available/mail.resuming.io)

```nginx
server {
    listen 80;
    server_name mail.resuming.io;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mail.resuming.io;

    ssl_certificate /etc/letsencrypt/live/mail.resuming.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mail.resuming.io/privkey.pem;

    # Frontend Static SPA
    location / {
        root /var/www/mail/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # API Requests -> Node Express Backend (PM2 Cluster)
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Realtime Websockets -> Socket.io
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

## 3. PM2 Cluster Ecosystem File (`resuming-mail/server/ecosystem.config.js`)

```javascript
module.exports = {
  apps: [
    {
      name: "mail-api",
      script: "src/index.js",
      instances: "max",       // Spawns 1 instance per CPU core (Cluster Mode)
      exec_mode: "cluster",   // Enables Node.js cluster load balancing
      env: {
        NODE_ENV: "production",
        PORT: 3001
      }
    },
    {
      name: "mail-worker",
      script: "src/workers/emailWorker.js",
      instances: 4,           // 4 parallel worker processes processing queue concurrently
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        EMAIL_CONCURRENCY: 5
      }
    }
  ]
};
```

## 4. Deployment Commands

```bash
# Copy files to VPS
rsync -avz client/dist/ root@mail.resuming.io:/var/www/mail/client/dist/
rsync -avz server/ root@mail.resuming.io:/var/www/mail/server/

# On VPS
cd /var/www/mail/server
npm install --production
pm2 start ecosystem.config.js
pm2 save
systemctl reload nginx
```
