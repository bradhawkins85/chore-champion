import Stripe from 'stripe';
import { pool } from '../config/database.js';
import { getTenantData, setTenantData } from './tenant-data-store.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { getEffectivePricePerChild } from './subscription-pricing.js';

// Initialize Stripe with secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  STRIPE_SECRET_KEY not set. Subscription features will be disabled.');
}

export const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2026-01-28.clover',
}) : null;

// Product name constant for consistency
const STRIPE_PRODUCT_NAME = 'ChoreQuest Paid Subscription';

type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'unpaid';

/**
 * Send a meter event to Stripe for billing tracking
 * 
 * This function is primarily called internally by `upsertInvoiceFromStripe()` when an invoice is paid.
 * It can also be called directly for custom usage tracking scenarios.
 * 
 * @param customerId - The Stripe customer ID
 * @param value - The value to track (e.g., 1 for a single API request). Accepts a number for convenience, which is converted to a string as required by Stripe's API
 */
export async function sendStripeMeterEvent(customerId: string, value: number = 1): Promise<void> {
  if (!stripe) {
    console.warn('⚠️  Stripe is not configured. Meter event not sent.');
    return;
  }

  const eventName = process.env.STRIPE_METER_EVENT_NAME || 'api_requests';
  const timestamp = Math.floor(Date.now() / 1000);

  try {
    // Send meter event to Stripe
    await stripe.billing.meterEvents.create({
      event_name: eventName,
      payload: {
        stripe_customer_id: customerId,
        value: value.toString(),
      },
      timestamp: timestamp,
    });
    console.log(`✓ Meter event sent for customer ${customerId}: ${eventName}=${value}`);
  } catch (error: unknown) {
    console.error('Failed to send Stripe meter event:', error instanceof Error ? error.message : 'Unknown error');
    // Don't throw error - meter events are for tracking, not critical to payment flow
  }
}

/**
 * Escape single quotes in a string for Stripe search query
 */
function escapeStripeSearchQuery(value: string): string {
  // Escape backslashes first, then single quotes
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Get or create Stripe product for ChoreQuest subscription
 * Checks if product already exists before creating a new one
 */
export async function getOrCreateStripeProduct(): Promise<string> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  // Search for existing product by name (escape single quotes for safety)
  const escapedProductName = escapeStripeSearchQuery(STRIPE_PRODUCT_NAME);
  const existingProducts = await stripe.products.search({
    query: `name:'${escapedProductName}' AND active:\"true\"`,
    limit: 1,
  });

  if (existingProducts.data.length > 0) {
    return existingProducts.data[0].id;
  }

  // Create new product if not found
  const product = await stripe.products.create({
    name: STRIPE_PRODUCT_NAME,
  });

  return product.id;
}

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

