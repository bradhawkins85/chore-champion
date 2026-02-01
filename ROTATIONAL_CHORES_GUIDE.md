# Rotational Chores Configuration Guide

## Overview

ChoreQuest includes a powerful **Rotational Chores** feature that allows chores to automatically rotate between assigned children. This is perfect for tasks like "Take out the trash" or "Feed the pets" where you want children to take turns.

## Accessing the Rotational Chores UI

The rotational chores configuration UI is available in the **Chore Dialog** when creating or editing chores.

### How to Configure Rotational Chores

1. **Navigate to Parent Mode**
   - Click the gear icon or "Go to Parent Mode" button
   - Enter your Parent PIN

2. **Open the Chore Dialog**
   - Go to the "Chores" tab
   - Click "Add Chore" (or edit an existing chore)

3. **Select Rotational Completion Type**
   - In the chore form, find the "Completion Type" dropdown
   - Select "**Rotational**" from the options:
     - Individual
     - Shareable
     - Once Per Day
     - **Rotational** ← Select this

4. **Configure Rotation Settings**
   
   Once you select "Rotational", additional configuration options will appear:

   ### Rotation Mode
   Choose how the chore rotates:
   
   - **One Child Per Interval** (Default)
     - Only one child is assigned at a time
     - Automatically rotates to the next child after completion
     - Best for chores that should be done by one child per day/week
   
   - **All Children**
     - All assigned children must complete the chore
     - Rotates the order after all children have completed it
     - Best for chores where everyone participates but order matters

   ### Rotation Order
   Determine how children are selected:
   
   - **Specific Order**
     - Define the exact order children rotate
     - Use the up/down arrows to reorder children
     - System automatically considers child availability
   
   - **Random Order**
     - Children are randomly selected for each rotation
     - Still considers child availability
     - Good for keeping things unpredictable and fair

   ### Child Order Management
   
   If you selected "Specific Order", you'll see a list of assigned children with controls to reorder them:
   
   ```
   1. Emma ↑ ↓
   2. Noah  ↑ ↓
   3. Sophia ↑ ↓
   ```
   
   - Use ↑ button to move a child up in the rotation
   - Use ↓ button to move a child down in the rotation
   - The system will follow this order when rotating the chore

## Example Use Cases

### Example 1: Weekly Trash Duty
- **Chore:** "Take out the trash"
- **Frequency:** Weekly
- **Completion Type:** Rotational
- **Rotation Mode:** One Child Per Interval
- **Rotation Order:** Specific Order
- **Children:** Emma → Noah → Sophia → Repeat

**How it works:** Emma takes out the trash this week. After she completes it, next week Noah will see it assigned to him. After Noah completes it, Sophia is next, then back to Emma.

### Example 2: Daily Pet Feeding (Shared)
- **Chore:** "Feed the dog"
- **Frequency:** Daily
- **Completion Type:** Rotational
- **Rotation Mode:** All Children
- **Rotation Order:** Random
- **Children:** All children must feed the dog each day

**How it works:** Every child must complete this chore daily, but the order changes randomly each day.

## Important Notes

- **First Assignment:** When you first create a rotational chore, assign all children who should participate. The rotation will start with the first child in your defined order (or random if selected).

- **Availability:** The system automatically considers child availability settings (vacation mode, school holidays, etc.) when rotating chores.

- **Edit Rotation Order:** You can edit the rotation order at any time by editing the chore. The change will take effect on the next rotation.

- **Rotation State:** The current rotation state is preserved, so if a child is currently assigned, they'll keep the assignment until they complete it or the period resets.

## Troubleshooting

### "I don't see the rotation configuration options"
- Make sure you've selected "Rotational" as the Completion Type
- The rotation options appear immediately below the Completion Type dropdown

### "I can't reorder children"
- First, save the chore with children assigned
- Then edit the chore to access the child ordering interface
- Make sure "Specific Order" is selected as the Rotation Order

### "The chore isn't rotating"
- Verify the assigned child has completed the chore
- Check that the next child in rotation is available (not on vacation, etc.)
- Ensure the chore frequency period has passed (daily/weekly/bi-weekly)

## Technical Details

The rotational chores feature uses the following data structure:

```typescript
{
  completionType: 'rotational',
  rotationConfig: {
    mode: 'one-child-per-interval' | 'all-children',
    order: 'specific' | 'random',
    childOrder?: string[]  // Array of child IDs in rotation order
  }
}
```

The rotation state is tracked per assignment:

```typescript
{
  rotationState: {
    currentChildId: string,      // Currently assigned child
    lastRotationDate: number,     // When last rotation occurred
    completedByChildIds: string[] // Who has completed in current period
  }
}
```

## Need Help?

If you're having trouble configuring rotational chores:
1. Check this guide for common solutions
2. Review the chore assignment settings
3. Open an issue on GitHub with details about your setup
4. Consult the main README.md for general ChoreQuest documentation

---

**Made with ❤️ for families who share responsibilities**
