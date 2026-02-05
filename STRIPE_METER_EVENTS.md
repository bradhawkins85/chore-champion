# Stripe Meter Events Implementation

## Overview

This document describes the Stripe billing meter events integration implemented to track subscription usage and enable usage-based billing.

## What are Stripe Meter Events?

Stripe billing meter events allow you to track and bill for usage-based metrics like API calls, storage usage, or any other countable activity. When an invoice is paid, a meter event is automatically sent to Stripe to record the payment.

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Stripe Meter Event Name (configured in Stripe Dashboard > Billing > Meters)
# This is used to track API requests or subscription usage events
STRIPE_METER_EVENT_NAME=api_requests
```

**Default Value:** If not specified, the default value is `api_requests`.

### Docker Configuration

The environment variable is automatically passed to the API container in:
- `docker-compose.yml` (development)
- `docker-compose.prod.yml` (production)
- `docker-compose.traefik.yml` (production with Traefik)

## How It Works

1. **Invoice Payment**: When a Stripe invoice is marked as paid (webhook event `invoice.paid`)
2. **Meter Event Sent**: The system automatically sends a meter event to Stripe
3. **Usage Tracked**: Stripe records this event for the customer
4. **Billing**: Stripe can use these events for usage-based billing calculations

## Implementation Details

### Code Changes

#### 1. New Function: `sendStripeMeterEvent()`

Located in `server/src/services/subscription.ts`:

```typescript
export async function sendStripeMeterEvent(customerId: string, value: number = 1): Promise<void>
```

**Parameters:**
- `customerId`: The Stripe customer ID
- `value`: The value to track (default: 1)

**Behavior:**
- Sends a meter event to Stripe's billing API
- Logs success/failure messages
- Does not throw errors (meter events are non-critical)

#### 2. Integration with Invoice Processing

The `upsertInvoiceFromStripe()` function now automatically sends a meter event when:
- An invoice status is `paid`
- The invoice has an associated customer

### Example API Call

The implementation sends requests equivalent to:

```bash
curl https://api.stripe.com/v1/billing/meter_events \
  -u "YOUR_STRIPE_SECRET_KEY:" \
  -d event_name=api_requests \
  -d timestamp=1770269297 \
  -d "payload[stripe_customer_id]"="cus_XXXXX" \
  -d "payload[value]"=1
```

## Setting Up Meters in Stripe

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Billing** > **Meters**
3. Click **Create meter**
4. Configure the meter:
   - **Event name**: `api_requests` (or your custom name)
   - **Aggregation**: Sum, Count, or other metric
   - **Value name**: `value`
5. Save the meter
6. Update your `.env` file with the event name

## Monitoring

### Logs

Monitor meter events in the API logs:

```bash
docker logs chorequest-api -f
```

Look for messages like:
```
✓ Meter event sent for customer cus_XXXXX: api_requests=1
```

Or warnings:
```
⚠️  Stripe is not configured. Meter event not sent.
Failed to send Stripe meter event: [error message]
```

### Stripe Dashboard

View meter events in Stripe:
1. Go to **Billing** > **Meters**
2. Select your meter
3. View the **Events** tab

## Error Handling

The implementation is designed to be resilient:
- **Stripe not configured**: Logs a warning and continues
- **API failure**: Logs the error but doesn't disrupt payment processing
- **Missing customer**: Meter event is skipped silently

This ensures that meter events don't interfere with critical payment operations.

## Troubleshooting

### Meter Events Not Appearing

**Check Stripe Configuration:**
```bash
docker exec chorequest-api env | grep STRIPE_SECRET_KEY
docker exec chorequest-api env | grep STRIPE_METER_EVENT_NAME
```

**Verify Meter Exists:**
- Ensure the meter is created in Stripe Dashboard
- Event name must exactly match the configuration

**Check Logs:**
```bash
docker logs chorequest-api --tail 100 | grep -i meter
```

### Invalid Event Name

**Error:** "No such meter event: [event_name]"

**Solution:**
1. Verify the meter exists in Stripe Dashboard
2. Check the event name matches exactly (case-sensitive)
3. Update `.env` and restart the API container

### Permission Issues

**Error:** "API key does not have permission"

**Solution:**
- Ensure your Stripe API key has billing permissions
- Test keys have full access; live keys may need specific permissions

## Benefits

1. **Usage Tracking**: Automatically track when payments are processed
2. **Usage-Based Billing**: Enable Stripe to bill based on actual usage
3. **Analytics**: View usage patterns in Stripe Dashboard
4. **Flexibility**: Easily change what you're tracking by updating the event name

## Additional Resources

- [Stripe Billing Meters Documentation](https://stripe.com/docs/billing/subscriptions/usage-based/recording-usage)
- [Stripe Meter Events API](https://stripe.com/docs/api/billing/meter_event)
- [Usage-Based Billing Guide](https://stripe.com/docs/billing/subscriptions/usage-based)

## Quick Reference

| Configuration | Value |
|--------------|--------|
| Environment Variable | `STRIPE_METER_EVENT_NAME` |
| Default Value | `api_requests` |
| Function | `sendStripeMeterEvent(customerId, value)` |
| Trigger | Invoice paid webhook event |
| Location | `server/src/services/subscription.ts` |
