import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import {
  getSubscriptionPlans,
  getSubscriptionPlansForTenant,
  getTenantSubscription,
  createPaidSubscription,
  cancelSubscription,
  reactivateSubscription,
  updateSubscriptionQuantity,
  downgradeToFreePlan,
  getTenantInvoices,
  checkPlanLimits,
  getOrCreateStripeCustomer,
  syncSubscriptionByStripeId,
  stripe,
  upsertInvoiceFromStripe,
  upsertSubscriptionFromStripe,
  getOrCreateStripeProduct,
} from '../services/subscription.js';

const router = Router();

/**
 * GET /api/subscriptions/plans
 * Get all available subscription plans
 */
router.get('/plans', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant not found' });
    }

    const plans = await getSubscriptionPlansForTenant(tenantId);
    res.json(plans);
  } catch (error: any) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch subscription plans' });
  }
});

/**
 * GET /api/subscriptions/current
 * Get current subscription for the authenticated tenant
 */
router.get('/current', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant not found' });
    }
    
    const subscription = await getTenantSubscription(tenantId);
    res.json(subscription);
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

/**
 * GET /api/subscriptions/limits
 * Check current usage against plan limits
 */
router.get('/limits', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant not found' });
    }
    
    const limits = await checkPlanLimits(tenantId);
    res.json(limits);
  } catch (error: any) {
    console.error('Error checking limits:', error);
    res.status(500).json({ error: 'Failed to check plan limits' });
  }
});

/**
 * POST /api/subscriptions/create
 * Create a new paid subscription
 * Body: { paymentMethodId: string, childrenCount: number }
 */
router.post('/create', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const email = req.userEmail;
    
    if (!tenantId || !email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { paymentMethodId, payment_method_id, childrenCount, children_count } = req.body;
    const resolvedPaymentMethodId = paymentMethodId ?? payment_method_id;
    let resolvedChildrenCount: number | null | undefined = childrenCount ?? children_count;

    if (resolvedChildrenCount === undefined || resolvedChildrenCount === null) {
      const limits = await checkPlanLimits(tenantId);
      resolvedChildrenCount = limits.current.children;
    }

    const normalizedChildrenCount = Number(resolvedChildrenCount);

    if (!resolvedPaymentMethodId) {
      return res.status(400).json({ error: 'Missing payment method' });
    }

    if (Number.isNaN(normalizedChildrenCount)) {
      return res.status(400).json({ error: 'Invalid children count' });
    }

    if (normalizedChildrenCount < 1) {
      return res.status(400).json({ error: 'Must have at least 1 child' });
    }

    const result = await createPaidSubscription(
      tenantId,
      email,
      resolvedPaymentMethodId,
      normalizedChildrenCount,
    );
    res.json(result);
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: error.message || 'Failed to create subscription' });
  }
});

/**
 * POST /api/subscriptions/cancel
 * Cancel subscription at period end
 */
router.post('/cancel', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant not found' });
    }
    
    await cancelSubscription(tenantId);
    res.json({ success: true, message: 'Subscription will be canceled at period end' });
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel subscription' });
  }
});

/**
 * POST /api/subscriptions/reactivate
 * Reactivate a canceled subscription
 */
router.post('/reactivate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant not found' });
    }
    
    await reactivateSubscription(tenantId);
    res.json({ success: true, message: 'Subscription reactivated' });
  } catch (error: any) {
    console.error('Error reactivating subscription:', error);
    res.status(500).json({ error: error.message || 'Failed to reactivate subscription' });
  }
});

/**
 * POST /api/subscriptions/update-quantity
 * Update subscription quantity (number of children)
 * Body: { childrenCount: number }
 */
router.post('/update-quantity', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant not found' });
    }
    
    const { childrenCount } = req.body;
    
    if (childrenCount === undefined || childrenCount === null || childrenCount < 0) {
      return res.status(400).json({ error: 'Invalid children count' });
    }
    
    await updateSubscriptionQuantity(tenantId, childrenCount);
    res.json({ success: true, message: 'Subscription quantity updated' });
  } catch (error: any) {
    console.error('Error updating quantity:', error);
    res.status(500).json({ error: error.message || 'Failed to update subscription quantity' });
  }
});

/**
 * POST /api/subscriptions/downgrade
 * Downgrade to free plan at period end
 */
router.post('/downgrade', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant not found' });
    }
    
    await downgradeToFreePlan(tenantId);
    res.json({ success: true, message: 'Subscription will be downgraded to Free plan at period end' });
  } catch (error: any) {
    console.error('Error downgrading subscription:', error);
    res.status(500).json({ error: error.message || 'Failed to downgrade subscription' });
  }
});

