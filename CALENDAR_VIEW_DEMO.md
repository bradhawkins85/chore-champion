# Calendar View Feature - Demo Guide

## Overview

The Calendar View feature has been successfully implemented to provide a per-child view of upcoming chores in both weekly and monthly formats. This view integrates both scheduled chores from the app and external ICS calendar events.

## Key Features

### 1. **View Mode Toggle**
- **Weekly View**: Shows the next 7 days with full details
- **Monthly View**: Shows the entire current month with summarized information

### 2. **Chore Display**
- Shows all chores assigned to the selected child
- Displays chore name, description, and point value
- Indicates time of day (AM/PM) when applicable
- Shows completion status with visual indicators:
  - ✅ Green background for completed chores
  - ⭕ Gray circle for pending chores

### 3. **ICS Event Integration**
- Continues to display external calendar events from ICS feeds
- Events shown in blue with distinct styling
- Maintains time display and event details

### 4. **Smart Scheduling**
- Respects chore frequency (daily, weekly, bi-weekly)
- Honors day-of-week assignments
- Checks repeat patterns and date ranges
- Filters chores based on start/end dates

### 5. **Visual Organization**
- Today's date is highlighted with a primary border
- Empty days show "No chores or events"
- Monthly view provides quick summaries with badges
- Weekly view shows full details for each chore and event

## Technical Implementation

### New Helper Functions

Added to `src/lib/helpers.ts`:

```typescript
// Get day of week for any date
getDayOfWeekForDate(date: Date): DayOfWeek

// Check if chore is active on a specific date
isChoreActiveOnDate(assignment: ChoreAssignment, date: Date): boolean

// Check if assignment date range includes a specific date
isChoreActiveForDate(assignment: ChoreAssignment, date: Date): boolean

// Check if chore is completed on a specific date
isChoreCompletedOnDate(
  completions: ChoreCompletion[],
  choreId: string,
  childId: string,
  date: Date,
  timeOfDay?: 'am' | 'pm'
): boolean

// Check repeat pattern for specific date
isRepeatPatternActiveOnDate(assignment: ChoreAssignment, date: Date): boolean
```

### Enhanced CalendarView Component

**New Props:**
- `chores?: Chore[]` - Array of all chores
- `assignments?: ChoreAssignment[]` - Chore assignments
- `completions?: ChoreCompletion[]` - Completion records
- `categories?: Category[]` - Point categories

**New State:**
- `viewMode: 'week' | 'month'` - Toggle between weekly/monthly view

**Key Methods:**
- `getChoresForDate(date: Date)` - Computes all chores scheduled for a specific date
- `daysToDisplay` - Dynamically generates date range based on view mode
- Filters and groups both chores and events by date

### Updated App Integration

Modified `App.tsx` to pass chore data to CalendarView:

```typescript
<CalendarView
  child={selectedChild}
  chores={migratedChores || []}
  assignments={safeAssignments}
  completions={safeCompletions}
  categories={safeCategories}
  onBack={() => setShowCalendar(false)}
/>
```

### UI Enhancements

**Calendar Button:**
- Now always visible (not dependent on ICS URL)
- Shows chores even without external calendar feed
- Accessible from child chore view

**Visual Design:**
- Completed chores: Green background with checkmark
- Pending chores: Muted background with empty circle
- Events: Blue background for distinction
- Time badges for AM/PM chores
- Point badges for quick reference

## Usage

### For Users

1. **Access Calendar:**
   - Select a child from the main screen
   - Click the "Calendar" button

2. **Switch Views:**
   - Use the "Week" / "Month" toggle at the top
   - Week view: See detailed information
   - Month view: See quick summary

3. **View Information:**
   - See upcoming chores for the selected child
   - Check which chores are completed
   - View external calendar events (if configured)
   - See point values for each chore

### For Developers

**To test locally:**
1. Add a child in Parent Mode
2. Create chores with various schedules
3. Assign chores to the child
4. Navigate to Calendar view
5. Toggle between week and month views

**To extend:**
- Add more filters (e.g., by category)
- Implement navigation between weeks/months
- Add chore interaction (complete from calendar)
- Add print/export functionality

## Benefits

1. **Better Planning**: Parents and children can see upcoming chores at a glance
2. **Motivation**: Children can anticipate their schedule
3. **Flexibility**: Two view modes suit different preferences
4. **Integration**: Combines app chores with external events
5. **Clarity**: Visual indicators make status immediately clear

## Future Enhancements (Suggestions)

- Navigation controls (previous/next week or month)
- Filter by chore category or status
- Quick complete button on calendar items
- Print-friendly layout
- Export to ICS format
- Drag-and-drop rescheduling
- Color coding by category

## Screenshots

### Weekly View
Shows 7 days with full chore details, completion status, time of day, and points.

### Monthly View
Shows entire month with summary badges indicating chore and event counts.

### Combined View
Displays both app chores and external ICS calendar events together.

---

**Implementation Date:** January 2026  
**Status:** ✅ Complete and Ready for Use
