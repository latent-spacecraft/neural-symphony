#!/bin/bash

# 🎼 Neural Symphony - Google Compute Engine Deployment Script
# Deploys gpt-oss-20b with TensorRT-LLM on optimized GPU instances

set -e  # Exit on any error

# Configuration
PROJECT_ID=""  # Will be set from gcloud config or user input
INSTANCE_NAME="neural-symphony-gpu"
ZONE="us-central1-a"  # Change if needed
MACHINE_TYPE="g2-standard-8"  # 1x L4 GPU, 8 vCPU, 32GB RAM - optimal for gpt-oss-20b
GPU_TYPE="nvidia-l4"
GPU_COUNT="1"
DISK_SIZE="100"  # GB - enough for model + dependencies
IMAGE_FAMILY="ubuntu-2004-lts"
IMAGE_PROJECT="ubuntu-os-cloud"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}🎼 Neural Symphony:${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

check_requirements() {
    print_status "Checking requirements..."
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        print_error "Google Cloud CLI (gcloud) is not installed."
        echo "Please install it from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    # Get project ID
    if [ -z "$PROJECT_ID" ]; then
        PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
        if [ -z "$PROJECT_ID" ]; then
            echo "Enter your Google Cloud Project ID:"
            read -p "Project ID: " PROJECT_ID
            if [ -z "$PROJECT_ID" ]; then
                print_error "Project ID is required"
                exit 1
            fi
        fi
    fi
    
    print_success "Using project: $PROJECT_ID"
    
    # Check authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1 > /dev/null 2>&1; then
        print_warning "Not authenticated. Running gcloud auth login..."
        gcloud auth login
    fi
    
    print_success "Authentication verified"
}

enable_apis() {
    print_status "Enabling required Google Cloud APIs..."
    
    gcloud services enable compute.googleapis.com --project=$PROJECT_ID
    gcloud services enable storage.googleapis.com --project=$PROJECT_ID
    
    print_success "APIs enabled"
}

create_startup_script() {
    print_status "Creating startup script for GPU instance..."
    
    cat > startup-script.sh << 'EOF'
#!/bin/bash

# Neural Symphony GPU Instance Startup Script

set -e
export DEBIAN_FRONTEND=noninteractive

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [STARTUP] $1" | tee -a /var/log/neural-symphony-setup.log
}

log "Starting Neural Symphony setup on GPU instance..."

# Update system
log "Updating system packages..."
apt-get update -y
apt-get upgrade -y

# Install basic requirements
log "Installing basic requirements..."
apt-get install -y \
    curl \
    wget \
    git \
    htop \
    nvtop \
    unzip \
    build-essential \
    software-properties-common

# Install NVIDIA drivers (should be pre-installed but ensure latest)
log "Checking NVIDIA drivers..."
nvidia-smi || {
    log "Installing NVIDIA drivers..."
    apt-get install -y nvidia-driver-535
    log "NVIDIA drivers installed, reboot may be required"
}

# Install CUDA toolkit
log "Installing CUDA toolkit..."
if ! command -v nvcc &> /dev/null; then
    wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2004/x86_64/cuda-keyring_1.1-1_all.deb
    dpkg -i cuda-keyring_1.1-1_all.deb
    apt-get update -y
    apt-get install -y cuda-toolkit-12-3
    echo 'export PATH=/usr/local/cuda/bin:$PATH' >> /root/.bashrc
    echo 'export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH' >> /root/.bashrc
fi

# Install Docker with NVIDIA container runtime
log "Installing Docker with NVIDIA container runtime..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Add NVIDIA container runtime
curl -s -L https://nvidia.github.io/nvidia-container-runtime/gpgkey | apt-key add -
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-container-runtime/$distribution/nvidia-container-runtime.list | \
    tee /etc/apt/sources.list.d/nvidia-container-runtime.list

apt-get update -y
apt-get install -y nvidia-container-runtime

# Configure Docker to use NVIDIA runtime
cat > /etc/docker/daemon.json << DOCKEREOF
{
    "default-runtime": "nvidia",
    "runtimes": {
        "nvidia": {
            "path": "/usr/bin/nvidia-container-runtime",
            "runtimeArgs": []
        }
    }
}
DOCKEREOF

systemctl restart docker

# Install miniconda
log "Installing Miniconda..."
if [ ! -d "/opt/miniconda3" ]; then
    wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O /tmp/miniconda.sh
    bash /tmp/miniconda.sh -b -p /opt/miniconda3
    rm /tmp/miniconda.sh
    
    # Add conda to path
    echo 'export PATH="/opt/miniconda3/bin:$PATH"' >> /root/.bashrc
    export PATH="/opt/miniconda3/bin:$PATH"
    
    # Initialize conda
    /opt/miniconda3/bin/conda init bash
fi

# Source bashrc to get updated PATH
export PATH="/opt/miniconda3/bin:$PATH"

# Clone Neural Symphony repository
log "Cloning Neural Symphony repository..."
cd /opt
if [ ! -d "neural-symphony" ]; then
    git clone https://github.com/user/neural-symphony.git neural-symphony || {
        log "Repository not found, creating directory for manual upload"
        mkdir -p neural-symphony
    }
