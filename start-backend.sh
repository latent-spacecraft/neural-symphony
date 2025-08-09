#!/bin/bash

echo "Starting Neural Symphony Backend..."

# Set Python path directly to neural-symphony environment
export PYTHON_PATH="C:/Users/geoff/miniforge3/envs/neural-symphony/python.exe"

# Verify vLLM installation
echo "Testing vLLM import..."
PYTHONIOENCODING=utf-8 "$PYTHON_PATH" -c "import vllm; print('vLLM version:', vllm.__version__)" || {
    echo "vLLM import failed. Please ensure vLLM is installed in the neural-symphony environment."
    exit 1
}

# Set environment variables
export CUDA_VISIBLE_DEVICES=0
export MODEL_PATH='models/gpt-oss-20b'

echo "Starting Node.js backend server..."
node src/backend/server.js
