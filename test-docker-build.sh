#!/bin/bash

# Neural Symphony - Docker Build Test
# Quick test to verify Docker build works

set -e

echo "🧪 Testing Docker build process..."
echo "================================"

echo "🔧 Building test image (CPU-only, faster)..."
docker build -f Dockerfile.test -t neural-symphony:test .

if [ $? -eq 0 ]; then
    echo "✅ Test build completed successfully!"
    echo ""
    echo "🧪 Testing main GPU build..."
    docker build -f Dockerfile -t neural-symphony:latest .
    
    if [ $? -eq 0 ]; then
        echo "🎉 Full GPU build completed successfully!"
        echo ""
        echo "📋 Available images:"
        docker images | grep neural-symphony
        echo ""
        echo "🚀 Ready for deployment!"
    else
        echo "❌ GPU build failed"
        exit 1
    fi
else
    echo "❌ Test build failed"
    exit 1
fi