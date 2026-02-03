# Admin Panel UI Overview

## Visual Structure

The admin panel provides a clean, professional interface for managing the ChoreQuest platform.

## Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to App          Admin Panel                   Sign Out  │
│  Platform management and administration                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────┐│
│  │ Total    │  │ Total    │  │ Total    │  │ Recent   │  │Act.││
│  │ Tenants  │  │ Parents  │  │ Devices  │  │ Signups  │  │Ten.││
│  │    42    │  │    85    │  │   127    │  │    12    │  │ 38 ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └────┘│
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│  [📊 Tenants] [👥 Parent Users] [💳 Payments]                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Tenant Management                                    🔄 Refresh │
│  View and manage all tenants on the platform                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ┌──────────────────────────────────────────────────────┐ │  │
│  │ │ Tenant ID: 123e4567-e89b-12d3-a456-426614174000     │ │  │
│  │ │ Created: 2024-01-15                                  │ │  │
│  │ │ Parent Emails: parent@example.com, parent2@...      │ │  │
│  │ │ Users: [2]  Devices: [3]                            │ │  │
│  │ └──────────────────────────────────────────────────────┘ │  │
│  │                                                           │  │
│  │ ┌──────────────────────────────────────────────────────┐ │  │
│  │ │ Tenant ID: 789e4567-e89b-12d3-a456-426614174000     │ │  │
│  │ │ Created: 2024-01-20                                  │ │  │
│  │ │ Parent Emails: user@domain.com                       │ │  │
│  │ │ Users: [1]  Devices: [2]                            │ │  │
│  │ └──────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Dashboard Statistics

Five key metrics displayed at the top:

1. **Total Tenants** - Total number of tenant organizations
2. **Total Parents** - Number of parent user accounts
3. **Total Devices** - Number of linked devices across all tenants
4. **Recent Signups (30d)** - New tenants in the last 30 days
5. **Active Tenants (7d)** - Tenants with recent device activity

## Tab 1: Tenants

Shows a scrollable list of all tenants with:
- Unique tenant ID (UUID)
- Creation date
- Number of users
- Number of linked devices
- Parent email addresses (comma-separated)
- Last updated timestamp

**Features:**
- Refresh button to reload data
- Scrollable container for large lists
- Card-based layout for easy scanning

## Tab 2: Parent Users

Shows a scrollable list of all parent users with:
- Email address
- Tenant ID
- Role badge (parent)
- Creation date
- Delete button (destructive red)

**Features:**
- Delete confirmation dialog prevents accidental deletion
- Cannot delete admin users (safety feature)
- Shows warning about permanent deletion
- Refresh button to reload data

**Delete Dialog:**
```
┌───────────────────────────────────────────┐
│  Delete Parent User                        │
│                                            │
│  Are you sure you want to delete parent    │
│  user parent@example.com?                  │
│                                            │
│  This action cannot be undone. All data    │
│  associated with this user will be         │
│  permanently removed.                      │
│                                            │
│              [Cancel]  [Delete]            │
└───────────────────────────────────────────┘
```

## Tab 3: Payments (Placeholder)

Shows payment/billing information for tenants:
- Tenant ID
- Status badge (active/inactive)
- Plan badge (free/premium)
- Number of users and devices
- Amount (placeholder: $0.00)

**Note Banner:**
```
ℹ️ This is a placeholder for future payment integration. 
   Currently showing mock data.
```

## Color Scheme

- **Primary Actions**: Blue buttons for refresh
- **Destructive Actions**: Red buttons for delete
- **Status Badges**: 
  - Green for active status
  - Gray for inactive/default
  - Blue for roles/plans
- **Background**: Clean white/light gray cards on gray background
- **Text**: Dark gray for primary, lighter gray for secondary

## Responsive Design

- Desktop: Full width with sidebar navigation
- Tablet: Stacked layout with collapsible sections
- Mobile: Single column with scrollable tabs

## Accessibility Features

- Semantic HTML structure
- Keyboard navigation support
- ARIA labels on interactive elements
- Focus indicators
- Color contrast compliance
- Screen reader friendly

## User Experience

### Success States
- Toast notifications for successful operations
- Green checkmark icons
- Success message text

### Error States
- Toast notifications for errors
- Red error icons
- Clear error messages

### Loading States
- Spinner icons on refresh buttons
- Disabled state while loading
- Skeleton screens for initial load (future enhancement)

## Navigation Flow

```
Login Page
    ↓
Main App (if admin user)
    ↓
Navigate to /admin URL
    ↓
Admin Panel Dashboard
    ├→ Tenants Tab
    ├→ Parent Users Tab
    └→ Payments Tab
```

## Security Indicators

- Role badge shows "admin" for admin users
- "Access denied" redirect for non-admin users
- Token-based authentication (invisible to user)
- Automatic logout on token expiration

## Sample Data Display

### Tenant Card Example:
```
┌─────────────────────────────────────────┐
│ Tenant ID                               │
│ abc123de-4567-89ab-cdef-0123456789ab   │
│                                         │
│ Created                                 │
│ January 15, 2024                       │
│                                         │
│ Parent Emails                          │
│ parent1@example.com,                   │
│ parent2@example.com                    │
│                                         │
│ Users              Devices             │
│ [2]                [3]                 │
└─────────────────────────────────────────┘
```

### Parent User Card Example:
```
┌─────────────────────────────────────────┐
│ Email                        [Delete]   │
│ parent@example.com           [Button]   │
│                                         │
│ Tenant ID                               │
│ abc123de-4567-89ab-cdef-0123456789ab   │
│                                         │
│ Created              Role              │
│ Jan 15, 2024        [parent]           │
└─────────────────────────────────────────┘
```

## Future UI Enhancements

Planned improvements:
- [ ] Search and filter functionality
- [ ] Sort by columns
- [ ] Pagination controls
- [ ] Bulk selection and actions
- [ ] Export data buttons (CSV/JSON)
- [ ] Dark mode toggle
- [ ] Customizable dashboard widgets
- [ ] Real-time updates (WebSocket)
- [ ] Advanced filtering (date ranges, status, etc.)
- [ ] Data visualization charts
- [ ] Tenant activity timeline
- [ ] User impersonation modal
- [ ] Audit log viewer

## Technical Implementation

Built with:
- **React 19**: Modern component architecture
- **TypeScript**: Type-safe development
- **Tailwind CSS v4**: Utility-first styling
- **shadcn/ui**: Professional component library
- **Lucide Icons**: Consistent iconography
- **Sonner**: Toast notifications
- **React Router**: Client-side routing

## Performance

- Lazy loading for large lists
- Debounced search (when implemented)
- Optimized re-renders with React.memo
- useCallback for event handlers
- Minimal bundle size impact (~20KB gzipped)

---

**Note**: Screenshots will be added once the application is deployed and accessible. The UI follows the ChoreQuest design system and integrates seamlessly with the existing application aesthetic.
