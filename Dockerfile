# Neural Symphony - AI Reasoning Orchestrator
# Multi-stage Docker build for GPU-accelerated deployment

# Stage 1: Python AI Backend
FROM nvidia/cuda:12.1-devel-ubuntu22.04 as ai-backend

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV CUDA_VISIBLE_DEVICES=0
ENV PYTHONPATH=/app
ENV HF_HOME=/app/.cache/huggingface

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    git \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Install PyTorch with CUDA support
RUN pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Install AI/ML dependencies
RUN pip3 install \
    transformers[torch] \
    accelerate \
    bitsandbytes \
    vllm \
    huggingface_hub \
    fastapi \
    uvicorn \
    websockets \
    pydantic

# Copy AI model interface scripts
COPY scripts/ ./scripts/
COPY src/models/ ./src/models/
COPY src/parsers/ ./src/parsers/

# Stage 2: Node.js Backend
FROM node:18-alpine as backend

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY src/backend/ ./src/backend/
COPY src/api/ ./src/api/
COPY src/websocket/ ./src/websocket/
COPY src/utils/ ./src/utils/

# Install dependencies
RUN npm ci --only=production

# Stage 3: React Frontend Build
FROM node:18-alpine as frontend-build

WORKDIR /app

# Copy frontend package files
COPY src/frontend/package*.json ./
RUN npm ci

# Copy frontend source
COPY src/frontend/ ./

# Build frontend
RUN npm run build

# Stage 4: Production Image
FROM nvidia/cuda:12.1-runtime-ubuntu22.04

# Install Node.js and Python runtime
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    python3 \
    python3-pip \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy Python AI backend from stage 1
COPY --from=ai-backend /usr/local/lib/python3.10/dist-packages /usr/local/lib/python3.10/dist-packages
COPY --from=ai-backend /usr/local/bin /usr/local/bin
COPY --from=ai-backend /app/src /app/src
COPY --from=ai-backend /app/scripts /app/scripts

# Copy Node.js backend from stage 2
COPY --from=backend /app/node_modules /app/node_modules
COPY --from=backend /app/src/backend /app/src/backend
COPY --from=backend /app/src/api /app/src/api
COPY --from=backend /app/src/websocket /app/src/websocket
COPY --from=backend /app/src/utils /app/src/utils
COPY --from=backend /app/package*.json /app/

# Copy frontend build from stage 3
COPY --from=frontend-build /app/build /app/frontend/build

# Create required directories
RUN mkdir -p /app/models /app/logs /var/log/supervisor

# Copy configuration files
COPY docker/nginx.conf /etc/nginx/sites-available/default
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy startup scripts
COPY docker/start-ai-backend.sh /app/start-ai-backend.sh
COPY docker/start-node-backend.sh /app/start-node-backend.sh
RUN chmod +x /app/start-*.sh

# Expose ports
EXPOSE 80 3000 3001 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Start services with supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]