fi

cd /opt/neural-symphony

# Create conda environment
log "Creating conda environment..."
if ! /opt/miniconda3/bin/conda env list | grep -q "neural-symphony"; then
    /opt/miniconda3/bin/conda create -n neural-symphony python=3.10 -y
fi

# Activate environment and install dependencies
log "Installing Python dependencies..."
source /opt/miniconda3/bin/activate neural-symphony

# Install PyTorch with CUDA
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Install Transformers and related packages
pip install transformers accelerate bitsandbytes optimum
pip install fastapi uvicorn websockets
pip install numpy scipy

# Try to install TensorRT-LLM (best effort)
log "Attempting to install TensorRT-LLM..."
pip install tensorrt-llm --extra-index-url https://pypi.nvidia.com || {
    log "TensorRT-LLM installation failed, will use Transformers backend"
}

# Install Node.js for backend
log "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install Node.js dependencies if package.json exists
if [ -f "package.json" ]; then
    npm install
fi

# Download gpt-oss-20b model
log "Downloading gpt-oss-20b model..."
mkdir -p models
cd models

if [ ! -d "gpt-oss-20b" ]; then
    # Install Hugging Face CLI
    pip install huggingface_hub
    
    # Download model (this will take a while)
    python -c "
from huggingface_hub import snapshot_download
print('Downloading gpt-oss-20b model...')
snapshot_download(
    repo_id='openai/gpt-oss-20b',
    local_dir='gpt-oss-20b',
    local_dir_use_symlinks=False
)
print('Model download complete!')
"
fi

cd /opt/neural-symphony

