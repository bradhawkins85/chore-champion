#!/bin/bash
# ChoreQuest Internal Update Script
# This script is designed to be called from within the container
# It triggers a Docker Compose update on the host

set -e

echo "ChoreQuest Update Triggered from Container"
echo "==========================================="
echo ""

# Check if docker command is available
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker CLI not found in container"
    echo "The update feature requires Docker CLI to be available."
    echo ""
    echo "Possible solutions:"
    echo "  1. Use the manual update method from the host:"
    echo "     make update"
    echo "  2. Install Docker CLI in the API container"
    exit 1
fi

# Check if we have access to docker socket
if [ ! -S /var/run/docker.sock ]; then
    echo "ERROR: Docker socket not available"
    echo "To enable updates from the dashboard, mount the Docker socket:"
    echo "  -v /var/run/docker.sock:/var/run/docker.sock"
    exit 1
fi

# Get the container's compose project name and working directory
COMPOSE_PROJECT=$(docker inspect --format='{{index .Config.Labels "com.docker.compose.project"}}' "$(hostname)" 2>/dev/null || echo "")
COMPOSE_WORKDIR=$(docker inspect --format='{{index .Config.Labels "com.docker.compose.project.working_dir"}}' "$(hostname)" 2>/dev/null || echo "")

if [ -z "$COMPOSE_PROJECT" ]; then
    echo "ERROR: Could not determine compose project name"
    echo "This container may not be running via Docker Compose"
    exit 1
fi

echo "Compose Project: $COMPOSE_PROJECT"
echo "Working Directory: $COMPOSE_WORKDIR"
echo ""

# Create backup before updating
echo "Creating pre-update backup..."
docker exec "${COMPOSE_PROJECT}-backup-1" /scripts/backup.sh 2>/dev/null || \
    docker exec "${COMPOSE_PROJECT}_backup_1" /scripts/backup.sh 2>/dev/null || \
    echo "WARNING: Could not create backup (backup container not found)"

echo ""
# Try to determine which compose file is being used
COMPOSE_FILE=""
if docker container inspect "${COMPOSE_PROJECT}-traefik-1" >/dev/null 2>&1 || \
   docker container inspect "${COMPOSE_PROJECT}_traefik_1" >/dev/null 2>&1; then
    COMPOSE_FILE="docker-compose.traefik.yml"
elif docker container inspect "${COMPOSE_PROJECT}-backup-1" >/dev/null 2>&1 || \
     docker container inspect "${COMPOSE_PROJECT}_backup_1" >/dev/null 2>&1; then
    COMPOSE_FILE="docker-compose.prod.yml"
else
    COMPOSE_FILE="docker-compose.yml"
fi

echo "Using compose file: $COMPOSE_FILE"
echo ""

# Validate that the compose file exists (it should be in the project directory)
# Since we're running in a container, we need to use the full path from the host's perspective
# Construct the full path to the compose file on the host
if [ -n "$COMPOSE_WORKDIR" ]; then
    COMPOSE_FILE_PATH="${COMPOSE_WORKDIR}/${COMPOSE_FILE}"
else
    # If we couldn't get the working directory, try to use just the project name
    # Docker Compose V2 can sometimes infer the configuration from the running project
    COMPOSE_FILE_PATH=""
    echo "WARNING: Could not determine compose working directory"
    echo "Will attempt to use project name only"
fi

echo "Compose file path: ${COMPOSE_FILE_PATH}"

# Test compose configuration
if [ -n "$COMPOSE_FILE_PATH" ]; then
    if ! docker compose -p "${COMPOSE_PROJECT}" -f "${COMPOSE_FILE_PATH}" config >/dev/null 2>&1; then
        echo "ERROR: Could not validate compose configuration"
        echo "Project: ${COMPOSE_PROJECT}, File: ${COMPOSE_FILE_PATH}"
        exit 1
    fi
else
    # Try without file path
    if ! docker compose -p "${COMPOSE_PROJECT}" config >/dev/null 2>&1; then
        echo "ERROR: Could not validate compose configuration"
        echo "Project: ${COMPOSE_PROJECT}"
        exit 1
    fi
fi

echo "Compose configuration validated"
echo ""

