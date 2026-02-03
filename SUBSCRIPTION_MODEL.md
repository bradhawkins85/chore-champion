# Subscription Model Implementation

This document outlines the subscription and billing system implemented for ChoreQuest, which enables tiered access control and Stripe-powered payment processing.

## Overview

ChoreQuest implements a three-tier subscription model:

1. **Free Tier** - Limited features for individuals trying out the app
2. **Paid Tier** - Full featured plan charged at $1 AUD per child per month
3. **Unlimited Tier** - Admin-configurable free tier with all features (for special accounts)

## Subscription Tiers

### Free Plan
- **Cost**: Free
- **Limits**:
  - 1 child
  - 1 linked device
  - 3 chores
  - 3 rewards
- **Features**:
  - Basic notifications
  - Core chore management
  - Reward shop

### Paid Plan
- **Cost**: $1 AUD per child per month
- **Limits**: All unlimited
  - Unlimited children
  - Unlimited devices
  - Unlimited chores
  - Unlimited rewards
- **Features**:
  - All Free tier features
  - Unlimited resources
  - Priority support
  - Advanced analytics

### Unlimited Plan
- **Cost**: Free (admin-only)
- **Limits**: All unlimited
- **Features**: All features enabled
- **Note**: Can only be assigned by system administrators via the admin panel

## Architecture

### Database Schema

#### `subscription_plans` Table
Stores available subscription plans and their limits:
- `id` - Unique plan identifier (e.g., 'plan_free', 'plan_paid', 'plan_unlimited')
- `name` - Display name
- `tier` - Enum: 'free', 'paid', 'unlimited'
- `description` - Plan description
- `max_children` - Max children allowed (NULL = unlimited)
- `max_devices` - Max devices allowed (NULL = unlimited)
- `max_chores` - Max chores allowed (NULL = unlimited)
- `max_rewards` - Max rewards allowed (NULL = unlimited)
- `price_per_child_aud` - Price per child per month in AUD
- `base_price` - Base monthly price
- `billing_interval` - 'monthly' or 'annual'
- `features` - JSON array of feature descriptions
- `is_active` - Whether the plan is available

#### `subscriptions` Table
Tracks each tenant's active subscription:
- `id` - Unique subscription identifier
- `tenant_id` - Foreign key to tenants table
- `plan_id` - Foreign key to subscription_plans table
- `status` - Enum: 'active', 'past_due', 'canceled', 'incomplete', etc.
- `current_period_start` - Billing period start timestamp
- `current_period_end` - Billing period end timestamp
- `cancel_at_period_end` - Boolean flag for pending cancellation
- `canceled_at` - Timestamp of cancellation
- `stripe_customer_id` - Stripe customer identifier
- `stripe_subscription_id` - Stripe subscription identifier

#### `invoices` Table
Stores billing invoices:
- `id` - Unique invoice identifier
- `tenant_id` - Foreign key to tenants table
- `subscription_id` - Foreign key to subscriptions table
- `amount_due` - Amount due in cents (AUD)
- `amount_paid` - Amount paid in cents
- `status` - Enum: 'draft', 'open', 'paid', 'void', 'uncollectible'
- `due_date` - Payment due date timestamp
- `paid_at` - Payment completion timestamp
- `hosted_invoice_url` - Stripe-hosted invoice URL
- `invoice_pdf` - PDF download URL
- `stripe_invoice_id` - Stripe invoice identifier
- `description` - Invoice description

#### `payment_methods` Table
Stores saved payment methods:
- `id` - Unique payment method identifier
- `tenant_id` - Foreign key to tenants table
- `stripe_payment_method_id` - Stripe payment method identifier
- `type` - 'card' or 'bank_account'
- `last4` - Last 4 digits
- `brand` - Card brand (visa, mastercard, etc.)
- `expiry_month` - Card expiry month
- `expiry_year` - Card expiry year
- `is_default` - Whether this is the default payment method

### Backend Components

#### Subscription Service (`server/src/services/subscription.ts`)
Core subscription logic:
- `getSubscriptionPlans()` - Retrieve all active plans
- `getTenantSubscription(tenantId)` - Get tenant's current subscription
- `createFreeSubscription(tenantId)` - Create free subscription for new tenant
- `createPaidSubscription(tenantId, email, paymentMethodId, childrenCount)` - Create paid subscription
- `cancelSubscription(tenantId)` - Cancel at period end
- `reactivateSubscription(tenantId)` - Reactivate canceled subscription
- `updateSubscriptionQuantity(tenantId, childrenCount)` - Update child count
- `checkPlanLimits(tenantId)` - Check current usage against limits
- `getOrCreateStripeCustomer(tenantId, email)` - Manage Stripe customer

#### Subscription Routes (`server/src/routes/subscriptions.ts`)
API endpoints:
- `GET /api/subscriptions/plans` - List available plans
- `GET /api/subscriptions/current` - Get current subscription
- `GET /api/subscriptions/limits` - Check usage limits
- `POST /api/subscriptions/create` - Create paid subscription
- `POST /api/subscriptions/cancel` - Cancel subscription
- `POST /api/subscriptions/reactivate` - Reactivate subscription
- `POST /api/subscriptions/update-quantity` - Update quantity
- `GET /api/subscriptions/invoices` - Get invoice history
- `POST /api/subscriptions/create-setup-intent` - Create Stripe SetupIntent
- `POST /api/subscriptions/webhook` - Stripe webhook handler

