# Planning Guide

A family chore management system that gamifies daily and weekly tasks for children while providing parents with comprehensive control over chore assignments, scheduling, and rewards.

**Experience Qualities**: 
1. **Playful** - Children should feel excited and motivated to complete chores through colorful visuals, point celebrations, and achievement-focused design.
2. **Intuitive** - Both parent and child interfaces should be instantly understandable, with the child view optimized for young users on tablets.
3. **Empowering** - Parents should feel in control with powerful management tools, while children feel autonomous completing their tasks.

**Complexity Level**: Light Application (multiple features with basic state)
This app manages chores, points, and user roles but doesn't require complex multi-view navigation or advanced data relationships. State management is straightforward with parent/child mode switching and basic CRUD operations.

## Essential Features

### Parent/Child Mode Toggle
- **Functionality**: Switch between parent control panel and child-friendly interface
- **Purpose**: Separate experiences for different user types - management vs. task completion
- **Trigger**: Mode selector button accessible from both views
- **Progression**: Click mode toggle → Interface transforms to appropriate view → Relevant features display
- **Success criteria**: Clean transition between modes, appropriate features visible for each role

### Chore Management (Parent)
- **Functionality**: Create, edit, delete chores with name, description, point value, frequency (daily/weekly/bi-weekly), time of day scheduling (AM/PM/Both/Anytime), and optional start/end dates. Quick-add from 40+ pre-built chore templates organized by category.
- **Purpose**: Give parents full control over what tasks children need to complete, including temporary or seasonal chores, with time-specific scheduling for morning/evening routines. Templates accelerate setup and provide realistic point values and descriptions.
- **Trigger**: "Add Chore" button or "Quick Add" button in parent panel
- **Progression**: Click add → Choose template or custom → Browse by category (Bedroom, Kitchen, Bathroom, Pet Care, etc.) or search → Select template to auto-fill form → Set time of day (AM only shows before noon, PM only shows after noon, Both requires completion twice, Anytime is always available) → Adjust if needed → Save → Chore appears in list
- **Success criteria**: Chores persist, can be edited/deleted, display correct frequency and time of day, inactive chores (outside date range) are clearly marked, templates provide instant setup with sensible defaults, AM-only chores marked as missed if not completed before noon

### Child Assignment (Parent)
- **Functionality**: Create child profiles and assign specific chores to each child
- **Purpose**: Personalize task lists for different children with different responsibilities
- **Trigger**: Add child profile, then assign chores from master list
- **Progression**: Create child → View child's chore list → Select from available chores → Assign with schedule
- **Success criteria**: Each child sees only their assigned chores, assignments persist

### Chore Completion (Child)
- **Functionality**: View assigned chores filtered by time of day, mark as complete, see points awarded, see missed AM chores
- **Purpose**: Simple, rewarding interface for children to track and complete tasks at the appropriate time of day
- **Trigger**: Child opens app in child mode, selects their profile
- **Progression**: Select profile → View current time period's chores (AM chores before noon, PM chores after noon, Anytime chores always visible) → Tap chore → Confirm completion → Points animate and add to total → See missed AM chores section if applicable
- **Success criteria**: Completed chores are marked with time of day, points increment, visual celebration on completion, AM chores marked as missed if not completed before noon, Both AM/PM chores appear separately in morning and evening

### Points Tracking
- **Functionality**: Track cumulative points per child, display prominently
- **Purpose**: Gamify chores and provide measurable progress toward rewards
- **Trigger**: Automatic calculation on chore completion
- **Progression**: Complete chore → Points add to total → Updated total displays with animation
- **Success criteria**: Accurate point totals, persistent across sessions, visible in both modes

### Chore Reset System
- **Functionality**: Daily chores reset each day, weekly chores reset each week, bi-weekly chores reset every two weeks. Chores with start dates only appear after that date, chores with end dates disappear after that date.
- **Purpose**: Ensure chores reappear on schedule without manual intervention, and allow temporary/seasonal chores to automatically activate and deactivate
- **Trigger**: Automatic based on timestamp comparison and date range validation
- **Progression**: App checks last completion and current date → If interval passed and chore is within active date range → Chore becomes available again
- **Success criteria**: Chores reset at appropriate intervals, completion history maintained, inactive chores are hidden from child view but visible (marked as inactive) in parent view

