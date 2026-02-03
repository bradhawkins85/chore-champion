# Parent Invitation System

## Overview

ChoreQuest now uses an email invitation system for adding additional parents to accounts. Instead of creating login credentials directly, the primary parent sends an email invitation, and the invited parent creates their own password when accepting the invitation.

## Key Features

### For Primary Parents
- **Send Email Invitations**: Primary parents can invite one additional parent by entering their email address
- **Track Invitation Status**: View pending invitations and their expiration dates
- **Single Primary Account**: Primary parents can only be the primary account holder for one ChoreQuest instance

### For Invited Parents
- **Email Invitation**: Receive an invitation email with a secure link
- **Choose Password**: Set your own password when accepting the invitation
- **Multiple Accounts**: Can be invited to and manage multiple ChoreQuest accounts (as a secondary parent)
- **7-Day Expiration**: Invitations expire after 7 days for security

## Configuration

### SMTP Setup Required

Email invitations require SMTP configuration. Add these settings to your `.env` file:

```env
# Enable email functionality
SMTP_ENABLED=true

# SMTP Server Settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Email Details
SMTP_FROM_EMAIL=chorequest@example.com
SMTP_FROM_NAME=ChoreQuest

# Application URL (for invitation links)
APP_URL=https://chorequest.example.com
```

### Docker Compose Configuration

If you're using Docker Compose, the APP_URL and SMTP settings are automatically passed to the API container. The environment variables from your `.env` file will be used.

**Default APP_URL Values:**
- `docker-compose.yml` / `docker-compose.prod.yml`: Defaults to `http://localhost:8080`
- `docker-compose.traefik.yml`: Defaults to `https://{DOMAIN}` (uses your DOMAIN variable)

You can override these by setting `APP_URL` in your `.env` file:

```env
APP_URL=https://your-chorequest-domain.com
```

After updating your `.env` file, restart the services:

```bash
docker-compose down
docker-compose up -d
```

For more details on Docker Compose configuration, see [DOCKER_COMPOSE_CHANGES.md](DOCKER_COMPOSE_CHANGES.md).
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Email Details
SMTP_FROM_EMAIL=chorequest@example.com
SMTP_FROM_NAME=ChoreQuest

# Application URL (for invitation links)
APP_URL=https://chorequest.example.com
```

#### Gmail Setup

If using Gmail, you'll need to:
1. Enable 2-factor authentication on your Google account
2. Generate an [App Password](https://support.google.com/accounts/answer/185833)
3. Use the app password in `SMTP_PASSWORD`

## How It Works

### 1. Sending an Invitation

1. Primary parent logs into ChoreQuest
2. Goes to **Parent Mode > Settings > Account Settings**
3. Clicks **"Invite Second Parent"**
4. Enters the email address of the parent to invite
5. Clicks **"Send Invitation"**

The invited parent receives an email with:
- Information about who invited them
- What they can do as a co-parent
- A secure invitation link
- Expiration information (7 days)

### 2. Accepting an Invitation

1. Invited parent clicks the link in the email
2. They see a page confirming the invitation details
3. They create a password (minimum 8 characters)
4. They confirm the password
5. Clicks **"Accept Invitation & Create Account"**

The account is created immediately and they're logged in.

### 3. Managing Multiple Accounts

**Primary Parents (Account Creators):**
- Can only be the primary parent for ONE account
- If they try to sign up for a second account with their email, they'll get an error
- This prevents confusion about which account is "theirs"

**Invited Parents:**
- Can be invited to MULTIPLE accounts
- Can manage all the accounts they're invited to
- When logging in, they access the account they were invited to
- Each invitation creates a separate user account tied to that family's tenant

## API Endpoints

### POST `/api/auth/invite-parent`
Send an email invitation to another parent.

**Authentication Required:** Yes (JWT token)

**Request Body:**
```json
{
  "email": "parent@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "invitation": {
    "id": "uuid",
    "email": "parent@example.com",
    "expiresAt": "2024-02-10T12:00:00Z"
  }
}
```

### POST `/api/auth/accept-invitation`
Accept an invitation and create parent account.

**Request Body:**
```json
{
  "token": "invitation-token-from-email",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "parent@example.com",
    "tenantId": "tenant-uuid",
    "role": "parent"
  }
}
```

### GET `/api/auth/invitation/:token`
Get invitation details (used on the accept invitation page).

**Response:**
```json
{
  "success": true,
  "email": "parent@example.com",
  "status": "pending",
  "expiresAt": "2024-02-10T12:00:00Z"
}
```

### GET `/api/auth/invitations`
List all invitations for the current tenant.

**Authentication Required:** Yes (JWT token)

**Response:**
```json
{
  "success": true,
  "invitations": [
    {
      "id": "uuid",
      "email": "parent@example.com",
      "status": "pending",
      "createdAt": "2024-02-03T12:00:00Z",
      "expiresAt": "2024-02-10T12:00:00Z",
      "acceptedAt": null
    }
  ]
}
```

## Database Schema

### `parent_invitations` Table

```sql
CREATE TABLE parent_invitations (
  id VARCHAR(36) PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(36) NOT NULL,
  inviter_id VARCHAR(36) NOT NULL,
  status ENUM('pending', 'accepted', 'expired') DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Security Considerations

1. **Token-based Invitations**: Each invitation uses a cryptographically secure random token
2. **Expiration**: Invitations automatically expire after 7 days
3. **One-time Use**: Tokens cannot be reused after acceptance
4. **Email Verification**: Only the person with access to the invited email can accept
5. **Password Requirements**: Minimum 8 characters enforced
6. **Tenant Isolation**: Users can only see invitations for their own tenant

## Troubleshooting

### Invitation Email Not Received

1. Check SMTP configuration in `.env`
2. Verify SMTP_ENABLED=true
3. Check server logs for email sending errors
4. Verify the email address is correct
5. Check spam/junk folder

### "Email service is not configured" Error

- SMTP settings are missing or incomplete in `.env`
- Make sure all required SMTP variables are set
- Restart the server after updating `.env`

### "User with this email already exists" Error

- The email is already registered as a primary account holder
- Primary parents can only hold one account
- Use a different email address or have them log in

### Invitation Link Shows "Invalid or Expired"

- The invitation may have expired (7 days)
- The invitation may have already been accepted
- The token in the URL may be incorrect
- Request a new invitation from the primary parent

## Migration from Old System

The old `/api/auth/add-parent` endpoint is still available for backward compatibility but is deprecated. It directly creates a parent account with email and password.

**Recommended:** Use the new invitation system for:
- Better security (invited parent sets their own password)
- Clearer workflow
- Email verification
- Better user experience

## Future Enhancements

Potential improvements for future versions:
- Resend invitation functionality
- Cancel/revoke pending invitations
- Custom invitation expiration periods
- Invitation reminder emails
- Support for more than 2 parents per account
