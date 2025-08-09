#!/bin/bash

# Neural Symphony - Google Cloud Run GPU Deployment
# Deploys with NVIDIA L4 GPU support

set -e

echo "🎼 Neural Symphony - Cloud Run GPU Deployment"
echo "=============================================="

# Configuration
PROJECT_ID=${PROJECT_ID:-$(gcloud config get-value project)}
REGION=${REGION:-"us-central1"}
SERVICE_NAME="neural-symphony"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: PROJECT_ID not set and no default project configured"
    echo "   Please set PROJECT_ID environment variable or run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "📋 Configuration:"
echo "   Project ID: $PROJECT_ID"
echo "   Region: $REGION"
echo "   Service: $SERVICE_NAME"
echo "   Image: $IMAGE_NAME"
echo ""

# Enable required APIs
echo "🔧 Enabling required Google Cloud APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    compute.googleapis.com \
    --project=$PROJECT_ID

# Build the container with Cloud Build
echo "🏗️  Building container image with Cloud Build..."
gcloud builds submit \
    --tag $IMAGE_NAME \
    --project=$PROJECT_ID \
    --timeout=3600s \
    --machine-type=e2-standard-4

if [ $? -ne 0 ]; then
    echo "❌ Container build failed"
    exit 1
fi

echo "✅ Container built successfully: $IMAGE_NAME"

# Deploy to Cloud Run with GPU support
echo "🚀 Deploying to Cloud Run with NVIDIA L4 GPU..."
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME \
    --platform managed \
    --region $REGION \
    --project=$PROJECT_ID \
    --allow-unauthenticated \
    --memory 32Gi \
    --cpu 8 \
    --gpu 1 \
    --gpu-type nvidia-l4 \
    --max-instances 3 \
    --min-instances 1 \
    --concurrency 1000 \
    --timeout 3600 \
    --port 80 \
    --set-env-vars "NODE_ENV=production,CUDA_VISIBLE_DEVICES=0,HF_HOME=/app/.cache/huggingface" \
    --execution-environment gen2

if [ $? -ne 0 ]; then
    echo "❌ Cloud Run deployment failed"
    echo "💡 Make sure you have GPU quota in region $REGION"
    echo "   Request quota at: https://console.cloud.google.com/iam-admin/quotas"
    exit 1
fi

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --platform managed \
    --region $REGION \
    --project=$PROJECT_ID \
    --format 'value(status.url)')

echo ""
echo "🎉 Neural Symphony deployed successfully!"
echo "=================================="
echo "🌐 Service URL: $SERVICE_URL"
echo "🏥 Health Check: $SERVICE_URL/health"
echo "🔌 API Endpoint: $SERVICE_URL/api"
echo "🎼 Web Interface: $SERVICE_URL"
echo ""
echo "📊 Management Commands:"
echo "   Logs: gcloud run services logs tail $SERVICE_NAME --region=$REGION --project=$PROJECT_ID"
echo "   Scale: gcloud run services update $SERVICE_NAME --region=$REGION --max-instances=5 --project=$PROJECT_ID"
echo "   Delete: gcloud run services delete $SERVICE_NAME --region=$REGION --project=$PROJECT_ID"
echo ""
echo "💰 Estimated Cost: ~$1.50/hour (NVIDIA L4 GPU + 32GB RAM)"
echo "⚠️  Remember to delete the service when done to avoid charges!"
echo ""
echo "🎼 Ready to conduct AI reasoning in the cloud! 🤖"