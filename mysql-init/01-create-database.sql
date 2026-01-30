-- ChoreQuest MySQL Database Initialization Script
-- This script ensures the database exists and is properly configured
-- It runs automatically when the MySQL container starts for the first time

-- Create database if it doesn't exist (this is redundant with MYSQL_DATABASE env var, but explicit is better)
CREATE DATABASE IF NOT EXISTS chorequest CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Verify the database was created
SELECT 'Database chorequest created successfully' AS status;

-- Show all databases for verification
SHOW DATABASES;
