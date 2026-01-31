# ChoreQuest - Quick Start Guide

## 🚀 Getting Started in 2 Minutes

### Option 1: Docker (Recommended)
```bash
docker-compose up -d
```
Access at: http://localhost:8080

### Option 2: Using Deploy Script
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh start
```

### Option 3: Pre-built Image
```bash
docker pull ghcr.io/YOUR_USERNAME/chorequest:latest
docker run -d -p 8080:80 --name chorequest ghcr.io/YOUR_USERNAME/chorequest:latest
```

## 📋 Common Commands

### Docker Management
```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Restart
docker-compose restart

# View logs
docker-compose logs -f

# Rebuild
docker-compose up -d --build
```

### Using Deploy Script
```bash
./scripts/deploy.sh start    # Start application
./scripts/deploy.sh stop     # Stop application
./scripts/deploy.sh restart  # Restart application
./scripts/deploy.sh logs     # View logs
./scripts/deploy.sh build    # Build application
./scripts/deploy.sh docker   # Build Docker image
./scripts/deploy.sh clean    # Clean everything
```

### Development
```bash
# Quick start (recommended - starts MySQL, API, and frontend)
./dev.sh

# Or manually:
# 1. Start MySQL
docker run -d --name chorequest-mysql-dev \
  -e MYSQL_ROOT_PASSWORD=rootpassword \
  -e MYSQL_DATABASE=chorequest \
  -e MYSQL_USER=chorequest \
  -e MYSQL_PASSWORD=chorequest \
  -p 3306:3306 mysql:8.0

# 2. Install dependencies
npm install
cd server && npm install && cd ..

# 3. Start API server (terminal 1)
cd server && MYSQL_HOST=localhost MYSQL_USER=chorequest MYSQL_PASSWORD=chorequest npm run dev

# 4. Start frontend (terminal 2)
npm run dev         # Access at localhost:5000
```

## 🔧 Configuration

### Initial Setup
1. Open http://localhost:8080
2. Create Parent PIN
3. Enter Parent Mode (gear icon)
4. Add children in "Children" tab
5. Create chores in "Chores" tab
6. Add rewards in "Rewards" tab

### Optional Features
- **Email Alerts**: Settings → Email Settings
- **Weather**: Settings → Weather
- **IP Restrictions**: Security → IP Restrictions
- **Calendar**: Edit child → Calendar Feed URL

## 🔐 Security

### Parent PIN
- Set on first access
- Required for Parent Mode
- Can be changed in Settings

### Biometric Auth
- Enable in Settings → Security
- Works on PWA installations
- Requires device support

### IP Restrictions
- Settings → Security → IP Restrictions
- CIDR notation (192.168.1.0/24)
- Optional override PIN

## 📱 PWA Installation

### iOS
1. Open in Safari
2. Share → Add to Home Screen

### Android
1. Open in Chrome
2. Menu → Install app

### Desktop
1. Address bar install icon
2. Or: Menu → Install ChoreQuest

## 🐛 Troubleshooting

### Port Already in Use
Edit `docker-compose.yml`:
```yaml
ports:
  - "8080:80"  # Change 8080 to another port
```

### Container Won't Start
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Check Health Status
```bash
curl http://localhost:8080/health
```

### View Detailed Logs
```bash
docker logs chorequest --tail 100 -f
```

## 📊 Data & Privacy

- All data stored locally in browser
- No external servers (except optional email/weather)
- Weather from Open-Meteo (privacy-friendly)
- Calendar feeds fetched directly

## 🔄 Updates

### Manual Update
```bash
docker-compose down
docker-compose pull
docker-compose up -d
```

### Auto-update (with Watchtower)
```bash
docker run -d \
  --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  chorequest
```

## 📚 Documentation

- **Full README**: [README.md](./README.md)
- **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **CI/CD Guide**: [CI-CD.md](./CI-CD.md)

## 🆘 Support

- Issues: https://github.com/YOUR_USERNAME/chorequest/issues
- Discussions: https://github.com/YOUR_USERNAME/chorequest/discussions

## ⚡ Performance Tips

1. Use Docker for best performance
2. Enable PWA for offline access
3. Configure cache headers for static hosting
4. Use CDN for global users

## 🎯 Quick Tips

- **First Time**: Set up Parent PIN immediately
- **Security**: Enable IP restrictions for home network
- **Kids**: Install as PWA on their tablets
- **Parents**: Set up email alerts for purchases
- **Backup**: Export data periodically (future feature)

---

**Need Help?** Check the [full documentation](./README.md) or open an [issue](https://github.com/YOUR_USERNAME/chorequest/issues).
