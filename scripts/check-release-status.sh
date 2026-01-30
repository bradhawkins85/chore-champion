#!/bin/bash
# Quick Release Status Checker
# This script checks if the GitHub release is set up correctly for the update feature

REPO="bradhawkins85/chore-champion"
EXPECTED_VERSION="v1.0.0"

echo "🔍 Checking ChoreQuest Release Status..."
echo ""

# Check if we can reach GitHub API
echo "1. Testing GitHub API connectivity..."
if curl -s -f -o /dev/null "https://api.github.com/rate_limit"; then
    echo "   ✅ GitHub API is reachable"
else
    echo "   ❌ Cannot reach GitHub API"
    exit 1
fi

echo ""
echo "2. Checking for releases in repository..."

# Try to fetch the latest release
RELEASE_INFO=$(curl -s "https://api.github.com/repos/$REPO/releases/latest")

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
    TAG_NAME=$(echo "$RELEASE_INFO" | grep -o '"tag_name": *"[^"]*"' | cut -d'"' -f4)
    RELEASE_NAME=$(echo "$RELEASE_INFO" | grep -o '"name": *"[^"]*"' | head -1 | cut -d'"' -f4)
    
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
