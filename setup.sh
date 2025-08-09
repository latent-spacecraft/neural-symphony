#!/bin/bash

# Neural Symphony - Setup Script
# OpenAI Hackathon 2025 - AI Reasoning Orchestrator

set -e  # Exit on any error

# Ensure we're using bash
if [ -z "$BASH_VERSION" ]; then
    echo "This script requires bash. Please run with: bash ./setup.sh"
    exit 1
fi

# Preserve and enhance PATH
if [ -n "$SUDO_USER" ] && [ -n "$SUDO_UID" ]; then
    # Get original user's PATH
    ORIG_PATH=$(su - "$SUDO_USER" -c 'echo $PATH' 2>/dev/null || echo "")
    if [ -n "$ORIG_PATH" ]; then
        export PATH="$ORIG_PATH"
    fi
fi

# Add common paths regardless
export PATH="/usr/local/cuda/bin:/usr/local/bin:/usr/bin:/bin:/home/$USER/miniconda3/bin:/home/$USER/anaconda3/bin:$PATH"
# Add Windows Miniforge
export PATH="$HOME/miniforge3/Scripts:$HOME/miniforge3:$PATH"

# Add conda paths if they exist
for conda_path in "/home/$USER/miniconda3/bin/conda" "/home/$USER/anaconda3/bin/conda" "/opt/miniconda3/bin/conda" "/opt/anaconda3/bin/conda" "/home/$USER/miniforge3/bin/conda" "C:\Users\geoff\miniforge"; do
    if [ -x "$conda_path" ]; then
        export PATH="$(dirname $conda_path):$PATH"
        break
    fi
done

echo "🎼 NEURAL SYMPHONY - SETUP SCRIPT"
echo "=================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print colored output (compatible with different shells)
print_status() {
    printf "${BLUE}[INFO]${NC} %s\n" "$1"
}

print_success() {
    printf "${GREEN}[SUCCESS]${NC} %s\n" "$1"
}

print_warning() {
    printf "${YELLOW}[WARNING]${NC} %s\n" "$1"
}

print_error() {
    printf "${RED}[ERROR]${NC} %s\n" "$1"
}

print_header() {
    printf "${PURPLE}%s${NC}\n" "$1"
}

# Check if running on supported OS
check_os() {
    print_status "Checking operating system..."
    
    # Use more compatible OS detection
    case "$(uname -s)" in
        Linux*)
            OS="linux"
            print_success "Linux detected"
            ;;
        Darwin*)
            OS="macos" 
            print_success "macOS detected"
            ;;
        CYGWIN*|MINGW*|MSYS*)
            OS="windows"
            print_success "Windows detected"
            ;;
        *)
            print_error "Unsupported operating system: $(uname -s)"
            exit 1
            ;;
    esac
}

# Global Python command detection
detect_python() {
    PYTHON_CMD=""
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    elif command -v python &> /dev/null; then
        # Check if it's Python 3
        PYTHON_VER=$(python --version 2>&1 | grep -o "Python 3")
        if [ -n "$PYTHON_VER" ]; then
            PYTHON_CMD="python"
        fi
    fi
}