# Check if this is a source-based deployment (has Dockerfile in working directory)
SOURCE_BASED=false
GIT_REPO=false
if [ -n "$COMPOSE_WORKDIR" ]; then
    # Check if Dockerfile exists in the working directory
    # Using a pinned Alpine version for predictable behavior
    if docker run --rm -v "${COMPOSE_WORKDIR}:/workdir" -w /workdir alpine:3.19 test -f Dockerfile 2>/dev/null; then
        SOURCE_BASED=true
        echo "Detected source-based deployment at ${COMPOSE_WORKDIR}"
        
        # Check if it's a git repository
        if docker run --rm -v "${COMPOSE_WORKDIR}:/workdir" -w /workdir alpine:3.19 test -d .git 2>/dev/null; then
            echo "Git repository detected"
            GIT_REPO=true
        fi
    fi
fi

# Check if updates are available before proceeding
echo ""
echo "Checking for updates..."
UPDATE_AVAILABLE=false

# Update strategy: check for updates from GitHub if source-based, otherwise check registry
if [ "$SOURCE_BASED" = "true" ]; then
    # If this is a git repository, check for updates from GitHub
    if [ "$GIT_REPO" = "true" ]; then
        echo "Checking git repository for updates..."
        
        # Get the current branch name
        CURRENT_BRANCH=$(docker run --rm -v "${COMPOSE_WORKDIR}:/repo" -w /repo alpine/git:latest rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
        echo "Current branch: ${CURRENT_BRANCH}"
        
        # Get current local commit
        LOCAL_COMMIT=$(docker run --rm -v "${COMPOSE_WORKDIR}:/repo" -w /repo alpine/git:latest rev-parse HEAD 2>/dev/null)
        
        # Fetch the latest changes
        echo "Fetching latest changes..."
        if docker run --rm -v "${COMPOSE_WORKDIR}:/repo" -w /repo alpine/git:latest fetch origin 2>&1; then
            echo "✓ Fetched latest changes from origin"
            
            # Get remote commit
            REMOTE_COMMIT=$(docker run --rm -v "${COMPOSE_WORKDIR}:/repo" -w /repo alpine/git:latest rev-parse "origin/${CURRENT_BRANCH}" 2>/dev/null)
            
            if [ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]; then
                echo "✓ Updates available from GitHub"
                UPDATE_AVAILABLE=true
                
                # Reset to the latest version of the current branch
                echo "Updating code to latest version..."
                if docker run --rm -v "${COMPOSE_WORKDIR}:/repo" -w /repo alpine/git:latest reset --hard "origin/${CURRENT_BRANCH}" 2>&1; then
                    echo "✓ Code updated to latest version from GitHub"
                else
                    echo "WARNING: Failed to reset to origin/${CURRENT_BRANCH}"
                    echo "Will skip update..."
                    UPDATE_AVAILABLE=false
                fi
            else
                echo "✓ Already up to date (${LOCAL_COMMIT:0:8})"
            fi
        else
            echo "WARNING: Git fetch failed. This might be expected if:"
            echo "  - Network connectivity issues"
            echo "  - Remote repository is not accessible"
            echo "  - Authentication is required"
            echo ""
            echo "Cannot check for updates. Assuming no updates available."
        fi
    else
        # Not a git repo, but source-based - we can't check for updates
        echo "Not a git repository - cannot check for updates"
        echo "Building images anyway since we can't verify if updates exist..."
        UPDATE_AVAILABLE=true
    fi
    
    if [ "$UPDATE_AVAILABLE" = "true" ]; then
        echo ""
        echo "Building latest images with updated code..."
        
        # Determine the version to build
        # Try to get the version from the latest git tag
        VERSION=$(docker run --rm -v "${COMPOSE_WORKDIR}:/repo" -w /repo alpine/git:latest describe --tags --abbrev=0 2>/dev/null || echo "1.0.0")
        # Strip 'v' prefix if present (e.g., v1.2.0 -> 1.2.0)
        VERSION=${VERSION#v}
        echo "Building with version: ${VERSION}"
        
        # Build new images with the updated code
        # Using --pull to ensure base images are up to date
        # Not using --no-cache to leverage Docker's layer caching for faster builds
        # Pass the version as a build argument
        if [ -n "$COMPOSE_FILE_PATH" ]; then
            docker compose -p "${COMPOSE_PROJECT}" -f "${COMPOSE_FILE_PATH}" build --pull --build-arg VITE_APP_VERSION="${VERSION}"
        else
            docker compose -p "${COMPOSE_PROJECT}" build --pull --build-arg VITE_APP_VERSION="${VERSION}"
        fi
    fi
else
    echo ""
    echo "Checking for image updates from container registry..."
    # For registry-based deployments, Docker doesn't provide a way to check without pulling
    # We need to pull to see if there are updates
    echo "(Note: Registry-based deployments must pull images to check for updates)"
    
    # Create a secure temporary file for pull output
    PULL_LOG=$(mktemp) || {
        echo "ERROR: Failed to create temporary file"
        exit 1
    }
    trap 'rm -f "$PULL_LOG"' EXIT
    
    # Store the current image IDs before pulling
    echo "Getting current image IDs..."
    if [ -n "$COMPOSE_FILE_PATH" ]; then
        BEFORE_IMAGES=$(docker compose -p "${COMPOSE_PROJECT}" -f "${COMPOSE_FILE_PATH}" images -q | sort)
    else
        BEFORE_IMAGES=$(docker compose -p "${COMPOSE_PROJECT}" images -q | sort)
    fi
    
    # Pull the latest images from registry
    if [ -n "$COMPOSE_FILE_PATH" ]; then
        if ! docker compose -p "${COMPOSE_PROJECT}" -f "${COMPOSE_FILE_PATH}" pull 2>&1 | tee "$PULL_LOG"; then
            echo ""
            echo "WARNING: Failed to pull images from registry."
            echo "This might happen if:"
            echo "  - Images are not published to a registry"
            echo "  - You're using local-only images"
            echo ""
            echo "For source-based deployments, ensure your deployment directory contains"
            echo "the Dockerfile so the update can pull and rebuild from source."
            exit 1
        fi
    else
        if ! docker compose -p "${COMPOSE_PROJECT}" pull 2>&1 | tee "$PULL_LOG"; then
            echo ""
            echo "WARNING: Failed to pull images from registry."
            echo "For source-based deployments, ensure your deployment directory contains"
            echo "the Dockerfile so the update can pull and rebuild from source."
            exit 1
        fi
    fi
    
    # Check the image IDs after pulling
    echo "Checking if images were updated..."
    if [ -n "$COMPOSE_FILE_PATH" ]; then
        AFTER_IMAGES=$(docker compose -p "${COMPOSE_PROJECT}" -f "${COMPOSE_FILE_PATH}" images -q | sort)
    else
        AFTER_IMAGES=$(docker compose -p "${COMPOSE_PROJECT}" images -q | sort)
    fi
    
    # Compare the image IDs
    if [ "$BEFORE_IMAGES" != "$AFTER_IMAGES" ]; then
        echo "✓ Updates available - images were updated"
        UPDATE_AVAILABLE=true
    else
        # Check the pull output for signs of updates
        # Look for "Downloaded newer image" which only appears when images are actually updated
        if grep -q "Downloaded newer image" "$PULL_LOG"; then
            echo "✓ Updates available from registry"
            UPDATE_AVAILABLE=true
        else
            echo "✓ Already up to date"
            UPDATE_AVAILABLE=false
        fi
    fi
fi

if [ "$UPDATE_AVAILABLE" = "true" ]; then
    echo ""
    echo "Recreating containers..."
    # Recreate containers with new images
    if [ -n "$COMPOSE_FILE_PATH" ]; then
        docker compose -p "${COMPOSE_PROJECT}" -f "${COMPOSE_FILE_PATH}" up -d --force-recreate --remove-orphans
    else
        docker compose -p "${COMPOSE_PROJECT}" up -d --force-recreate --remove-orphans
    fi
else
    echo ""
    echo "No updates available - skipping build and deployment"
    echo "✓ ChoreQuest is already running the latest version"
    exit 0
fi

echo ""
echo "Cleaning up old images..."
docker image prune -f

echo ""
echo "✓ Update completed successfully!"
echo ""
