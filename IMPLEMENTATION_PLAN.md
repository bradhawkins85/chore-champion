# Implementation Plan: Move Chore Settings to Assignment Level

## Goal
Move Time Window Restrictions, Advanced Repeat Patterns, Time Of Day, and Custom Points from Chore definitions to ChoreAssignment (per-child configuration).

## Status: ⚠️ IN PROGRESS - Partial Implementation

### Completed ✅
1. Updated `types.ts` - Modified Chore and ChoreAssignment interfaces
2. Updated `App.tsx` - Enhanced `handleEditAssignment` signature
3. Updated `PRD.md` - Documented new workflow

### In Progress 🔄
4. ChoreDialog.tsx - Needs simplification (remove moved fields from UI)
5. EditAssignmentDialog.tsx - Needs enhancement (add moved fields to UI)
6. AssignChoresView.tsx - Needs to pass new props to EditAssignmentDialog

### Pending ⏳
7. Helper functions in `helpers.ts` - Update to read from assignments instead of chores
8. `ChildChoreView.tsx` - Update to use assignment-level settings
9. `RewardShop.tsx` - Fix timeOfDay optional type handling
10. Migration logic - Handle existing data gracefully

## Technical Debt
The ChoreDialog.tsx file (~1134 lines) has extensive UI for the fields being moved. Rather than partially fixing, the best approach is to:
1. Create a backup of current ChoreDialog.tsx
2. Build a simplified version from scratch
3. Test thoroughly
4. Deploy

## Recommendation
This refactor touches 10+ files and changes core data flow. Suggest:
- Complete in phases with testing between each
- Add feature flag to toggle between old/new behavior during transition  
- Run E2E tests before deploying
- Document breaking changes for users

## Alternative Quick Fix
If time-constrained, could:
1. Keep both chore-level AND assignment-level fields
2. Assignment overrides chore when present
3. Gradually migrate UI over time

This allows incremental rollout without breaking existing functionality.
