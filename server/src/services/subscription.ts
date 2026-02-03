import Stripe from 'stripe';
import { pool } from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

// Initialize Stripe with secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  STRIPE_SECRET_KEY not set. Subscription features will be disabled.');
}

export const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2024-11-20.acacia',
}) : null;

// Subscription Plan Interfaces
export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: 'free' | 'paid' | 'unlimited';
  description: string;
  max_children: number | null;
  max_devices: number | null;
  max_chores: number | null;
  max_rewards: number | null;
  price_per_child_aud: number;
  base_price: number;
  billing_interval: 'monthly' | 'annual';
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantSubscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get all active subscription plans
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const [rows] = await pool.query<(SubscriptionPlan & RowDataPacket)[]>(
    'SELECT * FROM subscription_plans WHERE is_active = TRUE ORDER BY tier'
  );
  
  return rows.map(row => ({
    ...row,
    features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features,
  }));
}

/**
 * Get a specific subscription plan
 */
export async function getSubscriptionPlan(planId: string): Promise<SubscriptionPlan | null> {
  const [rows] = await pool.query<(SubscriptionPlan & RowDataPacket)[]>(
    'SELECT * FROM subscription_plans WHERE id = ?',
    [planId]
  );
  
  if (rows.length === 0) return null;
  
  return {
    ...rows[0],
    features: typeof rows[0].features === 'string' ? JSON.parse(rows[0].features) : rows[0].features,
  };
}

/**
 * Get current subscription for a tenant
 */
export async function getTenantSubscription(tenantId: string): Promise<(TenantSubscription & { plan?: SubscriptionPlan }) | null> {
  const [rows] = await pool.query<(TenantSubscription & RowDataPacket)[]>(
    `SELECT s.*, p.* 
     FROM subscriptions s
     LEFT JOIN subscription_plans p ON s.plan_id = p.id
     WHERE s.tenant_id = ?
     ORDER BY s.created_at DESC
     LIMIT 1`,
    [tenantId]
  );
  
  if (rows.length === 0) return null;
  
  const subscription = rows[0];
  const plan = subscription.plan_id ? await getSubscriptionPlan(subscription.plan_id) : null;
  
  return {
    ...subscription,
    plan: plan || undefined,
  };
}

/**
 * Create a free subscription for a new tenant
 */
export async function createFreeSubscription(tenantId: string): Promise<TenantSubscription> {
  const subscriptionId = uuidv4();
  const now = Date.now();
  const oneYearFromNow = now + (365 * 24 * 60 * 60 * 1000); // 1 year in milliseconds
  
  await pool.query<ResultSetHeader>(
    `INSERT INTO subscriptions 
     (id, tenant_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end)
     VALUES (?, ?, 'plan_free', 'active', ?, ?, FALSE)`,
    [subscriptionId, tenantId, now, oneYearFromNow]
  );
  
  const subscription = await getTenantSubscription(tenantId);
  if (!subscription) {
    throw new Error('Failed to create subscription');
  }
  
  return subscription;
}

/**
 * Create or retrieve Stripe customer for tenant
 */
export async function getOrCreateStripeCustomer(tenantId: string, email: string): Promise<string> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }
  
  // Check if customer already exists
  const subscription = await getTenantSubscription(tenantId);
  if (subscription?.stripe_customer_id) {
    return subscription.stripe_customer_id;
  }
  
  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      tenant_id: tenantId,
    },
  });
  
  // Update subscription with customer ID
  if (subscription) {
    await pool.query<ResultSetHeader>(
      'UPDATE subscriptions SET stripe_customer_id = ? WHERE id = ?',
      [customer.id, subscription.id]
    );
  }
  
  return customer.id;
}

/**
 * Create a paid subscription using Stripe
 */
export async function createPaidSubscription(
  tenantId: string,
  email: string,
  paymentMethodId: string,
  childrenCount: number
): Promise<{ subscription: TenantSubscription; clientSecret?: string }> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }
  
  // Get or create Stripe customer
  const customerId = await getOrCreateStripeCustomer(tenantId, email);
  
  // Attach payment method to customer
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });
  
  // Set as default payment method
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
  
  // Calculate amount: $1 AUD per child per month
  const amountInCents = childrenCount * 100; // $1 = 100 cents
  
  // Create Stripe subscription
  const stripeSubscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{
      price_data: {
        currency: 'aud',
        product_data: {
          name: 'ChoreQuest Paid Subscription',
          description: `$1 AUD per child per month (${childrenCount} children)`,
        },
        unit_amount: 100, // $1 in cents
        recurring: {
          interval: 'month',
        },
      },
      quantity: childrenCount,
    }],
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      tenant_id: tenantId,
      children_count: childrenCount.toString(),
    },
  });
  
  // Create or update subscription in database
  const subscriptionId = uuidv4();
  const currentPeriodStart = stripeSubscription.current_period_start * 1000;
  const currentPeriodEnd = stripeSubscription.current_period_end * 1000;
  
  // Check if subscription already exists
  const existingSubscription = await getTenantSubscription(tenantId);
  
  if (existingSubscription) {
    // Update existing subscription
    await pool.query<ResultSetHeader>(
      `UPDATE subscriptions 
       SET plan_id = 'plan_paid', 
           status = ?, 
           current_period_start = ?,
           current_period_end = ?,
           stripe_customer_id = ?,
           stripe_subscription_id = ?,
           cancel_at_period_end = FALSE
       WHERE tenant_id = ?`,
      [stripeSubscription.status, currentPeriodStart, currentPeriodEnd, customerId, stripeSubscription.id, tenantId]
    );
  } else {
    // Create new subscription
    await pool.query<ResultSetHeader>(
      `INSERT INTO subscriptions 
       (id, tenant_id, plan_id, status, current_period_start, current_period_end, stripe_customer_id, stripe_subscription_id, cancel_at_period_end)
       VALUES (?, ?, 'plan_paid', ?, ?, ?, ?, ?, FALSE)`,
      [subscriptionId, tenantId, stripeSubscription.status, currentPeriodStart, currentPeriodEnd, customerId, stripeSubscription.id]
    );
  }
  
  const subscription = await getTenantSubscription(tenantId);
  if (!subscription) {
    throw new Error('Failed to create subscription');
  }
  
  // Get client secret for payment confirmation
  const latestInvoice = stripeSubscription.latest_invoice as Stripe.Invoice;
  const paymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent;
  
  return {
    subscription,
    clientSecret: paymentIntent?.client_secret || undefined,
  };
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(tenantId: string): Promise<void> {
  const subscription = await getTenantSubscription(tenantId);
  if (!subscription) {
    throw new Error('No subscription found');
  }
  
  // Cancel Stripe subscription if exists
  if (stripe && subscription.stripe_subscription_id) {
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
  }
  
  // Update database
  await pool.query<ResultSetHeader>(
    'UPDATE subscriptions SET cancel_at_period_end = TRUE WHERE tenant_id = ?',
    [tenantId]
  );
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateSubscription(tenantId: string): Promise<void> {
  const subscription = await getTenantSubscription(tenantId);
  if (!subscription) {
    throw new Error('No subscription found');
  }
  
  // Reactivate Stripe subscription if exists
  if (stripe && subscription.stripe_subscription_id) {
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
    });
  }
  
  // Update database
  await pool.query<ResultSetHeader>(
    'UPDATE subscriptions SET cancel_at_period_end = FALSE WHERE tenant_id = ?',
    [tenantId]
  );
}

