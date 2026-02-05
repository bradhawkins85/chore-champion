import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Check, X, ArrowRight, Warning, Crown, Sparkle } from '@phosphor-icons/react';
import { useSubscription } from '@/hooks/use-subscription';
import { toast } from 'sonner';
import { SubscriptionPlan } from '@/lib/types';
const STRIPE_DASHBOARD_COPY = 'You will be redirected to Stripe to manage your subscription and payment details.';

interface SubscriptionSettingsProps {
  childrenCount: number;
}

// Checkout prompt component
function CheckoutPrompt({ plan, childrenCount, onSuccess, onRedirect }: { 
  plan: SubscriptionPlan; 
  childrenCount: number;
  onSuccess: () => void;
  onRedirect: () => Promise<void>;
}) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setProcessing(true);
    setError(null);

    try {
      await onRedirect();
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      toast.error(err.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const monthlyAmount = plan.pricePerChildAUD * childrenCount;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{STRIPE_DASHBOARD_COPY}</p>

      {error && (
        <Alert variant="destructive">
          <Warning className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="bg-muted p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span>Plan:</span>
          <span className="font-medium">{plan.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Children:</span>
          <span className="font-medium">{childrenCount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Rate:</span>
          <span className="font-medium">${plan.pricePerChildAUD} AUD per child/month</span>
        </div>
        <div className="flex justify-between font-semibold pt-2 border-t">
          <span>Total:</span>
          <span>${monthlyAmount.toFixed(2)} AUD/month</span>
        </div>
      </div>

      <Button 
        type="button" 
        className="w-full font-fredoka" 
        disabled={processing}
        onClick={handleCheckout}
      >
        {processing ? 'Redirecting...' : `Continue to Stripe - $${monthlyAmount.toFixed(2)} AUD/month`}
      </Button>
    </div>
  );
}

export function SubscriptionSettings({ childrenCount }: SubscriptionSettingsProps) {
  const {
    subscription,
    plans,
    limits,
    loading,
    isLimitedMode,
    effectiveTier,
    createCheckoutSession,
    createBillingPortalSession,
    fetchInvoices,
    invoices,
  } = useSubscription();

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  const currentPlan = subscription?.plan;
  const freePlan = plans.find(p => p.tier === 'free');
  const paidPlan = plans.find(p => p.tier === 'paid');
  const unlimitedPlan = plans.find(p => p.tier === 'unlimited');

  // Check if Stripe is configured
  const isStripeConfigured = Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

  const handleManageSubscription = async (successMessage: string) => {
    const portalUrl = await createBillingPortalSession();
    if (!portalUrl) {
      toast.error('Unable to open Stripe billing portal.');
      return;
    }
    toast.success(successMessage);
    window.location.assign(portalUrl);
  };

  const handleCancelSubscription = async () => {
    if (!confirm('You will be redirected to Stripe to cancel your subscription. Continue?')) {
      return;
    }
    await handleManageSubscription('Redirecting to Stripe to cancel your subscription...');
  };

  const handleDowngradeToFree = async () => {
    if (!confirm('You will be redirected to Stripe to manage your plan. Continue?')) {
      return;
    }
    await handleManageSubscription('Redirecting to Stripe to manage your plan...');
  };

  const handleReactivate = async () => {
    await handleManageSubscription('Redirecting to Stripe to manage your subscription...');
  };

  const handleViewInvoices = () => {
    fetchInvoices();
  };

  const hasUsageData = Boolean(
    limits &&
      (limits.current.children > 0 ||
        limits.current.devices > 0 ||
        limits.current.chores > 0 ||
        limits.current.rewards > 0),
  );

  const handleUpgradeAttempt = (plan: SubscriptionPlan) => {
    if (!isStripeConfigured) {
      toast.error('Stripe is not configured. Please contact your administrator.');
      return;
    }
    setSelectedPlan(plan);
    setShowUpgrade(true);
  };

  const handleCheckoutRedirect = async () => {
    if (!selectedPlan) return;
    const sessionUrl = await createCheckoutSession(childrenCount);
    if (!sessionUrl) {
      throw new Error('Unable to start Stripe Checkout.');
    }
    window.location.assign(sessionUrl);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading subscription...</p>
        </CardContent>
      </Card>
    );
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'free':
        return null;
      case 'paid':
        return <CreditCard className="h-5 w-5" />;
      case 'unlimited':
        return <Crown className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    if (!subscription) return null;

    const statusColors: Record<string, string> = {
      active: 'bg-green-500',
      past_due: 'bg-orange-500',
      canceled: 'bg-gray-500',
      unpaid: 'bg-red-500',
      incomplete: 'bg-yellow-500',
      incomplete_expired: 'bg-red-500',
      trialing: 'bg-blue-500',
    };

    return (
      <Badge className={`${statusColors[subscription.status] || 'bg-gray-500'} text-white`}>
        {subscription.status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stripe Configuration Alert */}
      {!isStripeConfigured && currentPlan?.tier === 'free' && (
        <Alert>
          <Warning className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Stripe Payment Integration Not Configured</p>
              <p className="text-sm">
                To enable paid subscriptions, please configure Stripe by setting the <code className="px-1 py-0.5 bg-muted rounded">VITE_STRIPE_PUBLISHABLE_KEY</code> environment variable.
              </p>
              <p className="text-sm text-muted-foreground">
                See the <a href="https://github.com/bradhawkins85/chore-champion/blob/main/SUBSCRIPTION_MODEL.md" target="_blank" rel="noopener noreferrer" className="underline">Subscription Model documentation</a> for setup instructions.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Limited Mode Alert */}
      {isLimitedMode && (
        <Alert variant="destructive">
          <Warning className="h-4 w-4" />
          <AlertDescription>
            Your account is in limited mode due to overdue payment. You're currently restricted to Free tier limits.
            Please update your payment method to restore full access.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getTierIcon(currentPlan?.tier || 'free')}
              <div>
                <CardTitle className="font-fredoka">Current Plan</CardTitle>
                <CardDescription>
                  {currentPlan?.name || 'Free'} Plan
                </CardDescription>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Details */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {currentPlan?.description}
            </p>
            
            {currentPlan?.tier === 'paid' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Monthly Cost</span>
                  <span className="text-lg font-semibold">
                    ${((currentPlan.pricePerChildAUD || 0) * childrenCount).toFixed(2)} AUD
                    <span className="text-sm text-muted-foreground ml-1">
                      ({childrenCount} {childrenCount === 1 ? 'child' : 'children'})
                    </span>
                  </span>
                </div>
              </div>
            )}
            
            {subscription?.cancelAtPeriodEnd && (
              <Alert>
                <Warning className="h-4 w-4" />
                <AlertDescription>
                  {subscription.currentPeriodEnd && !Number.isNaN(new Date(subscription.currentPeriodEnd).getTime())
                    ? (
                      <>
                        Your subscription will be canceled on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                        You can reactivate it at any time before then.
                      </>
                    )
                    : (
                      <>
                        Your subscription is set to cancel at the end of the current billing period.
                        You can reactivate it at any time before then.
                      </>
                    )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Features */}
          {currentPlan?.features && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Included Features:</p>
              <ul className="space-y-1">
                {currentPlan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Current Usage */}
          {limits && hasUsageData && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Current Usage:</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground">Children</div>
                  <div className="text-lg font-semibold">
                    {limits.current.children}
                    {limits.limits.maxChildren !== null && ` / ${limits.limits.maxChildren}`}
                  </div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground">Devices</div>
                  <div className="text-lg font-semibold">
                    {limits.current.devices}
                    {limits.limits.maxDevices !== null && ` / ${limits.limits.maxDevices}`}
                  </div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground">Chores</div>
                  <div className="text-lg font-semibold">
                    {limits.current.chores}
                    {limits.limits.maxChores !== null && ` / ${limits.limits.maxChores}`}
                  </div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground">Rewards</div>
                  <div className="text-lg font-semibold">
                    {limits.current.rewards}
                    {limits.limits.maxRewards !== null && ` / ${limits.limits.maxRewards}`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {currentPlan?.tier === 'free' && paidPlan && (
              <Button
                onClick={() => handleUpgradeAttempt(paidPlan)}
                className="font-fredoka"
                disabled={!isStripeConfigured}
              >
                <Sparkle className="h-4 w-4 mr-2" />
                Upgrade to Paid
              </Button>
            )}
            
            {currentPlan?.tier === 'paid' && !subscription?.cancelAtPeriodEnd && (
              <>
                <Button
                  variant="outline"
                  onClick={handleDowngradeToFree}
                  className="font-fredoka"
                >
                  Downgrade to Free
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelSubscription}
                  className="font-fredoka"
                >
                  Cancel Subscription
                </Button>
              </>
            )}
            
            {subscription?.cancelAtPeriodEnd && (
              <Button
                onClick={handleReactivate}
                className="font-fredoka"
              >
                Reactivate Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      {!showUpgrade && currentPlan?.tier !== 'unlimited' && (
        <Card>
          <CardHeader>
            <CardTitle className="font-fredoka">Available Plans</CardTitle>
            <CardDescription>Compare and choose the right plan for your family</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Free Plan */}
              {freePlan && (
                <div className={`border rounded-lg p-4 ${currentPlan?.tier === 'free' ? 'border-primary' : ''}`}>
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-fredoka font-semibold text-lg">{freePlan.name}</h3>
                      <p className="text-sm text-muted-foreground">{freePlan.description}</p>
                    </div>
                    <div className="text-2xl font-bold">Free</div>
                    <ul className="space-y-1">
                      {freePlan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {currentPlan?.tier === 'free' && (
                      <Badge variant="outline">Current Plan</Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Paid Plan */}
              {paidPlan && (
                <div className={`border rounded-lg p-4 ${currentPlan?.tier === 'paid' ? 'border-primary' : ''}`}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-fredoka font-semibold text-lg flex items-center gap-2">
                          <CreditCard className="h-5 w-5" />
                          {paidPlan.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{paidPlan.description}</p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold">
                      ${paidPlan.pricePerChildAUD} AUD
                      <span className="text-sm font-normal text-muted-foreground">
                        {' '}per child/month
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {paidPlan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {currentPlan?.tier === 'paid' ? (
                      <Badge variant="outline">Current Plan</Badge>
                    ) : (
                      <Button
                        onClick={() => handleUpgradeAttempt(paidPlan)}
                        className="w-full font-fredoka"
                        disabled={!isStripeConfigured}
                      >
                        Upgrade Now
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade Form */}
      {showUpgrade && selectedPlan && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-fredoka">Upgrade to {selectedPlan.name} Plan</CardTitle>
                <CardDescription>Complete your upgrade securely in Stripe</CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setShowUpgrade(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <CheckoutPrompt
              plan={selectedPlan}
              childrenCount={childrenCount}
              onSuccess={() => setShowUpgrade(false)}
              onRedirect={handleCheckoutRedirect}
            />
          </CardContent>
        </Card>
      )}

    </div>
  );
}
