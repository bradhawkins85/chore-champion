# Multi-Tenant Authentication Guide

## Overview

ChoreQuest now supports multi-tenant authentication, allowing parents to sign up with an email and password. Each family gets their own isolated data storage (tenant) and can share access with one other parent.

## Key Features

- **Email & Password Authentication**: Sign up and log in with email credentials
- **Tenant Isolation**: Each family's data is completely isolated from other families
- **Shared Access**: Allow up to 2 parents per family to share the same data
- **Secure Storage**: Passwords are hashed with bcrypt, sessions managed with JWT
- **Automatic Migration**: Existing database schema is automatically updated

## Getting Started

### New Users

1. **Access the Application**: Navigate to your ChoreQuest URL
2. **Sign Up**: Click "Sign Up" and create an account with your email and password
3. **Start Using**: Once signed in, you'll have access to all features
4. **Add Second Parent** (Optional): Go to Parent Mode > Settings > Account > Add Second Parent

### Authentication Flow

```
┌─────────────────┐
│   AuthPage      │  ← Login/Signup UI
│  (Not logged in)│
└────────┬────────┘
         │
         ├─ Signup: POST /api/auth/signup
         │  → Creates tenant + user
         │  → Returns JWT token
         │
         ├─ Login: POST /api/auth/login  
         │  → Validates credentials
         │  → Returns JWT token
         │
         ▼
┌─────────────────┐
│   Main App      │  ← Full access to features
│  (Authenticated)│
└─────────────────┘
```

## API Endpoints

### Authentication

- **POST /api/auth/signup**
  - Body: `{ email, password }`
  - Creates new tenant and user
  - Returns: `{ token, user }`

- **POST /api/auth/login**
  - Body: `{ email, password }`
  - Validates credentials
  - Returns: `{ token, user }`

- **GET /api/auth/me**
  - Headers: `Authorization: Bearer <token>`
  - Returns: Current user info

- **GET /api/auth/tenant-users**
  - Headers: `Authorization: Bearer <token>`
  - Returns: All users in the tenant

- **POST /api/auth/add-parent**
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ email, password }`
  - Adds second parent to tenant (max 2 parents)

### Data Storage (KV)

All KV endpoints now automatically filter by tenant:

- **GET /api/kv/:key** - Get data (filtered by tenant)
- **POST /api/kv/:key** - Set data (associated with tenant)
- **DELETE /api/kv/:key** - Delete data (filtered by tenant)

## Database Schema

### New Tables

**tenants**
```sql
CREATE TABLE tenants (
  id VARCHAR(36) PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**users**
```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(36) NOT NULL,
  role ENUM('parent', 'admin') DEFAULT 'parent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
```

### Updated Tables

**kv_store** - Added tenant_id column
```sql
ALTER TABLE kv_store 
  ADD COLUMN tenant_id VARCHAR(36) DEFAULT NULL,
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (key_name, tenant_id);
```

## Environment Variables

Add the following to your `.env` file:

```bash
# Authentication
JWT_SECRET=your-secure-random-string-here
```

⚠️ **IMPORTANT**: Generate a secure JWT secret for production:
```bash
openssl rand -base64 32
```

## Security Features

1. **Password Hashing**: Passwords are hashed using bcrypt with 10 salt rounds
2. **JWT Tokens**: Session tokens expire after 30 days
3. **Tenant Isolation**: All data queries are automatically filtered by tenant_id
4. **No Cross-Tenant Access**: Users can only access data within their tenant

## Testing

Run the multi-tenant test suite:

```bash
# Start the services
docker-compose up -d

# Wait for services to be ready
sleep 10

# Run tests
./test-multi-tenant.sh
```

This will:
- Create two separate users with different tenants
- Verify data isolation between tenants
- Create a second parent and verify data sharing
- Test all authentication endpoints

## Migration Notes

### For Existing Deployments

The database schema is automatically updated when the server starts:

1. New tables (`tenants`, `users`) are created if they don't exist
2. The `kv_store` table is updated to include `tenant_id` as a required field
3. Existing data in `kv_store` will be assigned to the "legacy" tenant automatically

⚠️ **Note**: Existing data is assigned to a special "legacy" tenant to maintain backward compatibility. You can access this data by logging in without authentication (it uses tenant_id = "legacy").

### Recommended Migration Path

1. **Backup your data** before updating
2. Deploy the new version
3. Option A - Keep existing data accessible:
   - Don't sign up for a new account
   - Continue using without authentication (legacy tenant)
   - Data is still isolated from new authenticated users
   
4. Option B - Migrate to authenticated accounts:
   - Sign up for a new account
   - Manually re-enter important data
   - Old legacy data will remain accessible if you don't authenticate

## Account Management

### Adding a Second Parent

1. Log in to your account
2. Go to Parent Mode (click gear icon)
3. Navigate to Settings tab
4. Scroll to "Account Settings"
5. Click "Add Second Parent"
6. Enter email and password for the second parent
7. The second parent can now log in and access the same data

### Logging Out

1. Go to Parent Mode
2. Navigate to Settings tab
3. Scroll to "Account Settings"
4. Click "Sign Out"

## Troubleshooting

### "Authentication required" error

- You need to sign up or log in
- Your session may have expired (tokens expire after 30 days)
- Try logging in again

### "User with this email already exists"

- That email is already registered
- Try logging in instead of signing up
- Use a different email address

### "Maximum of 2 parents reached"

- Each tenant can only have 2 parent accounts
- Remove one parent before adding another (contact support)

### Can't see old data after signing up

- Old data without tenant_id is not accessible
- This is a security feature to prevent unauthorized access
- You'll need to re-enter data or contact support for migration

## Support

For issues or questions:
- Open an [Issue](https://github.com/yourusername/chorequest/issues)
- Check the [Discussions](https://github.com/yourusername/chorequest/discussions)