/**
 * Update subscription quantity (number of children)
 */
export async function updateSubscriptionQuantity(tenantId: string, childrenCount: number): Promise<void> {
  const subscription = await getTenantSubscription(tenantId);
  if (!subscription || !subscription.stripe_subscription_id || !stripe) {
    return; // No Stripe subscription to update
  }
  
  // Get the subscription from Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
  
  // Update the quantity of the first item
  if (stripeSubscription.items.data.length > 0) {
    await stripe.subscriptionItems.update(stripeSubscription.items.data[0].id, {
      quantity: childrenCount,
    });
  }
}

/**
 * Get invoices for a tenant
 */
export async function getTenantInvoices(tenantId: string): Promise<any[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM invoices WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50`,
    [tenantId]
  );
  
  return rows;
}

/**
 * Check if tenant has reached plan limits
 */
export async function checkPlanLimits(tenantId: string): Promise<{
  canAddChild: boolean;
  canAddDevice: boolean;
  canAddChore: boolean;
  canAddReward: boolean;
  limits: {
    maxChildren: number | null;
    maxDevices: number | null;
    maxChores: number | null;
    maxRewards: number | null;
  };
  current: {
    children: number;
    devices: number;
    chores: number;
    rewards: number;
  };
}> {
  const subscription = await getTenantSubscription(tenantId);
  
  // If no subscription or in limited mode (past_due/unpaid), use free tier limits
  const effectivePlanId = (subscription?.status === 'past_due' || subscription?.status === 'unpaid') 
    ? 'plan_free' 
    : subscription?.plan_id || 'plan_free';
  
  const plan = await getSubscriptionPlan(effectivePlanId);
  
  if (!plan) {
    throw new Error('Plan not found');
  }
  
  // Get current counts from kv_store
  const [childrenRows] = await pool.query<RowDataPacket[]>(
    'SELECT value_data FROM kv_store WHERE tenant_id = ? AND key_name = ?',
    [tenantId, 'children']
  );
  const children = childrenRows.length > 0 ? JSON.parse(childrenRows[0].value_data) : [];
  const childrenCount = Array.isArray(children) ? children.length : 0;
  
  const [choresRows] = await pool.query<RowDataPacket[]>(
    'SELECT value_data FROM kv_store WHERE tenant_id = ? AND key_name = ?',
    [tenantId, 'chores']
  );
  const chores = choresRows.length > 0 ? JSON.parse(choresRows[0].value_data) : [];
  const choresCount = Array.isArray(chores) ? chores.length : 0;
  
  const [rewardsRows] = await pool.query<RowDataPacket[]>(
    'SELECT value_data FROM kv_store WHERE tenant_id = ? AND key_name = ?',
    [tenantId, 'rewards']
  );
  const rewards = rewardsRows.length > 0 ? JSON.parse(rewardsRows[0].value_data) : [];
  const rewardsCount = Array.isArray(rewards) ? rewards.length : 0;
  
  const [devicesRows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM devices WHERE tenant_id = ?',
    [tenantId]
  );
  const devicesCount = devicesRows[0]?.count || 0;
  
  return {
    canAddChild: plan.max_children === null || childrenCount < plan.max_children,
    canAddDevice: plan.max_devices === null || devicesCount < plan.max_devices,
    canAddChore: plan.max_chores === null || choresCount < plan.max_chores,
    canAddReward: plan.max_rewards === null || rewardsCount < plan.max_rewards,
    limits: {
      maxChildren: plan.max_children,
      maxDevices: plan.max_devices,
      maxChores: plan.max_chores,
      maxRewards: plan.max_rewards,
    },
    current: {
      children: childrenCount,
      devices: devicesCount,
      chores: choresCount,
      rewards: rewardsCount,
    },
  };
}
