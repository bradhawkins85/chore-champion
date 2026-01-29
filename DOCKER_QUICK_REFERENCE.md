# ChoreQuest Docker Quick Reference

## 🚀 Quick Start

```bash
# Development
docker-compose up -d

# Production with backups
docker-compose -f docker-compose.prod.yml up -d

# Production with SSL
docker-compose -f docker-compose.traefik.yml up -d
```

## 📋 Common Commands

### Using Makefile (Recommended)
```bash
make help          # Show all commands
make init          # Initialize environment
make deploy        # Deploy production
make up            # Start development
make up-prod       # Start production
make logs          # View logs
make restart       # Restart services
make health        # Run health check
make backup        # Create backup
make restore       # Restore from backup
make update        # Update application
make clean         # Clean Docker resources
```

### Direct Docker Compose
```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Logs
docker-compose logs -f

# Restart
docker-compose restart

# Status
docker-compose ps

# Execute command
docker-compose exec chorequest sh
```

## 💾 Data Management

### Backups
```bash
# List backups
ls -lh backups/

# Manual backup
docker exec chorequest-backup /scripts/backup.sh

# Restore
docker exec -it chorequest-backup /scripts/restore.sh backup_file.tar.gz
```

### Volumes
```bash
# List volumes
docker volume ls | grep chorequest

# Inspect volume
docker volume inspect chorequest-data

# Backup volume
docker run --rm \
  -v chorequest-data:/data \
  -v $(pwd)/backup:/backup \
  alpine tar -czf /backup/backup.tar.gz -C /data .

# Restore volume
docker run --rm \
  -v chorequest-data:/data \
  -v $(pwd)/backup:/backup \
  alpine tar -xzf /backup/backup.tar.gz -C /data
```

## 🔍 Monitoring

### Logs
```bash
# Follow logs
docker logs -f chorequest-app

# Last 100 lines
docker logs --tail 100 chorequest-app

# Since timestamp
docker logs --since 1h chorequest-app
```

### Health
```bash
# Container status
docker ps --filter "name=chorequest"

# Health check
docker inspect --format='{{.State.Health.Status}}' chorequest-app

# Resource usage
docker stats chorequest-app
```

## 🛠️ Maintenance

### Update
```bash
# Pull latest
docker-compose pull

# Recreate
docker-compose up -d --force-recreate

# Clean old images
docker image prune -f
```

### Restart
```bash
# Graceful restart
docker-compose stop
docker-compose start

# Force restart
docker-compose restart
```

### Clean Up
```bash
# Remove containers (keeps data)
docker-compose down

# Remove unused images
docker image prune -a -f

# Remove unused volumes
docker volume prune -f

# Clean everything
docker system prune -a -f
```

## 🔐 Security

### Access
```bash
# Shell into container
docker exec -it chorequest-app sh

# View environment
docker exec chorequest-app env

# Check permissions
docker exec chorequest-app ls -la /usr/share/nginx/html/data
```

## 🌐 Network

### Ports
```bash
# Check port binding
docker port chorequest-app

# Test health endpoint
curl http://localhost:8080/health

# Test with custom port
curl http://localhost:${CHOREQUEST_PORT}/health
```

## 📊 Resource Management

### Limits
```bash
# View resource usage
docker stats chorequest-app --no-stream

# View limits
docker inspect chorequest-app | jq '.[0].HostConfig.Memory'

# Disk usage
docker system df -v
```

## 🔄 Environment Variables

```bash
# View from .env
cat .env

# Key variables
CHOREQUEST_PORT=8080
TIMEZONE=America/New_York
DATA_PATH=./data
BACKUP_PATH=./backups
BACKUP_RETENTION_DAYS=30
```

## 🆘 Troubleshooting

### Container won't start
```bash
docker-compose logs chorequest
docker inspect chorequest-app
docker events --filter container=chorequest-app
```

### Port already in use
```bash
sudo lsof -i :8080
# Change port in .env
```

### Permission errors
```bash
sudo chown -R 1000:1000 ./data
sudo chown -R 1000:1000 ./backups
```

### Reset to defaults
```bash
docker-compose down -v
rm -rf ./data/* ./backups/*
docker-compose up -d
```

## 📁 File Locations

```
.
├── docker-compose.yml              # Development
├── docker-compose.prod.yml         # Production
├── docker-compose.traefik.yml      # SSL/Traefik
├── .env                            # Configuration
├── Dockerfile                      # Image definition
├── nginx.conf                      # Web server config
├── Makefile                        # Command shortcuts
├── data/                           # Persistent data
├── backups/                        # Automated backups
└── scripts/
    ├── backup.sh                   # Backup script
    ├── restore.sh                  # Restore script
    ├── deploy.sh                   # Deploy script
    ├── update.sh                   # Update script
    └── health-check.sh             # Health check
```

## 🔗 Useful Links

- Full Guide: [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)
- CI/CD: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Main README: [README.md](./README.md)
