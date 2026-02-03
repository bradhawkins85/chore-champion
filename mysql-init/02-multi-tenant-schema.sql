-- Multi-tenant schema for ChoreQuest
-- This script creates the necessary tables for multi-tenant support

USE chorequest;

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id VARCHAR(36) PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(36) NOT NULL,
  role ENUM('parent', 'admin') DEFAULT 'parent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_email (email),
  INDEX idx_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add tenant_id to kv_store table if it doesn't exist
-- This allows for multi-tenant data isolation
ALTER TABLE kv_store 
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) DEFAULT NULL,
  ADD INDEX IF NOT EXISTS idx_tenant_id (tenant_id),
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (key_name, tenant_id);

-- For existing data without tenant_id, we'll set it to NULL
-- This will need to be migrated or deleted based on deployment strategy

SELECT 'Multi-tenant schema created successfully' AS status;