export async function getSubscriptionPlansForTenant(tenantId: string): Promise<SubscriptionPlan[]> {
  const plans = await getSubscriptionPlans();
  const pricedPlans = await Promise.all(
    plans.map(async (plan) => {
      if (plan.tier !== 'paid') {
        return plan;
      }

      const fallbackPrice = Number(plan.price_per_child_aud) || 0;
      const effectivePrice = await getEffectivePricePerChild(tenantId, fallbackPrice);
      return {
        ...plan,
        price_per_child_aud: effectivePrice,
      };
    })
  );

  return pricedPlans;
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

async function updatePlanLimitedItems(
  tenantId: string,
  keyName: 'children' | 'chores' | 'rewards',
  maxAllowed: number | null,
  isActive: boolean
): Promise<void> {
  if (maxAllowed === null && !isActive) {
    return;
  }
  let items: unknown;
  try {
    items = await getTenantData(keyName, tenantId);
  } catch (error) {
    console.error(`Unable to parse tenant data for ${keyName}:`, error);
    return;
  }
  if (items === null || items === undefined) {
    return;
  }
  if (!Array.isArray(items)) {
    return;
  }
  let activeCount = 0;
  const updatedItems = items.map((item) => {
    if (!item || typeof item !== 'object') {
      return item;
    }
    if (!isActive && maxAllowed !== null) {
      if (activeCount < maxAllowed) {
        activeCount += 1;
        return { ...item, isActive: true };
      }
      return { ...item, isActive: false };
    }
    return { ...item, isActive: true };
  });
  const hasChanges = updatedItems.some((item, index) => {
    const previous = items[index];
    if (!item || typeof item !== 'object' || !previous || typeof previous !== 'object') {
      return false;
    }
    return (item as { isActive?: boolean }).isActive !== (previous as { isActive?: boolean }).isActive;
  });
  if (!hasChanges) {
    return;
  }
  await setTenantData(keyName, tenantId, updatedItems);
}

export async function applyFreePlanDeactivations(tenantId: string): Promise<void> {
  const freePlan = await getSubscriptionPlan('plan_free');
  if (!freePlan) {
    return;
  }
  await updatePlanLimitedItems(tenantId, 'children', freePlan.max_children, false);
  await updatePlanLimitedItems(tenantId, 'chores', freePlan.max_chores, false);
  await updatePlanLimitedItems(tenantId, 'rewards', freePlan.max_rewards, false);
}

export async function reactivatePlanItems(tenantId: string): Promise<void> {
  await updatePlanLimitedItems(tenantId, 'children', null, true);
  await updatePlanLimitedItems(tenantId, 'chores', null, true);
  await updatePlanLimitedItems(tenantId, 'rewards', null, true);
}

// Type for the joined query result with aliased plan columns
interface SubscriptionWithPlanRow extends TenantSubscription, RowDataPacket {
  plan_id_value: string;
  plan_name: string | null;
  plan_tier: 'free' | 'paid' | 'unlimited' | null;
  plan_description: string | null;
  plan_max_children: number | null;
  plan_max_devices: number | null;
  plan_max_chores: number | null;
  plan_max_rewards: number | null;
  plan_price_per_child_aud: number | null;
  plan_base_price: number | null;
  plan_billing_interval: 'monthly' | 'annual' | null;
  plan_features: string | string[] | null;
  plan_is_active: boolean | null;
  plan_created_at: string | null;
  plan_updated_at: string | null;
}

/**
 * Get current subscription for a tenant
 */
export async function getTenantSubscription(tenantId: string): Promise<(TenantSubscription & { plan?: SubscriptionPlan }) | null> {
  const [rows] = await pool.query<SubscriptionWithPlanRow[]>(
    `SELECT 
       s.id,
       s.tenant_id,
       s.plan_id,
       s.status,
       s.current_period_start,
       s.current_period_end,
       s.cancel_at_period_end,
       s.canceled_at,
       s.stripe_customer_id,
       s.stripe_subscription_id,
       s.created_at,
       s.updated_at,
       p.id as plan_id_value,
       p.name as plan_name,
       p.tier as plan_tier,
       p.description as plan_description,
       p.max_children as plan_max_children,
       p.max_devices as plan_max_devices,
       p.max_chores as plan_max_chores,
       p.max_rewards as plan_max_rewards,
       p.price_per_child_aud as plan_price_per_child_aud,
       p.base_price as plan_base_price,
       p.billing_interval as plan_billing_interval,
       p.features as plan_features,
       p.is_active as plan_is_active,
       p.created_at as plan_created_at,
       p.updated_at as plan_updated_at
     FROM subscriptions s
     LEFT JOIN subscription_plans p ON s.plan_id = p.id
     WHERE s.tenant_id = ?
     ORDER BY s.created_at DESC
     LIMIT 1`,
    [tenantId]
  );
  
  if (rows.length === 0) return null;
  
  const row = rows[0];
  
  // Build the subscription object
  const subscription: TenantSubscription = {
    id: row.id,
    tenant_id: row.tenant_id,
    plan_id: row.plan_id,
    status: row.status,
    current_period_start: row.current_period_start,
    current_period_end: row.current_period_end,
    cancel_at_period_end: row.cancel_at_period_end,
    canceled_at: row.canceled_at,
    stripe_customer_id: row.stripe_customer_id,
    stripe_subscription_id: row.stripe_subscription_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  
  // Build the plan object if plan data exists
  let plan: SubscriptionPlan | undefined = undefined;
  if (row.plan_name) {
    const fallbackPrice = Number(row.plan_price_per_child_aud) || 0;
    const effectivePrice = row.plan_tier === 'paid'
      ? await getEffectivePricePerChild(tenantId, fallbackPrice)
      : fallbackPrice;

    plan = {
      id: row.plan_id_value!,
      name: row.plan_name,
      tier: row.plan_tier!,
      description: row.plan_description!,
      max_children: row.plan_max_children,
      max_devices: row.plan_max_devices,
      max_chores: row.plan_max_chores,
      max_rewards: row.plan_max_rewards,
      price_per_child_aud: effectivePrice,
      base_price: row.plan_base_price!,
      billing_interval: row.plan_billing_interval!,
      features: typeof row.plan_features === 'string' ? JSON.parse(row.plan_features) : row.plan_features!,
      is_active: row.plan_is_active!,
      created_at: row.plan_created_at!,
      updated_at: row.plan_updated_at!,
    };
  }
  
  return {
    ...subscription,
    plan,
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
  
  // Check if customer already exists in local database
  const subscription = await getTenantSubscription(tenantId);
  if (subscription?.stripe_customer_id) {
    return subscription.stripe_customer_id;
  }
  
  // Check if customer already exists in Stripe by email
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 10, // Get up to 10 customers to handle potential duplicates
  });
  
  let customerId: string;
  
  if (existingCustomers.data.length > 0) {
    // Check if any existing customer already has this tenant_id
    let existingCustomer = existingCustomers.data.find(
      (customer) => customer.metadata?.tenant_id === tenantId
    );

    if (!existingCustomer) {
      existingCustomer = existingCustomers.data.find(
        (customer) => !customer.metadata?.tenant_id
      );
    }

    if (existingCustomer) {
      customerId = existingCustomer.id;

      // Update the customer metadata to include tenant_id if not already set
      if (!existingCustomer.metadata?.tenant_id) {
        await stripe.customers.update(customerId, {
          metadata: {
            ...existingCustomer.metadata,
            tenant_id: tenantId,
          },
        });
      }
    } else {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          tenant_id: tenantId,
        },
      });
      customerId = customer.id;
    }
  } else {
    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email,
      metadata: {
        tenant_id: tenantId,
      },
    });
    customerId = customer.id;
  }
  
  // Update subscription with customer ID
  if (subscription) {
    await pool.query<ResultSetHeader>(
      'UPDATE subscriptions SET stripe_customer_id = ? WHERE id = ?',
      [customerId, subscription.id]
    );
  }
  
  return customerId;
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
  
  // Attach payment method to customer (only if not already attached)
  let paymentMethod;
  try {
    paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
  } catch (error: unknown) {
    // Handle retrieve errors
    throw new Error(`Failed to retrieve payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Helper function to extract customer ID from payment method (handles both string and expanded object)
  const extractPaymentMethodCustomerId = (pm: typeof paymentMethod): string | null => {
    if (!pm.customer) return null;
    return typeof pm.customer === 'string' ? pm.customer : pm.customer.id;
  };
  
  const currentCustomerId = extractPaymentMethodCustomerId(paymentMethod);
  
  // Check attachment status and attach if needed
  if (!currentCustomerId) {
    // Payment method not attached to any customer yet - attach it
    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
    } catch (error: unknown) {
      // Handle the race condition where the payment method was attached between retrieve and attach
      // Stripe error type check: resource_already_exists code or "already been attached" message
      const isAttachmentError = error instanceof Error && 
        (error.message.includes('already been attached') || 
         ('code' in error && (error as { code?: string }).code === 'resource_already_exists'));
      
      if (isAttachmentError) {
        // Verify it's attached to the correct customer
        const updatedPaymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
        const updatedCustomerId = extractPaymentMethodCustomerId(updatedPaymentMethod);
        if (updatedCustomerId !== customerId) {
          throw new Error('Payment method is attached to a different customer');
        }
        // If it's attached to the correct customer, continue
      } else {
        throw error;
      }
    }
  } else if (currentCustomerId !== customerId) {
    // Payment method is attached to a different customer
    throw new Error('Payment method is attached to a different customer');
  }
  // If currentCustomerId === customerId, it's already attached to the correct customer - continue
  
  // Set as default payment method
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
  
  const paidPlan = await getSubscriptionPlan('plan_paid');
  if (!paidPlan) {
    throw new Error('Paid plan not found');
  }

  const effectivePrice = await getEffectivePricePerChild(tenantId, Number(paidPlan.price_per_child_aud) || 0);
  const unitAmount = Math.round(effectivePrice * 100);
  if (unitAmount <= 0) {
    throw new Error('Paid plan price is not configured');
  }

  // Get or create the product
  const productId = await getOrCreateStripeProduct();

  // Create a price for the product
  const price = await stripe.prices.create({
    currency: 'aud',
    unit_amount: unitAmount,
    recurring: {
      interval: 'month',
    },
    product: productId,
  });
  
  // Create Stripe subscription - use any to work around type issues with expanded fields
  const stripeSubscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{
      price: price.id,
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
  // Get current_period_start and current_period_end from the first subscription item
  const currentPeriodStart = (stripeSubscription.items?.data?.[0]?.current_period_start || 0) * 1000;
  const currentPeriodEnd = (stripeSubscription.items?.data?.[0]?.current_period_end || 0) * 1000;
  
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
  let clientSecret: string | undefined;
  if (stripeSubscription.latest_invoice && typeof stripeSubscription.latest_invoice === 'object' && 'payment_intent' in stripeSubscription.latest_invoice) {
    const paymentIntent = stripeSubscription.latest_invoice.payment_intent;
    if (paymentIntent && typeof paymentIntent === 'object' && 'client_secret' in paymentIntent) {
      clientSecret = paymentIntent.client_secret as string;
    }
  }
  
  return {
    subscription,
    clientSecret,
  };
}

async function getSubscriptionRowByStripeId(stripeSubscriptionId: string): Promise<{ id: string; tenant_id: string } | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, tenant_id FROM subscriptions WHERE stripe_subscription_id = ? LIMIT 1',
    [stripeSubscriptionId]
  );

  if (rows.length === 0) {
    return null;
  }

  return {
    id: rows[0].id,
    tenant_id: rows[0].tenant_id,
  };
}

export async function upsertSubscriptionFromStripe(stripeSubscription: Stripe.Subscription): Promise<void> {
  const stripeSubscriptionId = stripeSubscription.id;
  const status = stripeSubscription.status as SubscriptionStatus;
  const planId = status === 'canceled' ? 'plan_free' : 'plan_paid';
  const currentPeriodStart = (stripeSubscription.items?.data?.[0]?.current_period_start || 0) * 1000;
  const currentPeriodEnd = (stripeSubscription.items?.data?.[0]?.current_period_end || 0) * 1000;
  const cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end ?? false;
  const canceledAt = stripeSubscription.canceled_at ? stripeSubscription.canceled_at * 1000 : null;
  const stripeCustomerId = typeof stripeSubscription.customer === 'string'
    ? stripeSubscription.customer
    : stripeSubscription.customer?.id ?? null;
  const [existingRows] = await pool.query<RowDataPacket[]>(
    'SELECT tenant_id, plan_id FROM subscriptions WHERE stripe_subscription_id = ? LIMIT 1',
    [stripeSubscriptionId]
  );
  const existingTenantId = existingRows[0]?.tenant_id ?? null;
  const previousPlanId = existingRows[0]?.plan_id ?? null;

  const [updateResult] = await pool.query<ResultSetHeader>(
    `UPDATE subscriptions
     SET plan_id = ?,
         status = ?,
         current_period_start = ?,
         current_period_end = ?,
         cancel_at_period_end = ?,
         canceled_at = ?,
         stripe_customer_id = COALESCE(stripe_customer_id, ?)
     WHERE stripe_subscription_id = ?`,
    [
      planId,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      canceledAt,
      stripeCustomerId,
      stripeSubscriptionId,
    ]
  );

  if (updateResult.affectedRows > 0) {
    if (previousPlanId !== planId && existingTenantId) {
      if (planId === 'plan_free') {
        await applyFreePlanDeactivations(existingTenantId);
      }
      if (planId === 'plan_paid') {
        await reactivatePlanItems(existingTenantId);
      }
    }
    return;
  }

  const metadataTenantId = stripeSubscription.metadata?.tenant_id || stripeSubscription.metadata?.tenantId;
  let tenantId = metadataTenantId ?? null;

  if (!tenantId && stripeCustomerId) {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT tenant_id FROM subscriptions WHERE stripe_customer_id = ? ORDER BY created_at DESC LIMIT 1',
      [stripeCustomerId]
    );
    tenantId = rows[0]?.tenant_id ?? null;
  }

  if (!tenantId && stripeCustomerId && stripe) {
    try {
      const customer = await stripe.customers.retrieve(stripeCustomerId);
      if (!Array.isArray(customer) && !('deleted' in customer && customer.deleted)) {
        const stripeCustomer = customer as Stripe.Customer;
        tenantId = stripeCustomer.metadata?.tenant_id || stripeCustomer.metadata?.tenantId || tenantId;
      }
    } catch (error: unknown) {
      console.warn('Unable to retrieve Stripe customer metadata for subscription sync:',
        error instanceof Error ? error.message : 'Unknown error');
    }
  }

  if (!tenantId) {
    return;
  }

  const [existingTenantRows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM subscriptions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1',
    [tenantId]
  );
  const existingId = existingTenantRows[0]?.id ?? null;

  if (existingId) {
    await pool.query<ResultSetHeader>(
      `UPDATE subscriptions
       SET plan_id = ?,
           status = ?,
           current_period_start = ?,
           current_period_end = ?,
           cancel_at_period_end = ?,
           canceled_at = ?,
           stripe_customer_id = ?,
           stripe_subscription_id = ?
       WHERE id = ?`,
      [
        planId,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        canceledAt,
        stripeCustomerId,
        stripeSubscriptionId,
        existingId,
      ]
    );
    if (planId === 'plan_free') {
      await applyFreePlanDeactivations(tenantId);
    }
    if (planId === 'plan_paid') {
      await reactivatePlanItems(tenantId);
    }
    return;
  }

  const subscriptionId = uuidv4();
  await pool.query<ResultSetHeader>(
    `INSERT INTO subscriptions
     (id, tenant_id, plan_id, status, current_period_start, current_period_end, stripe_customer_id, stripe_subscription_id, cancel_at_period_end, canceled_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      subscriptionId,
      tenantId,
      planId,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      stripeCustomerId,
      stripeSubscriptionId,
      cancelAtPeriodEnd,
      canceledAt,
    ]
  );
  if (planId === 'plan_free') {
    await applyFreePlanDeactivations(tenantId);
  }
  if (planId === 'plan_paid') {
    await reactivatePlanItems(tenantId);
  }
}

