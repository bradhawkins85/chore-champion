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

  // Fetch subscription plans
  const fetchPlans = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/subscriptions/plans`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch plans');
      }

      const data = await response.json();
      setPlans(data);
    } catch (err: any) {
      console.error('Error fetching plans:', err);
      setError(err.message);
    }
  }, [token]);

  // Fetch current subscription
  const fetchSubscription = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/subscriptions/current`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const data = await response.json();
      setSubscription(data);
    } catch (err: any) {
      console.error('Error fetching subscription:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch plan limits
  const fetchLimits = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/subscriptions/limits`, {
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
      const response = await fetch(`${API_URL}/api/subscriptions/invoices`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }

      const data = await response.json();
      setInvoices(data);
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
      setError(err.message);
    }
  }, [token]);

  // Create setup intent for payment method
  const createSetupIntent = useCallback(async (): Promise<{ clientSecret: string; customerId: string } | null> => {
    if (!token) return null;

    try {
      const response = await fetch(`${API_URL}/api/subscriptions/create-setup-intent`, {
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
      const response = await fetch(`${API_URL}/api/subscriptions/create`, {
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
      const response = await fetch(`${API_URL}/api/subscriptions/cancel`, {
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
      const response = await fetch(`${API_URL}/api/subscriptions/reactivate`, {
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
      const response = await fetch(`${API_URL}/api/subscriptions/update-quantity`, {
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
      const response = await fetch(`${API_URL}/api/subscriptions/downgrade`, {
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
