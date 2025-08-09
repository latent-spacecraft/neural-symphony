#!/bin/bash

# Neural Symphony - AI Backend Startup Script
# Starts the Python-based AI inference server with GPU acceleration

set -e

echo "[AI-BACKEND] Starting Neural Symphony AI Backend..."

# Wait for GPU to be available
echo "[AI-BACKEND] Checking GPU availability..."
python3 -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}'); print(f'GPU count: {torch.cuda.device_count()}')" || {
    echo "[AI-BACKEND] WARNING: CUDA not available, falling back to CPU"
}

# Check if model exists
if [ ! -d "/app/models/gpt-oss-20b" ]; then
    echo "[AI-BACKEND] Model not found, downloading gpt-oss-20b..."
    python3 -c "
from huggingface_hub import snapshot_download
import os
os.makedirs('/app/models', exist_ok=True)
snapshot_download('openai/gpt-oss-20b', local_dir='/app/models/gpt-oss-20b')
print('Model downloaded successfully!')
"
fi

# Set memory optimization
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
export OMP_NUM_THREADS=4

echo "[AI-BACKEND] Starting FastAPI server on port 8000..."

# Start the AI backend server
cd /app
python3 scripts/transformers-server.py \
    --model-path /app/models/gpt-oss-20b \
    --host 0.0.0.0 \
    --port 8000 \
    --max-tokens 2048 \
    --temperature 0.7 \
    --device cuda