export async function syncSubscriptionByStripeId(stripeSubscriptionId: string): Promise<void> {
  if (!stripe) {
    return;
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  await upsertSubscriptionFromStripe(stripeSubscription);
}

export async function syncTenantSubscription(tenantId: string): Promise<TenantSubscription | null> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const subscription = await getTenantSubscription(tenantId);
  if (!subscription) {
    return null;
  }

  if (subscription.stripe_subscription_id) {
    await syncSubscriptionByStripeId(subscription.stripe_subscription_id);
    return await getTenantSubscription(tenantId);
  }

  if (subscription.stripe_customer_id) {
    const stripeSubscriptions = await stripe.subscriptions.list({
      customer: subscription.stripe_customer_id,
      limit: 1,
      status: 'all',
    });
    const stripeSubscription = stripeSubscriptions.data[0];
    if (stripeSubscription) {
      await upsertSubscriptionFromStripe(stripeSubscription);
      return await getTenantSubscription(tenantId);
    }
  }

  return subscription;
}

export async function upsertInvoiceFromStripe(invoice: Stripe.Invoice): Promise<void> {
  const subscription = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription }).subscription;
  const stripeSubscriptionId =
    typeof subscription === 'string' ? subscription : subscription?.id;

  if (!stripeSubscriptionId) {
    return;
  }

  const subscriptionRow = await getSubscriptionRowByStripeId(stripeSubscriptionId);
  if (!subscriptionRow) {
    return;
  }

  const dueDateSeconds = invoice.due_date ?? invoice.created ?? Math.floor(Date.now() / 1000);
  const paidAtSeconds = invoice.status_transitions?.paid_at ?? null;
  const paidAt = paidAtSeconds ? paidAtSeconds * 1000 : null;
  const hostedInvoiceUrl = invoice.hosted_invoice_url ?? null;
  const invoicePdf = invoice.invoice_pdf ?? null;
  const description = invoice.description ?? null;
  const [existingInvoiceRows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM invoices WHERE stripe_invoice_id = ? LIMIT 1',
    [invoice.id]
  );
  const existingInvoiceId = existingInvoiceRows[0]?.id ?? null;

  if (existingInvoiceId) {
    await pool.query<ResultSetHeader>(
      `UPDATE invoices
       SET amount_due = ?,
           amount_paid = ?,
           status = ?,
           due_date = ?,
           paid_at = ?,
           hosted_invoice_url = ?,
           invoice_pdf = ?,
           description = ?
       WHERE id = ?`,
      [
        invoice.amount_due ?? 0,
        invoice.amount_paid ?? 0,
        invoice.status ?? 'draft',
        dueDateSeconds * 1000,
        paidAt,
        hostedInvoiceUrl,
        invoicePdf,
        description,
        existingInvoiceId,
      ]
    );
  } else {
    const invoiceId = uuidv4();
    await pool.query<ResultSetHeader>(
      `INSERT INTO invoices
       (id, tenant_id, subscription_id, amount_due, amount_paid, status, due_date, paid_at, hosted_invoice_url, invoice_pdf, stripe_invoice_id, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceId,
        subscriptionRow.tenant_id,
        subscriptionRow.id,
        invoice.amount_due ?? 0,
        invoice.amount_paid ?? 0,
        invoice.status ?? 'draft',
        dueDateSeconds * 1000,
        paidAt,
        hostedInvoiceUrl,
        invoicePdf,
        invoice.id,
        description,
      ]
    );
  }

  // Send meter event if invoice is paid
  if (invoice.status === 'paid' && invoice.customer) {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id;
    if (customerId) {
      await sendStripeMeterEvent(customerId, 1);
    }
  }
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(tenantId: string): Promise<void> {
  const subscription = await getTenantSubscription(tenantId);
  if (!subscription) {
    throw new Error('No subscription found');
  }
  let updatedPeriodEnd: number | null = null;

  // Cancel Stripe subscription if exists
  if (stripe && subscription.stripe_subscription_id) {
    const updatedSubscription = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
    // Get current_period_end from the first subscription item
    const periodEnd = updatedSubscription.items?.data?.[0]?.current_period_end;
    if (periodEnd) {
      updatedPeriodEnd = periodEnd * 1000;
    }
  }
  
  // Update database
  if (updatedPeriodEnd) {
    await pool.query<ResultSetHeader>(
      'UPDATE subscriptions SET cancel_at_period_end = TRUE, current_period_end = ? WHERE tenant_id = ?',
      [updatedPeriodEnd, tenantId]
    );
  } else {
    await pool.query<ResultSetHeader>(
      'UPDATE subscriptions SET cancel_at_period_end = TRUE WHERE tenant_id = ?',
      [tenantId]
    );
  }
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
    const currentQuantity = stripeSubscription.items.data[0].quantity ?? 0;
    if (currentQuantity === childrenCount) {
      return;
    }
    await stripe.subscriptionItems.update(stripeSubscription.items.data[0].id, {
      quantity: childrenCount,
      proration_behavior: 'create_prorations',
    });
  }
}

/**
 * Downgrade subscription to free plan
 */
export async function downgradeToFreePlan(tenantId: string): Promise<void> {
  const subscription = await getTenantSubscription(tenantId);
  if (!subscription) {
    throw new Error('No subscription found');
  }
  
  // Cancel Stripe subscription if exists (at period end)
  if (stripe && subscription.stripe_subscription_id) {
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
  }
  
  // Update database only after Stripe succeeds
  await pool.query<ResultSetHeader>(
    'UPDATE subscriptions SET cancel_at_period_end = TRUE WHERE tenant_id = ?',
    [tenantId]
  );
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
  
  // If no subscription or in limited mode (past_due/unpaid/incomplete), use free tier limits
  const effectivePlanId = (subscription?.status === 'past_due' || subscription?.status === 'unpaid' || subscription?.status === 'incomplete' || subscription?.status === 'incomplete_expired')
    ? 'plan_free' 
    : subscription?.plan_id || 'plan_free';
  
  const plan = await getSubscriptionPlan(effectivePlanId);
  
  if (!plan) {
    throw new Error('Plan not found');
  }
  
  // Get current counts from tenant data tables
  const children = (await getTenantData('children', tenantId)) ?? [];
  const childrenCount = Array.isArray(children)
    ? children.filter((child) => child?.isActive !== false).length
    : 0;
  
  const chores = (await getTenantData('chores', tenantId)) ?? [];
  const choresCount = Array.isArray(chores)
    ? chores.filter((chore) => chore?.isActive !== false).length
    : 0;
  
  const rewards = (await getTenantData('rewards', tenantId)) ?? [];
  const rewardsCount = Array.isArray(rewards)
    ? rewards.filter((reward) => reward?.isActive !== false).length
    : 0;
  
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
