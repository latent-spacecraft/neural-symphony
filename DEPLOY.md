# 🎼 Neural Symphony - Cloud Deployment Guide

Deploy Neural Symphony to Google Compute Engine with GPU acceleration for optimal performance.

## ⚡ Quick Start (Recommended)

### Prerequisites
1. **Google Cloud Account** with billing enabled
2. **Google Cloud CLI** installed and authenticated
   ```bash
   # Install gcloud CLI
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   
   # Authenticate
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

### One-Click Deploy
```bash
python deploy-quick.py
```

This will:
- ✅ Create GPU instance (NVIDIA L4, 24GB VRAM)
- ✅ Install CUDA, Python, Node.js
- ✅ Download gpt-oss-20b model (~40GB)
- ✅ Setup TensorRT-LLM or Transformers backend
- ✅ Configure nginx reverse proxy
- ✅ Upload your Neural Symphony code

**Time:** 10-15 minutes | **Cost:** ~$1.20/hour

## 🎯 Instance Specifications

| Component | Specification |
|-----------|---------------|
| **GPU** | 1x NVIDIA L4 (24GB VRAM) |
| **CPU** | 8 vCPUs |
| **RAM** | 32GB |
| **Storage** | 100GB SSD |
| **OS** | Ubuntu 20.04 LTS |
| **Machine Type** | g2-standard-8 |

Perfect for gpt-oss-20b (21B parameters)!

## 🌐 Access Your Deployment

After deployment completes:

```bash
# Your Neural Symphony will be available at:
http://YOUR_INSTANCE_IP

# API endpoint:
http://YOUR_INSTANCE_IP/api

# Health check:
http://YOUR_INSTANCE_IP/api/health
```

## 🔧 Management Commands

```bash
# Check status
python deploy-quick.py status

# SSH to instance
gcloud compute ssh neural-symphony-gpu --zone=us-central1-a

# View logs
gcloud compute ssh neural-symphony-gpu --zone=us-central1-a \
  --command='tail -f /var/log/neural-symphony.log'

# Stop instance (saves money!)
gcloud compute instances stop neural-symphony-gpu --zone=us-central1-a

# Start instance
gcloud compute instances start neural-symphony-gpu --zone=us-central1-a

# Clean up everything
python deploy-quick.py clean
```

## 📊 Performance Expectations

| Backend | Tokens/Second | Memory Usage | Quality |
|---------|---------------|--------------|---------|
| **TensorRT-LLM** | 200-400 | 20GB VRAM | Identical |
| **Transformers** | 50-100 | 20GB VRAM | Identical |

Both backends provide identical model quality - TensorRT-LLM is just faster!

## 💰 Cost Optimization

| Usage Pattern | Strategy | Cost/Day |
|---------------|----------|----------|
| **Development** | Stop when not in use | $5-10 |
| **Demo Day** | Run continuously | $25-30 |
| **Production** | Use preemptible instances | $10-15 |

**Pro Tip:** Always stop instances when not in use!

## 🚨 Troubleshooting

### GPU Quota Issues
If you get quota errors:
1. Visit [Google Cloud Quotas](https://console.cloud.google.com/iam-admin/quotas)
2. Search for "NVIDIA_L4_GPUS"
3. Request increase to at least 1 in us-central1

### Model Download Fails
```bash
# SSH to instance and manually download
gcloud compute ssh neural-symphony-gpu --zone=us-central1-a
sudo su -
cd /opt/neural-symphony
python -c "
from huggingface_hub import snapshot_download
snapshot_download('openai/gpt-oss-20b', local_dir='models/gpt-oss-20b')
"
```

### Service Won't Start
```bash
# Check logs
sudo journalctl -u neural-symphony -f

# Restart service
sudo systemctl restart neural-symphony

# Check GPU status
nvidia-smi
```

## 🏗️ Advanced Deployment

For production deployments, consider:

- **Load Balancing:** Multiple instances behind load balancer
- **Auto Scaling:** Based on request queue length
- **Monitoring:** Cloud Monitoring + custom metrics
- **Security:** VPC, firewall rules, SSL certificates
- **Storage:** Persistent disks for model cache

## 🌟 Regional Options

| Region | Benefits | Latency |
|--------|----------|---------|
| **us-central1** | Lowest cost, high availability | US: 20-50ms |
| **us-west1** | West coast users | US West: 10-30ms |
| **europe-west1** | European users | EU: 20-40ms |
| **asia-northeast1** | Asian users | Asia: 30-60ms |

## 📈 Scaling Up

For higher performance:
- **Multiple GPUs:** g2-standard-24 (2x L4)
- **Bigger GPU:** a2-highgpu-1g (1x A100, 40GB)
- **Multiple Instances:** Load balanced deployment

## 🎉 Success Metrics

Your deployment is successful when:
- ✅ Instance accessible via HTTP
- ✅ API returns model info at `/api/health`
- ✅ Reasoning request completes at `/api/reason`
- ✅ GPU memory usage shows model loaded
- ✅ Response time < 2 seconds for first token

---

**Ready to deploy? Run `python deploy-quick.py` and get Neural Symphony running in the cloud! 🚀**