### Rewards Shop
- **Functionality**: Parents create rewards with point costs, children can browse and purchase rewards using earned points
- **Purpose**: Give children tangible goals to work toward and motivation to complete chores
- **Trigger**: Child clicks "Shop" button from their chore view
- **Progression**: View rewards → Select desired reward → Confirm purchase → Points deducted → Parent notified
- **Success criteria**: Points correctly deducted, purchase history tracked, rewards display with clear affordability indicators

### Purchase History & Fulfillment (Parent)
- **Functionality**: View all reward purchases, track pending claims, mark rewards as fulfilled or unfulfilled
- **Purpose**: Help parents track which rewards children have earned and ensure they receive their prizes
- **Trigger**: Parent navigates to "Purchase History" tab in parent panel
- **Progression**: View purchases sorted by date → See pending count → Click fulfill button → Mark as delivered → Child's purchase shows as fulfilled
- **Success criteria**: All purchases tracked with timestamps, pending purchases clearly indicated, bulk fulfill option available, ability to toggle fulfillment status

## Edge Case Handling

- **No Children Added**: Display friendly empty state with "Add your first child" prompt
- **No Chores Created**: Show onboarding message encouraging parents to create chores or use templates
- **No Rewards Available**: Show empty state in rewards shop prompting parents to add rewards
- **Template Search with No Results**: Show message suggesting different search terms or category
- **All Chores Complete**: Celebratory message for child, summary view for parents
- **Insufficient Points**: Disable purchase button and show how many more points are needed
- **Point Adjustment**: Parents can manually adjust points (add/subtract) for corrections
- **Accidental Completion**: Parents can uncheck completed chores in parent mode
- **Multiple Children Using Simultaneously**: Each child has separate profile selection to prevent conflicts
- **Reward Purchase History**: Track all purchases with timestamps, allow parents to mark as fulfilled or unfulfilled
- **Multiple Pending Purchases**: Bulk fulfill option to mark all pending purchases as complete at once
- **Deleted Rewards with Purchase History**: Past purchases remain visible even if reward is deleted
- **Inactive Chores**: Chores outside their date range are hidden from child view but visible in parent view with "Inactive" badge
- **Future Start Date**: Chores with future start dates show start date in parent view
- **Expired Chores**: Chores past their end date show end date in parent view and are filtered from child assignments
- **Duplicate Template Addition**: Users can add the same template multiple times if they want (e.g., multiple "Make Your Bed" chores for different children)
- **Missed AM Chores**: AM-only chores not completed before noon are marked as missed and shown in a separate section with 0 points awarded
- **PM Chores in Morning**: PM-only chores are hidden in the morning and only appear after noon
- **Both AM/PM Chores**: Chores requiring both morning and evening completion appear twice - once in AM (before noon) and once in PM (after noon), must be completed separately for each time period
- **Time Zone Transitions**: All time-based logic uses local device time to determine AM/PM periods
- **Missed Chore No Points**: Missed AM chores award 0 points and display with warning indicator to teach time management

## Design Direction

The design should evoke a sense of fun, accomplishment, and clarity. The parent interface should feel organized and efficient—like a control dashboard—while the child interface should feel like an engaging game with large touch targets, bright colors, and celebratory moments. Visual hierarchy should clearly separate completed from pending tasks, and point awards should feel rewarding through animation and emphasis.

## Color Selection

A vibrant, energetic palette that appeals to children while maintaining professionalism for parents.

- **Primary Color**: Bright playful purple (oklch(0.6 0.22 290)) - Communicates creativity and fun, suitable for a family app
- **Secondary Colors**: Sunny yellow (oklch(0.85 0.15 95)) for highlights and celebrations, soft blue (oklch(0.65 0.12 240)) for parent mode calm
- **Accent Color**: Energetic orange (oklch(0.72 0.18 45)) - Draws attention to action buttons and point awards
- **Foreground/Background Pairings**: 
  - Background (Soft cream oklch(0.98 0.01 85)): Dark gray text (oklch(0.25 0 0)) - Ratio 13.2:1 ✓
  - Primary (Purple oklch(0.6 0.22 290)): White text (oklch(1 0 0)) - Ratio 5.8:1 ✓
  - Accent (Orange oklch(0.72 0.18 45)): Dark text (oklch(0.2 0 0)) - Ratio 8.1:1 ✓
  - Card surfaces (White oklch(1 0 0)): Dark gray text (oklch(0.25 0 0)) - Ratio 14.5:1 ✓

## Font Selection

Typography should be friendly, legible at large sizes for children, and organized for parent data. The chosen typeface should have rounded characteristics that feel approachable.

