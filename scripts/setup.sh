#!/bin/bash

set -e

echo "🚀 ChoreQuest Deployment Helper"
echo "================================"
echo ""

check_requirements() {
    local missing=0
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed"
        missing=1
    else
        echo "✅ Docker found: $(docker --version)"
    fi
    
    if ! docker compose version &> /dev/null; then
        echo "❌ Docker Compose is not installed"
        missing=1
    else
        echo "✅ Docker Compose found: $(docker compose version)"
    fi
    
    if ! command -v node &> /dev/null; then
        echo "⚠️  Node.js is not installed (optional for Docker deployment)"
    else
        echo "✅ Node.js found: $(node --version)"
    fi
    
    echo ""
    
    if [ $missing -eq 1 ]; then
        echo "❌ Please install missing requirements before deploying"
        exit 1
    fi
}

show_menu() {
    echo "Select deployment option:"
    echo "1) Docker Compose (Recommended)"
    echo "2) Manual Docker Build"
    echo "3) Local Development"
    echo "4) Build for Static Hosting"
    echo "5) Check System Requirements"
    echo "6) Exit"
    echo ""
    read -p "Enter choice [1-6]: " choice
    
    case $choice in
        1) deploy_docker_compose ;;
        2) deploy_docker_manual ;;
        3) deploy_local ;;
        4) build_static ;;
        5) check_requirements ;;
        6) exit 0 ;;
        *) echo "Invalid option"; show_menu ;;
    esac
}

deploy_docker_compose() {
    echo ""
    echo "🐳 Deploying with Docker Compose..."
    echo ""
    
    if [ ! -f "docker-compose.yml" ]; then
        echo "❌ docker-compose.yml not found in current directory"
        exit 1
    fi
    
    echo "Building and starting containers..."
    docker compose up -d --build
    
    echo ""
    echo "✅ ChoreQuest is now running!"
    echo "🌐 Access at: http://localhost:8080"
    echo ""
    echo "Useful commands:"
    echo "  View logs:    docker compose logs -f"
    echo "  Stop:         docker compose down"
    echo "  Restart:      docker compose restart"
    echo ""
}

deploy_docker_manual() {
    echo ""
    echo "🐳 Manual Docker Build..."
    echo ""
    
    echo "Building image..."
    docker build -t chorequest:latest .
    
    echo "Stopping existing container (if any)..."
    docker stop chorequest 2>/dev/null || true
    docker rm chorequest 2>/dev/null || true
    
    echo "Starting new container..."
    docker run -d \
        --name chorequest \
        -p 8080:80 \
        --restart unless-stopped \
        chorequest:latest
    
    echo ""
    echo "✅ ChoreQuest is now running!"
    echo "🌐 Access at: http://localhost:8080"
    echo ""
}

deploy_local() {
    echo ""
    echo "💻 Starting Local Development Server..."
    echo ""
    
    if [ ! -f "package.json" ]; then
        echo "❌ package.json not found in current directory"
        exit 1
    fi
    
    echo "Installing dependencies..."
    npm install
    
    echo "Starting development server..."
    npm run dev
}

build_static() {
    echo ""
    echo "📦 Building for Static Hosting..."
    echo ""
    
    if [ ! -f "package.json" ]; then
        echo "❌ package.json not found in current directory"
        exit 1
    fi
    
    echo "Installing dependencies..."
    npm ci
    
    echo "Building application..."
    npm run build
    
    echo ""
    echo "✅ Build complete!"
    echo "📁 Files are in: ./dist"
    echo ""
    echo "Deploy to:"
    echo "  Vercel:   vercel --prod"
    echo "  Netlify:  netlify deploy --prod --dir=dist"
    echo "  S3:       aws s3 sync dist/ s3://your-bucket-name/"
    echo ""
}

check_requirements

if [ "$1" == "--quick" ]; then
    deploy_docker_compose
else
    show_menu
fi
