# ChoreQuest Deployment Guide

This guide covers various deployment scenarios for ChoreQuest.

## 📋 Table of Contents
- [Docker Deployment](#docker-deployment)
- [Raspberry Pi Deployment](#raspberry-pi-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Reverse Proxy Setup](#reverse-proxy-setup)
- [SSL/HTTPS Configuration](#sslhttps-configuration)

---

## 🐳 Docker Deployment

### Standard Docker Deployment

```bash
# Clone repository
git clone https://github.com/yourusername/chorequest.git
cd chorequest

# Start with Docker Compose
docker-compose up -d

# Access at http://localhost:3000
```

### Custom Port

Edit `docker-compose.yml`:
```yaml
ports:
  - "8080:3000"  # Change 8080 to your preferred port
```

### Using Specific Version

```bash
# Tag your version
docker build -t chorequest:v1.0.0 .

# Update docker-compose.yml to use specific version
services:
  chorequest:
    image: chorequest:v1.0.0
```

---

## 🍓 Raspberry Pi Deployment

ChoreQuest works great on Raspberry Pi for a dedicated home server!

### Requirements
- Raspberry Pi 3B+ or newer
- Raspberry Pi OS (32-bit or 64-bit)
- At least 1GB free storage
- Docker installed

### Installation Steps

1. **Install Docker on Raspberry Pi**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

2. **Install Docker Compose**
   ```bash
   sudo apt-get install docker-compose
   ```

3. **Clone and Deploy**
   ```bash
   git clone https://github.com/yourusername/chorequest.git
   cd chorequest
   docker-compose up -d
   ```

4. **Access ChoreQuest**
   ```
   http://[raspberry-pi-ip]:3000
   ```

5. **Find Your Pi's IP Address**
   ```bash
   hostname -I
   ```

### Auto-Start on Boot

Docker containers will automatically restart with `restart: unless-stopped` in docker-compose.yml.

### Performance Tips for Pi
- Use Raspberry Pi 4 with 4GB+ RAM for best performance
- Consider using SSD instead of SD card for better I/O
- Monitor temperature: `vcgencmd measure_temp`

---

## ☁️ Cloud Deployment

### Docker Hub

1. **Build and Push Image**
   ```bash
   docker build -t yourusername/chorequest:latest .
   docker push yourusername/chorequest:latest
   ```

2. **Deploy on Cloud Provider**
   ```bash
   docker run -d -p 3000:3000 yourusername/chorequest:latest
   ```

### DigitalOcean

1. Create a Droplet (Docker Marketplace)
2. SSH into your droplet
3. Clone and run:
   ```bash
   git clone https://github.com/yourusername/chorequest.git
   cd chorequest
   docker-compose up -d
   ```

### AWS EC2

1. Launch EC2 instance (Amazon Linux 2 or Ubuntu)
2. Install Docker:
   ```bash
   sudo yum update -y
   sudo yum install docker -y
   sudo service docker start
   sudo usermod -aG docker ec2-user
   ```
3. Deploy ChoreQuest:
   ```bash
   git clone https://github.com/yourusername/chorequest.git
   cd chorequest
   docker-compose up -d
   ```

### Google Cloud Run

1. **Build for Cloud Run**
   ```bash
   gcloud builds submit --tag gcr.io/[PROJECT-ID]/chorequest
   ```

2. **Deploy**
   ```bash
   gcloud run deploy chorequest \
     --image gcr.io/[PROJECT-ID]/chorequest \
     --platform managed \
     --port 3000 \
     --allow-unauthenticated
   ```

### Heroku

1. **Create heroku.yml**
   ```yaml
   build:
     docker:
       web: Dockerfile
   ```

2. **Deploy**
   ```bash
   heroku create chorequest-app
   git push heroku main
   ```

---

## 🔒 Reverse Proxy Setup

### Nginx

Create `/etc/nginx/sites-available/chorequest`:

```nginx
server {
    listen 80;
    server_name chorequest.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/chorequest /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Apache

Enable required modules:
```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
```

Create `/etc/apache2/sites-available/chorequest.conf`:

```apache
<VirtualHost *:80>
    ServerName chorequest.yourdomain.com

    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    ErrorLog ${APACHE_LOG_DIR}/chorequest-error.log
    CustomLog ${APACHE_LOG_DIR}/chorequest-access.log combined
</VirtualHost>
```

Enable the site:
```bash
sudo a2ensite chorequest
sudo systemctl reload apache2
```

### Traefik

Add labels to `docker-compose.yml`:

```yaml
services:
  chorequest:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.chorequest.rule=Host(`chorequest.yourdomain.com`)"
      - "traefik.http.routers.chorequest.entrypoints=web"
      - "traefik.http.services.chorequest.loadbalancer.server.port=3000"
```

---

## 🔐 SSL/HTTPS Configuration

### Let's Encrypt with Nginx

1. **Install Certbot**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   ```

2. **Obtain Certificate**
   ```bash
   sudo certbot --nginx -d chorequest.yourdomain.com
   ```

3. **Auto-renewal is configured automatically**

### Let's Encrypt with Docker Compose

Add to `docker-compose.yml`:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    depends_on:
      - chorequest

  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
```

### Self-Signed Certificate (Development Only)

```bash
# Generate certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /path/to/private.key \
  -out /path/to/certificate.crt

# Update nginx config to use SSL
listen 443 ssl;
ssl_certificate /path/to/certificate.crt;
ssl_certificate_key /path/to/private.key;
```

---

## 📊 Monitoring

### Docker Stats

```bash
# Real-time stats
docker stats chorequest

# Resource usage
docker-compose top
```

### Health Check

ChoreQuest includes a health check endpoint:

```bash
# Check health
curl http://localhost:3000

# With Docker
docker inspect chorequest | grep Health -A 10
```

### Logs

```bash
# View logs
docker-compose logs -f chorequest

# Last 100 lines
docker-compose logs --tail=100 chorequest

# Save logs to file
docker-compose logs chorequest > chorequest.log
```

---

## 🔄 Updates

### Update ChoreQuest

```bash
# Stop current container
docker-compose down

# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose build --no-cache
docker-compose up -d

# Verify
docker-compose ps
```

### Backup Before Update

```bash
# Backup data
docker cp chorequest:/app/data ./backup-$(date +%Y%m%d)

# Or with docker-compose
docker run --rm -v chorequest_chorequest-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/backup-$(date +%Y%m%d).tar.gz /data
```

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 [PID]

# Or change ChoreQuest port in docker-compose.yml
```

### Container Won't Start

```bash
# Check logs
docker-compose logs chorequest

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Out of Disk Space

```bash
# Clean up Docker
docker system prune -a
docker volume prune

# Check disk usage
df -h
```

---

## 📞 Support

For deployment issues:
- 📖 Check the [README.md](README.md)
- 🐛 Open an [Issue](https://github.com/yourusername/chorequest/issues)
- 💬 Ask in [Discussions](https://github.com/yourusername/chorequest/discussions)

---

**Happy Deploying! 🚀**
