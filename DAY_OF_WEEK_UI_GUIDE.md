# UI Guide: Day-of-Week Reward Cost Customization

## Visual Overview

This guide shows what users will see when using the new day-of-week reward cost feature.

## Where to Find the Feature

**Location**: Parent Panel → Rewards Tab → Add/Edit Reward → Custom Cost Per Child section

## UI Components

### 1. Default View (Before Expansion)
```
┌─────────────────────────────────────────────────────┐
│ ⭐ Custom Cost Per Child                            │
│                                                     │
│ Override the default 50 points cost for specific   │
│ children (optional)                                 │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │  👤  Alice              [  ] pts  📅       │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │  👤  Bob                [  ] pts  📅       │   │
│ └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Key Elements**:
- Child avatar/initial in colored circle
- Child name
- Default cost input field (optional)
- Calendar button (📅) to expand day settings

### 2. Expanded View (With Day-of-Week Settings)
```
┌─────────────────────────────────────────────────────┐
│ ⭐ Custom Cost Per Child                            │
│                                                     │
│ Override the default 50 points cost for specific   │
│ children (optional)                                 │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │  👤  Alice              [40] pts  📅✓      │   │
│ │  ─────────────────────────────────────────  │   │
│ │  Day-specific costs (optional)              │   │
│ │  Set different costs for different days of  │   │
│ │  the week. Leave blank to use the default.  │   │
│ │                                              │   │
│ │  Mon [30]  Tue [30]                         │   │
│ │  Wed [30]  Thu [30]                         │   │
│ │  Fri [30]  Sat [60]                         │   │
│ │  Sun [60]                                    │   │
│ └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Key Elements**:
- Calendar button is highlighted (📅✓) when day costs exist
- Expandable section shows below the default cost
- 2-column grid layout for days
- Each day has its own input field
- Placeholder shows the default cost if not specified

## User Interactions

### Setting Up Day-Specific Costs

**Step 1**: Set a default cost (optional but recommended)
```
Enter "40" in the cost field → This becomes the fallback for days without specific costs
```

**Step 2**: Click the calendar button (📅)
```
The day-of-week section expands below
```

**Step 3**: Enter costs for specific days
```
Monday:    30 pts  ← Lower cost for weekdays
Tuesday:   30 pts
Wednesday: 30 pts
Thursday:  30 pts
Friday:    30 pts
Saturday:  60 pts  ← Higher cost for weekends
Sunday:    60 pts
```

**Step 4**: Save the reward
```
The settings are persisted and the calendar button shows highlighted (✓)
```

## Cost Calculation Examples

### Example 1: All Day Costs Specified
```
Reward Base Cost: 50 pts
Child Override:
  Default Cost: 40 pts
  Monday:      30 pts
  Tuesday:     30 pts
  Saturday:    60 pts
  (other days not specified)

Result:
  Monday:     30 pts  ← Uses day-specific cost
  Tuesday:    30 pts  ← Uses day-specific cost
  Wednesday:  40 pts  ← Uses default cost (fallback)
  Saturday:   60 pts  ← Uses day-specific cost
```

### Example 2: No Default, Only Day Costs
```
Reward Base Cost: 50 pts
Child Override:
  Default Cost: (empty)
  Monday:      30 pts
  Saturday:    60 pts

Result:
  Monday:     30 pts  ← Uses day-specific cost
  Saturday:   60 pts  ← Uses day-specific cost
  Tuesday:    50 pts  ← Uses reward base cost (ultimate fallback)
```

### Example 3: Only Default Cost (Backward Compatible)
```
Reward Base Cost: 50 pts
Child Override:
  Default Cost: 40 pts
  (no day-specific costs)

Result:
  Every day:  40 pts  ← Uses default cost
  (Exactly like the old system!)
```

## Visual Indicators

### Calendar Button States

**Default State** (no day costs):
```
📅  (outline style, secondary color)
```

**Active State** (has day costs):
```
📅  (filled style, primary color, highlighted)
```

### Auto-Expansion

When editing a reward with existing day-specific costs:
- Children with day costs automatically expand
- Calendar button shows in active/highlighted state
- All day-specific values are pre-filled

## What Children See

In the **Reward Shop**, children see:
```
┌─────────────────────────────────┐
│          🎁 Ice Cream           │
│                                 │
│   A trip to the ice cream shop  │
│                                 │
│   ⭐ 30 points                  │  ← Today's cost (Monday)
│                                 │
│   [Get This Reward!]            │
└─────────────────────────────────┘
```

If the same child checks on Saturday:
```
┌─────────────────────────────────┐
│          🎁 Ice Cream           │
│                                 │
│   A trip to the ice cream shop  │
│                                 │
│   ⭐ 60 points                  │  ← Weekend cost (Saturday)
│                                 │
│   [Need 10 more points]         │
└─────────────────────────────────┘
```

## Best Practices

### For Parents

1. **Set a Default Cost First**
   - Provides fallback for days you don't specify
   - Makes it easier to see which days are different

2. **Use Consistent Patterns**
   - Example: "Weekdays low, weekends high"
   - Example: "Special treat days (Fri/Sat) higher"

3. **Visual Scanning**
   - Look for highlighted calendar buttons (📅) to quickly see which children have custom schedules

4. **Editing Existing Rewards**
   - Sections auto-expand when day costs exist
   - Easy to modify without losing existing settings

### Common Use Cases

1. **Weekend Premium**
   ```
   Mon-Fri: 30 pts
   Sat-Sun: 60 pts
   Rationale: More family time on weekends, fewer chores
   ```

2. **Midweek Boost**
   ```
   Mon: 50 pts
   Wed: 30 pts  ← Midweek motivation boost
   Fri: 50 pts
   Rationale: Encourage consistency through the week
   ```

3. **Fair Distribution**
   ```
   Days with many chores: 40 pts
   Days with few chores: 60 pts
   Rationale: Keep rewards accessible regardless of chore schedule
   ```

## Technical Notes

- All costs are stored in the `cost_overrides` JSON field
- No database migration required
- Existing rewards continue to work unchanged
- Backend simply stores and retrieves the data
- All cost logic happens on the frontend
