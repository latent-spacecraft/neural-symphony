#!/bin/bash

# Neural Symphony - CPU-only AI Backend Startup Script
# For Google Cloud Run deployment without GPU

set -e

echo "[AI-BACKEND-CPU] Starting Neural Symphony AI Backend (CPU Mode)..."

# Check CPU capabilities
echo "[AI-BACKEND-CPU] Checking CPU capabilities..."
python3 -c "import torch; print(f'PyTorch version: {torch.__version__}'); print(f'CPU count: {torch.get_num_threads()}')" || {
    echo "[AI-BACKEND-CPU] PyTorch not available"
}

# Check if model exists
if [ ! -d "/app/models/gpt-oss-20b" ]; then
    echo "[AI-BACKEND-CPU] Model not found, downloading gpt-oss-20b..."
    python3 -c "
from huggingface_hub import snapshot_download
import os
os.makedirs('/app/models', exist_ok=True)
snapshot_download('openai/gpt-oss-20b', local_dir='/app/models/gpt-oss-20b')
print('Model downloaded successfully!')
"
fi

# Set CPU optimization
export OMP_NUM_THREADS=4
export MKL_NUM_THREADS=4
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:128

echo "[AI-BACKEND-CPU] Starting Transformers server on port 8000..."

# Start the CPU-optimized AI backend server
cd /app
python3 scripts/transformers-server.py \
    --model-path /app/models/gpt-oss-20b \
    --host 0.0.0.0 \
    --port 8000 \
    --max-tokens 2048 \
    --temperature 0.7 \
    --device cpu \
    --dtype float32