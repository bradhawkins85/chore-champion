import { ReactNode, useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Sparkle, Warning } from '@phosphor-icons/react';
import { useSubscription } from '@/hooks/use-subscription';

interface LimitGuardProps {
  limitType: 'child' | 'device' | 'chore' | 'reward';
  children: (canAdd: boolean, checkLimit: () => Promise<boolean>) => ReactNode;
  onUpgradeClick?: () => void;
}

export function LimitGuard({ limitType, children, onUpgradeClick }: LimitGuardProps) {
  const { limits, isLimitedMode, subscription } = useSubscription();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const limitMap = {
    child: { 
      current: limits?.current.children || 0, 
      max: limits?.limits.maxChildren,
      canAdd: limits?.canAddChild ?? true,
      name: 'Children',
      singular: 'child'
    },
    device: { 
      current: limits?.current.devices || 0, 
      max: limits?.limits.maxDevices,
      canAdd: limits?.canAddDevice ?? true,
      name: 'Devices',
      singular: 'device'
    },
    chore: { 
      current: limits?.current.chores || 0, 
      max: limits?.limits.maxChores,
      canAdd: limits?.canAddChore ?? true,
      name: 'Chores',
      singular: 'chore'
    },
    reward: { 
      current: limits?.current.rewards || 0, 
      max: limits?.limits.maxRewards,
      canAdd: limits?.canAddReward ?? true,
      name: 'Rewards',
      singular: 'reward'
    },
  };

  const limit = limitMap[limitType];
  const isUnlimited = limit.max === null;
  const currentTier = subscription?.plan?.tier || 'free';

  const checkLimit = async (): Promise<boolean> => {
    if (limit.canAdd) {
      return true;
    }

    setShowUpgradeDialog(true);
    return false;
  };

  const handleUpgrade = () => {
    setShowUpgradeDialog(false);
    if (onUpgradeClick) {
      onUpgradeClick();
    }
  };

  return (
    <>
      {children(limit.canAdd, checkLimit)}
      
      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 font-fredoka">
              {isLimitedMode ? (
                <>
                  <Warning className="h-5 w-5 text-orange-500" />
                  Account in Limited Mode
                </>
              ) : (
                <>
                  <Sparkle className="h-5 w-5" />
                  {limit.name} Limit Reached
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {isLimitedMode ? (
                <>
                  <p>
                    Your account is currently in limited mode due to an overdue payment.
                    You're restricted to Free tier limits.
                  </p>
                  <p className="font-medium">
                    Please update your payment method to restore full access to your {subscription?.plan?.name} plan features.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    You've reached the {limit.name.toLowerCase()} limit for the {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} plan.
                  </p>
                  <p className="font-medium">
                    Current limit: {limit.current} / {isUnlimited ? '∞' : limit.max} {limit.current === 1 ? limit.singular : limit.name.toLowerCase()}
                  </p>
                  {currentTier === 'free' && (
                    <p>
                      Upgrade to the Paid plan ($1 AUD per child per month) to add unlimited {limit.name.toLowerCase()}.
                    </p>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-fredoka">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpgrade} className="font-fredoka">
              {isLimitedMode ? 'Update Payment' : 'Upgrade Plan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
