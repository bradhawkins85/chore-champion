# Admin Panel Setup Guide

The ChoreQuest admin panel provides platform administrators with tools to manage tenants, users, and monitor system activity. This guide explains how to set up and access the admin panel.

## Overview

The admin panel is accessible at `/admin` and provides:

- **Tenant Management**: View all tenants, their creation dates, user counts, and device counts
- **User Management**: View and manage parent user accounts across all tenants
- **Payment Status**: Monitor billing and payment information (placeholder for future integration)
- **Platform Statistics**: View key metrics including total tenants, users, devices, and activity

## Security

- Admin access is restricted to users with the `admin` role in the database
- Only admin users can access `/admin` endpoint and its API routes
- Regular parent users cannot access admin functionality
- Admin authentication uses the same JWT token system as regular users

## Creating Admin Users

There are two ways to create admin users:

### Method 1: Promote Existing User to Admin

If you already have a parent user account and want to promote it to admin:

1. **Navigate to the server directory:**
   ```bash
   cd server
   ```

2. **Build the server (if not already built):**
   ```bash
   npm run build
   ```

3. **Run the promotion script:**
   ```bash
   node dist/utils/promote-admin.js <email>
   ```

   Example:
   ```bash
   node dist/utils/promote-admin.js parent@example.com
   ```

   This will promote the existing user to admin role while keeping their tenant and all existing data.

### Method 2: Create New Admin User

To create a brand new admin user:

1. **Navigate to the server directory:**
   ```bash
   cd server
   ```

2. **Build the server (if not already built):**
   ```bash
   npm run build
   ```

3. **Run the creation script:**
   ```bash
   node dist/utils/promote-admin.js <email> <password>
   ```

   Example:
   ```bash
   node dist/utils/promote-admin.js admin@example.com SecurePassword123!
   ```

   This will:
   - Create a new tenant for the admin user
   - Create a new admin user with the provided credentials
   - Set the user's role to 'admin'

**Password Requirements:**
- Minimum 8 characters
- Should be secure and unique

### Method 3: Direct Database Update

If you have direct database access, you can manually update the user role:

```sql
-- Promote existing user to admin
UPDATE users SET role = 'admin' WHERE email = 'user@example.com';

-- Create new admin user (requires more steps - use the script instead)
```

**Note:** It's recommended to use the provided scripts rather than direct SQL manipulation to ensure proper data integrity.

## Environment Configuration

The admin promotion script uses the following environment variables (same as the main application):

```bash
MYSQL_HOST=mysql          # Database host
MYSQL_PORT=3306           # Database port
MYSQL_USER=chorequest     # Database user
MYSQL_PASSWORD=chorequest # Database password
MYSQL_DATABASE=chorequest # Database name
```

These should be configured in your `.env` file at the root of the project.

## Accessing the Admin Panel

Once you have created an admin user:

1. **Navigate to the application URL**
   ```
   http://localhost:8080  (or your production URL)
   ```

2. **Log in with admin credentials**
   - Use the email and password of your admin user
   - The system will recognize you as an admin based on your role

3. **Access the admin panel**
   - Navigate to `/admin` directly: `http://localhost:8080/admin`
   - Or add `/admin` to your URL after logging in

4. **Start managing**
   - View tenant statistics in the dashboard
   - Browse and manage tenants in the Tenants tab
   - View and remove parent users in the Parent Users tab
   - Check payment status (placeholder) in the Payments tab

## Admin Panel Features

### Dashboard Statistics

The admin panel displays key platform metrics:

- **Total Tenants**: Number of tenant organizations on the platform
- **Total Parents**: Number of parent user accounts
- **Total Devices**: Number of linked devices across all tenants
- **Recent Signups**: New tenants in the last 30 days
- **Active Tenants**: Tenants with device activity in the last 7 days

### Tenant Management

View and manage all tenants:

- Tenant ID and creation date
- Number of users per tenant
- Number of linked devices
- Parent email addresses
- Last updated timestamp

### User Management

Manage parent user accounts:

- View all parent users across tenants
- See user creation dates and tenant associations
- Delete parent users (with confirmation)
- Automatic tenant cleanup when last user is deleted

**Restrictions:**
- Cannot delete admin users (safety measure)
- Deleting the last user in a tenant will also delete the tenant

### Payment Status (Placeholder)

The payment tab is a placeholder for future billing integration. Currently shows:

- Tenant billing information
- User and device counts
- Placeholder for payment status and amounts

## Docker Deployment

When running in Docker, you need to execute the admin script inside the container:

```bash
# For Docker Compose deployment
docker-compose exec api node dist/utils/promote-admin.js admin@example.com SecurePassword123!

# For standalone Docker container
docker exec -it <container-name> node dist/utils/promote-admin.js admin@example.com SecurePassword123!
```

## Troubleshooting

### "User not found" error

- Verify the email address is correct
- Check that the user has completed signup
- Ensure the database is accessible

### "Access denied" when accessing /admin

- Verify you're logged in with an admin account
- Check that the user's role is 'admin' in the database
- Clear browser cache and cookies, then log in again

### Cannot connect to database

- Verify MySQL is running
- Check environment variables are set correctly
- Ensure database credentials are correct
- For Docker deployments, verify network connectivity

### Script fails to run

- Ensure you've built the server: `npm run build`
- Check that all dependencies are installed: `npm install`
- Verify you're in the server directory when running the script

## Security Best Practices

1. **Limit Admin Access**: Only create admin accounts for trusted administrators
2. **Strong Passwords**: Use strong, unique passwords for admin accounts
3. **Regular Audits**: Periodically review the list of admin users
4. **Secure Environment**: Keep `.env` file secure and never commit it to version control
5. **HTTPS**: Always use HTTPS in production to protect admin credentials
6. **Token Security**: Admin tokens have the same security as regular user tokens

## Future Enhancements

Planned improvements for the admin panel:

- Two-factor authentication for admin users
- Audit logging for admin actions
- More detailed analytics and reporting
- Payment integration (Stripe/PayPal)
- Tenant suspension/activation
- User impersonation (for support purposes)
- Email communication tools
- System health monitoring

## Support

For issues or questions about the admin panel:

1. Check this documentation
2. Review server logs for errors
3. Verify database connectivity
4. Check the GitHub issues page

---

**Important**: The admin panel provides powerful capabilities to manage the entire platform. Use it responsibly and ensure only trusted administrators have access.
