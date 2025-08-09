#!/bin/bash

echo "🧪 NEURAL SYMPHONY - SETUP TEST"
echo "================================"
echo ""

# Test bash version
echo "Shell: $0"
echo "Bash version: $BASH_VERSION"
echo ""

# Test basic commands
echo "Testing basic commands:"
echo "- uname -s: $(uname -s)"
echo "- id -u: $(id -u)"
echo "- which python3: $(which python3 2>/dev/null || echo 'not found')"
echo "- which node: $(which node 2>/dev/null || echo 'not found')"
echo "- which conda: $(which conda 2>/dev/null || echo 'not found')"
echo "- which nvidia-smi: $(which nvidia-smi 2>/dev/null || echo 'not found')"
echo ""

# Test PATH
echo "Current PATH:"
echo "$PATH" | tr ':' '\n' | head -10
echo ""

# Test conda detection
echo "Testing conda detection:"
for conda_path in "/home/$USER/miniconda3/bin/conda" "/home/$USER/anaconda3/bin/conda" "/opt/miniconda3/bin/conda" "/opt/anaconda3/bin/conda" "/usr/local/bin/conda" "/home/$USER/miniforge3/bin/conda"; do
    if [ -x "$conda_path" ]; then
        echo "✅ Found: $conda_path"
    else
        echo "❌ Not found: $conda_path"
    fi
done
echo ""

# Test nvidia-smi detection
echo "Testing nvidia-smi detection:"
for nvidia_path in "/usr/bin/nvidia-smi" "/usr/local/cuda/bin/nvidia-smi" "nvidia-smi"; do
    if command -v $nvidia_path >/dev/null 2>&1 || [ -x "$nvidia_path" ]; then
        echo "✅ Found: $nvidia_path"
        $nvidia_path --version | head -1 2>/dev/null || echo "  (version check failed)"
    else
        echo "❌ Not found: $nvidia_path"
    fi
done
echo ""

echo "Test complete. If any commands are missing, please install them before running setup.sh"