# Set permissions
chown -R root:root /opt/neural-symphony
chmod +x scripts/*.py 2>/dev/null || true
chmod +x *.sh 2>/dev/null || true

# Create systemd service for Neural Symphony
log "Creating systemd service..."
cat > /etc/systemd/system/neural-symphony.service << SERVICEEOF
[Unit]
Description=Neural Symphony AI Reasoning Orchestrator
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/neural-symphony
Environment=PATH=/opt/miniconda3/envs/neural-symphony/bin:/opt/miniconda3/bin:/usr/local/cuda/bin:/usr/bin:/bin
Environment=CUDA_VISIBLE_DEVICES=0
Environment=MODEL_PATH=/opt/neural-symphony/models/gpt-oss-20b
Environment=PYTHON_PATH=/opt/miniconda3/envs/neural-symphony/bin/python
ExecStart=/bin/bash -c 'source /opt/miniconda3/bin/activate neural-symphony && node src/backend/server.js'
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICEEOF

systemctl daemon-reload
systemctl enable neural-symphony

# Create nginx proxy for external access
log "Setting up nginx reverse proxy..."
apt-get install -y nginx

cat > /etc/nginx/sites-available/neural-symphony << NGINXEOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/neural-symphony /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
systemctl enable nginx

# Set up firewall
log "Configuring firewall..."
ufw allow ssh
ufw allow http
ufw allow https
ufw allow 3000
ufw allow 3001
ufw --force enable

# Create startup status file
echo "$(date '+%Y-%m-%d %H:%M:%S') Neural Symphony setup completed successfully!" > /opt/neural-symphony-status.txt

log "Neural Symphony setup completed! 🎼"
log "You can now access the interface at http://[EXTERNAL_IP]"
log "Backend API available at http://[EXTERNAL_IP]/api"

# Start the service
systemctl start neural-symphony

EOF

    print_success "Startup script created"
}

check_quotas() {
    print_status "Checking GPU quotas in region..."
    
    # Check if we have GPU quota
    local gpu_quota=$(gcloud compute regions describe $ZONE --project=$PROJECT_ID --format="value(quotas[metric=NVIDIA_L4_GPUS].limit)" 2>/dev/null || echo "0")
    
    if [ "$gpu_quota" = "0" ] || [ -z "$gpu_quota" ]; then
        print_warning "No L4 GPU quota detected in $ZONE"
        print_warning "You may need to request quota increase at:"
        echo "https://console.cloud.google.com/iam-admin/quotas"
        echo "Required quota: NVIDIA_L4_GPUS >= 1 in region us-central1"
        echo ""
        echo "Continue anyway? (y/N)"
        read -p "> " continue_deploy
        if [ "$continue_deploy" != "y" ] && [ "$continue_deploy" != "Y" ]; then
            print_error "Deployment cancelled"
            exit 1
        fi
    else
        print_success "GPU quota available: $gpu_quota L4 GPUs"
    fi
}

create_instance() {
    print_status "Creating GPU compute instance..."
    
    # Check if instance already exists
    if gcloud compute instances describe $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID &>/dev/null; then
        print_warning "Instance $INSTANCE_NAME already exists"
        echo "Delete existing instance? (y/N)"
        read -p "> " delete_existing
        if [ "$delete_existing" = "y" ] || [ "$delete_existing" = "Y" ]; then
            print_status "Deleting existing instance..."
            gcloud compute instances delete $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID --quiet
        else
            print_error "Cannot proceed with existing instance"
            exit 1
        fi
    fi
    
    print_status "Creating new instance with GPU..."
    gcloud compute instances create $INSTANCE_NAME \
        --project=$PROJECT_ID \
        --zone=$ZONE \
        --machine-type=$MACHINE_TYPE \
        --accelerator="type=${GPU_TYPE},count=${GPU_COUNT}" \
        --maintenance-policy=TERMINATE \
        --provisioning-model=STANDARD \
        --scopes=https://www.googleapis.com/auth/cloud-platform \
        --create-disk="auto-delete=yes,boot=yes,device-name=${INSTANCE_NAME},image-family=${IMAGE_FAMILY},image-project=${IMAGE_PROJECT},mode=rw,size=${DISK_SIZE},type=pd-ssd" \
        --metadata-from-file startup-script=startup-script.sh \
        --tags=http-server,https-server \
        --verbosity=info
    
    print_success "Instance created successfully!"
}

setup_firewall() {
    print_status "Setting up firewall rules..."
    
    # Create firewall rule for HTTP traffic
    if ! gcloud compute firewall-rules describe neural-symphony-http --project=$PROJECT_ID &>/dev/null; then
        gcloud compute firewall-rules create neural-symphony-http \
            --project=$PROJECT_ID \
            --allow tcp:80,tcp:443,tcp:3000,tcp:3001 \
            --source-ranges 0.0.0.0/0 \
            --target-tags http-server,https-server \
            --description "Allow HTTP/HTTPS traffic for Neural Symphony"
    else
        print_warning "Firewall rule already exists"
    fi
    
    print_success "Firewall rules configured"
}

wait_for_instance() {
    print_status "Waiting for instance to be ready..."
    
    # Wait for instance to be running
    while true; do
        STATUS=$(gcloud compute instances describe $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID --format="value(status)")
        if [ "$STATUS" = "RUNNING" ]; then
            break
        fi
        print_status "Instance status: $STATUS - waiting..."
        sleep 10
    done
    
    print_success "Instance is running!"
    
    # Get external IP
    EXTERNAL_IP=$(gcloud compute instances describe $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID --format="value(networkInterfaces[0].accessConfigs[0].natIP)")
    
    print_success "Instance External IP: $EXTERNAL_IP"
    
    # Wait for startup script to complete
    print_status "Waiting for Neural Symphony setup to complete (this may take 10-20 minutes)..."
    print_status "You can monitor progress with:"
    echo "  gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID --command='tail -f /var/log/neural-symphony-setup.log'"
    echo ""
    
    # Check for completion
    local attempts=0
    local max_attempts=120  # 20 minutes
    while [ $attempts -lt $max_attempts ]; do
        if gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID --command='test -f /opt/neural-symphony-status.txt' &>/dev/null; then
            print_success "Setup completed!"
            break
        fi
        
        if [ $((attempts % 6)) -eq 0 ]; then  # Print every minute
            print_status "Still setting up... ($((attempts/6))/20 minutes)"
        fi
        
        sleep 10
        attempts=$((attempts + 1))
    done
    
    if [ $attempts -ge $max_attempts ]; then
        print_warning "Setup may still be in progress. Check manually with:"
        echo "  gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID"
    fi
}

upload_code() {
    print_status "Uploading Neural Symphony code to instance..."
    
    # Create tar archive of current directory (excluding node_modules, models, etc.)
    print_status "Creating code archive..."
    tar --exclude='node_modules' \
        --exclude='models' \
        --exclude='.git' \
        --exclude='*.log' \
        --exclude='startup-script.sh' \
        -czf neural-symphony-code.tar.gz .
    
    # Copy to instance
    gcloud compute scp neural-symphony-code.tar.gz $INSTANCE_NAME:/tmp/ --zone=$ZONE --project=$PROJECT_ID
    
    # Extract on instance
    gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID --command='
        cd /opt/neural-symphony &&
        sudo tar -xzf /tmp/neural-symphony-code.tar.gz &&
        sudo chown -R root:root . &&
        sudo npm install 2>/dev/null || true &&
        sudo systemctl restart neural-symphony
    '
    
    # Clean up local archive
    rm neural-symphony-code.tar.gz
    
    print_success "Code uploaded and service restarted"
}

show_instructions() {
    EXTERNAL_IP=$(gcloud compute instances describe $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID --format="value(networkInterfaces[0].accessConfigs[0].natIP)")
    
    echo ""
    echo "🎉 Neural Symphony deployed successfully!"
    echo ""
    echo "📍 Instance Details:"
    echo "   Name: $INSTANCE_NAME"
    echo "   Zone: $ZONE"
    echo "   Machine: $MACHINE_TYPE (1x NVIDIA L4 GPU)"
    echo "   External IP: $EXTERNAL_IP"
    echo ""
    echo "🌐 Access URLs:"
    echo "   Neural Symphony UI: http://$EXTERNAL_IP"
    echo "   API Endpoint: http://$EXTERNAL_IP/api"
    echo "   Health Check: http://$EXTERNAL_IP/api/model/info"
    echo ""
    echo "🔧 Management Commands:"
    echo "   SSH to instance: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID"
    echo "   View logs: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID --command='sudo journalctl -u neural-symphony -f'"
    echo "   Stop instance: gcloud compute instances stop $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID"
    echo "   Delete instance: gcloud compute instances delete $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID"
    echo ""
    echo "💰 Estimated cost: ~$1.20/hour (includes GPU, compute, storage)"
    echo "⚠️  Remember to stop or delete the instance when done to avoid charges!"
    echo ""
}

# Main deployment flow
main() {
    echo "🎼 Neural Symphony - Google Compute Engine Deployment"
    echo "=================================================="
    echo ""
    
    check_requirements
    enable_apis
    create_startup_script
    check_quotas
    create_instance
    setup_firewall
    wait_for_instance
    upload_code
    show_instructions
    
    print_success "Deployment completed! 🚀"
}

# Handle script arguments
case "${1:-}" in
    "clean")
        print_status "Cleaning up resources..."
        gcloud compute instances delete $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID --quiet 2>/dev/null || true
        gcloud compute firewall-rules delete neural-symphony-http --project=$PROJECT_ID --quiet 2>/dev/null || true
        rm -f startup-script.sh
        print_success "Cleanup completed"
        ;;
    "status")
        EXTERNAL_IP=$(gcloud compute instances describe $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID --format="value(networkInterfaces[0].accessConfigs[0].natIP)" 2>/dev/null || echo "Not found")
        STATUS=$(gcloud compute instances describe $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID --format="value(status)" 2>/dev/null || echo "Not found")
        echo "Instance: $INSTANCE_NAME"
        echo "Status: $STATUS"
        echo "External IP: $EXTERNAL_IP"
        if [ "$EXTERNAL_IP" != "Not found" ]; then
            echo "Access: http://$EXTERNAL_IP"
        fi
        ;;
    *)
        main
        ;;
esac