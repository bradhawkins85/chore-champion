# Docker Deployment Guide

This guide provides comprehensive instructions for deploying ChoreQuest in production using Docker and Docker Compose.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Deployment Options](#deployment-options)
- [Volume Persistence](#volume-persistence)
- [Backup and Restore](#backup-and-restore)
- [Updates and Maintenance](#updates-and-maintenance)
- [Monitoring and Health Checks](#monitoring-and-health-checks)
- [SSL/TLS with Traefik](#ssltls-with-traefik)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker 20.10 or later
- Docker Compose 1.29 or later (or Docker Compose V2)
- At least 1GB of available RAM
- At least 2GB of available disk space

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/chorequest.git
cd chorequest
```

### 2. Configure Environment

```bash
cp .env.example .env
nano .env  # Edit configuration
```

Key settings to configure:
- `CHOREQUEST_PORT`: Port to expose the application (default: 8080)
- `TIMEZONE`: Your timezone (e.g., America/New_York)
- `DATA_PATH`: Path for persistent data storage
- `BACKUP_PATH`: Path for backup storage

### 3. Deploy

**Option A: Development/Testing**
```bash
docker-compose up -d
```

**Option B: Production**
```bash
chmod +x scripts/*.sh
./scripts/deploy.sh
```

### 4. Access the Application

Open your browser to `http://localhost:8080` (or your configured port).

## Deployment Options

### Standard Deployment (docker-compose.yml)

Basic deployment for development and testing:

```bash
docker-compose up -d
```

**Features:**
- Simple single-container deployment
- Basic volume persistence
- Health checks enabled
- Logging configured

### Production Deployment (docker-compose.prod.yml)

Enhanced deployment with backup automation:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

**Features:**
- All standard features
- Automated daily backups
- Resource limits configured
- Bind mount volumes for easy access
- Separate backup container

**Configuration:**
```bash
# In .env
DATA_PATH=/var/lib/chorequest/data
BACKUP_PATH=/var/lib/chorequest/backups
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE=0 2 * * *  # Daily at 2 AM
```

### Traefik Deployment (docker-compose.traefik.yml)

Production deployment with automatic SSL/TLS:

```bash
docker-compose -f docker-compose.traefik.yml up -d
```

**Features:**
- All production features
- Automatic SSL certificates via Let's Encrypt
- HTTP to HTTPS redirect
- Traefik reverse proxy
- Dashboard for monitoring

**Configuration:**
```bash
# In .env
DOMAIN=chorequest.example.com
ACME_EMAIL=admin@example.com
TRAEFIK_BASIC_AUTH=admin:$$apr1$$...  # Generated with htpasswd
```

Generate Traefik auth:
```bash
htpasswd -nb admin yourpassword
```

## Volume Persistence

ChoreQuest uses Docker volumes to persist data between container restarts and updates.

### Volume Structure

```
chorequest-data/          # Application data
  ├── children/           # Child profiles
  ├── chores/            # Chore definitions
  ├── completions/       # Completion records
  ├── rewards/           # Reward definitions
  └── settings/          # Application settings

chorequest-backups/       # Automated backups
  ├── chorequest_backup_20240101_020000.tar.gz
  ├── chorequest_backup_20240102_020000.tar.gz
  └── ...
```

### Volume Locations

**Named Volumes (docker-compose.yml):**
```bash
# Inspect volume location
docker volume inspect chorequest-data

# Access data directly
docker run --rm -v chorequest-data:/data -it alpine sh
```

**Bind Mounts (docker-compose.prod.yml):**
```bash
# Data is stored in the paths specified in .env
ls -la ./data
ls -la ./backups
```

### Manual Volume Management

**Create data directories:**
```bash
mkdir -p /var/lib/chorequest/data
mkdir -p /var/lib/chorequest/backups
chown -R 1000:1000 /var/lib/chorequest
```

**Backup volume manually:**
```bash
docker run --rm \
  -v chorequest-data:/data \
  -v $(pwd)/backup:/backup \
  alpine tar -czf /backup/chorequest-$(date +%Y%m%d).tar.gz -C /data .
```

**Restore volume manually:**
```bash
docker run --rm \
  -v chorequest-data:/data \
  -v $(pwd)/backup:/backup \
  alpine tar -xzf /backup/chorequest-20240101.tar.gz -C /data
```

## Backup and Restore

### Automated Backups

The production deployment includes an automated backup container that runs on a schedule.

**View backup logs:**
```bash
docker logs chorequest-backup
```

**List available backups:**
```bash
ls -lh ./backups/
```

**Manual backup trigger:**
```bash
docker exec chorequest-backup /scripts/backup.sh
```

### Restore from Backup

**Interactive restore:**
```bash
docker exec -it chorequest-backup /scripts/restore.sh chorequest_backup_20240101_020000.tar.gz
```

**Automated restore script:**
```bash
./scripts/restore.sh chorequest_backup_20240101_020000.tar.gz
```

### Backup Configuration

Edit `.env` to configure backup behavior:

```bash
# Backup retention period
BACKUP_RETENTION_DAYS=30

# Cron schedule (default: daily at 2 AM)
BACKUP_SCHEDULE=0 2 * * *

# Examples:
# Every 6 hours: 0 */6 * * *
# Twice daily: 0 2,14 * * *
# Weekly: 0 2 * * 0
```

### Off-site Backups

**Sync to remote storage:**
```bash
# Example: rsync to remote server
rsync -avz ./backups/ user@backup-server:/backups/chorequest/

# Example: sync to cloud storage
aws s3 sync ./backups/ s3://my-bucket/chorequest-backups/
```

**Automated sync cron job:**
```bash
# Add to crontab
0 3 * * * rsync -avz /var/lib/chorequest/backups/ user@backup-server:/backups/chorequest/
```

## Updates and Maintenance

### Update Application

**Using update script:**
```bash
./scripts/update.sh
```

**Manual update:**
```bash
# Pull latest image
docker-compose -f docker-compose.prod.yml pull

# Recreate containers
docker-compose -f docker-compose.prod.yml up -d --force-recreate

# Remove old images
docker image prune -f
```

### View Logs

**Real-time logs:**
```bash
docker-compose logs -f chorequest
```

**Last 100 lines:**
```bash
docker-compose logs --tail 100 chorequest
```

**Logs with timestamps:**
```bash
docker-compose logs -f -t chorequest
```

### Restart Services

**Restart all services:**
```bash
docker-compose restart
```

**Restart specific service:**
```bash
docker-compose restart chorequest
```

**Graceful restart:**
```bash
docker-compose stop
docker-compose start
```

### Clean Up

**Remove containers (keeps data):**
```bash
docker-compose down
```

**Remove containers and networks:**
```bash
docker-compose down --remove-orphans
```

**Remove everything including volumes (⚠️ DELETES DATA):**
```bash
docker-compose down -v
```

**Clean up disk space:**
```bash
# Remove unused images
docker image prune -a -f

# Remove unused volumes
docker volume prune -f

# Remove everything unused
docker system prune -a -f
```

## Monitoring and Health Checks

### Health Check Script

```bash
./scripts/health-check.sh
```

### Check Container Status

```bash
# Container health
docker ps --filter "name=chorequest"

# Detailed health info
docker inspect --format='{{.State.Health.Status}}' chorequest-app

# Resource usage
docker stats chorequest-app
```

### Monitor Logs

```bash
# Application logs
docker logs -f chorequest-app

# Backup logs
docker logs -f chorequest-backup

# Traefik logs (if using Traefik)
docker logs -f chorequest-traefik
```

### Disk Space Monitoring

```bash
# Check volume usage
docker system df -v

# Check data volume
df -h /var/lib/chorequest/data

# Check backup volume
du -sh /var/lib/chorequest/backups
```

### Health Endpoints

**Application health:**
```bash
curl http://localhost:8080/health
```

**Docker health check:**
```bash
docker inspect --format='{{json .State.Health}}' chorequest-app | jq
```

## SSL/TLS with Traefik

### Setup

1. **Configure DNS:**
   Point your domain to your server's IP address.

2. **Configure environment:**
   ```bash
   # In .env
   DOMAIN=chorequest.example.com
   ACME_EMAIL=admin@example.com
   ```

3. **Deploy with Traefik:**
   ```bash
   docker-compose -f docker-compose.traefik.yml up -d
   ```

4. **Verify SSL:**
   ```bash
   curl https://chorequest.example.com/health
   ```

### Traefik Dashboard

Access the Traefik dashboard at `http://your-server:8888` (or `https://traefik.chorequest.example.com` if configured).

**Default credentials:**
- Username: admin
- Password: (set in TRAEFIK_BASIC_AUTH)

### Certificate Management

**Certificate location:**
```bash
docker volume inspect traefik-certs
```

**Force certificate renewal:**
```bash
docker-compose -f docker-compose.traefik.yml restart traefik
```

**Backup certificates:**
```bash
docker run --rm \
  -v traefik-certs:/certs \
  -v $(pwd)/cert-backup:/backup \
  alpine cp /certs/acme.json /backup/
```

## Troubleshooting

### Container Won't Start

**Check logs:**
```bash
docker-compose logs chorequest
```

**Check resource limits:**
```bash
docker stats
free -h
df -h
```

**Verify configuration:**
```bash
docker-compose config
```

### Port Already in Use

**Find conflicting process:**
```bash
sudo lsof -i :8080
```

**Change port in .env:**
```bash
CHOREQUEST_PORT=8081
```

### Permission Errors

**Fix volume permissions:**
```bash
sudo chown -R 1000:1000 /var/lib/chorequest
```

**Check SELinux (if applicable):**
```bash
sudo chcon -Rt svirt_sandbox_file_t /var/lib/chorequest
```

### Data Loss Prevention

**Always create backups before:**
- Updating the application
- Changing volume configuration
- Moving to a new server

**Verify backups regularly:**
```bash
# Test restore to temporary volume
docker volume create test-restore
docker run --rm \
  -v test-restore:/data \
  -v $(pwd)/backups:/backups \
  alpine tar -xzf /backups/chorequest_backup_latest.tar.gz -C /data
docker volume rm test-restore
```

### Reset to Factory Defaults

**⚠️ WARNING: This deletes all data!**

```bash
docker-compose down -v
rm -rf ./data/* ./backups/*
docker-compose up -d
```

## Performance Tuning

### Resource Limits

Edit `docker-compose.prod.yml` to adjust resources:

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 256M
```

### Nginx Optimization

Edit `nginx.conf` for high-traffic scenarios:

```nginx
worker_processes auto;
worker_connections 2048;
keepalive_timeout 65;
```

### Volume Performance

Use dedicated disk/partition for volumes:

```bash
# Create dedicated partition
sudo mkdir /mnt/chorequest
sudo mount /dev/sdb1 /mnt/chorequest

# Update .env
DATA_PATH=/mnt/chorequest/data
BACKUP_PATH=/mnt/chorequest/backups
```

## Security Best Practices

1. **Use strong parent PIN codes**
2. **Enable IP restrictions for sensitive networks**
3. **Keep Docker and images updated**
4. **Use SSL/TLS in production (Traefik deployment)**
5. **Regularly backup data**
6. **Limit container resources**
7. **Use firewall rules**
8. **Monitor access logs**

## Production Checklist

- [ ] Copy and configure `.env` file
- [ ] Set appropriate `DATA_PATH` and `BACKUP_PATH`
- [ ] Configure `TIMEZONE`
- [ ] Set up automated backups
- [ ] Configure SSL/TLS (if public-facing)
- [ ] Set resource limits
- [ ] Configure firewall rules
- [ ] Set up monitoring
- [ ] Test backup and restore procedures
- [ ] Document parent PIN (securely)
- [ ] Set up log rotation
- [ ] Configure off-site backup sync

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/chorequest/issues
- Documentation: See README.md

## License

ChoreQuest is open-source software. See LICENSE file for details.
