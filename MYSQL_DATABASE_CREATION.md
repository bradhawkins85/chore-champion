# MySQL Database Creation in Docker Deployment

## Overview

**YES**, the MySQL database **IS automatically created** as part of the Docker deployment. This document explains how it works and provides verification steps.

## How Database Creation Works

The ChoreQuest application uses a multi-layered approach to ensure the MySQL database is properly created and initialized:

### 1. Automatic Database Creation via Environment Variable

The MySQL official Docker image automatically creates a database when you provide the `MYSQL_DATABASE` environment variable. Both `docker-compose.yml` and `docker-compose.prod.yml` include:

```yaml
environment:
  - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-rootpassword}
  - MYSQL_DATABASE=${MYSQL_DATABASE:-chorequest}  # This creates the database
  - MYSQL_USER=${MYSQL_USER:-chorequest}
  - MYSQL_PASSWORD=${MYSQL_PASSWORD:-chorequest}
```

**What happens**: When the MySQL container starts for the first time, the entrypoint script reads the `MYSQL_DATABASE` environment variable and automatically creates a database with that name.

### 2. Explicit Database Creation via Initialization Script

For additional assurance and better logging, we provide an initialization script in `mysql-init/01-create-database.sql`:

```sql
CREATE DATABASE IF NOT EXISTS chorequest 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;
```

This script is mounted to `/docker-entrypoint-initdb.d/` in the container and is automatically executed when the container starts for the first time.

```yaml
volumes:
  - mysql-data:/var/lib/mysql
  - ./mysql-init:/docker-entrypoint-initdb.d:ro
```

**What happens**: The MySQL Docker image looks for `.sql` files in `/docker-entrypoint-initdb.d/` and executes them in alphabetical order during initialization.

### 3. Table Schema Creation via Application Code

Once the database exists, the Node.js API server creates the required tables on startup. See `server/src/config/database.ts`:

```typescript
export async function initDatabase() {
  const connection = await pool.getConnection();
  try {
    // Create tables for all data entities
    await connection.query(`
      CREATE TABLE IF NOT EXISTS kv_store (
        key_name VARCHAR(255) PRIMARY KEY,
        value_data LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('Database initialized successfully');
  } finally {
    connection.release();
  }
}
```

The `initDatabase()` function is called from `server/src/index.ts` during startup:

```typescript
async function start() {
  try {
    console.log('Initializing database...');
    await initDatabase();  // Creates tables
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}
```

## Startup Order

The Docker Compose configuration ensures services start in the correct order:

1. **MySQL Container** starts first
2. **Health Check** waits for MySQL to be ready (30s timeout, 5 retries)
3. **API Server** starts only after MySQL is healthy
4. **Frontend** starts only after API is healthy

```yaml
depends_on:
  mysql:
    condition: service_healthy  # Waits for MySQL health check
```

## Verification Steps

### Quick Verification

Run the automated verification script:

```bash
./test-mysql-database-creation.sh
```

This script validates:
- Docker and Docker Compose are available
- Configuration files are valid
- Initialization scripts are in place
- Environment variables are configured
- Documentation is complete

### Manual Verification Steps

### 1. Verify Database Exists

After starting the containers, check that the database was created:

```bash
docker exec -it chorequest-mysql mysql -u chorequest -pchorequest -e "SHOW DATABASES;"
```

Expected output:
```
+--------------------+
| Database           |
+--------------------+
| chorequest         |
| information_schema |
+--------------------+
```

### 2. Verify Tables Exist

Check that the application created the required tables:

```bash
docker exec -it chorequest-mysql mysql -u chorequest -pchorequest chorequest -e "SHOW TABLES;"
```

Expected output:
```
+----------------------+
| Tables_in_chorequest |
+----------------------+
| kv_store             |
+----------------------+
```

### 3. Check Table Schema

Verify the table structure:

```bash
docker exec -it chorequest-mysql mysql -u chorequest -pchorequest chorequest -e "DESCRIBE kv_store;"
```

Expected output:
```
+------------+---------------+------+-----+-------------------+-------+
| Field      | Type          | Null | Key | Default           | Extra |
+------------+---------------+------+-----+-------------------+-------+
| key_name   | varchar(255)  | NO   | PRI | NULL              |       |
| value_data | longtext      | NO   |     | NULL              |       |
| created_at | timestamp     | YES  |     | CURRENT_TIMESTAMP |       |
| updated_at | timestamp     | YES  |     | CURRENT_TIMESTAMP |       |
+------------+---------------+------+-----+-------------------+-------+
```

### 4. Check MySQL Container Logs

View the initialization logs:

```bash
docker logs chorequest-mysql 2>&1 | grep -i "database\|ready"
```

You should see messages indicating:
- Database was created
- MySQL is ready for connections

### 5. Check API Server Logs

Verify that the API server successfully initialized the database:

```bash
docker logs chorequest-api | grep -i "database\|initialized"
```

Expected output:
```
Initializing database...
Database initialized successfully
Server running on port 3000
```

### 6. Test via API

Make a test request to verify the database is working:

```bash
# Health check
curl http://localhost:8080/api/health

# Test KV store (should return empty data initially)
curl http://localhost:8080/api/kv
```

## Troubleshooting

### Issue: Database Not Created

**Symptoms**: API logs show connection errors like "Unknown database 'chorequest'"

**Solutions**:

1. **Check environment variables**:
   ```bash
   docker exec chorequest-mysql env | grep MYSQL
   ```
   Verify that `MYSQL_DATABASE=chorequest`

2. **Check if data directory was pre-existing**:
   If the MySQL volume already had data from a previous installation, the initialization scripts won't run. To start fresh:
   ```bash
   docker-compose down
   docker volume rm mysql-data
   docker-compose up -d
   ```
   **WARNING**: This deletes all existing data!

3. **Verify initialization scripts are mounted**:
   ```bash
   docker exec chorequest-mysql ls -la /docker-entrypoint-initdb.d/
   ```
   You should see the SQL files.

### Issue: Container Won't Start

**Symptoms**: MySQL container keeps restarting

**Solutions**:

1. **Check logs for errors**:
   ```bash
   docker logs chorequest-mysql
   ```

2. **Verify port 3306 is not in use**:
   ```bash
   netstat -tuln | grep 3306
   ```

3. **Check disk space**:
   ```bash
   df -h
   ```

### Issue: Permission Errors

**Symptoms**: MySQL complains about file permissions

**Solutions**:

For production deployment with bind mounts:
```bash
mkdir -p ./mysql-data
chmod 755 ./mysql-data
```

## Summary

✅ **The MySQL database IS automatically created** through three mechanisms:
1. `MYSQL_DATABASE` environment variable (primary method)
2. Initialization SQL script (explicit confirmation)
3. Application code creates tables on startup

✅ **No manual steps required** - everything is automated

✅ **Multiple safety checks** ensure proper initialization

✅ **Health checks** prevent race conditions and ensure services start in order

For more information, see:
- [MYSQL_BACKEND.md](MYSQL_BACKEND.md) - Complete MySQL setup guide
- [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) - Docker deployment guide
- [MySQL Docker Hub](https://hub.docker.com/_/mysql) - Official MySQL image documentation
