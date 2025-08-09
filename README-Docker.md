# Neural Symphony - Docker Deployment Guide

🎼 **AI Reasoning Orchestrator** - Dockerized for easy cloud deployment

## Quick Start

### Prerequisites
- Docker Engine 20.10+ with Docker Compose
- NVIDIA Docker runtime (for GPU support)
- 16GB+ VRAM GPU (RTX 4060 Ti or better)
- 32GB+ system RAM

### 1. Clone and Build
```bash
git clone <your-repo-url>
cd neural-symphony
docker-compose build
```

### 2. Deploy
```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 3. Access
- **Web Interface:** http://localhost
- **API:** http://localhost/api
- **Health:** http://localhost/health

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│                 │    │                  │    │                 │
│  NGINX          │    │  Node.js API     │    │  Python AI      │
│  (Port 80)      ├────┤  (Port 3001)     ├────┤  (Port 8000)    │
│  Frontend+Proxy │    │  WebSocket 3002  │    │  GPU Inference  │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌──────────────────┐
                    │                  │
                    │  Redis Cache     │
                    │  (Port 6379)     │
                    │  Optional        │
                    │                  │
                    └──────────────────┘
```

## Services

### Main Container (`neural-symphony`)
- **Frontend:** React app (built and served by nginx)
- **API Backend:** Node.js with Express + WebSocket
- **AI Backend:** Python FastAPI with GPU inference
- **Nginx:** Reverse proxy and static file server

### Optional Services
- **Redis:** Session management and caching
- **Prometheus:** Monitoring and metrics

## Configuration

### Environment Variables
```yaml
NODE_ENV: production
CUDA_VISIBLE_DEVICES: 0
MODEL_PATH: /app/models/gpt-oss-20b
AI_BACKEND_PORT: 8000
```

### GPU Memory
- Model uses ~14GB VRAM for inference
- Configure `gpu-memory-utilization: 0.95` in startup script
- Adjust based on your GPU capacity

### Resource Limits
```yaml
mem_limit: 24g          # System RAM
shm_size: 4g           # Shared memory for GPU
```

## Cloud Deployment

### Google Cloud Run
```bash
# Build for Cloud Run
gcloud builds submit --tag gcr.io/PROJECT_ID/neural-symphony

# Deploy with GPU
gcloud run deploy neural-symphony \
  --image gcr.io/PROJECT_ID/neural-symphony \
  --platform managed \
  --memory 32Gi \
  --gpu 1 \
  --gpu-type nvidia-l4 \
  --max-instances 1 \
  --port 80
```

### Google Compute Engine
```bash
# Use the included deployment script
python deploy-quick.py
```

## Development

### Local Development
```bash
# Start in development mode
docker-compose -f docker-compose.dev.yml up

# Access development servers
# Frontend: http://localhost:3000
# API: http://localhost:3001
# AI Backend: http://localhost:8000
```

### Model Management
Models are downloaded automatically on first startup. To pre-download:

```bash
python3 -c "
from huggingface_hub import snapshot_download
snapshot_download('openai/gpt-oss-20b', local_dir='./models/gpt-oss-20b')
"
```

## Monitoring

### Health Checks
- **Main:** `curl http://localhost/health`
- **API:** `curl http://localhost/api/health`
- **AI:** `curl http://localhost/ai/health`

### Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f neural-symphony

# AI backend only
docker exec -it neural-symphony-main tail -f /app/logs/ai-backend.log
```

### Prometheus Metrics
Access http://localhost:9090 for monitoring dashboard

## Troubleshooting

### GPU Not Detected
```bash
# Check NVIDIA runtime
docker info | grep nvidia

# Install nvidia-container-runtime
sudo apt install nvidia-container-runtime
sudo systemctl restart docker
```

### Memory Issues
```bash
# Check GPU memory
nvidia-smi

# Reduce memory usage in docker-compose.yml
gpu-memory-utilization: 0.8
```

### Port Conflicts
```bash
# Check port usage
netstat -tlnp | grep :80

# Change ports in docker-compose.yml
ports:
  - "8080:80"  # Use port 8080 instead
```

## Performance Tuning

### GPU Optimization
```yaml
environment:
  PYTORCH_CUDA_ALLOC_CONF: max_split_size_mb:512
  OMP_NUM_THREADS: 4
```

### Memory Settings
```bash
# Increase shared memory
docker run --shm-size=8g neural-symphony
```

### Model Quantization
```python
# Enable 8-bit quantization for lower memory usage
load_in_8bit=True
```

## Security

### Production Hardening
- Change default ports
- Enable HTTPS with SSL certificates
- Set up firewall rules
- Use secrets management for API keys
- Enable container security scanning

### Secrets Management
```bash
# Use Docker secrets
echo "your-hf-token" | docker secret create hf_token -
```

---

🎼 **Ready to conduct AI reasoning like never before!**

For issues: [GitHub Issues](https://github.com/your-repo/issues)
For docs: [Full Documentation](./docs/)