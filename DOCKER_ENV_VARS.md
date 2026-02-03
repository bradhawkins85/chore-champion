# Docker Environment Variables Configuration

This document explains how environment variables from `.env` are used in Docker configurations.

## Overview

The ChoreQuest application uses Docker Compose for deployment and relies on environment variables defined in a `.env` file for configuration. This ensures that sensitive information like API keys and database passwords are not hardcoded.

## Changes Made

### 1. Added Stripe Environment Variables

The Stripe payment integration requires environment variables that were not previously configured in the Docker setup. These have now been added:

#### Backend API Service (server)
- `STRIPE_SECRET_KEY` - Stripe secret API key for server-side operations
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret for verifying Stripe events

#### Frontend Build
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (safe to expose to frontend)

### 2. Updated Files

#### `Dockerfile`
Added build argument and environment variable for Stripe publishable key:
```dockerfile
ARG VITE_STRIPE_PUBLISHABLE_KEY=
ENV VITE_STRIPE_PUBLISHABLE_KEY=${VITE_STRIPE_PUBLISHABLE_KEY}
```

#### `docker-compose.yml`
Added Stripe environment variables to API service:
```yaml
environment:
  - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-}
  - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-}
```

Added Stripe build arg to chorequest service:
```yaml
build:
  args:
    - VITE_STRIPE_PUBLISHABLE_KEY=${VITE_STRIPE_PUBLISHABLE_KEY:-}
```

#### `docker-compose.prod.yml`
Same changes as `docker-compose.yml` for production environment.

#### `docker-compose.traefik.yml`
Added Stripe environment variables to API service for SSL-enabled deployments.

## How It Works

### Environment Variable Flow

1. **`.env` file** contains all configuration:
   ```bash
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

2. **Docker Compose** reads `.env` automatically and substitutes variables using `${VAR_NAME:-default}` syntax

3. **Build Arguments** pass frontend variables to the Docker build process

4. **Environment Variables** pass runtime configuration to containers

### Frontend vs Backend Variables

- **Frontend (`VITE_*`)**: Must be available at **build time** as build arguments. They are compiled into the static frontend bundle.
- **Backend**: Available at **runtime** as environment variables in the container.

## Testing

Use the included test script to verify environment variables are properly configured:

```bash
./test-env-vars.sh
```

This script:
- ✓ Validates all docker-compose files are syntactically correct
- ✓ Verifies Stripe variables are present in API service
- ✓ Confirms frontend build arguments include Stripe publishable key

## Verifying in Running Containers

After starting the services:

```bash
# Check API environment variables
docker exec chorequest-api env | grep STRIPE

# View frontend build output
docker logs chorequest-app 2>&1 | grep -i stripe
```

## Security Notes

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Use test keys for development** - Keys starting with `pk_test_` and `sk_test_`
3. **Use live keys for production** - Keys starting with `pk_live_` and `sk_live_`
4. **Rotate secrets regularly** - Change JWT_SECRET, database passwords, and API keys periodically
5. **Environment-specific files** - Consider using `.env.production`, `.env.staging` for different environments

## Default Values

All environment variables have sensible defaults (empty strings or placeholder values) so the application can start even if the `.env` file is missing or incomplete. However, features requiring these variables (like Stripe payments) won't function without proper configuration.

## Troubleshooting

### Variables not showing up in container

1. Ensure `.env` file exists in the project root
2. Check variable names match exactly (case-sensitive)
3. Rebuild images if changing build arguments: `docker compose build --no-cache`
4. Restart containers if changing runtime environment variables: `docker compose restart`

### Stripe integration not working

1. Verify all three Stripe variables are set in `.env`:
   - `VITE_STRIPE_PUBLISHABLE_KEY` (frontend)
   - `STRIPE_SECRET_KEY` (backend)
   - `STRIPE_WEBHOOK_SECRET` (backend)

2. Check variable values are correct (test vs live keys)

3. Rebuild frontend image to include new publishable key:
   ```bash
   docker compose build chorequest
   docker compose up -d chorequest
   ```

## Stripe Webhook Configuration

After deploying with Docker, you need to configure the Stripe webhook endpoint:

### Webhook Endpoint URL

The webhook endpoint URL depends on your Docker deployment type:

| Deployment | Webhook URL | Configuration |
|------------|-------------|---------------|
| **Standard Docker** | `http://your-server-ip:8080/api/subscriptions/webhook` | Use server's public IP, port from `CHOREQUEST_PORT` (default: 8080) |
| **Docker with Traefik** | `https://your-domain.com/api/subscriptions/webhook` | SSL automatically handled by Traefik |
| **Custom Port** | `http://your-domain.com:PORT/api/subscriptions/webhook` | Replace PORT with your `CHOREQUEST_PORT` value |

### Setup Steps

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) > Developers > Webhooks
2. Click "Add endpoint"
3. Enter your webhook URL (see table above)
4. Select events to listen for:
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy the webhook signing secret (starts with `whsec_`)
7. Add to your `.env` file:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_your_signing_secret
   ```
8. Restart the API container:
   ```bash
   docker compose restart api
   ```

### Testing Webhooks

Verify webhooks are working:

```bash
# Check API container logs for webhook events
docker logs chorequest-api -f

# In Stripe Dashboard, send a test webhook
# You should see the event in the container logs
```

### Troubleshooting

**Webhooks not receiving:**
- Ensure your server's firewall allows incoming connections on the specified port
- For Docker standard deployment, ensure port mapping is correct in docker-compose
- Verify the API container is running: `docker ps | grep chorequest-api`

**Signature verification fails:**
- Double-check `STRIPE_WEBHOOK_SECRET` matches the signing secret from Stripe Dashboard
- Ensure you copied the entire secret including the `whsec_` prefix
- Restart the API container after updating the secret

## References

- [Docker Compose Environment Variables](https://docs.docker.com/compose/environment-variables/)
- [Docker Build Arguments](https://docs.docker.com/engine/reference/builder/#arg)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
