# Stripe Webhook Configuration Guide

This guide explains how to configure Stripe webhooks for the ChoreQuest subscription system.

## What are Webhooks?

Webhooks allow Stripe to send real-time notifications to your server when events occur (e.g., payment success, subscription canceled). The ChoreQuest API listens for these events at the `/api/subscriptions/webhook` endpoint.

## Webhook Endpoint URL

The webhook endpoint URL you configure in Stripe depends on your deployment environment:

### Development (Local)

**URL:** Not directly accessible - use Stripe CLI

**Setup:**
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/subscriptions/webhook
   ```
4. The CLI will display a webhook signing secret (starts with `whsec_`)
5. Add to `.env`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_1a2b3c4d5e6f...
   ```
6. Keep the CLI running while developing

### Production (Standard Server)

**URL:** `https://your-domain.com/api/subscriptions/webhook`

**Setup:**
1. Replace `your-domain.com` with your actual domain
2. Ensure your server has a valid SSL certificate
3. Configure in Stripe Dashboard (see steps below)

### Docker Deployment

#### Standard Docker (without SSL)

**URL:** `http://your-server-ip:8080/api/subscriptions/webhook`

**Setup:**
- Replace `your-server-ip` with your server's public IP address
- Replace `8080` with your `CHOREQUEST_PORT` value from `.env`
- ⚠️ Note: HTTP webhooks work for testing but HTTPS is recommended for production

#### Docker with Traefik (with SSL)

**URL:** `https://your-domain.com/api/subscriptions/webhook`

**Setup:**
- Replace `your-domain.com` with your configured domain
- Traefik handles SSL automatically
- Use the same domain configured in your `DOMAIN` environment variable

#### Docker with Custom Port

**URL:** `http://your-domain.com:PORT/api/subscriptions/webhook`

**Setup:**
- Replace `your-domain.com` with your domain or IP
- Replace `PORT` with your custom `CHOREQUEST_PORT` value

## Configuration Steps in Stripe Dashboard

### Step 1: Navigate to Webhooks

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Developers** > **Webhooks**
3. Click **Add endpoint**

### Step 2: Enter Webhook URL

1. In the "Endpoint URL" field, enter your webhook URL (see table above)
2. Example: `https://chorequest.example.com/api/subscriptions/webhook`

### Step 3: Select Events

Click **Select events** and choose these four events:

- ✅ `customer.subscription.updated` - When subscription details change
- ✅ `customer.subscription.deleted` - When subscription is canceled
- ✅ `invoice.paid` - When payment succeeds
- ✅ `invoice.payment_failed` - When payment fails

Click **Add events** to confirm.

### Step 4: Add the Endpoint

1. Click **Add endpoint**
2. Your webhook is now created

### Step 5: Get Signing Secret

1. On the webhook details page, find the **Signing secret** section
2. Click **Reveal** or copy the secret (starts with `whsec_`)
3. Add to your `.env` file:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_1a2b3c4d5e6f...
   ```

### Step 6: Restart Application

**Standard deployment:**
```bash
# Restart your application server
pm2 restart chorequest-api  # or however you manage your process
```

**Docker deployment:**
```bash
docker compose restart api
```

## Testing Webhooks

### Test in Stripe Dashboard

1. Go to your webhook endpoint page in Stripe Dashboard
2. Click **Send test webhook**
3. Select an event (e.g., `invoice.paid`)
4. Click **Send test webhook**
5. Check the response:
   - ✅ Success (200): Webhook is working
   - ❌ Error: Check troubleshooting section below

### Test with Stripe CLI (Development)

```bash
# Trigger specific events
stripe trigger customer.subscription.updated
stripe trigger invoice.paid
stripe trigger invoice.payment_failed

