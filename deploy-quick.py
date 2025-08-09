#!/usr/bin/env python3
"""
🎼 Neural Symphony - Quick Cloud Deployment
One-click deployment to Google Compute Engine with GPU acceleration
"""

import os
import sys
import subprocess
import json
import time
from typing import Optional

class NeuralSymphonyDeployer:
    def __init__(self):
        self.project_id: Optional[str] = None
        self.instance_name = "neural-symphony-gpu"
        self.zone = "us-east4-a"
        self.machine_type = "g2-standard-8"  # 1x L4 GPU, perfect for gpt-oss-20b
        
    def print_status(self, msg: str):
        print(f"[INFO] {msg}")
        
    def print_success(self, msg: str):
        print(f"[SUCCESS] {msg}")
        
    def print_error(self, msg: str):
        print(f"[ERROR] {msg}")
        
    def print_warning(self, msg: str):
        print(f"[WARNING] {msg}")

    def check_gcloud(self) -> bool:
        """Check if gcloud is installed and authenticated"""
        try:
            result = subprocess.run(['gcloud', 'auth', 'list'], 
                                  capture_output=True, text=True, shell=True)
            if result.returncode != 0:
                self.print_error("gcloud is not installed or not authenticated")
                print("Please install Google Cloud CLI: https://cloud.google.com/sdk/docs/install")
                return False
                
            # Get project ID
            result = subprocess.run(['gcloud', 'config', 'get-value', 'project'], 
                                  capture_output=True, text=True, shell=True)
            if result.returncode == 0 and result.stdout.strip():
                self.project_id = result.stdout.strip()
                self.print_success(f"Using project: {self.project_id}")
                return True
            else:
                project_id = input("Enter your Google Cloud Project ID: ").strip()
                if not project_id:
                    self.print_error("Project ID is required")
                    return False
                self.project_id = project_id
                return True
                
        except FileNotFoundError:
            self.print_error("gcloud command not found")
            return False

    def enable_apis(self):
        """Enable required Google Cloud APIs"""
        self.print_status("Enabling required APIs...")
        apis = [
            "compute.googleapis.com",
            "storage.googleapis.com"
        ]
        
        for api in apis:
            subprocess.run([
                'gcloud', 'services', 'enable', api, 
                f'--project={self.project_id}'
            ], check=True, shell=True)
        
        self.print_success("APIs enabled")

    def create_startup_script(self):
        """Create the startup script for the instance"""
        startup_script = '''#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive

log() {
    echo "$(date) [STARTUP] $1" | tee -a /var/log/neural-symphony.log
}

log "Starting Neural Symphony GPU setup..."

# Update system
apt-get update -y
apt-get install -y curl wget git htop build-essential

# Install NVIDIA drivers and CUDA
log "Setting up NVIDIA environment..."
apt-get install -y nvidia-driver-535
apt-get install -y nvidia-cuda-toolkit

# Install Miniconda
log "Installing Miniconda..."
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O /tmp/miniconda.sh
bash /tmp/miniconda.sh -b -p /opt/miniconda3
export PATH="/opt/miniconda3/bin:$PATH"
/opt/miniconda3/bin/conda init bash

# Create conda environment
log "Creating neural-symphony environment..."
/opt/miniconda3/bin/conda create -n neural-symphony python=3.10 -y

# Install dependencies
log "Installing Python packages..."
source /opt/miniconda3/bin/activate neural-symphony

pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install transformers accelerate bitsandbytes
pip install fastapi uvicorn websockets
pip install huggingface_hub

# Try TensorRT-LLM
pip install tensorrt-llm --extra-index-url https://pypi.nvidia.com || echo "TensorRT-LLM not available, using Transformers"

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Create working directory
mkdir -p /opt/neural-symphony
cd /opt/neural-symphony

# Download gpt-oss-20b model
log "Downloading gpt-oss-20b model (this will take a while)..."
python -c "
from huggingface_hub import snapshot_download
snapshot_download('openai/gpt-oss-20b', local_dir='models/gpt-oss-20b')
print('Model downloaded successfully!')
"

# Setup nginx proxy
apt-get install -y nginx
cat > /etc/nginx/sites-available/default << 'NGINX_EOF'
server {
    listen 80 default_server;
    location / { proxy_pass http://127.0.0.1:3000; }
    location /api { proxy_pass http://127.0.0.1:3001; }
}
NGINX_EOF

systemctl restart nginx
systemctl enable nginx

# Setup firewall
ufw allow ssh
ufw allow http
ufw --force enable

log "Neural Symphony setup completed!"
echo "ready" > /opt/neural-symphony-ready

'''
        
        with open('startup-script.sh', 'w') as f:
            f.write(startup_script)
            
        self.print_success("Startup script created")

    def create_instance(self):
        """Create the GCE instance with GPU"""
        self.print_status("Creating GPU instance (this takes 2-3 minutes)...")
        
        # Check if instance exists
        try:
            result = subprocess.run([
                'gcloud', 'compute', 'instances', 'describe', 
                self.instance_name, f'--zone={self.zone}', 
                f'--project={self.project_id}'
            ], capture_output=True, text=True, shell=True)
            
            if result.returncode == 0:
                self.print_warning("Instance already exists!")
                response = input("Delete and recreate? (y/N): ").strip().lower()
                if response == 'y':
                    subprocess.run([
                        'gcloud', 'compute', 'instances', 'delete',
                        self.instance_name, f'--zone={self.zone}',
                        f'--project={self.project_id}', '--quiet'
                    ], shell=True)
                else:
                    return
        except:
            pass
        
        # Create instance
        cmd = [
            'gcloud', 'compute', 'instances', 'create', self.instance_name,
            f'--project={self.project_id}',
            f'--zone={self.zone}',
            f'--machine-type={self.machine_type}',
            '--network-interface=network-tier=PREMIUM,stack-type=IPV4_ONLY,subnet=default',
            '--metadata=enable-osconfig=TRUE',
            '--maintenance-policy=TERMINATE',
            '--provisioning-model=STANDARD',
            '--service-account=275263642759-compute@developer.gserviceaccount.com',
            '--scopes=https://www.googleapis.com/auth/devstorage.read_only,https://www.googleapis.com/auth/logging.write,https://www.googleapis.com/auth/monitoring.write,https://www.googleapis.com/auth/service.management.readonly,https://www.googleapis.com/auth/servicecontrol,https://www.googleapis.com/auth/trace.append',
            '--accelerator=count=1,type=nvidia-l4',
            '--create-disk=auto-delete=yes,boot=yes,device-name=instance-20250809-024555,image=projects/debian-cloud/global/images/debian-12-bookworm-v20250709,mode=rw,size=10,type=pd-balanced',
            '--no-shielded-secure-boot',
            '--shielded-vtpm',
            '--shielded-integrity-monitoring',
            '--labels=goog-ops-agent-policy=v2-x86-template-1-4-0,goog-ec-src=vm_add-gcloud',
            '--reservation-affinity=any',
            '--metadata-from-file=startup-script=startup-script.sh',
            '--tags=http-server,https-server'
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, shell=True)
        if result.returncode != 0:
            self.print_error(f"Failed to create instance: {result.stderr}")
            if "quota" in result.stderr.lower():
                self.print_warning("GPU quota exceeded. Request quota increase at:")
                print("https://console.cloud.google.com/iam-admin/quotas")
            sys.exit(1)
            
        self.print_success("Instance created!")

    def setup_firewall(self):
        """Create firewall rules"""
        self.print_status("Setting up firewall...")
        
        try:
            subprocess.run([
                'gcloud', 'compute', 'firewall-rules', 'create', 'neural-symphony-web',
                f'--project={self.project_id}',
                '--allow=tcp:80,tcp:443,tcp:3000,tcp:3001',
                '--source-ranges=0.0.0.0/0',
                '--target-tags=http-server,https-server'
            ], capture_output=True, shell=True)
        except:
            pass  # Rule might already exist
        
        self.print_success("Firewall configured")

    def wait_for_ready(self):
        """Wait for the instance to be ready"""
        self.print_status("Waiting for setup to complete...")
        self.print_status("This will take 10-15 minutes (downloading 40GB model)...")
        
        max_attempts = 100  # ~16 minutes
        for attempt in range(max_attempts):
            try:
                result = subprocess.run([
                    'gcloud', 'compute', 'ssh', self.instance_name,
                    f'--zone={self.zone}', f'--project={self.project_id}',
                    '--command=test -f /opt/neural-symphony-ready'
                ], capture_output=True, text=True, timeout=30, shell=True)
                
                if result.returncode == 0:
                    self.print_success("Setup completed!")
                    break
                    
            except subprocess.TimeoutExpired:
                pass
            except:
                pass
            
            if attempt % 6 == 0:  # Every minute
                self.print_status(f"Still setting up... ({attempt//6}/15 minutes)")
                
            time.sleep(10)
        else:
            self.print_warning("Setup may still be in progress. Check manually.")

    def get_instance_ip(self) -> str:
        """Get the external IP of the instance"""
        result = subprocess.run([
            'gcloud', 'compute', 'instances', 'describe', self.instance_name,
            f'--zone={self.zone}', f'--project={self.project_id}',
            '--format=value(networkInterfaces[0].accessConfigs[0].natIP)'
        ], capture_output=True, text=True, shell=True)
        
        return result.stdout.strip()

    def setup_continuous_deployment(self, repo_url: str):
        """Configure the instance for continuous deployment from git"""
        self.print_status("Setting up continuous deployment...")
        
        # Clone repository and setup auto-deployment
        subprocess.run([
            'gcloud', 'compute', 'ssh', self.instance_name,
            f'--zone={self.zone}', f'--project={self.project_id}',
            '--command=' + f'''
                cd /opt/neural-symphony &&
                git clone {repo_url} . &&
                npm install &&
                cd src/frontend && npm install && npm run build && cd ../.. &&
                sudo systemctl restart nginx
            '''
        ], shell=True)
        
        self.print_success("Continuous deployment configured!")

    def show_results(self):
        """Show deployment results and access information"""
        ip = self.get_instance_ip()
        
        print("\n" + "="*60)
        print("Neural Symphony deployed successfully!")
        print("="*60)
        print(f"Access URL: http://{ip}")
        print(f"API Endpoint: http://{ip}/api")
        print(f"Health Check: http://{ip}/api/health")
        print("")
        print("Management Commands:")
        print(f"   SSH: gcloud compute ssh {self.instance_name} --zone={self.zone} --project={self.project_id}")
        print(f"   Logs: gcloud compute ssh {self.instance_name} --zone={self.zone} --project={self.project_id} --command='tail -f /var/log/neural-symphony.log'")
        print(f"   Stop: gcloud compute instances stop {self.instance_name} --zone={self.zone} --project={self.project_id}")
        print(f"   Delete: gcloud compute instances delete {self.instance_name} --zone={self.zone} --project={self.project_id}")
        print("")
        print("Cost: ~$1.20/hour")
        print("Don't forget to stop/delete when done!")
        print("="*60)

    def deploy(self):
        """Main deployment process"""
        print("Neural Symphony - Quick Cloud Deployment")
        print("=" * 50)
        
        if not self.check_gcloud():
            return False
            
        try:
            self.enable_apis()
            self.create_startup_script()
            self.create_instance()
            self.setup_firewall()
            self.wait_for_ready()
            
            # For continuous deployment, get repo URL from user
            repo_url = input("Enter your private GitHub repo URL (https://github.com/user/repo.git): ").strip()
            if repo_url:
                self.setup_continuous_deployment(repo_url)
            
            self.show_results()
            
            return True
            
        except KeyboardInterrupt:
            self.print_error("Deployment cancelled")
            return False
        except Exception as e:
            self.print_error(f"Deployment failed: {e}")
            return False
        finally:
            # Cleanup
            if os.path.exists('startup-script.sh'):
                os.remove('startup-script.sh')

def main():
    deployer = NeuralSymphonyDeployer()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "status":
            # Show current status
            ip = deployer.get_instance_ip()
            print(f"Neural Symphony: http://{ip}")
            
        elif command == "clean":
            # Clean up resources
            print("Cleaning up resources...")
            subprocess.run([
                'gcloud', 'compute', 'instances', 'delete', 
                deployer.instance_name, f'--zone={deployer.zone}', 
                f'--project={deployer.project_id}', '--quiet'
            ], shell=True)
            print("Cleanup completed")
            
        else:
            print("Usage: python deploy-quick.py [status|clean]")
            
    else:
        # Deploy
        deployer.deploy()

if __name__ == "__main__":
    main()