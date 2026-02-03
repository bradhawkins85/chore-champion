import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Check, X, ArrowRight, Warning, Crown, Sparkle } from '@phosphor-icons/react';
import { useSubscription } from '@/hooks/use-subscription';
import { toast } from 'sonner';
import { SubscriptionPlan } from '@/lib/types';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface SubscriptionSettingsProps {
  childrenCount: number;
}

// Payment form component
function PaymentForm({ plan, childrenCount, onSuccess }: { 
  plan: SubscriptionPlan; 
  childrenCount: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { createPaidSubscription, createSetupIntent } = useSubscription();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Create setup intent
      const setupIntentData = await createSetupIntent();
      if (!setupIntentData) {
        throw new Error('Failed to create payment setup');
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Confirm card setup
      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(
        setupIntentData.clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (!setupIntent?.payment_method) {
        throw new Error('Payment method not created');
      }

      // Create subscription
      const success = await createPaidSubscription(
        setupIntent.payment_method as string,
        childrenCount
      );

      if (success) {
        toast.success('Subscription activated successfully!');
        onSuccess();
      } else {
        throw new Error('Failed to activate subscription');
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      toast.error(err.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const monthlyAmount = plan.pricePerChildAUD * childrenCount;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Card Details</label>
        <div className="border rounded-lg p-3">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
      </div>

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
        type="submit" 
        className="w-full font-fredoka" 
        disabled={!stripe || processing}
      >
        {processing ? 'Processing...' : `Activate Paid Plan - $${monthlyAmount.toFixed(2)} AUD/month`}
      </Button>
    </form>
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
    cancelSubscription,
    reactivateSubscription,
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

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? It will remain active until the end of the current billing period.')) {
      return;
    }

    const success = await cancelSubscription();
    if (success) {
      toast.success('Subscription will be canceled at the end of the billing period');
    }
  };

  const handleReactivate = async () => {
    const success = await reactivateSubscription();
    if (success) {
      toast.success('Subscription reactivated successfully');
    }
  };

  const handleViewInvoices = () => {
    fetchInvoices();
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
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Monthly Cost</span>
                <span className="text-lg font-semibold">
                  ${((currentPlan.pricePerChildAUD || 0) * childrenCount).toFixed(2)} AUD
                  <span className="text-sm text-muted-foreground ml-1">
                    ({childrenCount} {childrenCount === 1 ? 'child' : 'children'})
                  </span>
                </span>
              </div>
            )}
            
            {subscription?.cancelAtPeriodEnd && (
              <Alert>
                <Warning className="h-4 w-4" />
                <AlertDescription>
                  Your subscription will be canceled on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                  You can reactivate it at any time before then.
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
          {limits && (
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
          <div className="flex gap-2">
            {currentPlan?.tier === 'free' && paidPlan && (
              <Button
                onClick={() => {
                  if (!isStripeConfigured) {
                    toast.error('Stripe is not configured. Please contact your administrator.');
                    return;
                  }
                  setSelectedPlan(paidPlan);
                  setShowUpgrade(true);
                }}
                className="font-fredoka"
                disabled={!isStripeConfigured}
              >
                <Sparkle className="h-4 w-4 mr-2" />
                Upgrade to Paid
              </Button>
            )}
            
            {currentPlan?.tier === 'paid' && !subscription?.cancelAtPeriodEnd && (
              <Button
                variant="outline"
                onClick={handleCancelSubscription}
                className="font-fredoka"
              >
                Cancel Subscription
              </Button>
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
                        onClick={() => {
                          if (!isStripeConfigured) {
                            toast.error('Stripe is not configured. Please contact your administrator.');
                            return;
                          }
                          setSelectedPlan(paidPlan);
                          setShowUpgrade(true);
                        }}
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
                <CardDescription>Enter your payment details to activate</CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setShowUpgrade(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise}>
              <PaymentForm
                plan={selectedPlan}
                childrenCount={childrenCount}
                onSuccess={() => setShowUpgrade(false)}
              />
            </Elements>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