# Watch webhook events in real-time
stripe listen --forward-to localhost:3000/api/subscriptions/webhook
```

### Verify in Application Logs

**Docker:**
```bash
docker logs chorequest-api -f
```

**Standard deployment:**
```bash
# Check your application logs
tail -f /var/log/chorequest-api.log
# or
pm2 logs chorequest-api
```

Look for log messages like:
```
Subscription event: customer.subscription.updated, sub_xxx...
Invoice paid: in_xxx...
```

## Webhook Events Explained

### customer.subscription.updated

**When:** Subscription status changes, plan changes, or quantity updates
**Action:** Updates subscription status in database
**Example:** User upgrades from Free to Paid, or payment fails and status becomes `past_due`

### customer.subscription.deleted

**When:** Subscription is canceled (after grace period ends)
**Action:** Marks subscription as canceled in database
**Example:** User cancels subscription and billing period ends

### invoice.paid

**When:** Payment successfully processes
**Action:** Records payment, removes limited mode flag
**Example:** Monthly subscription payment succeeds

### invoice.payment_failed

**When:** Payment attempt fails
**Action:** Marks subscription as `past_due`, enables limited mode
**Example:** Credit card declined, insufficient funds

## Troubleshooting

### Webhook Not Receiving Events

**Check Firewall:**
```bash
# Ensure your server accepts connections on the webhook port
sudo ufw status
sudo ufw allow 8080/tcp  # Adjust port as needed
```

**Verify API Container is Running:**
```bash
docker ps | grep chorequest-api
# Should show container running
```

**Check Nginx/Reverse Proxy:**
Ensure the `/api/subscriptions/webhook` route is properly forwarded to the API container.

### Signature Verification Fails

**Error:** "No signatures found matching the expected signature"

**Solutions:**
1. Verify `STRIPE_WEBHOOK_SECRET` in `.env` exactly matches the signing secret from Stripe
2. Ensure you copied the entire secret including the `whsec_` prefix
3. Check you're using the correct secret for test/live mode
4. Restart the API container after changing the secret

**Check environment variable:**
```bash
docker exec chorequest-api env | grep STRIPE_WEBHOOK_SECRET
# Should show: STRIPE_WEBHOOK_SECRET=whsec_...
```

### Webhook Returns 404

**Cause:** Endpoint URL is incorrect

**Solutions:**
1. Verify the endpoint path is exactly: `/api/subscriptions/webhook`
2. Check your reverse proxy configuration
3. Ensure the API container is accessible at the specified URL

**Test endpoint manually:**
```bash
curl -I https://your-domain.com/api/subscriptions/webhook
# Should return 405 Method Not Allowed (webhook only accepts POST)
```

### Webhook Returns 500

**Cause:** Server error processing webhook

**Solutions:**
1. Check API container logs: `docker logs chorequest-api`
2. Verify database connection is working
3. Ensure all environment variables are set correctly

### Events Not Processing

**Check Webhook Logs in Stripe:**
1. Go to your webhook in Stripe Dashboard
2. Click **View logs** or **Attempts**
3. Review failed attempts and error messages

**Common Issues:**
- Database connection lost
- Missing environment variables
- Application crash during processing

## Security Best Practices

1. ✅ **Always verify webhook signatures** - ChoreQuest automatically does this
2. ✅ **Use HTTPS in production** - Prevents man-in-the-middle attacks
3. ✅ **Keep signing secret private** - Never commit to git, only in `.env`
4. ✅ **Monitor webhook health** - Set up alerts for failed webhooks
5. ✅ **Implement idempotency** - Handle duplicate webhook events gracefully

## Test vs Live Mode

Stripe has separate test and live modes:

| Mode | Keys Start With | Webhook Secret Starts With |
|------|----------------|----------------------------|
| **Test** | `pk_test_`, `sk_test_` | `whsec_test_` |
| **Live** | `pk_live_`, `sk_live_` | `whsec_` (no test prefix) |

**Important:** 
- Test mode webhooks go to test mode endpoints
- Live mode webhooks go to live mode endpoints
- Keep secrets separate for each mode
- Configure separate webhook endpoints in Stripe for test and live modes

## Additional Resources

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Testing Webhooks](https://stripe.com/docs/webhooks/test)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)

## Quick Reference

| Environment | Webhook URL |
|-------------|-------------|
| Local Dev | Use Stripe CLI: `stripe listen --forward-to localhost:3000/api/subscriptions/webhook` |
| Production | `https://your-domain.com/api/subscriptions/webhook` |
| Docker Standard | `http://your-server-ip:8080/api/subscriptions/webhook` |
| Docker + Traefik | `https://your-domain.com/api/subscriptions/webhook` |

**Required Events:**
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

**Testing:**
```bash
# Stripe Dashboard: Send test webhook
# Stripe CLI: stripe trigger invoice.paid
# Check logs: docker logs chorequest-api -f
```
