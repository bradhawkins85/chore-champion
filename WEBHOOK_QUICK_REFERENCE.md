# Stripe Webhook Quick Reference

## Webhook Endpoint URL

The webhook endpoint path is always: `/api/subscriptions/webhook`

Choose the appropriate base URL for your deployment:

### 🏠 Local Development
```
Use Stripe CLI (webhooks can't reach localhost directly)
stripe listen --forward-to localhost:3000/api/subscriptions/webhook
```

### 🌐 Production (Standard Server)
```
https://your-domain.com/api/subscriptions/webhook
```
Replace `your-domain.com` with your actual domain.

### 🐳 Docker (Standard)
```
http://your-server-ip:8080/api/subscriptions/webhook
```
- Replace `your-server-ip` with server's public IP
- Replace `8080` with your `CHOREQUEST_PORT` value

### 🐳 Docker with Traefik (SSL)
```
https://your-domain.com/api/subscriptions/webhook
```
Use the same domain from your `DOMAIN` environment variable.

### 🐳 Docker (Custom Port)
```
http://your-domain.com:PORT/api/subscriptions/webhook
```
Replace `PORT` with your `CHOREQUEST_PORT` value.

## Required Events

Configure these 4 events in Stripe Dashboard:

```
✓ customer.subscription.updated
✓ customer.subscription.deleted
✓ invoice.paid
✓ invoice.payment_failed
```

## Setup Steps

1. Go to https://dashboard.stripe.com
2. Navigate to: **Developers** > **Webhooks**
3. Click **Add endpoint**
4. Enter your webhook URL (see above)
5. Click **Select events** and choose the 4 required events
6. Click **Add endpoint**
7. Copy the **Signing secret** (starts with `whsec_`)
8. Add to `.env`: `STRIPE_WEBHOOK_SECRET=whsec_your_secret`
9. Restart your API service

## Testing

**Stripe Dashboard:**
- Click "Send test webhook" on your endpoint
- Should return 200 OK

**Stripe CLI:**
```bash
stripe trigger invoice.paid
```

**Check Logs:**
```bash
docker logs chorequest-api -f
```

## Troubleshooting

**Not receiving webhooks?**
- Check firewall allows incoming connections
- Verify API container is running
- Test endpoint manually: `curl -I https://your-domain.com/api/subscriptions/webhook`

**Signature verification fails?**
- Ensure `STRIPE_WEBHOOK_SECRET` matches exactly
- Restart API after changing secret
- Verify test/live mode keys match

## More Information

See **STRIPE_WEBHOOK_SETUP.md** for complete guide.
