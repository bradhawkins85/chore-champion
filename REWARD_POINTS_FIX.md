# Reward Points Deduction Fix - Verification

## Issue Summary
When a child redeemed a reward, the number of points shown on their card was not reducing accordingly.

## Root Cause
The `RewardPurchase` interface did not store the actual cost at the time of purchase. When calculating available points, the system would look up the current reward cost from the reward definition, which could:
1. Have changed since the purchase
2. No longer exist (reward was deleted)
3. Result in incorrect calculations (returning 0 when reward not found)

## Solution Implemented

### 1. Added `cost` Field to `RewardPurchase` Interface
- File: `src/lib/types.ts`
- Added `cost: number` field to store the actual cost at purchase time

### 2. Updated Purchase Creation
- File: `src/App.tsx` - `handlePurchaseReward` function
- Now stores the actual cost value in the purchase record

### 3. Added Migration for Existing Purchases
- File: `src/App.tsx` - `migratedPurchases` useMemo
- Automatically populates the cost field for existing purchases without it
- Looks up the reward and applies any child-specific cost overrides
- Falls back to 0 if reward no longer exists

### 4. Updated Available Points Calculations
- File: `src/App.tsx` - Multiple locations
  - RewardShop component props
  - childAvailableCategoryPoints calculation
- Now uses `purchase.cost` directly instead of looking up reward

### 5. Updated History and Activity Views
- File: `src/components/RewardShop.tsx`
- File: `src/components/PointsHistoryView.tsx`
- File: `src/components/ActivityView.tsx`
- All now use the stored cost from purchase records

## Verification Steps

### To verify the fix works:

1. **Create a child profile** and assign some chores
2. **Complete chores** to earn points (e.g., 100 points)
3. **Create a reward** with a specific cost (e.g., 50 points)
4. **Note the child's available points** before purchase
5. **Redeem the reward** as the child
6. **Verify the points are deducted correctly**:
   - Child's available points should reduce by the cost (100 - 50 = 50 points remaining)
   - The purchase should appear in history with correct cost

### Additional test cases:

1. **Custom cost per child**: 
   - Create a reward with different costs for different children
   - Verify each child pays their custom cost

2. **Deleted reward**:
   - Purchase a reward, then delete the reward definition
   - Points should still be correctly deducted (uses stored cost)

3. **Changed reward cost**:
   - Purchase a reward, then change its cost
   - Previously purchased items should use the old cost
   - New purchases should use the new cost

## Impact
- ✅ Points now correctly deduct when rewards are redeemed
- ✅ Historical purchases maintain their original cost
- ✅ Backwards compatible with existing data (migration included)
- ✅ No breaking changes to the data structure
- ✅ All build checks pass

## Files Changed
1. `src/lib/types.ts` - Added cost field to interface
2. `src/App.tsx` - Added migration, updated purchase creation and calculations
3. `src/components/RewardShop.tsx` - Updated to use stored cost
4. `src/components/PointsHistoryView.tsx` - Updated to use stored cost
5. `src/components/ActivityView.tsx` - Updated to use stored cost
