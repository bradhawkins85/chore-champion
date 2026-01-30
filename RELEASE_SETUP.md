# Release Setup Guide

## Issue Summary

The software update checker is currently failing with the error **"No releases found for this repository"** because no GitHub releases have been published yet. While the code is configured to check for updates at version v1.0.0, there are no corresponding tags or releases on GitHub.

## Solution

To fix the update checker, you need to create an initial release on GitHub. This is a **one-time setup** that will enable the update checking feature to work properly.

## Step-by-Step Instructions

### Option 1: Create Release via GitHub Web Interface (Recommended)

This is the easiest method and requires no command-line tools.

1. **Go to the Releases page**
   - Navigate to https://github.com/bradhawkins85/chore-champion/releases
   - Click the **"Draft a new release"** button

2. **Create the release**
   - Click **"Choose a tag"** dropdown
   - Type `v1.0.0` in the text field
   - Click **"Create new tag: v1.0.0 on publish"**
   - Set **Release title** to: `Version 1.0.0`
   - Add **Release notes** (example below)
   - Click **"Publish release"**

**Example Release Notes:**
```markdown
# ChoreQuest v1.0.0 - Initial Release

## Features
- Complete chore management system for families
- Parent and child dashboards
- Points and rewards system
- Weather-based themes
- Calendar integration
- Built-in software update checker
- Docker deployment support
- MySQL database backend
- PWA support for mobile devices

## Installation
See the [README](../README.md) for installation instructions.
```

3. **Verify the release**
   - After publishing, the release will appear at: https://github.com/bradhawkins85/chore-champion/releases/tag/v1.0.0
   - The Docker Release workflow will automatically trigger and build versioned Docker images

### Option 2: Create Release via Command Line

If you prefer using Git commands:

```bash
# Navigate to your repository
cd /path/to/chore-champion

# Create and push the tag
git tag -a v1.0.0 -m "Release version 1.0.0 - Initial release"
git push origin v1.0.0

# Then create the release via GitHub CLI (if installed)
gh release create v1.0.0 \
  --title "Version 1.0.0" \
  --notes "Initial release with update checker feature"
```

Or after pushing the tag, go to the GitHub web interface and create a release from that tag.

## Verification

After creating the release, verify that the update checker works:

### Method 1: Using the Verification Script (Recommended)

Run the automated release status checker:

```bash
# If you get a permission denied error, make the script executable first:
# chmod +x ./scripts/check-release-status.sh

./scripts/check-release-status.sh
```

This script will:
- Check GitHub API connectivity
- Verify the release exists
- Compare versions
- Provide clear status and next steps

### Method 2: Manual Verification via Web Interface

1. **Open ChoreQuest** in your browser
2. **Enter Parent Mode** (using your PIN)
3. **Go to Settings** tab
4. **Scroll to "Software Updates"** section
5. **Click "Check for Updates"**

You should now see:
- ✅ Current Version: v1.0.0
- ✅ Latest Version: v1.0.0
- ✅ "You're running the latest version" message

Instead of the previous error: "No releases found for this repository"

**Note:** The current version is displayed as shown in the code (1.0.0), while the release tag includes the 'v' prefix (v1.0.0). Both formats are correct.

## What Happens After Creating the Release

1. **Update Checker Works**: The software can now query GitHub's API and find releases
2. **Docker Images Built**: The Docker Release workflow automatically builds and publishes:
   - `ghcr.io/bradhawkins85/chorequest:v1.0.0`
   - `ghcr.io/bradhawkins85/chorequest:latest`
3. **Future Updates Enabled**: When you create v1.0.1, v1.1.0, etc., users will be notified of available updates

## Future Release Process

For subsequent releases:

1. **Update version in code**:
   - Edit `src/components/UpdateSettings.tsx`
   - Change `CURRENT_VERSION` to the new version (e.g., '1.1.0')
   - Commit the change

2. **Create new release on GitHub**:
   - Follow the same steps above with the new version number
   - The update checker will automatically detect the new version

3. **Users get notified**:
   - When users click "Check for Updates", they'll see the new version
   - They can click "Update Now" to automatically update

## Version Naming Convention

Follow semantic versioning:
- **Major**: `v2.0.0` - Breaking changes
- **Minor**: `v1.1.0` - New features (backward compatible)
- **Patch**: `v1.0.1` - Bug fixes

## Troubleshooting

### "No releases found" still appears after creating release

- Wait a few seconds and try again (GitHub API may have a small delay)
- Verify the release is published (not draft) at: https://github.com/bradhawkins85/chore-champion/releases
- Check that the tag name matches the format `v1.0.0` (with 'v' prefix)

### Update checker shows "GitHub API rate limit exceeded"

- GitHub API has rate limits for unauthenticated requests (60 per hour)
- The rate limit resets one hour after your first request
- Wait up to an hour from your first request and try again
- This is normal behavior and doesn't indicate a problem
- To avoid rate limits, you can authenticate GitHub API requests (see GitHub documentation)

### Docker images aren't building automatically

- Check the Actions tab: https://github.com/bradhawkins85/chore-champion/actions
- Verify the Docker Release workflow ran successfully
- Check workflow logs for any errors

## Related Documentation

- [UPDATE_FEATURE.md](./UPDATE_FEATURE.md) - How to use the update feature
- [CI-CD.md](./CI-CD.md) - CI/CD pipeline documentation
- [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md) - Docker Hub publishing setup

---

**Status**: This is a one-time setup. Once the initial v1.0.0 release is created, the update checker will work properly.
