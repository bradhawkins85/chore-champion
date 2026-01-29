#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_usage() {
    cat << EOF
Usage: $0 [OPTION]

Deploy ChoreQuest application

Options:
    build           Build the application
    docker          Build Docker image
    start           Start Docker container
    stop            Stop Docker container
    restart         Restart Docker container
    logs            Show Docker container logs
    clean           Clean build artifacts and containers
    help            Show this help message

Examples:
    $0 build        # Build the application
    $0 docker       # Build Docker image
    $0 start        # Start the application
    $0 logs         # View logs

EOF
}

build_app() {
    log_info "Building ChoreQuest application..."
    cd "$PROJECT_ROOT"
    npm ci
    npm run build
    log_info "Build completed successfully!"
}

build_docker() {
    log_info "Building Docker image..."
    cd "$PROJECT_ROOT"
    docker build -t chorequest:latest .
    log_info "Docker image built successfully!"
}

start_app() {
    log_info "Starting ChoreQuest with Docker Compose..."
    cd "$PROJECT_ROOT"
    docker-compose up -d
    log_info "ChoreQuest is now running at http://localhost:8080"
}

stop_app() {
    log_info "Stopping ChoreQuest..."
    cd "$PROJECT_ROOT"
    docker-compose down
    log_info "ChoreQuest stopped"
}

restart_app() {
    stop_app
    start_app
}

show_logs() {
    log_info "Showing logs (Ctrl+C to exit)..."
    cd "$PROJECT_ROOT"
    docker-compose logs -f
}

clean_all() {
    log_warn "Cleaning build artifacts and containers..."
    cd "$PROJECT_ROOT"
    docker-compose down -v 2>/dev/null || true
    docker rmi chorequest:latest 2>/dev/null || true
    rm -rf dist node_modules/.vite
    log_info "Cleanup completed"
}

case "${1:-help}" in
    build)
        build_app
        ;;
    docker)
        build_docker
        ;;
    start)
        start_app
        ;;
    stop)
        stop_app
        ;;
    restart)
        restart_app
        ;;
    logs)
        show_logs
        ;;
    clean)
        clean_all
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        log_error "Unknown command: $1"
        show_usage
        exit 1
        ;;
esac

exit 0
