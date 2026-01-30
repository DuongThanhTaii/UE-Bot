# Deployment Guide

## Deployment Options

1. **Docker Compose** - Recommended for self-hosting
2. **Kubernetes** - For scalable production
3. **Cloud Services** - Vercel, Railway, etc.

## Docker Compose Deployment

### Prerequisites

- Docker 24+
- Docker Compose 2.20+
- 2GB+ RAM
- Public IP or domain (for ESP32 connectivity)

### 1. Prepare Environment

```bash
# Clone repository
git clone https://github.com/DuongThanhTaii/UE-Bot.git
cd UE-Bot

# Create production environment file
cp .env.example .env
```

### 2. Configure Environment

Edit `.env`:

```bash
NODE_ENV=production

# API Keys (Required)
OPENAI_API_KEY=sk-xxx
ELEVENLABS_API_KEY=xxx

# URLs (Update with your domain)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com

# Ports
WEBAPP_PORT=3000
BRIDGE_PORT=8080
```

### 3. Build and Start

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Configure Reverse Proxy

**Nginx Configuration:**

```nginx
# /etc/nginx/sites-available/ue-bot

# Webapp
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
    }
}

# Bridge API + WebSocket
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. SSL with Certbot

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificates
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

## Cloud Deployment

### Vercel (Webapp Only)

1. Fork repository
2. Connect to Vercel
3. Set environment variables
4. Deploy

```bash
# Or using CLI
vercel --prod
```

### Railway

1. Create new project
2. Connect GitHub repository
3. Add services from docker-compose.yml
4. Configure environment variables

### DigitalOcean App Platform

1. Create App from GitHub
2. Select docker-compose.yml
3. Configure resources
4. Deploy

## Production Checklist

### Security

- [ ] HTTPS enabled on all endpoints
- [ ] API keys stored securely (not in code)
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints

### Monitoring

- [ ] Health checks configured
- [ ] Logging to external service
- [ ] Error tracking (Sentry, etc.)
- [ ] Uptime monitoring

### Performance

- [ ] CDN for static assets
- [ ] Database connection pooling
- [ ] Redis for caching
- [ ] Compression enabled

### Backup

- [ ] Database backups scheduled
- [ ] Configuration backups
- [ ] Disaster recovery plan

## Scaling Considerations

### Horizontal Scaling

```yaml
# docker-compose.prod.yml
services:
  bridge:
    deploy:
      replicas: 3
```

### Load Balancing

For multiple Bridge Service instances, use Redis for session sharing:

```bash
REDIS_URL=redis://redis:6379
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs bridge

# Check resource usage
docker stats
```

### WebSocket Connection Issues

1. Check firewall allows port 8080
2. Verify nginx WebSocket proxy config
3. Test direct connection without proxy

### Performance Issues

```bash
# Monitor resources
docker stats

# Scale if needed
docker-compose up -d --scale bridge=2
```

## Maintenance

### Updates

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose build
docker-compose up -d
```

### Cleanup

```bash
# Remove unused images
docker system prune -a

# Remove volumes (careful - deletes data!)
docker volume prune
```
