# ChoreQuest Assignment-Level Configuration Migration

## Overview
Moving Time Window Restrictions, Advanced Repeat Patterns, Time Of Day, and Custom Points from the Chore level to the Assignment level (per-child configuration).

## What Changed

### Data Model Changes (types.ts)
- **Chore interface**: Removed `timeOfDay`, `timeWindow`, `pointOverrides`, and `categoryPointOverrides` (made optional for backward compatibility)
- **ChoreAssignment interface**: Added `timeOfDay`, `timeWindow`, `pointOverrides`, and `categoryPointOverrides`

### Why This Change?
- Different children may need different time windows for the same chore
- Points can vary per child based on age/ability
- Repeat patterns are already per-child (assignment-specific)
- This provides more flexibility for family management

### Affected Components
1. **ChoreDialog.tsx** - Simplified to only manage core chore properties
2. **EditAssignmentDialog.tsx** - Enhanced to manage child-specific chore settings
3. **AssignChoresView.tsx** - Updated to pass assignment-specific data
4. **App.tsx** - Updated `handleEditAssignment` signature

### Migration Path
Existing chores with these properties will continue to work. When editing assignments, you can now customize:
- Time of day (AM/PM/Both/Anytime) per child
- Time windows (e.g., "Brush teeth between 7-9 PM") per child  
- Custom point values per child
- Category-specific point overrides per child

## Implementation Status
- ✅ Type definitions updated
- ✅ App.tsx handler updated
- ⏳ ChoreDialog simplification in progress
- ⏳ EditAssignmentDialog enhancement in progress
- ⏳ Helper functions need updating

## Next Steps
Complete the component rewrites to fully separate chore definitions from assignment-specific configurations.
