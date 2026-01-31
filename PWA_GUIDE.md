# 📱 ChoreQuest PWA Guide

## Overview

ChoreQuest is built as a Progressive Web App (PWA), providing native app-like experiences across all devices while maintaining the accessibility of a web application.

## Features

### ✅ What Works Offline
- View all chores and assignments
- Check point balances
- Browse the rewards shop
- View completion history
- Access calendar events (cached)
- Complete and track chores
- All data stored locally persists

### ⚠️ What Requires Internet
- Initial app load (first visit)
- Weather data updates
- Calendar ICS feed imports/refreshes
- Email notifications (SMTP)
- Service worker updates

## Installation

### Mobile Devices

#### iOS (Safari Required)
1. Navigate to your ChoreQuest URL in Safari
2. Tap the Share icon (square with up arrow)
3. Scroll and tap "Add to Home Screen"
4. Edit the name if desired (default: "ChoreQuest")
5. Tap "Add"

**iOS Features:**
- Full screen mode without Safari UI
- Splash screen on launch
- Saves to home screen like native apps
- Works with Face ID/Touch ID for biometric auth

#### Android (Chrome/Firefox/Edge)
1. Navigate to your ChoreQuest URL
2. Tap the menu (⋮) button
3. Select "Install app" or "Add to Home screen"
4. Confirm installation

**Android Features:**
- Native app drawer integration
- Full screen mode
- WebAPK installation (Chrome)
- Background sync capabilities

### Desktop

#### Chrome/Edge/Brave
1. Navigate to ChoreQuest
2. Look for install icon in address bar (⊕ or 💻)
3. Click and select "Install"

OR

1. Click three-dot menu
2. Select "Install ChoreQuest"

**Desktop Features:**
- Standalone window (no browser tabs)
- Taskbar/dock icon
- Window controls
- Keyboard shortcuts

#### Safari (macOS)
Safari doesn't support full PWA installation on desktop, but you can:
1. File → Add to Dock
2. Access via dock icon for quick launch

### Firefox
Firefox has limited PWA support. Users can:
- Bookmark to home screen (mobile)
- Use as regular web app with offline capabilities

## Technical Details

### Manifest Configuration

Located at `/public/manifest.json`:

```json
{
  "name": "ChoreQuest - Family Chore Tracker",
  "short_name": "ChoreQuest",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#65CC99",
  "background_color": "#F7F9FB"
}
```

**Key Properties:**
- `display: standalone` - No browser UI
- `orientation: any` - Supports both portrait and landscape modes
- `scope: /` - Entire app is PWA-controlled
- `theme_color` - Status bar color on mobile

### Service Worker

Located at `/public/service-worker.js`:

**Caching Strategy:**
- **Precache:** Essential files cached on install
- **Runtime Cache:** Pages cached as visited
- **Network First:** API calls try network, fall back to cache

**Cache Names:**
- `chorequest-v1` - Static asset cache
- `chorequest-runtime` - Dynamic content cache

**Update Strategy:**
- Checks for updates on page load
- Prompts user to reload when new version available
- Manual refresh forces update check

### Icons

All icons located in `/public/icons/`:

| Size | Purpose |
|------|---------|
| 72×72 | iOS small |
| 96×96 | Android standard |
| 128×128 | Android large |
| 144×144 | Windows tile |
| 152×152 | iOS large |
| 192×192 | Android launcher (maskable) |
| 384×384 | High-res displays |
| 512×512 | Splash screens (maskable) |

**Maskable Icons:**
Icons with `purpose: "maskable"` support Android adaptive icons, allowing the OS to apply different shapes.

### App Shortcuts

Quick actions available from home screen icon (long-press on Android):

```json
{
  "shortcuts": [
    {
      "name": "Parent Mode",
      "url": "/?mode=parent"
    }
  ]
}
```

## Development

### Testing PWA Features Locally

1. **HTTPS Required:**
   ```bash
   # Use ngrok or similar for HTTPS testing
   npx vite --host
   ngrok http 5173
   ```

2. **Chrome DevTools:**
   - Open DevTools (F12)
   - Go to "Application" tab
   - Check "Service Workers" section
   - Use "Update" to test update flow
   - Use "Offline" checkbox to test offline mode

