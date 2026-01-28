# Schedule Migration: Per-Child Schedules

## What Changed

Chore schedules are now per-child (stored in assignments) rather than per-chore. This allows each child to have their own schedule for the same chore.

## Type Changes

### Before:
```typescript
interface Chore {
  // ... other fields
  startDate?: number
  endDate?: number
  daysOfWeek?: DayOfWeek[]
  repeatPattern?: RepeatPattern
}

interface ChoreAssignment {
  id: string
  childId: string
  choreId: string
  assignedAt: number
}
```

### After:
```typescript
interface Chore {
  // ... other fields
  // Schedule fields REMOVED
}

interface ChoreAssignment {
  id: string
  childId: string
  choreId: string
  assignedAt: number
  startDate?: number        // NEW
  endDate?: number          // NEW
  daysOfWeek?: DayOfWeek[]  // NEW
  repeatPattern?: RepeatPattern  // NEW
}
```

## Helper Function Changes

Schedule-related helper functions now accept `ChoreAssignment` instead of `Chore`:

- `isChoreActive(assignment: ChoreAssignment)`
- `isChoreActiveToday(assignment: ChoreAssignment)`  
- `isRepeatPatternActiveToday(assignment: ChoreAssignment)`

## Component Changes

### ✅ Fixed
- **types.ts**: Updated interfaces
- **helpers.ts**: Updated functions to accept ChoreAssignment
- **App.tsx**: Added data migration from old chore schedules to assignments
- **ChildChoreView.tsx**: Uses assignments for schedule checking
- **ChoreCard.tsx**: Removed schedule display (schedules are now per-child)
- **AssignChoresView.tsx**: Shows schedule dates from assignment
- **MissedChoresManager.tsx**: Uses assignment for schedule checking

### ⚠️ TODO: ChoreDialog.tsx

The ChoreDialog currently has extensive UI for managing schedules (days of week, repeat patterns, start/end dates). This UI needs to be:

1. **Removed from ChoreDialog** - Chores no longer have schedules
2. **Added to Assignment Management UI** - Create a new dialog or expand AssignChoresView to allow parents to set:
   - Start date
   - End date
   - Days of week
   - Repeat patterns
   - Per-child basis

The schedule UI sections in ChoreDialog that reference these undefined variables need to be removed:
- `daysOfWeek`, `setDaysOfWeek`, `toggleDayOfWeek`
- `useRepeatPattern`, `setUseRepeatPattern`
- `repeatInterval`, `setRepeatInterval`
- `repeatSpecificDays`, `setRepeatSpecificDays`, `toggleRepeatDay`
- `repeatAnchorDate`, `setRepeatAnchorDate`
- `getRepeatPatternDescription`
- `startDate`, `setStartDate`
- `endDate`, `setEndDate`

## Migration Strategy

The App.tsx includes automatic data migration that runs once:
- Copies schedule fields from old chores to their assignments
- Cleans the schedule fields from chores
- Preserves all existing schedule data

## Next Steps

1. Remove schedule UI from ChoreDialog (lines referencing schedule state variables)
2. Create AssignmentDialog or enhance AssignChoresView to manage per-child schedules
3. Update parent panel to show per-child schedule information
4. Test that existing users' schedule data migrates correctly