# Check system requirements
check_requirements() {
    print_header "Checking System Requirements..."
    
    # Detect Python command
    detect_python
    
    # Check NVIDIA GPU - try multiple common paths
    NVIDIA_SMI=""
    for path in "/usr/bin/nvidia-smi" "/usr/local/cuda/bin/nvidia-smi" "nvidia-smi"; do
        if command -v $path &> /dev/null || [ -x "$path" ]; then
            NVIDIA_SMI=$path
            break
        fi
    done
    
    if [ -n "$NVIDIA_SMI" ]; then
        print_status "Checking GPU memory..."
        GPU_MEM=$($NVIDIA_SMI --query-gpu=memory.total --format=csv,noheader,nounits | head -1)
        GPU_MEM_GB=$((GPU_MEM / 1024))
        
        if [ $GPU_MEM_GB -ge 15 ]; then
            print_success "GPU memory: ${GPU_MEM_GB}GB (✅ Meets requirement)"
        else
            print_warning "GPU memory: ${GPU_MEM_GB}GB (⚠️ Minimum 16GB recommended)"
        fi
        print_success "NVIDIA GPU detected: $NVIDIA_SMI"
    else
        print_error "NVIDIA GPU not detected or nvidia-smi not available"
        print_error "Searched paths: /usr/bin/nvidia-smi, /usr/local/cuda/bin/nvidia-smi"
        print_error "Please install CUDA toolkit and NVIDIA drivers"
        
        # Don't exit immediately - let user decide
        print_warning "GPU check failed, but continuing setup..."
        print_warning "You can install CUDA later and re-run setup"
    fi
    
    # Check RAM
    if [[ "$OS" == "linux" ]]; then
        RAM_GB=$(free -g | awk '/^Mem:/{print $2}')
    elif [[ "$OS" == "macos" ]]; then
        RAM_BYTES=$(sysctl -n hw.memsize)
        RAM_GB=$((RAM_BYTES / 1024 / 1024 / 1024))
    else
        print_warning "RAM check not available on Windows"
        RAM_GB=32  # Assume sufficient
    fi
    
    if [ $RAM_GB -ge 24 ]; then
        print_success "System RAM: ${RAM_GB}GB (✅ Sufficient)"
    else
        print_warning "System RAM: ${RAM_GB}GB (⚠️ 32GB recommended)"
    fi
    
    # Check Python
    if [ -n "$PYTHON_CMD" ]; then
        PYTHON_VERSION=$($PYTHON_CMD --version | cut -d' ' -f2)
        print_success "Python: $PYTHON_VERSION ($PYTHON_CMD)"
    else
        print_error "Python 3 not found. Please install Python 3.8+"
        exit 1
    fi
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js: $NODE_VERSION"
    else
        print_error "Node.js not found. Please install Node.js 18+"
        exit 1
    fi
    
    # Check conda with enhanced detection
    CONDA_CMD=""
    
    # Try multiple conda detection methods
    if command -v conda >/dev/null 2>&1; then
        CONDA_CMD="conda"
    else
        # Try common conda installation paths
        for conda_path in "/home/$USER/miniconda3/bin/conda" "/home/$USER/anaconda3/bin/conda" "/opt/miniconda3/bin/conda" "/opt/anaconda3/bin/conda" "/usr/local/bin/conda"; do
            if [ -x "$conda_path" ]; then
                CONDA_CMD="$conda_path"
                export PATH="$(dirname $conda_path):$PATH"
                break
            fi
        done
    fi
    
    if [ -n "$CONDA_CMD" ]; then
        CONDA_VERSION=$($CONDA_CMD --version 2>/dev/null | cut -d' ' -f2 || echo "unknown")
        print_success "Conda found: $CONDA_CMD (version $CONDA_VERSION)"
    else
        print_error "Conda not found. Please install Miniconda or Anaconda"
        print_error "Common installation paths checked:"
        print_error "  - /home/$USER/miniconda3/bin/conda"  
        print_error "  - /home/$USER/anaconda3/bin/conda"
        print_error "  - /opt/miniconda3/bin/conda"
        print_error "  - /opt/anaconda3/bin/conda"
        exit 1
    fi
}

# Setup conda environment
setup_conda_env() {
    print_header "Setting up Conda Environment..."
    
    ENV_NAME="neural-symphony"
    
    # Check if environment exists
    if conda env list | grep -q "^${ENV_NAME} "; then
        print_warning "Environment '$ENV_NAME' already exists"
        printf "Do you want to recreate it? (y/N): "
        read -r REPLY
        echo
        case "$REPLY" in
            [yY]|[yY][eE][sS])
                print_status "Removing existing environment..."
                conda env remove -n $ENV_NAME -y
                ;;
            *)
                print_status "Using existing environment"
                return 0
                ;;
        esac
    fi
    
    print_status "Creating conda environment..."
    conda create -n $ENV_NAME python=3.10 -y
    
    print_status "Activating environment..."
    source "$(conda info --base)/etc/profile.d/conda.sh"
    conda activate $ENV_NAME
    
    print_status "Installing PyTorch with CUDA..."
    conda install pytorch pytorch-cuda=12.1 -c pytorch -c nvidia -y
    
    print_status "Installing Python dependencies..."
    pip install \
        vllm \
        transformers>=4.55.0 \
        accelerate \
        huggingface-hub \
        sentencepiece \
        protobuf \
        fastapi \
        uvicorn \
        websockets \
        python-multipart
    
    print_success "Conda environment setup complete"
}

# Install Node.js dependencies
setup_node_deps() {
    print_header "Setting up Node.js Dependencies..."
    
    print_status "Installing backend dependencies..."
    npm install
    
    print_status "Installing frontend dependencies..."
    cd src/frontend
    npm install
    cd ../..
    
    print_success "Node.js dependencies installed"
}

