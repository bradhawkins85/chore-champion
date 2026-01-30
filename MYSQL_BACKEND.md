# MySQL Backend Setup

ChoreQuest now includes MySQL database backend support for persistent data storage when deployed in Docker.

> **📘 Database Creation**: For details on how the MySQL database is automatically created during deployment, see [MYSQL_DATABASE_CREATION.md](MYSQL_DATABASE_CREATION.md).

## Features

- **Persistent Storage**: All application data is stored in MySQL instead of browser localStorage
- **Centralized Data**: Multiple users can access the same data from different browsers
- **Automatic Configuration**: MySQL is automatically configured when using Docker Compose
- **Data Migration**: Utilities to migrate existing localStorage data to MySQL

## Architecture

The application now consists of three main services:

1. **Frontend (nginx)**: Static React application served by nginx
2. **Backend API (Node.js)**: Express API server that handles data operations
3. **MySQL Database**: Persistent data storage

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ↓ HTTP
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│   nginx     │───────>│   API       │───────>│   MySQL     │
│  (Port 80)  │ Proxy  │ (Port 3000) │        │ (Port 3306) │
└─────────────┘        └─────────────┘        └─────────────┘
```

## Quick Start

### 1. Configure Environment

Copy the example environment file and configure MySQL credentials:

```bash
cp .env.example .env
nano .env
```

Key MySQL settings:
```env
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=chorequest
MYSQL_USER=chorequest
MYSQL_PASSWORD=chorequest
```

**Important**: Change the default passwords in production!

### 2. Deploy with Docker Compose

```bash
docker-compose up -d
```

This will start:
- MySQL database
- Backend API server
- Frontend application

### 3. Verify Deployment

Check that all services are running:

```bash
docker-compose ps
```

You should see three services:
- `chorequest-mysql` (healthy)
- `chorequest-api` (healthy)
- `chorequest-app` (healthy)

Access the application at `http://localhost:8080`

## Data Migration

If you have existing data in localStorage (from a previous deployment), you can migrate it to MySQL:

### Automatic Migration

The application includes a migration utility. Open the browser console and run:

```javascript
// Import the migration function
import { migrateToApi } from './hooks/use-api-kv';

// Run migration
await migrateToApi();
```

This will copy all localStorage data to the MySQL database.

### Manual Migration

You can also manually export/import data using the API:

1. **Export from browser:**
   ```javascript
   const data = {};
   for (let i = 0; i < localStorage.length; i++) {
     const key = localStorage.key(i);
     if (key) data[key] = JSON.parse(localStorage.getItem(key));
   }
   console.log(JSON.stringify(data));
   ```

2. **Import to MySQL:**
   ```bash
   curl -X POST http://localhost:8080/api/kv \
     -H "Content-Type: application/json" \
     -d @data.json
   ```

## Database Management

### Accessing MySQL

Connect to the MySQL database:

```bash
docker exec -it chorequest-mysql mysql -u chorequest -p
# Enter password when prompted
```

### Viewing Data

Query the key-value store:

```sql
USE chorequest;
SELECT key_name, LEFT(value_data, 100) FROM kv_store;
```

### Backup Database

Create a backup:

```bash
docker exec chorequest-mysql mysqldump -u chorequest -p chorequest > backup.sql
```

### Restore Database

Restore from backup:

```bash
docker exec -i chorequest-mysql mysql -u chorequest -p chorequest < backup.sql
```

### Reset Database

**Warning**: This will delete all data!

```bash
docker exec -it chorequest-mysql mysql -u root -p -e "DROP DATABASE chorequest; CREATE DATABASE chorequest;"
```

## Production Deployment

For production use `docker-compose.prod.yml`:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Production Configuration

In your `.env` file:

```env
# Use strong passwords
MYSQL_ROOT_PASSWORD=<strong-random-password>
MYSQL_PASSWORD=<strong-random-password>

# Configure data paths
MYSQL_DATA_PATH=/var/lib/chorequest/mysql
DATA_PATH=/var/lib/chorequest/data
BACKUP_PATH=/var/lib/chorequest/backups
```

### Security Best Practices

1. **Change default passwords**: Never use default passwords in production
2. **Restrict network access**: MySQL is only accessible within the Docker network
3. **Regular backups**: Set up automated database backups
4. **Update regularly**: Keep MySQL and all containers updated
5. **Monitor logs**: Check logs for suspicious activity

## Troubleshooting

### MySQL Container Won't Start

**Check logs:**
```bash
docker logs chorequest-mysql
```

**Common issues:**
- Port 3306 already in use
- Insufficient disk space
- Permission errors on volume

### API Can't Connect to MySQL

**Check MySQL is healthy:**
```bash
docker ps --filter "name=chorequest-mysql"
```

**Check API logs:**
```bash
docker logs chorequest-api
```

**Verify network:**
```bash
docker network inspect chorequest-network
```

### Data Not Persisting

**Check volumes:**
```bash
docker volume ls | grep mysql
docker volume inspect mysql-data
```

**Verify data directory (prod):**
```bash
ls -la /var/lib/chorequest/mysql
```

### Connection Errors

If you see "Connection refused" errors:

1. Wait for MySQL to fully start (can take 30+ seconds)
2. Check healthcheck status
3. Verify credentials in .env match docker-compose

### Performance Issues

For better performance:

1. **Adjust MySQL settings**: Create a custom MySQL config
2. **Increase resources**: Adjust Docker resource limits
3. **Use connection pooling**: Already configured in the API

## API Reference

The backend API provides the following endpoints:

### Health Check
```
GET /api/health
```

### Get Value
```
GET /api/kv/:key
```

### Set Value
```
POST /api/kv/:key
Body: { "value": <any> }
```

### Delete Value
```
DELETE /api/kv/:key
```

### Get All Data
```
GET /api/kv
```

### Bulk Set (Migration)
```
POST /api/kv
Body: { "key1": value1, "key2": value2, ... }
```

## Monitoring

### Health Checks

All services include health checks:

```bash
# Check MySQL
docker exec chorequest-mysql mysqladmin ping -h localhost -u root -p

# Check API
curl http://localhost:8080/api/health

# Check frontend
curl http://localhost:8080/health
```

### Logs

View logs for each service:

```bash
# MySQL logs
docker logs -f chorequest-mysql

# API logs
docker logs -f chorequest-api

# Frontend/nginx logs
docker logs -f chorequest-app
```

### Resource Usage

Monitor resource usage:

```bash
docker stats
```

## Advanced Configuration

### Custom MySQL Configuration

Create `mysql.cnf` and mount it:

```yaml
volumes:
  - ./mysql.cnf:/etc/mysql/conf.d/custom.cnf:ro
```

### Multiple Environments

Use different compose files for different environments:

```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d

# Testing
docker-compose -f docker-compose.test.yml up -d
```

### Scaling

To handle more traffic, you can scale the API service:

```bash
docker-compose up -d --scale api=3
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/chorequest/issues
- Documentation: See README.md and DOCKER_DEPLOYMENT.md