### Frontend Components

#### Subscription Hook (`src/hooks/use-subscription.ts`)
React hook for subscription management:
- State management for subscription, plans, limits, and invoices
- Functions for creating, canceling, and reactivating subscriptions
- Automatic limit checking
- Limited mode detection (past_due/unpaid status)

#### SubscriptionSettings Component (`src/components/SubscriptionSettings.tsx`)
Main subscription management UI:
- Current plan display
- Usage statistics
- Plan comparison
- Payment form with Stripe Elements integration
- Upgrade/downgrade flows
- Invoice history
- Cancellation management

#### LimitGuard Component (`src/components/LimitGuard.tsx`)
Reusable limit enforcement wrapper:
- Checks limits before allowing actions
- Shows upgrade dialog when limits reached
- Handles both free tier limits and limited mode (overdue payment)
- Usage:
  ```tsx
  <LimitGuard 
    limitType="child"
    onUpgradeClick={() => setSettingsSubTab('subscription')}
  >
    {(canAdd, checkLimit) => (
      <Button 
        onClick={async () => {
          if (await checkLimit()) {
            // Add child
          }
        }}
      >
        Add Child
      </Button>
    )}
  </LimitGuard>
  ```

## Stripe Integration

### Configuration

Set these environment variables:

```bash
# Frontend (.env)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY  # Use pk_live_ for production

# Backend (.env)
STRIPE_SECRET_KEY=sk_test_YOUR_KEY  # Use sk_live_ for production
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

### Stripe Setup

1. **Create Stripe Account**: Sign up at https://stripe.com

2. **Get API Keys**: 
   - Dashboard > Developers > API keys
   - Use test keys for development
   - Use live keys for production

3. **Configure Webhook Endpoint**:
   
   Stripe needs to send events to your server. Configure the webhook endpoint URL based on your deployment:
   
   **Step-by-step:**
   - Go to Stripe Dashboard > Developers > Webhooks
   - Click "Add endpoint"
   - Enter your webhook endpoint URL (see examples below)
   - Click "Select events" and choose:
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
   - Click "Add endpoint"
   - Copy the "Signing secret" (starts with `whsec_`)
   - Add to your `.env` file as `STRIPE_WEBHOOK_SECRET`
   
   **Webhook Endpoint URL Examples:**
   
   | Deployment Type | Webhook URL | Notes |
   |----------------|-------------|-------|
   | **Development (local)** | `http://localhost:3000/api/subscriptions/webhook` | Only works with Stripe CLI for testing |
   | **Production (domain)** | `https://your-domain.com/api/subscriptions/webhook` | Replace `your-domain.com` with your actual domain |
   | **Docker (standard)** | `http://your-server-ip:8080/api/subscriptions/webhook` | Use server's public IP, port from `CHOREQUEST_PORT` |
   | **Docker with Traefik** | `https://your-domain.com/api/subscriptions/webhook` | SSL handled by Traefik |
   | **Docker (custom port)** | `http://your-domain.com:PORT/api/subscriptions/webhook` | Replace PORT with your `CHOREQUEST_PORT` value |
   
   **Important Notes:**
   - For local development, use [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhooks
   - Production webhooks require HTTPS (except for testing)
   - The endpoint path is always `/api/subscriptions/webhook`
   - Test your webhook with "Send test webhook" in Stripe Dashboard

### Payment Flow

1. User clicks "Upgrade to Paid" in Subscription Settings
2. Frontend creates SetupIntent via `/api/subscriptions/create-setup-intent`
3. User enters card details using Stripe Elements (CardElement)
4. Frontend confirms card setup with Stripe
5. Frontend calls `/api/subscriptions/create` with payment method ID
6. Backend:
   - Creates Stripe Price object ($1 AUD/month per child)
   - Creates Stripe Subscription with quantity = child count
   - Saves subscription to database
   - Returns subscription and client secret
7. Frontend updates UI to show active subscription

## Feature Enforcement

### Limited Mode

When a paid account has overdue payments (`status: 'past_due'` or `status: 'unpaid'`):
- Subscription is marked as "limited mode"
- Account is restricted to Free tier limits
- User sees warning banner in UI
- Upgrade dialogs show "Update Payment" instead of "Upgrade Plan"
- Full access restored once payment is received

### Limit Checking

Before creating resources:
1. Frontend calls `checkPlanLimits()` via useSubscription hook
2. Backend queries current usage from KV store
3. Backend compares with plan limits (using Free limits if in limited mode)
4. Returns `canAdd*` flags and current/max counts
5. Frontend uses LimitGuard to enforce limits

### Integration Points

Add limit enforcement to:
- Add Child button
- Add Chore button
- Add Reward button
- Link Device flow

Example:
```tsx
<LimitGuard 
  limitType="child"
  onUpgradeClick={() => {
    setActiveTab('settings-tab');
    setSettingsSubTab('subscription');
  }}
>
  {(canAdd, checkLimit) => (
    <Button 
      onClick={async () => {
        if (await checkLimit()) {
          setChildDialogOpen(true);
        }
      }}
    >
      Add Child
    </Button>
  )}
</LimitGuard>
```

## Webhook Handling

Stripe sends webhook events for subscription changes. The webhook handler (`/api/subscriptions/webhook`) processes:

- `customer.subscription.updated` - Update subscription status in database
- `customer.subscription.deleted` - Mark subscription as canceled
- `invoice.paid` - Record successful payment, exit limited mode
- `invoice.payment_failed` - Mark subscription as past_due, enter limited mode

Webhook events are verified using the webhook secret to ensure they're from Stripe.

## Admin Panel Integration

Administrators can:
1. View all tenant subscriptions
2. See subscription status and current plan
3. Assign Unlimited tier to special accounts
4. View payment history
5. Handle subscription issues

## Testing

### Test Mode

Use Stripe test keys to test subscription flows:
- Test card: `4242 4242 4242 4242`
- Any future expiry date
- Any 3-digit CVC

### Test Scenarios

1. **Free to Paid Upgrade**:
   - Create account (gets Free plan)
   - Add 1 child
   - Try to add 2nd child (blocked)
   - Upgrade to Paid
   - Add more children (allowed)

2. **Payment Failure**:
   - Use test card `4000 0000 0000 0341` (decline)
   - Subscription enters past_due
   - Verify limited mode restrictions apply

3. **Cancellation**:
   - Cancel subscription
   - Verify it stays active until period end
   - Verify reactivation works

### Testing Webhooks

**Local Development with Stripe CLI:**

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/subscriptions/webhook
   ```
4. Copy the webhook signing secret shown (starts with `whsec_`)
5. Add to `.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`
6. Trigger test events:
   ```bash
   stripe trigger customer.subscription.updated
   stripe trigger invoice.paid
   stripe trigger invoice.payment_failed
   ```
7. Check server logs for webhook processing

**Production Webhook Testing:**

1. In Stripe Dashboard > Developers > Webhooks
2. Click on your webhook endpoint
3. Click "Send test webhook"
4. Select an event type (e.g., `invoice.paid`)
5. Click "Send test webhook"
6. Check webhook delivery logs in Stripe Dashboard
7. Verify server logs show webhook was received and processed

**Troubleshooting Webhooks:**

- **Webhook not receiving**: Check firewall rules, ensure endpoint is publicly accessible
- **Signature verification fails**: Ensure `STRIPE_WEBHOOK_SECRET` matches the webhook's signing secret
- **Events not processing**: Check server logs (`docker logs chorequest-api`) for errors
- **Test mode vs Live mode**: Ensure webhook secret matches the key mode (test/live)

## Production Checklist

- [ ] Replace Stripe test keys with live keys
- [ ] Configure production webhook endpoint in Stripe Dashboard
  - [ ] URL: `https://your-domain.com/api/subscriptions/webhook`
  - [ ] Events: subscription.updated, subscription.deleted, invoice.paid, invoice.payment_failed
  - [ ] Copy signing secret to `STRIPE_WEBHOOK_SECRET` in `.env`
- [ ] Test webhook delivery using "Send test webhook" in Stripe Dashboard
- [ ] Verify webhook signature verification in server logs
- [ ] Test payment flow in production mode
- [ ] Set up email notifications for payment failures
- [ ] Monitor subscription status and failed payments
- [ ] Set up backup payment method collection
- [ ] Configure invoice email templates in Stripe
- [ ] Test cancellation and reactivation flows
- [ ] Verify limited mode enforcement
- [ ] Document customer support procedures

## Security Considerations

- API keys stored in environment variables (never committed to git)
- Webhook signatures verified to prevent spoofing
- Payment processing handled entirely by Stripe (PCI compliant)
- No card details stored in database
- All subscription operations authenticated via JWT
- Tenant isolation enforced in database queries

## Support & Troubleshooting

### Common Issues

**"Stripe is not configured" error:**
- Ensure `STRIPE_SECRET_KEY` is set in backend environment
- Ensure `VITE_STRIPE_PUBLISHABLE_KEY` is set in frontend environment
- Check keys are for the same Stripe account (test/live)

**Payment fails:**
- Check Stripe Dashboard > Payments for error details
- Verify webhook is receiving events
- Check server logs for webhook processing errors

**Limits not enforcing:**
- Verify subscription status is 'active'
- Check `checkPlanLimits()` is being called
- Ensure KV store has correct counts

**Limited mode not activating:**
- Check webhook is configured and receiving events
- Verify `invoice.payment_failed` event updates subscription status
- Check subscription refresh in frontend

## Future Enhancements

- Annual billing option (discount)
- Promo codes and discounts
- Trial periods
- Usage-based billing options
- Payment method management UI
- Dunning (automated payment retry)
- Subscription analytics
- Custom enterprise plans