# Download GPT-oss model
download_model() {
    print_header "Setting up GPT-oss Model..."
    
    MODEL_DIR="./models/gpt-oss-20b"
    
    if [ -d "$MODEL_DIR" ] && [ "$(ls -A $MODEL_DIR)" ]; then
        print_warning "Model directory already exists and is not empty"
        printf "Do you want to re-download the model? (y/N): "
        read -r REPLY
        echo
        case "$REPLY" in
            [yY]|[yY][eE][sS])
                print_status "Proceeding with model download..."
                ;;
            *)
                print_status "Using existing model"
                return 0
                ;;
        esac
    fi
    
    print_status "Creating model directory..."
    mkdir -p "$MODEL_DIR"
    
    print_status "Downloading GPT-oss-20b model (~40GB)..."
    print_warning "This may take 30-60 minutes depending on your internet speed"
    
    # Activate conda environment
    source "$(conda info --base)/etc/profile.d/conda.sh"
    conda activate neural-symphony
    
    # Try huggingface-cli first
    if command -v huggingface-cli &> /dev/null; then
        print_status "Using huggingface-cli for download..."
        huggingface-cli download openai/gpt-oss-20b --local-dir "$MODEL_DIR" --local-dir-use-symlinks False
    else
        print_status "Installing huggingface-hub..."
        pip install huggingface-hub[cli]
        huggingface-cli download openai/gpt-oss-20b --local-dir "$MODEL_DIR" --local-dir-use-symlinks False
    fi
    
    print_success "Model download complete"
}

# Create environment file
create_env_file() {
    print_header "Creating Environment Configuration..."
    
    ENV_FILE=".env"
    
    print_status "Creating $ENV_FILE..."
    
    cat > $ENV_FILE << EOF
# Neural Symphony Configuration

# Model Configuration
MODEL_NAME=openai/gpt-oss-20b
MODEL_PATH=$(pwd)/models/gpt-oss-20b
VLLM_GPU_MEMORY_UTILIZATION=0.90
VLLM_MAX_MODEL_LEN=4096
VLLM_TENSOR_PARALLEL_SIZE=1

# Server Configuration
PORT=3001
FRONTEND_PORT=3000
WS_PORT=3002

# Performance Settings
MAX_REASONING_DEPTH=5
DEFAULT_TEMPERATURE=0.7
DEFAULT_TOP_P=0.9
MAX_TOKENS=2048
STREAM_BUFFER_SIZE=50

# Debug Settings
LOG_LEVEL=info
ENABLE_REASONING_LOGS=true
ENABLE_EXPERT_TRACKING=true

# System Resources
MAX_CONCURRENT_REQUESTS=2
GPU_DEVICE=0
CUDA_VISIBLE_DEVICES=0

# React App Configuration
REACT_APP_BACKEND_URL=http://localhost:3001
REACT_APP_WS_URL=ws://localhost:3001
EOF

    print_success "Environment file created: $ENV_FILE"
}

