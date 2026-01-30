#!/bin/bash
# Quick Release Status Checker
# This script checks if the GitHub release is set up correctly for the update feature

set -euo pipefail  # Exit on error, undefined variables, and pipe failures

REPO="bradhawkins85/chore-champion"
EXPECTED_VERSION="v1.0.0"

echo "🔍 Checking ChoreQuest Release Status..."
echo ""

# Check if we can reach GitHub API
echo "1. Testing GitHub API connectivity..."
if curl -s -f -o /dev/null --max-time 10 "https://api.github.com/rate_limit"; then
    echo "   ✅ GitHub API is reachable"
else
    echo "   ❌ Cannot reach GitHub API"
    echo "   Check your internet connection and try again."
    exit 1
fi

echo ""
echo "2. Checking for releases in repository..."

# Try to fetch the latest release with better error handling
RELEASE_INFO=$(curl -s --max-time 10 "https://api.github.com/repos/$REPO/releases/latest" || echo "CURL_FAILED")

if [ "$RELEASE_INFO" = "CURL_FAILED" ]; then
    echo "   ❌ Failed to fetch release information from GitHub"
    echo "   Check your internet connection and try again."
    exit 1
fi

if echo "$RELEASE_INFO" | grep -q "Not Found"; then
    echo "   ❌ No releases found for this repository"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "   ACTION REQUIRED: Create Initial Release"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "The update checker needs at least one GitHub release to work."
    echo ""
    echo "📖 Quick Fix:"
    echo "   1. Go to: https://github.com/$REPO/releases"
    echo "   2. Click 'Draft a new release'"
    echo "   3. Create tag: $EXPECTED_VERSION"
    echo "   4. Title: 'Version 1.0.0'"
    echo "   5. Click 'Publish release'"
    echo ""
    echo "📚 Detailed Instructions:"
    echo "   See RELEASE_SETUP.md in the repository"
    echo ""
    exit 1
else
    # Use grep with more robust patterns and handle potential parsing failures
    TAG_NAME=$(echo "$RELEASE_INFO" | grep -o '"tag_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
    RELEASE_NAME=$(echo "$RELEASE_INFO" | grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
    
    if [ -z "$TAG_NAME" ]; then
        echo "   ⚠️  Could not parse release information"
        echo "   Release exists but format is unexpected."
        echo "   Try viewing releases at: https://github.com/$REPO/releases"
        exit 1
    fi
    
    echo "   ✅ Release found!"
    echo "      Latest Tag: $TAG_NAME"
    echo "      Release Name: $RELEASE_NAME"
    echo ""
    
    # Compare versions
    if [ "$TAG_NAME" = "$EXPECTED_VERSION" ]; then
        echo "3. Version check..."
        echo "   ✅ Release matches current version ($EXPECTED_VERSION)"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "   ✅ ALL CHECKS PASSED"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "The update checker should now work correctly!"
        echo ""
        echo "To verify:"
        echo "   1. Open ChoreQuest in your browser"
        echo "   2. Enter Parent Mode"
        echo "   3. Go to Settings → Software Updates"
        echo "   4. Click 'Check for Updates'"
        echo ""
        echo "You should see: 'You're running the latest version'"
    else
        echo "3. Version check..."
        echo "   ⚠️  Latest release ($TAG_NAME) differs from expected ($EXPECTED_VERSION)"
        echo ""
        echo "This is OK if you've already created a newer release."
        echo "The update checker will show that a new version is available."
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
