import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Subscription, SubscriptionPlan, Invoice, UsageStats } from '@/lib/types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface PlanLimitsResponse {
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
}

export function useSubscription() {
  const { token, user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [limits, setLimits] = useState<PlanLimitsResponse | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapPlan = useCallback((plan: any): SubscriptionPlan => ({
    id: plan.id,
    name: plan.name,
    tier: plan.tier,
    description: plan.description,
    limits: {
      maxChildren: plan.max_children ?? plan.limits?.maxChildren ?? null,
      maxDevices: plan.max_devices ?? plan.limits?.maxDevices ?? null,
      maxChores: plan.max_chores ?? plan.limits?.maxChores ?? null,
      maxRewards: plan.max_rewards ?? plan.limits?.maxRewards ?? null,
    },
    pricePerChildAUD: Number(plan.price_per_child_aud ?? plan.pricePerChildAUD ?? 0),
    basePrice: Number(plan.base_price ?? plan.basePrice ?? 0),
    billingInterval: plan.billing_interval ?? plan.billingInterval ?? 'monthly',
    features: plan.features ?? [],
    isActive: Boolean(plan.is_active ?? plan.isActive ?? true),
    createdAt: plan.created_at ? new Date(plan.created_at).getTime() : plan.createdAt ?? Date.now(),
    updatedAt: plan.updated_at ? new Date(plan.updated_at).getTime() : plan.updatedAt ?? Date.now(),
  }), []);

  const mapSubscription = useCallback((subscription: any): Subscription | null => {
    if (!subscription) return null;

    return {
      id: subscription.id,
      tenantId: subscription.tenant_id ?? subscription.tenantId,
      planId: subscription.plan_id ?? subscription.planId,
      plan: subscription.plan ? mapPlan(subscription.plan) : undefined,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start ?? subscription.currentPeriodStart,
      currentPeriodEnd: subscription.current_period_end ?? subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? subscription.cancelAtPeriodEnd,
      canceledAt: subscription.canceled_at ?? subscription.canceledAt ?? null,
      stripeCustomerId: subscription.stripe_customer_id ?? subscription.stripeCustomerId ?? null,
      stripeSubscriptionId: subscription.stripe_subscription_id ?? subscription.stripeSubscriptionId ?? null,
      createdAt: subscription.created_at ? new Date(subscription.created_at).getTime() : subscription.createdAt ?? Date.now(),
      updatedAt: subscription.updated_at ? new Date(subscription.updated_at).getTime() : subscription.updatedAt ?? Date.now(),
    };
  }, [mapPlan]);

  const mapInvoice = useCallback((invoice: any): Invoice => ({
    id: invoice.id,
    tenantId: invoice.tenant_id ?? invoice.tenantId,
    subscriptionId: invoice.subscription_id ?? invoice.subscriptionId,
    amountDue: invoice.amount_due ?? invoice.amountDue,
    amountPaid: invoice.amount_paid ?? invoice.amountPaid,
    status: invoice.status,
    dueDate: invoice.due_date ?? invoice.dueDate,
    paidAt: invoice.paid_at ?? invoice.paidAt ?? null,
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? invoice.hostedInvoiceUrl ?? null,
    invoicePdf: invoice.invoice_pdf ?? invoice.invoicePdf ?? null,
    stripeInvoiceId: invoice.stripe_invoice_id ?? invoice.stripeInvoiceId ?? null,
    description: invoice.description ?? null,
    createdAt: invoice.created_at ? new Date(invoice.created_at).getTime() : invoice.createdAt ?? Date.now(),
  }), []);

  // Fetch subscription plans
  const fetchPlans = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/subscriptions/plans`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch plans');
      }

      const data = await response.json();
      setPlans(Array.isArray(data) ? data.map(mapPlan) : []);
    } catch (err: any) {
      console.error('Error fetching plans:', err);
      setError(err.message);
    }
  }, [mapPlan, token]);

  // Fetch current subscription
  const fetchSubscription = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/subscriptions/current`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const data = await response.json();
      setSubscription(mapSubscription(data));
    } catch (err: any) {
      console.error('Error fetching subscription:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [mapSubscription, token]);

  // Fetch plan limits
  const fetchLimits = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/subscriptions/limits`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch limits');
      }

      const data = await response.json();
      setLimits(data);
    } catch (err: any) {
      console.error('Error fetching limits:', err);
      setError(err.message);
    }
  }, [token]);

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/subscriptions/invoices`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }

      const data = await response.json();
      setInvoices(Array.isArray(data) ? data.map(mapInvoice) : []);
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
      setError(err.message);
    }
  }, [mapInvoice, token]);

  // Create setup intent for payment method
  const createSetupIntent = useCallback(async (): Promise<{ clientSecret: string; customerId: string } | null> => {
    if (!token) return null;

    try {
      const response = await fetch(`${API_URL}/subscriptions/create-setup-intent`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create setup intent');
      }

      return await response.json();
    } catch (err: any) {
      console.error('Error creating setup intent:', err);
      setError(err.message);
      return null;
    }
  }, [token]);

  // Create paid subscription
  const createPaidSubscription = useCallback(async (paymentMethodId: string, childrenCount: number): Promise<boolean> => {
    if (!token) return false;

    try {
      const response = await fetch(`${API_URL}/subscriptions/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethodId, childrenCount }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subscription');
      }

      await fetchSubscription();
      await fetchLimits();
      return true;
    } catch (err: any) {
      console.error('Error creating subscription:', err);
      setError(err.message);
      return false;
    }
  }, [token, fetchSubscription, fetchLimits]);

  // Cancel subscription
  const cancelSubscription = useCallback(async (): Promise<boolean> => {
    if (!token) return false;

    try {
      const response = await fetch(`${API_URL}/subscriptions/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel subscription');
      }

      await fetchSubscription();
      return true;
    } catch (err: any) {
      console.error('Error canceling subscription:', err);
      setError(err.message);
      return false;
    }
  }, [token, fetchSubscription]);

  // Reactivate subscription
  const reactivateSubscription = useCallback(async (): Promise<boolean> => {
    if (!token) return false;

    try {
      const response = await fetch(`${API_URL}/subscriptions/reactivate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reactivate subscription');
      }

      await fetchSubscription();
      return true;
    } catch (err: any) {
      console.error('Error reactivating subscription:', err);
      setError(err.message);
      return false;
    }
  }, [token, fetchSubscription]);

  // Update subscription quantity
  const updateQuantity = useCallback(async (childrenCount: number): Promise<boolean> => {
    if (!token) return false;

    try {
      const response = await fetch(`${API_URL}/subscriptions/update-quantity`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ childrenCount }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update quantity');
      }

      await fetchSubscription();
      return true;
    } catch (err: any) {
      console.error('Error updating quantity:', err);
      setError(err.message);
      return false;
    }
  }, [token, fetchSubscription]);

  // Downgrade to free plan
  const downgradePlan = useCallback(async (): Promise<boolean> => {
    if (!token) return false;

    try {
      const response = await fetch(`${API_URL}/subscriptions/downgrade`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to downgrade subscription');
      }

      await fetchSubscription();
      return true;
    } catch (err: any) {
      console.error('Error downgrading subscription:', err);
      setError(err.message);
      return false;
    }
  }, [token, fetchSubscription]);

  // Initial load
  useEffect(() => {
    if (token && user) {
      fetchPlans();
      fetchSubscription();
      fetchLimits();
    }
  }, [token, user, fetchPlans, fetchSubscription, fetchLimits]);

  // Check if account is in limited mode (past_due or unpaid)
  const isLimitedMode = subscription?.status === 'past_due' || subscription?.status === 'unpaid';
  
  // Get effective tier (Free if in limited mode)
  const effectiveTier = isLimitedMode ? 'free' : subscription?.plan?.tier || 'free';

  return {
    subscription,
    plans,
    limits,
    invoices,
    loading,
    error,
    isLimitedMode,
    effectiveTier,
    fetchSubscription,
    fetchLimits,
    fetchInvoices,
    createSetupIntent,
    createPaidSubscription,
    cancelSubscription,
    reactivateSubscription,
    updateQuantity,
    downgradePlan,
  };
}
