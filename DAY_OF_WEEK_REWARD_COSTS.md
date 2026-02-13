# Day-of-Week Reward Cost Customization

This feature allows parents to set different reward costs for different days of the week, enabling more flexible reward management.

## Overview

Previously, reward costs could be customized per child with a single cost value. Now, parents can optionally define different costs for each day of the week.

## Use Cases

1. **Weekday vs Weekend Pricing**: Offer rewards at lower costs on weekends when children have more time to complete chores
2. **Special Day Pricing**: Set higher costs on days when fewer chores are assigned
3. **Motivational Pricing**: Lower costs on days when participation is typically lower to encourage engagement

## How It Works

### Data Structure

The `RewardCostOverride` interface now supports:
- `cost?: number` - Default cost for all days (backward compatible)
- `costByDay?: { [day: string]: number }` - Optional per-day costs

Example:
```typescript
{
  childId: "child123",
  cost: 50,  // Default cost for days not specified
  costByDay: {
    monday: 30,
    tuesday: 30,
    wednesday: 30,
    thursday: 30,
    friday: 30,
    saturday: 60,
    sunday: 60
  }
}
```

### UI Features

1. **Expandable Day Configuration**: Click the calendar icon (📅) next to a child's cost input to expand day-of-week settings
2. **Visual Feedback**: Children with day-specific costs have the calendar button highlighted
3. **Auto-expansion**: When editing a reward with existing day-specific costs, those children's sections are automatically expanded
4. **Smart Fallback**: Days without specific costs use the default cost, which in turn falls back to the reward's base cost

### Cost Calculation Priority

The `getRewardCostForChild` function calculates costs in this order:
1. If `costByDay` exists for the current day → use that cost
2. Else if `cost` is specified in the override → use that cost
3. Else → use the reward's base cost

### Backward Compatibility

- Existing rewards with simple cost overrides continue to work
- The new `costByDay` field is optional
- If neither `cost` nor `costByDay` is set, the reward's base cost is used

## Implementation Details

### Modified Files

1. **src/lib/types.ts**
   - Extended `RewardCostOverride` interface
   - Added `DayOfWeekCost` type

2. **src/lib/helpers.ts**
   - Updated `getRewardCostForChild` to accept optional `date` parameter
   - Added logic to check day-specific costs

3. **src/components/RewardDialog.tsx**
   - Added day-of-week UI section
   - Added expandable/collapsible functionality
   - Added state management for expanded children

4. **src/components/RewardShop.tsx**
   - Pass current date when calculating costs

5. **src/components/ChildChoreView.tsx**
   - Pass current date when calculating goal progress

6. **src/components/ChildSelector.tsx**
   - Pass current date when displaying goal tracking

7. **src/App.tsx**
   - Use helper function with purchase date for cost migration

### Database

No database schema changes required. The existing `cost_overrides` JSON column stores the new structure seamlessly.

## Testing Checklist

- [ ] Create a reward with default cost
- [ ] Set different costs for a child on weekdays vs weekends
- [ ] Verify the reward shop shows the correct cost for current day
- [ ] Change system date and verify cost changes
- [ ] Edit an existing reward to add day-specific costs
- [ ] Verify existing rewards without day-specific costs still work
- [ ] Test UI on mobile/tablet screen sizes
- [ ] Verify calendar button shows correct state (highlighted when day costs exist)
- [ ] Test removing all day-specific costs

## Future Enhancements

Potential improvements for future iterations:
- Bulk copy costs from one day to other days
- Templates for common patterns (e.g., "Weekdays low, weekends high")
- Visual calendar view showing cost variations
- Analytics showing purchase patterns by day of week