- **Typographic Hierarchy**:
  - H1 (Child Name/Welcome): Fredoka Bold/36px/tight tracking - Playful rounded font perfect for kids
  - H2 (Section Headers): Fredoka Semibold/24px/normal tracking
  - H3 (Chore Titles): Fredoka Medium/20px/normal tracking
  - Body (Descriptions, Parent UI): Inter Regular/16px/relaxed leading - Clean, readable for management interface
  - Points Display: Fredoka Bold/32px/tight tracking - Makes numbers feel important and exciting
  - Small Labels: Inter Medium/14px/normal tracking

## Animations

Animations should celebrate achievements and provide smooth transitions, especially in the child interface where completion should feel rewarding.

- **Chore Completion**: Scale pulse + confetti burst when marking complete, with point number animating up
- **Points Counter**: Number count-up animation when points are awarded
- **Mode Switching**: Smooth fade transition between parent and child interfaces
- **Chore Card Interactions**: Gentle hover lift on desktop, immediate feedback on touch
- **List Reordering**: Smooth animated transitions when chores are completed and move to bottom of list
- **Profile Selection**: Playful bounce when child selects their avatar/name

## Component Selection

- **Components**: 
  - Card for chore items and child profiles with hover states
  - Dialog for adding/editing chores and children
  - Button with multiple variants (primary for completion, secondary for management)
  - Badge for point displays, frequency labels, pending purchase counts, and category filters
  - Avatar for child profiles
  - Switch for parent/child mode toggle
  - Form components (Input, Label, Textarea, Select) for chore management
  - Progress bar for daily/weekly completion percentage
  - Tabs for organizing parent panel sections (Chores, Children, Rewards, Purchase History) and template dialog (Templates, Custom Chore)
  - Alert Dialog for deletion confirmations
  - Large reward cards with emojis for visual appeal in shop view
  - Purchase history cards showing child name, reward, timestamp, and fulfillment status
  - Popover for quick-add template menu with popular templates
  - ScrollArea for browsing long lists of templates
  
- **Customizations**: 
  - Extra-large touch-friendly buttons for child interface (min 80px height)
  - Custom confetti animation component using framer-motion for celebrations
  - Large card components with prominent checkboxes for child chore list
  - Point badge with glow effect and animation capabilities
  - Reward cards with large emoji displays and clear affordability indicators
  - Shop button prominently displayed in child chore view
  - Template cards with emoji icons, category badges, and point displays
  - Searchable and filterable template browser with category tags
  - Quick-add popover showing top 6 popular templates for instant access
  
- **States**: 
  - Chore cards: default (pending), checked (completed), disabled (not available today)
  - Reward cards: affordable (full color, interactive), unaffordable (muted, disabled)
  - Buttons: default, hover (lift), active (press down), disabled (for completed or unaffordable)
  - Profile avatars: unselected, selected (border + glow), hover
  - Mode toggle: clear visual distinction between parent (organized, blue tones) and child (playful, purple tones)
  
- **Icon Selection**: 
  - CheckCircle (Phosphor) for completed chores
  - Star (Phosphor) for points and rewards
  - ShoppingCart (Phosphor) for rewards shop access
  - Calendar (Phosphor) for frequency indicators
  - CalendarBlank (Phosphor) for start date indicators
  - CalendarCheck (Phosphor) for end date indicators
  - Plus (Phosphor) for adding chores/children/rewards
  - Gear (Phosphor) for parent mode/settings
  - User (Phosphor) for child profiles
  - Trash (Phosphor) for deletions
  - Pencil (Phosphor) for editing
  - ArrowLeft (Phosphor) for back navigation
  - Package (Phosphor) for purchase history tab
  - Check (Phosphor) for fulfillment actions
  - Clock (Phosphor) for pending status
  - X (Phosphor) for unfulfill action
  - Sparkle (Phosphor) for templates and quick-add features
  
- **Spacing**: 
  - Child interface: Generous spacing with gap-6 between chore cards, p-8 on main container
  - Parent interface: Efficient spacing with gap-4, p-6 on containers
  - Cards: p-6 for child view, p-4 for parent view
  - Forms: gap-4 for form fields, mb-6 for form sections
  
- **Mobile**: 
  - Child interface is tablet-first (optimized for 768px+) with large touch targets
  - Parent interface scales down gracefully with stacked layouts below 768px
  - Navigation switches from tabs to dropdown menu on mobile
  - Cards stack vertically on small screens
  - Point displays remain prominent but adjust size proportionally
