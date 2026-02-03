# Device Child Restrictions Feature

## Overview
The Device Child Restrictions feature allows parents to control which children are visible and accessible on each linked device. This enables different restriction levels for personal devices versus shared household devices.

## Use Cases

### Personal Devices
**Scenario**: Each child has their own tablet in their bedroom.

**Solution**: Restrict each device to show only that child's profile.
- Child A's tablet: Only shows Child A
- Child B's tablet: Only shows Child B
- Child C's tablet: Only shows Child C

**Benefits**:
- Prevents siblings from accessing each other's accounts
- Maintains privacy and reduces conflicts
- Each child can only complete their own chores

### Shared Household Devices
**Scenario**: Kitchen tablet used by all family members.

**Solution**: Leave all children unchecked (default behavior).
- Kitchen tablet: Shows all children
- Living room tablet: Shows all children

**Benefits**:
- Any child can select their profile
- Flexibility for completing chores anywhere
- Natural for shared spaces

### Mixed Configuration
**Scenario**: Some personal devices, some shared.

**Solution**: Configure each device appropriately.
- Child A's phone: Only Child A
- Child B's phone: Only Child B  
- Kitchen tablet: All children
- Playroom tablet: All children

## How to Configure

### Step 1: Access Device Management
1. Open ChoreQuest
2. Enter Parent Mode (PIN required)
3. Navigate to Settings → Device Management

### Step 2: Edit Device Restrictions
1. Find the device you want to configure
2. Click "Edit Restrictions" button
3. A dialog will open showing all children

### Step 3: Select Children
**For Personal Devices (Restricted):**
- Check the box next to the child who should access this device
- You can select one or multiple children
- Click "Save"

**For Shared Devices (Unrestricted):**
- Leave all checkboxes unchecked
- Click "Save"
- The device will show "(All)" indicating all children can access it

### Step 4: Verify
- Look at the device card
- "Allowed Children" section shows either:
  - "(All)" - All children can access
  - "(N)" - Number of restricted children
  - Badges showing which children are allowed

## Behavior & Logic

### Default Behavior
When a device is first linked:
- **Default**: All children are allowed
- No restrictions are applied
- Perfect for shared devices

### Filtering Logic
- **Empty/Unchecked**: All children visible on child selector
- **Specific Children Selected**: Only those children visible
- **Applied Only**: Child selector screen (profile selection)
- **Not Applied**: Once child is selected, normal operations proceed

### Examples

#### Example 1: Personal Device
```
Device: "Emma's iPad"
Allowed Children: [Emma]
Result: Only Emma appears on child selector
```

#### Example 2: Shared Device
```
Device: "Kitchen Tablet"
Allowed Children: [] (empty)
Result: All children (Emma, Noah, Olivia) appear on selector
```

#### Example 3: Multiple Children
```
Device: "Twins' Tablet"
Allowed Children: [Emma, Noah]
Result: Only Emma and Noah appear on selector
(Olivia is not visible)
```

## UI Elements

### Device Card Display
Each device shows:
- Device name and type
- Last seen timestamp
- **Allowed Children count**: "(All)" or "(N)"
- **Badges**: Visual display of allowed children with avatars
- **Edit Restrictions** button

### Edit Dialog
When editing restrictions:
- Clear title: "Manage Child Access"
- Instruction text explaining behavior
- Checkbox for each child with:
  - Child's avatar (colored circle)
  - Child's name
- Helpful hint at bottom explaining logic
- Save/Cancel buttons

## Technical Details

### Database
- **Table**: `devices`
- **Column**: `allowed_children_ids` (JSON)
- **Type**: Array of child IDs
- **Null/Empty**: Both mean "all children allowed"

### API Endpoints

#### Get Devices
```
GET /api/devices
Authorization: Bearer <token>

Response:
{
  "devices": [
    {
      "id": "device-id",
      "deviceGuid": "guid",
      "deviceName": "Kitchen Tablet",
      "allowedChildrenIds": [], // empty = all allowed
      ...
    }
  ]
}
```

#### Update Restrictions
```
PATCH /api/devices/:deviceId
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "allowedChildrenIds": ["child-id-1", "child-id-2"]
}
```

### Frontend Implementation
- **App.tsx**: Fetches device config and filters children
- **DeviceManagement.tsx**: UI for managing restrictions
- **deviceHelper.ts**: API helper functions
- **Filtering**: Applied only to ChildSelector component

## Troubleshooting

### All Children Still Visible on Restricted Device
**Possible Causes**:
1. Device restrictions not saved properly
2. Cache needs refresh
3. Using different device than configured

**Solution**:
1. Verify restrictions in Device Management
2. Refresh the page
3. Check device is correctly identified

### Can't Find Edit Restrictions Button
**Cause**: No children created yet

**Solution**:
1. Create children first in Parent Mode
2. Return to Device Management
3. Edit Restrictions button will now appear

### Changes Not Appearing
**Cause**: Changes not saved to server

**Solution**:
1. Ensure internet connection
2. Check for error messages
3. Try editing again and click Save

## Best Practices

### Recommendations
1. **Start Unrestricted**: Leave devices unrestricted initially
2. **Test Configuration**: Test each device after configuring
3. **Label Devices**: Give devices clear names (e.g., "Emma's iPad")
4. **Shared First**: Configure shared devices first, then personal
5. **Document**: Keep note of which devices are for whom

### Security Tips
1. Use device restrictions as primary access control
2. Still require Parent Mode PIN for sensitive operations
3. Regularly review device list and remove unused devices
4. Name devices clearly to identify them easily

### Family Communication
1. Explain to children which device is theirs
2. Make it clear why siblings aren't visible on personal devices
3. Emphasize that shared devices are for everyone
4. Use this as a teaching moment about privacy and respect

## Examples by Family Size

### Small Family (2 Children)
- 2 personal tablets (one per child)
- 1 kitchen tablet (shared)
- **Configuration**: Restrict personal, leave kitchen unrestricted

### Medium Family (3-4 Children)
- 3-4 personal devices (one per child)
- 2 shared tablets (kitchen, living room)
- **Configuration**: Each personal device restricted to owner, shared unrestricted

### Large Family (5+ Children)
- Mix of personal and shared devices
- May group younger children on shared devices
- **Configuration**: Varies by device purpose and child age

## Migration from Previous Versions

If upgrading from a version without this feature:
- **All devices default to unrestricted** (all children allowed)
- No action required unless you want restrictions
- Existing devices will continue working as before
- Database migration happens automatically on first run

## Support & Feedback

For questions or issues:
1. Check this documentation
2. Review Troubleshooting section
3. Check GitHub issues
4. Contact repository maintainer

## Future Enhancements

Potential future additions:
- Time-based restrictions (certain hours only)
- Age-based automatic filtering
- Temporary guest access codes
- Device groups for bulk configuration
- Remote device management
