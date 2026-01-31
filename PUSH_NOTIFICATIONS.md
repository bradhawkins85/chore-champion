# Push Notifications for PWA

## Overview

ChoreQuest now supports push notifications when installed as a Progressive Web App (PWA). This feature allows parents to receive real-time notifications on their devices for important events like reward purchases and pending chore approvals.

## Features

### Per-Device Configuration

- Each device can have its own notification settings
- Devices are automatically identified and tracked
- Settings are stored locally and persist across sessions

### Notification Types

1. **Reward Purchase Alerts** - Get notified when a child claims a reward
2. **Pending Approval Alerts** - Get notified when chores are completed and need approval
3. **Weekly Report Alerts** - Receive weekly activity reports

### Digest Mode

Similar to email notifications, push notifications support digest mode:
- **Immediate** - Send notifications right away
- **15 minutes** - Batch notifications every 15 minutes
- **30 minutes** - Batch notifications every 30 minutes
- **1 hour** - Batch notifications every hour
- **2 hours** - Batch notifications every 2 hours
- **4 hours** - Batch notifications every 4 hours
- **Daily** - Send one notification per day

## Setup Instructions

### 1. Install as PWA

First, install ChoreQuest as a PWA:

- **Chrome/Edge**: Click the install icon in the address bar
- **Safari iOS**: Share > Add to Home Screen
- **Android**: Menu > Install App

### 2. Enable Push Notifications

1. Open ChoreQuest in parent mode
2. Navigate to **Settings** tab
3. Find the **Push Notifications** section
4. Click **Enable** button
5. Allow notifications when prompted by your browser

### 3. Configure Notification Preferences

After enabling push notifications:

1. Toggle which alert types you want to receive
2. Set your preferred digest mode for pending approvals
3. Use **Send Test Notification** to verify it's working

## How It Works

### Browser Compatibility

Push notifications require:
- A modern browser with service worker support
- The `Notification` API
- The `PushManager` API

Supported browsers:
- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari 16+ (Desktop & Mobile)
- ❌ Older browsers may not support all features

### Privacy & Data

- Notification preferences are stored locally on each device
- Push subscriptions are managed per-device
- No notification data is sent to external servers
- Works alongside email notifications (SMTP)

## Comparison with Email Notifications

| Feature | Email Notifications | Push Notifications |
|---------|-------------------|-------------------|
| Requires SMTP setup | ✅ Yes | ❌ No |
| Works on any device | ✅ Yes | ⚠️ Only on devices with PWA installed |
| Instant delivery | ⚠️ Depends on SMTP | ✅ Instant |
| Works offline | ❌ No | ⚠️ Delivered when back online |
| Per-device settings | ❌ No | ✅ Yes |
| Digest mode | ✅ Yes | ✅ Yes |

## Troubleshooting

### Notifications Not Working?

1. **Check browser permissions**: Ensure notifications are allowed for the site
2. **Verify PWA installation**: Push notifications only work when installed as PWA
3. **Check device settings**: Make sure Do Not Disturb is not enabled
4. **Test notification**: Use the "Send Test Notification" button to verify

### Permission Denied?

If you previously denied notification permission:

1. Open browser settings
2. Find site permissions for ChoreQuest
3. Change notifications from "Blocked" to "Allow"
4. Refresh the page and try enabling again

### Not Receiving Notifications?

1. Check that the alert type is enabled in settings
2. Verify the device has push notifications enabled
3. For digest mode, notifications are batched based on your interval setting
4. Make sure the app is installed as a PWA, not just in a browser tab

## Technical Details

### Service Worker

Push notifications are handled by a service worker (`/public/service-worker.js`) that:
- Listens for push events
- Displays notifications with appropriate icons and badges
- Handles notification clicks to open/focus the app

### Data Storage

Push notification settings are stored using the Spark KV storage system:
- Key: `push-notification-settings`
- Contains: Device subscriptions, preferences, and digest settings
- Persists across sessions and app updates

### Notification Icons

- **Icon**: `/icons/icon-192x192.png`
- **Badge**: `/icons/icon-72x72.png`

## Future Enhancements

Potential improvements for future versions:
- Background notification service for server-side push
- More granular notification controls
- Custom notification sounds
- Rich notification actions (approve/reject from notification)
- Notification history/log