/**
 * GET /api/subscriptions/invoices
 * Get invoice history for the tenant
 */
router.get('/invoices', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant not found' });
    }
    
    const invoices = await getTenantInvoices(tenantId);
    res.json(invoices);
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

/**
 * POST /api/subscriptions/checkout-session
 * Create a Stripe Checkout session for starting a paid subscription
 * Body: { childrenCount: number }
 */
router.post('/checkout-session', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }

    const tenantId = req.tenantId;
    const email = req.userEmail;

    if (!tenantId || !email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { childrenCount } = req.body;

    if (!childrenCount || childrenCount < 1) {
      return res.status(400).json({ error: 'Must have at least 1 child' });
    }

    const customerId = await getOrCreateStripeCustomer(tenantId, email);
    const plans = await getSubscriptionPlansForTenant(tenantId);
    const paidPlan = plans.find((plan) => plan.tier === 'paid');

    if (!paidPlan) {
      return res.status(404).json({ error: 'Paid plan not found' });
    }

    const unitAmount = Math.round((Number(paidPlan.price_per_child_aud) || 0) * 100);
    if (unitAmount <= 0) {
      return res.status(400).json({ error: 'Paid plan price is not configured' });
    }

    // Get or create the product
    const productId = await getOrCreateStripeProduct();

    const price = await stripe.prices.create({
      currency: 'aud',
      unit_amount: unitAmount,
      recurring: {
        interval: 'month',
      },
      product: productId,
    });

    const appUrl = process.env.APP_URL || 'http://localhost:5000';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: price.id,
          quantity: childrenCount,
        },
      ],
      success_url: `${appUrl}/?checkout=success`,
      cancel_url: `${appUrl}/?checkout=cancel`,
      subscription_data: {
        metadata: {
          tenant_id: tenantId,
          children_count: childrenCount.toString(),
        },
      },
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message || 'Failed to create checkout session' });
  }
});

/**
 * POST /api/subscriptions/billing-portal
 * Create a Stripe Billing Portal session for managing subscription changes
 */
router.post('/billing-portal', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }

    const tenantId = req.tenantId;
    const email = req.userEmail;

    if (!tenantId || !email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const customerId = await getOrCreateStripeCustomer(tenantId, email);
    const appUrl = process.env.APP_URL || 'http://localhost:5000';
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/?portal=return`,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating billing portal session:', error);
    res.status(500).json({ error: error.message || 'Failed to create billing portal session' });
  }
});

/**
 * POST /api/subscriptions/create-setup-intent
 * Create a Stripe SetupIntent for saving payment method
 */
router.post('/create-setup-intent', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }
    
    const tenantId = req.tenantId;
    const email = req.userEmail;
    
    if (!tenantId || !email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(tenantId, email);
    
    // Create SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });
    
    res.json({
      clientSecret: setupIntent.client_secret,
      customerId,
    });
  } catch (error: any) {
    console.error('Error creating setup intent:', error);
    res.status(500).json({ error: error.message || 'Failed to create setup intent' });
  }
});

/**
 * POST /api/subscriptions/webhook
 * Stripe webhook handler for subscription events
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }
    
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }
    
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }
    
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        // When checkout is completed, sync the subscription created by Stripe
        if (session.subscription) {
          const stripeSubscriptionId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;
          await syncSubscriptionByStripeId(stripeSubscriptionId);
          console.log('Checkout session completed:', session.id, 'subscription:', stripeSubscriptionId);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        await upsertSubscriptionFromStripe(subscription);
        console.log('Subscription event:', event.type, subscription.id);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as any;
        await upsertInvoiceFromStripe(invoice);
        if (invoice.subscription) {
          const stripeSubscriptionId = typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription.id;
          await syncSubscriptionByStripeId(stripeSubscriptionId);
        }
        console.log('Invoice paid:', invoice.id);
        break;
      }

      case 'invoice.payment_failed': {
        const failedInvoice = event.data.object as any;
        await upsertInvoiceFromStripe(failedInvoice);
        if (failedInvoice.subscription) {
          const stripeSubscriptionId = typeof failedInvoice.subscription === 'string'
            ? failedInvoice.subscription
            : failedInvoice.subscription.id;
          await syncSubscriptionByStripeId(stripeSubscriptionId);
        }
        console.log('Invoice payment failed:', failedInvoice.id);
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
