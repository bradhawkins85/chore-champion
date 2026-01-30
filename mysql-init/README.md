# MySQL Initialization Scripts

This directory contains SQL scripts that are automatically executed when the MySQL container starts for the first time.

## How It Works

The official MySQL Docker image automatically executes files with extensions `.sh`, `.sql`, `.sql.gz`, `.sql.bz2`, `.sql.xz`, and `.sql.zst` that are found in `/docker-entrypoint-initdb.d`.

Files are executed in alphabetical order, which is why the scripts are numbered.

## Scripts

- **01-create-database.sql**: Creates the chorequest database with proper character set and collation

## Note

The database is also created automatically via the `MYSQL_DATABASE` environment variable in docker-compose.yml. This script provides an additional layer of assurance and logging.

The actual table schema is created by the Node.js application when it starts (see `server/src/config/database.ts`).

## When Scripts Run

These scripts only run when:
1. The container starts for the first time
2. The data directory is empty (no existing database)

If you want to re-run these scripts:
1. Stop the containers: `docker-compose down` or `docker compose down`
2. Remove the MySQL volume: `docker compose down -v` (removes all volumes) or `docker volume rm chorequest_mysql-data`
3. Start the containers: `docker-compose up -d` or `docker compose up -d`

**WARNING**: Removing the volume will delete all existing data!