# Test model loading
test_model() {
    print_header "Testing Model Loading..."
    
    print_status "Activating conda environment..."
    source "$(conda info --base)/etc/profile.d/conda.sh"
    conda activate neural-symphony
    
    print_status "Testing model load (this may take 2-3 minutes)..."
    
    $PYTHON_CMD << EOF
import sys
import torch
from transformers import AutoTokenizer

try:
    print("Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained("./models/gpt-oss-20b")
    print("✅ Tokenizer loaded successfully")
    
    print("Checking CUDA availability...")
    if torch.cuda.is_available():
        print(f"✅ CUDA available - {torch.cuda.get_device_name(0)}")
        print(f"✅ GPU Memory: {torch.cuda.get_device_properties(0).total_memory // 1024**3}GB")
    else:
        print("❌ CUDA not available")
        sys.exit(1)
        
    print("✅ Model test successful!")
    
except Exception as e:
    print(f"❌ Model test failed: {e}")
    sys.exit(1)
EOF

    if [ $? -eq 0 ]; then
        print_success "Model test passed"
    else
        print_error "Model test failed"
        exit 1
    fi
}

# Create start scripts
create_start_scripts() {
    print_header "Creating Start Scripts..."
    
    # Backend start script
    cat > start-backend.sh << 'EOF'
#!/bin/bash
echo "🎼 Starting Neural Symphony Backend..."
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate neural-symphony
export CUDA_VISIBLE_DEVICES=0
node src/backend/server.js
EOF
    chmod +x start-backend.sh
    
    # Frontend start script
    cat > start-frontend.sh << 'EOF'
#!/bin/bash
echo "🎨 Starting Neural Symphony Frontend..."
cd src/frontend
npm start
EOF
    chmod +x start-frontend.sh
    
    # Combined start script
    cat > start.sh << 'EOF'
#!/bin/bash
echo "🎼 NEURAL SYMPHONY - AI REASONING ORCHESTRATOR"
echo "=============================================="
echo ""

# Check if tmux is available
if command -v tmux &> /dev/null; then
    echo "Starting with tmux (recommended)..."
    
    # Create new tmux session
    tmux new-session -d -s neural-symphony
    
    # Split into two panes
    tmux split-window -h
    
    # Start backend in first pane
    tmux send-keys -t 0 './start-backend.sh' Enter
    
    # Start frontend in second pane  
    tmux send-keys -t 1 './start-frontend.sh' Enter
    
    echo ""
    echo "✅ Neural Symphony started in tmux session 'neural-symphony'"
    echo ""
    echo "📋 Useful commands:"
    echo "   tmux attach -t neural-symphony  # Attach to session"
    echo "   tmux kill-session -t neural-symphony  # Stop everything"
    echo ""
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔗 Backend:  http://localhost:3001"
    echo ""
    echo "Press Ctrl+C to stop this script (services will continue running)"
    
    # Keep script running
    while true; do sleep 1; done
    
else
    echo "tmux not found. Starting manually..."
    echo ""
    echo "In one terminal, run: ./start-backend.sh"
    echo "In another terminal, run: ./start-frontend.sh"
    echo ""
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔗 Backend:  http://localhost:3001"
fi
EOF
    chmod +x start.sh
    
    print_success "Start scripts created"
}

# Main setup function
main() {
    print_header "🎼 NEURAL SYMPHONY SETUP"
    echo "AI Reasoning Orchestrator for OpenAI Hackathon 2025"
    echo ""
    
    # Check if running as root (not recommended)
    if [ "$(id -u)" -eq 0 ]; then
        print_warning "Running as root detected!"
        print_warning "This script doesn't need sudo and may cause permission issues."
        print_warning "Consider running as regular user: ./setup.sh"
        echo ""
        printf "Continue anyway? (y/N): "
        read -r REPLY
        echo ""
        case "$REPLY" in
            [yY]|[yY][eE][sS])
                print_status "Continuing with root privileges..."
                ;;
            *)
                print_status "Exiting. Please run without sudo."
                exit 0
                ;;
        esac
    fi
    
    check_os
    check_requirements
    
    # Ask user what to install
    echo ""
    print_header "Setup Options:"
    echo "1) Full setup (recommended for first time)"
    echo "2) Dependencies only (skip model download)"
    echo "3) Model only (if dependencies already installed)"
    echo "4) Test existing setup"
    echo ""
    printf "Choose option (1-4): "
    read -r REPLY
    echo ""
    
    case $REPLY in
        1)
            print_status "Starting full setup..."
            setup_conda_env
            setup_node_deps
            create_env_file
            download_model
            test_model
            create_start_scripts
            ;;
        2)
            print_status "Installing dependencies only..."
            setup_conda_env
            setup_node_deps
            create_env_file
            create_start_scripts
            ;;
        3)
            print_status "Downloading model only..."
            download_model
            test_model
            ;;
        4)
            print_status "Testing existing setup..."
            test_model
            ;;
        *)
            print_error "Invalid option"
            exit 1
            ;;
    esac
    
    print_success "Setup complete!"
    echo ""
    print_header "🚀 Next Steps:"
    echo ""
    echo "1. Start the system:"
    echo "   ./start.sh"
    echo ""
    echo "2. Open browser:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:3001/health"
    echo ""
    echo "3. Try a demo scenario:"
    echo "   - Click 'DEMOS' in the problem input"
    echo "   - Select 'Climate Solution' or 'Creative Problem'"
    echo "   - Click 'START REASONING' and watch the magic! 🎼"
    echo ""
    print_header "🎯 For OpenAI Hackathon Demo:"
    echo "- Use the built-in demo scenarios"
    echo "- Adjust expert bias sliders live"
    echo "- Show the channel mixer in action"
    echo "- Demonstrate parallel reasoning tracks"
    echo ""
    print_success "Ready to conduct AI reasoning like never before!"
}

# Run main function
main "$@"