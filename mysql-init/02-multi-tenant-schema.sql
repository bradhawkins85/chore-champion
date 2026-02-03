-- Multi-tenant schema for ChoreQuest
-- This script is for reference only - the actual schema is created by the API server
-- See server/src/config/database.ts for the implementation

USE chorequest;

-- These tables will be created automatically by the server on startup:
-- 1. tenants - stores tenant information
-- 2. users - stores user accounts with email/password
-- 3. kv_store - updated to include tenant_id for data isolation

-- Note: Existing kv_store data will be assigned to "legacy" tenant automatically

SELECT 'Multi-tenant schema will be created automatically on server start' AS status;