3. **Lighthouse PWA Audit:**
   ```bash
   # Install Lighthouse CLI
   npm install -g lighthouse
   
   # Run PWA audit
   lighthouse https://your-url --view --preset=pwa
   ```

### Updating Service Worker

After changing `service-worker.js`:

1. Update `CACHE_NAME` version:
   ```javascript
   const CACHE_NAME = 'chorequest-v2'; // Increment version
   ```

2. Users will be prompted to update on next visit

3. Test update flow in incognito mode

### Adding to Precache

To cache additional assets:

```javascript
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/main.css',
  '/your-new-asset.js' // Add here
];
```

## Troubleshooting

### PWA Not Installing

**iOS:**
- Must use Safari (not Chrome/Firefox)
- Must be HTTPS (not http://)
- Must have valid manifest
- Check for console errors

**Android:**
- Must meet PWA criteria (manifest, service worker, HTTPS)
- Check Chrome flags: `chrome://flags/#enable-webapk`
- Clear cache and retry

**Desktop:**
- Check install criteria in DevTools → Application
- Verify service worker is active
- Check manifest is valid JSON

### Offline Mode Not Working

1. Check service worker is registered:
   ```javascript
   navigator.serviceWorker.getRegistration().then(reg => {
     console.log('SW registered:', !!reg);
   });
   ```

2. Check cache in DevTools → Application → Cache Storage

3. Verify network requests are intercepted

4. Check for service worker errors in console

### Updates Not Showing

1. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
2. Unregister service worker:
   ```javascript
   navigator.serviceWorker.getRegistrations().then(regs => {
     regs.forEach(reg => reg.unregister());
   });
   ```
3. Clear all caches
4. Reload page

### App Icon Not Showing

1. Verify all icon sizes exist in `/public/icons/`
2. Check manifest references correct paths
3. Icons must be PNG format (SVG not widely supported)
4. Clear home screen cache (iOS: remove and re-add)

## Best Practices

### For Users

1. **Install vs. Bookmark:**
   - Install for full app experience
   - Bookmark for quick web access

2. **Keep Updated:**
   - Accept update prompts
   - Periodic hard refresh if issues occur

3. **Offline Usage:**
   - Initial load requires internet
   - Most features work offline after load
   - Weather/email features need connection

### For Developers

1. **Always Increment Cache Version:**
   - Change `CACHE_NAME` with every deployment
   - Old caches auto-delete

2. **Test Offline Thoroughly:**
   - Use DevTools offline mode
   - Test on real devices
   - Verify critical paths work

3. **Optimize Assets:**
   - Minimize bundle size
   - Compress images
   - Lazy load non-critical resources

4. **Monitor Performance:**
   - Run Lighthouse audits regularly
   - Check Core Web Vitals
   - Test on low-end devices

## Browser Support

| Browser | Install | Offline | Shortcuts | Biometric |
|---------|---------|---------|-----------|-----------|
| Chrome Android | ✅ | ✅ | ✅ | ✅ |
| Safari iOS | ✅ | ✅ | ❌ | ✅ |
| Chrome Desktop | ✅ | ✅ | ✅ | ⚠️ |
| Edge Desktop | ✅ | ✅ | ✅ | ⚠️ |
| Firefox Android | ⚠️ | ✅ | ❌ | ❌ |
| Firefox Desktop | ❌ | ✅ | ❌ | ❌ |
| Safari macOS | ⚠️ | ✅ | ❌ | ❌ |

Legend:
- ✅ Full support
- ⚠️ Partial support
- ❌ No support

## Future Enhancements

Potential PWA features to add:

- [ ] Push notifications for chore reminders
- [ ] Background sync for offline completions
- [ ] Share target (share files to ChoreQuest)
- [ ] Media session API for audio controls
- [ ] Periodic background sync
- [ ] Web Share API integration
- [ ] Badge API for notification count
- [ ] File System Access API for data export

## Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Lighthouse PWA Audit](https://developers.google.com/web/tools/lighthouse)
- [Can I Use PWA](https://caniuse.com/?search=pwa)
