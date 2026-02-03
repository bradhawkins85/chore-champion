# Legacy Data Migration UI - Visual Guide

## Component Appearance

The migration component appears at the top of the Parent Dashboard's Summary tab when legacy data is detected.

### Card Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🗄️ Legacy Data Available                                                │
│                                                                           │
│ 42 records from legacy data storage are available for migration to       │
│ your account.                                                             │
│                                                                           │
│ ⚠️ This will move all legacy data to your tenant and remove it from     │
│    the legacy storage.                              [Migrate Data →]     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Visual Details

**Card Styling:**
- Light blue background (bg-blue-50) with blue border
- Dark mode: Dark blue background (bg-blue-950) with blue border
- Stands out from other dashboard elements
- Database icon (🗄️) for visual identification

**Button States:**
- Default: "Migrate Data" with right arrow icon
- Loading: "Migrating..." (disabled)
- After success: Card disappears entirely

### Confirmation Dialog

When user clicks "Migrate Data", a confirmation dialog appears:

```
┌─────────────────────────────────────────────────────────────────┐
│  Confirm Legacy Data Migration                                  │
│                                                                  │
│  This will transfer 42 records from legacy storage to your      │
│  account.                                                        │
│                                                                  │
│  Important: The legacy data will be permanently removed after   │
│  migration.                                                      │
│                                                                  │
│  If you already have data in your account, existing records     │
│  will be preserved and only missing data will be migrated.      │
│                                                                  │
│                               [Cancel]  [Proceed with Migration] │
└─────────────────────────────────────────────────────────────────┘
```

### Success Notification

After successful migration, a toast notification appears:

```
┌─────────────────────────────────────────────────────────────┐
│ ✓ Migration completed successfully!                         │
│   Migrated 38 records. Skipped 4 existing records.         │
└─────────────────────────────────────────────────────────────┘
```

### Error Notification

If migration fails, an error toast appears:

```
┌─────────────────────────────────────────────────────────────┐
│ ✗ Migration failed                                          │
│   No legacy data found to migrate                           │
└─────────────────────────────────────────────────────────────┘
```

## User Flow Diagram

```
                    Parent Dashboard
                           ↓
              ┌────────────────────────┐
              │  Summary Tab Active    │
              └────────────────────────┘
                           ↓
                 ┌──────────────────┐
                 │ Has legacy data? │
                 └──────────────────┘
                     ↓           ↓
                   YES          NO
                     ↓           ↓
    ┌────────────────────┐  (No migration
    │ Show Migration     │   card shown)
    │ Card               │
    └────────────────────┘
              ↓
    ┌────────────────────┐
    │ User clicks        │
    │ "Migrate Data"     │
    └────────────────────┘
              ↓
    ┌────────────────────┐
    │ Show Confirmation  │
    │ Dialog             │
    └────────────────────┘
         ↓           ↓
      Cancel    Proceed
         ↓           ↓
      (Close    ┌────────────────┐
       dialog)  │ Start Migration│
                └────────────────┘
                        ↓
                ┌──────────────────┐
                │ Show "Migrating" │
                │ (disabled button)│
                └──────────────────┘
                        ↓
                   ┌─────────┐
                   │Success? │
                   └─────────┘
                   ↓         ↓
                 YES        NO
                   ↓         ↓
         ┌─────────────┐  ┌──────────┐
         │ Success     │  │ Error    │
         │ Toast       │  │ Toast    │
         └─────────────┘  └──────────┘
                   ↓         ↓
         ┌─────────────┐    │
         │ Card Hidden │    │
         │ Forever     │    │
         └─────────────┘    │
                            ↓
                   ┌──────────────┐
                   │ Card remains │
                   │ User can     │
                   │ retry        │
                   └──────────────┘
```

## Color Scheme

- **Card Background**: Light blue (#eff6ff in light mode, #172554 in dark mode)
- **Card Border**: Blue (#93c5fd in light mode, #1e40af in dark mode)
- **Database Icon**: Blue (#2563eb in light mode, #60a5fa in dark mode)
- **Warning Icon**: Amber (#d97706)
- **Success Toast**: Green background with checkmark
- **Error Toast**: Red background with X icon

## Responsive Design

- Desktop: Full-width card with button on the right
- Tablet: Card stacks content, button below text
- Mobile: Card stacks content, full-width button

## Accessibility

- Button has clear, descriptive text
- Warning icon provides visual cue
- Confirmation dialog prevents accidental migration
- Toast notifications are screen-reader friendly
- All interactive elements have proper focus states

## States Summary

1. **Loading State**: Checking for legacy data (hidden)
2. **Has Data State**: Blue card visible with migrate button
3. **Migrating State**: Button disabled, shows "Migrating..."
4. **Success State**: Card hidden, success toast shown
5. **Error State**: Card remains, error toast shown, user can retry
6. **No Data State**: Card hidden (not rendered)
