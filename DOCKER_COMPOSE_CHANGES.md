# Docker Compose Configuration Updates

## Changes Made

Updated all Docker Compose files to include the `APP_URL` environment variable required for the parent invitation email system.

## Files Modified

### 1. docker-compose.yml
- Added `APP_URL=${APP_URL:-http://localhost:8080}` to api service
- Fixed `SMTP_USERNAME` to `SMTP_USER` for consistency with email service code
- Default URL: `http://localhost:8080`

### 2. docker-compose.prod.yml
- Added `APP_URL=${APP_URL:-http://localhost:8080}` to api service
- Fixed `SMTP_USERNAME` to `SMTP_USER` for consistency with email service code
- Default URL: `http://localhost:8080`

### 3. docker-compose.traefik.yml
- Added `APP_URL=${APP_URL:-https://${DOMAIN:-chorequest.example.com}}` to api service
- Fixed `SMTP_USERNAME` to `SMTP_USER` for consistency with email service code
- Default URL: `https://chorequest.example.com` (uses DOMAIN variable for dynamic configuration)

## Usage

The APP_URL environment variable is now properly passed to the API service in all Docker Compose configurations. This variable is used by the email service to generate invitation links in parent invitation emails.

### Setting APP_URL

Add to your `.env` file:

```env
APP_URL=https://your-chorequest-domain.com
```

### Default Values

- **docker-compose.yml & docker-compose.prod.yml**: Defaults to `http://localhost:8080`
- **docker-compose.traefik.yml**: Defaults to `https://{DOMAIN}` (dynamically uses the DOMAIN variable)

## Why This Change?

The parent invitation system sends email invitations with links that invited parents use to accept invitations. The `APP_URL` variable tells the system what URL to use in these email links, ensuring they point to the correct ChoreQuest instance.

## Additional Fix

Also corrected `SMTP_USERNAME` to `SMTP_USER` in all files to match the email service implementation, which expects the `SMTP_USER` environment variable.
