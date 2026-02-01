# Rotational Chores UI - Visual Location Guide

This diagram shows where to find the rotational chores configuration UI in the ChoreQuest application.

## Navigation Path

```
Home Screen
    ↓
[Go to Parent Mode] Button
    ↓
Enter PIN (e.g., 1234)
    ↓
Parent Dashboard
    ↓
[Chores] Tab
    ↓
[Add Chore] Button (or click on existing chore to edit)
    ↓
Chore Dialog Opens
```

## Chore Dialog UI Structure

```
┌─────────────────────────────────────────────────────────┐
│  Add/Edit Chore                                    [X]  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Chore Name: [________________]                          │
│  Description: [________________]                         │
│  Points: [10]                                            │
│  Frequency: [Daily ▼]                                    │
│  Time of Day: [Anytime ▼]                                │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Completion Type: [Individual ▼]                 │   │
│  │                  - Individual                    │   │
│  │                  - Shareable                     │   │
│  │                  - Once Per Day                  │   │
│  │                  - Rotational  ← SELECT THIS!    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🎯 ROTATIONAL CONFIGURATION                      │   │
│  │ (Appears when "Rotational" is selected)          │   │
│  │                                                   │   │
│  │  Rotation Mode: [One Child Per Interval ▼]       │   │
│  │    - One Child Per Interval                      │   │
│  │    - All Children                                │   │
│  │                                                   │   │
│  │  Rotation Order: [Specific Order ▼]              │   │
│  │    - Specific Order                              │   │
│  │    - Random Order                                │   │
│  │                                                   │   │
│  │  ┌─────────────────────────────────────────┐    │   │
│  │  │ Child Order (Drag to Reorder):          │    │   │
│  │  │                                         │    │   │
│  │  │  1. Emma    [↑] [↓]                     │    │   │
│  │  │  2. Noah    [↑] [↓]                     │    │   │
│  │  │  3. Sophia  [↑] [↓]                     │    │   │
│  │  │                                         │    │   │
│  │  └─────────────────────────────────────────┘    │   │
│  │                                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  [Cancel]                           [Save Chore]        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Key Points

1. **The UI is CONDITIONAL** - It only appears when you select "Rotational" as the Completion Type
2. **Two Locations** - The same UI appears in both "Add Chore" and "Edit Chore" dialogs
3. **Child Order** - You must save the chore with assigned children first, then edit it to reorder them
4. **Immediate Feedback** - When you change Completion Type to "Rotational", the config section appears instantly

## Screenshots Location

For actual screenshots of the UI:
1. Run the application locally: `./dev.sh`
2. Navigate to http://localhost:5000
3. Click "Go to Parent Mode" and enter PIN
4. Go to Chores → Add Chore
5. Scroll down to "Completion Type"
6. Select "Rotational"
7. See the configuration UI appear below

## Code Reference

The UI code is located in:
- **File:** `src/components/ChoreDialog.tsx`
- **Lines:** 652-841 (create mode) and 1192-1380 (edit mode)
- **Conditional:** `{completionType === 'rotational' && (...)}`

## Related Documentation

- [ROTATIONAL_CHORES_GUIDE.md](./ROTATIONAL_CHORES_GUIDE.md) - Complete usage guide
- [README.md](./README.md) - Main documentation

---

**The UI exists and works - this guide helps you find it!** 🎯
