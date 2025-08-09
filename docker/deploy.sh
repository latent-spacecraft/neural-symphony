#!/bin/bash

# Neural Symphony - Docker Deployment Script
# Quick deployment script for Google Cloud Run or local Docker

set -e

echo "🎼 Neural Symphony - Docker Deployment"
echo "======================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if NVIDIA Docker runtime is available (for GPU support)
if docker info 2>/dev/null | grep -q nvidia; then
    echo "✅ NVIDIA Docker runtime detected - GPU support enabled"
    GPU_SUPPORT=true
else
    echo "⚠️  NVIDIA Docker runtime not found - running in CPU mode"
    GPU_SUPPORT=false
fi

# Build the Docker image
echo "🔨 Building Neural Symphony Docker image..."
docker build -t neural-symphony:latest .

# Check if models directory exists
if [ ! -d "./models" ]; then
    echo "📥 Models directory not found. Creating and downloading gpt-oss-20b..."
    mkdir -p ./models
    # Note: Model will be downloaded during container startup
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down || true

# Start the services
echo "🚀 Starting Neural Symphony services..."
if [ "$GPU_SUPPORT" = true ]; then
    docker-compose up -d
else
    # Use CPU-only version
    CUDA_VISIBLE_DEVICES="" docker-compose up -d
fi

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✅ Neural Symphony is running successfully!"
    echo ""
    echo "🎯 Access URLs:"
    echo "   Web Interface: http://localhost"
    echo "   API Endpoint:  http://localhost/api"
    echo "   Health Check:  http://localhost/health"
    echo ""
    echo "📊 Service Status:"
    docker-compose ps
else
    echo "❌ Services failed to start properly"
    echo "📋 Container logs:"
    docker-compose logs --tail=50
    exit 1
fi

echo ""
echo "🎼 Neural Symphony is ready for AI reasoning orchestration!"
echo "🔧 To stop: docker-compose down"
echo "📝 To view logs: docker-compose logs -f"