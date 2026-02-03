# Environment Variables Flow Diagram

## Complete Configuration Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                          .env File                                   │
│  (User Configuration - Not committed to git)                        │
├─────────────────────────────────────────────────────────────────────┤
│  VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...                           │
│  STRIPE_SECRET_KEY=sk_test_...                                      │
│  STRIPE_WEBHOOK_SECRET=whsec_...                                    │
│  MYSQL_PASSWORD=secure_password                                     │
│  JWT_SECRET=secure_jwt_secret                                       │
│  ... (other variables)                                              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Docker Compose reads .env
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Docker Compose Files                               │
│  (docker-compose.yml, docker-compose.prod.yml, etc.)               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │                    │
                    ▼                    ▼
        ┌───────────────────┐  ┌──────────────────────┐
        │  BUILD ARGUMENTS  │  │ RUNTIME ENVIRONMENT  │
        │   (Frontend)      │  │    (Backend API)     │
        └───────────────────┘  └──────────────────────┘
                    │                    │
                    │                    │
                    ▼                    ▼
    ┌─────────────────────────┐  ┌──────────────────────────┐
    │     Dockerfile          │  │   API Container          │
    │                         │  │                          │
    │  ARG VITE_STRIPE_...    │  │  ENV STRIPE_SECRET_KEY   │
    │  ENV VITE_STRIPE_...    │  │  ENV STRIPE_WEBHOOK_...  │
    │                         │  │                          │
    │  Compiled into JS ──────┼──┼──> Available at runtime │
    └─────────────────────────┘  └──────────────────────────┘
                    │                    │
                    ▼                    ▼
         ┌──────────────────┐  ┌────────────────────┐
         │  Frontend Build  │  │   API Server       │
         │  (Static Files)  │  │   (Node.js)        │
         │                  │  │                    │
         │  Stripe.js       │  │  Stripe SDK        │
         │  initialized     │  │  initialized       │
         │  with pk_test_*  │  │  with sk_test_*    │
         └──────────────────┘  └────────────────────┘
```

## Variable Types

### 1. Frontend Variables (VITE_*)
- **When needed:** Build time
- **How passed:** Build arguments in docker-compose → ARG in Dockerfile → ENV
- **Result:** Compiled into JavaScript bundle
- **Example:** `VITE_STRIPE_PUBLISHABLE_KEY`

### 2. Backend Variables
- **When needed:** Runtime
- **How passed:** Environment variables in docker-compose
- **Result:** Available as process.env in Node.js
- **Example:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

## Updated Configuration

### docker-compose.yml / docker-compose.prod.yml

```yaml
services:
  api:
    environment:
      # Existing variables...
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-}        # ← ADDED
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-} # ← ADDED

  chorequest:
    build:
      args:
        # Existing args...
        - VITE_STRIPE_PUBLISHABLE_KEY=${VITE_STRIPE_PUBLISHABLE_KEY:-} # ← ADDED
```

### Dockerfile

```dockerfile
# Build arguments
ARG VITE_API_URL=/api
ARG VITE_APP_VERSION=1.0.0
ARG VITE_STRIPE_PUBLISHABLE_KEY=  # ← ADDED

# Environment variables (for Vite)
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}
ENV VITE_STRIPE_PUBLISHABLE_KEY=${VITE_STRIPE_PUBLISHABLE_KEY}  # ← ADDED
```

## Validation

### Test Configuration
```bash
# Run validation script
./test-env-vars.sh

# Expected output:
# ✓ docker-compose.yml is valid
# ✓ Stripe environment variables configured
# ✓ VITE_STRIPE_PUBLISHABLE_KEY configured
```

### Verify in Running Containers
```bash
# Check API has Stripe keys
docker exec chorequest-api env | grep STRIPE

# Should show:
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...
```

## Security Best Practices

1. ✅ `.env` file is in `.gitignore`
2. ✅ `.env.example` provides template without secrets
3. ✅ Default values are empty/placeholders
4. ✅ Use test keys for development
5. ✅ Use live keys for production only
6. ✅ Rotate secrets regularly

## Troubleshooting

### Issue: Stripe not working in Docker

**Frontend not finding publishable key:**
```bash
# Rebuild with build args
docker compose build --no-cache chorequest
docker compose up -d chorequest
```

**Backend not finding secret key:**
```bash
# Restart to pick up new env vars
docker compose restart api
```

### Issue: Variables not in .env

```bash
# Check what Docker Compose sees
docker compose config | grep STRIPE

# Should show actual values from .env
```

## Files Modified

- ✏️ `Dockerfile` - Added VITE_STRIPE_PUBLISHABLE_KEY
- ✏️ `docker-compose.yml` - Added Stripe vars
- ✏️ `docker-compose.prod.yml` - Added Stripe vars  
- ✏️ `docker-compose.traefik.yml` - Added Stripe vars
- ➕ `test-env-vars.sh` - Validation script
- ➕ `DOCKER_ENV_VARS.md` - Documentation
- ➕ `ENV_VAR_FLOW.md` - This diagram

---

**Status:** ✅ Environment variables properly configured for Docker deployments
