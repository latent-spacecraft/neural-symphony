const { spawn } = require('child_process');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

/**
 * Windows-optimized GPT-oss interface using Transformers with CUDA acceleration
 * Falls back to TensorRT-LLM when available, otherwise uses optimized Transformers
 */
class GPTOssWindowsInterface extends EventEmitter {
    constructor(config = {}) {
        super();
        this.modelName = config.modelName || process.env.MODEL_NAME || 'gpt-oss-20b';
        this.modelPath = config.modelPath || process.env.MODEL_PATH;
        this.maxModelLen = config.maxModelLen || process.env.MAX_MODEL_LEN || 4096;
        this.device = config.device || 'cuda';
        this.dtype = config.dtype || 'auto';
        
        this.isInitialized = false;
        this.backend = null; // 'tensorrt' or 'transformers'
        this.serverProcess = null;
        
        this.stats = {
            totalRequests: 0,
            completedRequests: 0,
            failedRequests: 0,
            averageLatency: 0,
            totalTokens: 0,
            backend: null
        };
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        console.log(`🔄 Initializing GPT-oss Windows interface...`);
        console.log(`📍 Model: ${this.modelName}`);
        
        try {
            // Try TensorRT-LLM first
            if (await this.checkTensorRTAvailability()) {
                console.log(`⚡ Using TensorRT-LLM backend for maximum performance`);
                await this.initializeTensorRT();
                this.backend = 'tensorrt';
            } else {
                console.log(`🔧 Using Transformers backend with CUDA acceleration`);
                await this.initializeTransformers();
                this.backend = 'transformers';
            }
            
            this.stats.backend = this.backend;
            this.isInitialized = true;
            console.log(`✅ GPT-oss Windows interface initialized with ${this.backend} backend`);
            
        } catch (error) {
            console.error(`❌ Failed to initialize GPT-oss interface:`, error.message);
            throw error;
        }
    }

    async checkTensorRTAvailability() {
        try {
            const pythonPath = process.env.PYTHON_PATH || 
                              process.env.CONDA_PREFIX ? `${process.env.CONDA_PREFIX}/bin/python` :
                              'python3';
            
            return new Promise((resolve) => {
                const testProcess = spawn(pythonPath, ['-c', 'import tensorrt_llm; print("available")'], {
                    stdio: ['ignore', 'pipe', 'pipe'],
                    timeout: 5000
                });

                let output = '';
                testProcess.stdout.on('data', (data) => {
                    output += data.toString();
                });

                testProcess.on('close', (code) => {
                    resolve(code === 0 && output.includes('available'));
                });

                testProcess.on('error', () => resolve(false));
            });
        } catch {
            return false;
        }
    }

    async initializeTensorRT() {
        return new Promise((resolve, reject) => {
            const pythonPath = process.env.PYTHON_PATH || 
                              process.env.CONDA_PREFIX ? `${process.env.CONDA_PREFIX}/bin/python` :
                              'python3';
            const wrapperPath = path.join(__dirname, '../../scripts/tensorrt-server.py');
            
            // Create TensorRT server script if it doesn't exist
            this.createTensorRTServer();
            
            const args = [
                wrapperPath,
                '--model', this.modelName,
                '--host', '127.0.0.1',
                '--port', '8000',
                '--max-model-len', this.maxModelLen.toString(),
                '--dtype', this.dtype
            ];

            if (this.modelPath) {
                args.push('--model-path', this.modelPath);
            }

            console.log(`🚀 Starting TensorRT-LLM server...`);
            
            this.serverProcess = spawn(pythonPath, args, {
                stdio: ['ignore', 'pipe', 'pipe'],
                env: { 
                    ...process.env,
                    CUDA_VISIBLE_DEVICES: process.env.CUDA_VISIBLE_DEVICES || '0'
                }
            });

            let startupOutput = '';
            let hasStarted = false;

            this.serverProcess.stdout.on('data', (data) => {
                const output = data.toString();
                startupOutput += output;
                console.log(`[TensorRT] ${output.trim()}`);

                if (!hasStarted && (output.includes('Server started') || output.includes('ready'))) {
                    hasStarted = true;
                    setTimeout(() => resolve(), 2000);
                }
            });

            this.serverProcess.stderr.on('data', (data) => {
                const output = data.toString();
                console.error(`[TensorRT Error] ${output.trim()}`);
            });

            this.serverProcess.on('close', (code) => {
                console.log(`TensorRT process exited with code ${code}`);
                if (!hasStarted) {
                    reject(new Error(`TensorRT failed to start: ${startupOutput}`));
                }
            });

            setTimeout(() => {
                if (!hasStarted) {
                    reject(new Error('TensorRT startup timeout'));
                }
            }, 30000);
        });
    }

    async initializeTransformers() {
        return new Promise((resolve, reject) => {
            const pythonPath = process.env.PYTHON_PATH || 
                              process.env.CONDA_PREFIX ? `${process.env.CONDA_PREFIX}/bin/python` :
                              'python3';
            const wrapperPath = path.join(__dirname, '../../scripts/transformers-server.py');
            
            // Create Transformers server script if it doesn't exist
            this.createTransformersServer();
            
            const args = [
                wrapperPath,
                '--model', this.modelName,
                '--host', '127.0.0.1',
                '--port', '8000',
                '--device', this.device,
                '--dtype', this.dtype,
                '--max-length', this.maxModelLen.toString()
            ];

            if (this.modelPath) {
                args.push('--model-path', this.modelPath);
            }

            console.log(`🚀 Starting Transformers server with CUDA acceleration...`);
            
            this.serverProcess = spawn(pythonPath, args, {
                stdio: ['ignore', 'pipe', 'pipe'],
                env: { 
                    ...process.env,
                    CUDA_VISIBLE_DEVICES: process.env.CUDA_VISIBLE_DEVICES || '0',
                    TRANSFORMERS_CACHE: path.join(process.cwd(), 'models'),
                    HF_HOME: path.join(process.cwd(), 'models')
                }
            });

            let startupOutput = '';
            let hasStarted = false;

            this.serverProcess.stdout.on('data', (data) => {
                const output = data.toString();
                startupOutput += output;
                console.log(`[Transformers] ${output.trim()}`);

                if (!hasStarted && (output.includes('Server ready') || output.includes('Model loaded'))) {
                    hasStarted = true;
                    setTimeout(() => resolve(), 2000);
                }
            });

            this.serverProcess.stderr.on('data', (data) => {
                const output = data.toString();
                console.error(`[Transformers Error] ${output.trim()}`);
            });

            this.serverProcess.on('close', (code) => {
                console.log(`Transformers process exited with code ${code}`);
                if (!hasStarted) {
                    reject(new Error(`Transformers server failed to start: ${startupOutput}`));
                }
            });

            setTimeout(() => {
                if (!hasStarted) {
                    reject(new Error('Transformers server startup timeout'));
                }
            }, 30000);
        });
    }

    createTensorRTServer() {
        const serverPath = path.join(__dirname, '../../scripts/tensorrt-server.py');
        if (fs.existsSync(serverPath)) return;
        
        const serverCode = `#!/usr/bin/env python3
"""
TensorRT-LLM server for gpt-oss models on Windows
"""
import argparse
import asyncio
import json
from typing import AsyncGenerator, Dict, Any
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from tensorrt_llm import LLM, SamplingParams
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
llm_instance = None

async def initialize_model(model_name: str, **kwargs):
    global llm_instance
    try:
        logger.info(f"Initializing TensorRT-LLM with model: {model_name}")
        llm_instance = LLM(model=model_name, **kwargs)
        logger.info("TensorRT-LLM model initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize model: {e}")
        return False

@app.post("/v1/chat/completions")
async def chat_completions(request: dict):
    if llm_instance is None:
        raise HTTPException(status_code=503, detail="Model not initialized")
    
    try:
        messages = request.get("messages", [])
        if not messages:
            raise HTTPException(status_code=400, detail="No messages provided")
        
        # Format prompt from messages
        prompt = ""
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "system":
                prompt += f"System: {content}\\n"
            elif role == "user":
                prompt += f"User: {content}\\n"
            elif role == "assistant":
                prompt += f"Assistant: {content}\\n"
        
        prompt += "Assistant: "
        
        # Sampling parameters
        sampling_params = SamplingParams(
            temperature=request.get("temperature", 0.7),
            top_p=request.get("top_p", 0.9),
            max_tokens=request.get("max_tokens", 1024),
        )
        
        # Generate
        outputs = llm_instance.generate([prompt], sampling_params)
        generated_text = outputs[0].outputs[0].text
        
        return {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": generated_text
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": len(prompt.split()),
                "completion_tokens": len(generated_text.split()),
                "total_tokens": len(prompt.split()) + len(generated_text.split())
            }
        }
        
    except Exception as e:
        logger.error(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "healthy", "backend": "tensorrt-llm"}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="gpt-oss-20b")
    parser.add_argument("--model-path", default=None)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--max-model-len", type=int, default=4096)
    parser.add_argument("--dtype", default="auto")
    
    args = parser.parse_args()
    
    # Initialize model
    model_kwargs = {}
    if args.model_path:
        model_kwargs["model_path"] = args.model_path
    if args.max_model_len:
        model_kwargs["max_model_len"] = args.max_model_len
    if args.dtype != "auto":
        model_kwargs["dtype"] = args.dtype
    
    success = asyncio.run(initialize_model(args.model, **model_kwargs))
    if not success:
        print("Failed to initialize model")
        return
    
    print(f"TensorRT-LLM server ready on {args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port)

if __name__ == "__main__":
    main()
`;
        
        fs.writeFileSync(serverPath, serverCode);
    }

    createTransformersServer() {
        const serverPath = path.join(__dirname, '../../scripts/transformers-server.py');
        if (fs.existsSync(serverPath)) return;
        
        const serverCode = `#!/usr/bin/env python3
"""
Transformers server for gpt-oss models on Windows with CUDA acceleration
"""
import argparse
import json
import logging
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from fastapi import FastAPI, HTTPException
import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
model = None
tokenizer = None
pipe = None

def initialize_model(model_name: str, model_path: str = None, device: str = "cuda", dtype: str = "auto"):
    global model, tokenizer, pipe
    try:
        logger.info(f"Initializing Transformers with model: {model_name}")
        logger.info(f"Using device: {device}")
        
        # Determine model path
        model_id = model_path if model_path else model_name
        if model_path and not model_path.startswith(('/', 'C:')):
            model_id = f"./models/{model_name}"
        
        # Set torch dtype
        if dtype == "auto":
            torch_dtype = torch.bfloat16 if torch.cuda.is_available() else torch.float32
        else:
            torch_dtype = getattr(torch, dtype)
        
        logger.info(f"Loading model from: {model_id}")
        logger.info(f"Using dtype: {torch_dtype}")
        
        # Create pipeline for better Windows compatibility
        pipe = pipeline(
            "text-generation",
            model=model_id,
            torch_dtype=torch_dtype,
            device_map="auto" if device == "cuda" else device,
            trust_remote_code=True,
            model_kwargs={
                "low_cpu_mem_usage": True,
                "use_cache": True
            }
        )
        
        logger.info("Transformers model initialized successfully")
        print("Model loaded successfully - Server ready")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize model: {e}")
        print(f"Model initialization failed: {e}")
        return False

@app.post("/v1/chat/completions")
async def chat_completions(request: dict):
    if pipe is None:
        raise HTTPException(status_code=503, detail="Model not initialized")
    
    try:
        messages = request.get("messages", [])
        if not messages:
            raise HTTPException(status_code=400, detail="No messages provided")
        
        # Use the chat template for proper formatting
        prompt = pipe.tokenizer.apply_chat_template(
            messages, 
            tokenize=False, 
            add_generation_prompt=True
        )
        
        # Generation parameters
        generation_args = {
            "max_new_tokens": request.get("max_tokens", 1024),
            "temperature": request.get("temperature", 0.7),
            "top_p": request.get("top_p", 0.9),
            "do_sample": True,
            "pad_token_id": pipe.tokenizer.eos_token_id,
            "return_full_text": False
        }
        
        # Generate
        outputs = pipe(prompt, **generation_args)
        generated_text = outputs[0]["generated_text"]
        
        return {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": generated_text
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": len(prompt.split()),
                "completion_tokens": len(generated_text.split()),
                "total_tokens": len(prompt.split()) + len(generated_text.split())
            }
        }
        
    except Exception as e:
        logger.error(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "healthy", "backend": "transformers"}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="gpt-oss-20b")
    parser.add_argument("--model-path", default=None)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--device", default="cuda")
    parser.add_argument("--dtype", default="auto")
    parser.add_argument("--max-length", type=int, default=4096)
    
    args = parser.parse_args()
    
    success = initialize_model(args.model, args.model_path, args.device, args.dtype)
    if not success:
        exit(1)
    
    print(f"Transformers server ready on {args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port)

if __name__ == "__main__":
    main()
`;
        
        fs.writeFileSync(serverPath, serverCode);
    }

    // Rest of the methods remain the same as the original interface
    async generate(prompt, options = {}) {
        if (!this.isInitialized) {
            throw new Error('Model not initialized. Call initialize() first.');
        }

        const requestId = Date.now().toString();
        const startTime = Date.now();
        
        this.stats.totalRequests++;
        
        const requestData = {
            model: 'gpt-oss-20b',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful AI assistant that provides detailed reasoning. Use <analysis> tags for your raw thinking and <final> tags for your polished response.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 1024,
            top_p: options.topP || 0.9,
            stream: options.stream || false
        };

        try {
            const response = await this.makeRequest('/v1/chat/completions', requestData);
            
            const latency = Date.now() - startTime;
            this.stats.completedRequests++;
            this.stats.averageLatency = (this.stats.averageLatency * (this.stats.completedRequests - 1) + latency) / this.stats.completedRequests;
            
            if (response.usage) {
                this.stats.totalTokens += response.usage.total_tokens;
            }

            return response;
            
        } catch (error) {
            this.stats.failedRequests++;
            console.error(`Generation failed for request ${requestId}:`, error.message);
            throw error;
        }
    }

    async *generateStream(prompt, options = {}) {
        // Stream generation implementation
        // Similar to original but adapted for both backends
        const requestData = {
            model: 'gpt-oss-20b',
            messages: [
                {
                    role: 'system', 
                    content: 'You are a helpful AI assistant that provides detailed reasoning. Use <analysis> tags for your raw thinking and <final> tags for your polished response.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 1024,
            top_p: options.topP || 0.9,
            stream: true
        };

        try {
            const response = await fetch('http://127.0.0.1:8000/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') {
                                return;
                            }

                            try {
                                const parsed = JSON.parse(data);
                                if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                                    yield parsed.choices[0].delta;
                                }
                            } catch (e) {
                                // Skip invalid JSON
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }

        } catch (error) {
            console.error('Stream generation error:', error);
            throw error;
        }
    }

    async makeRequest(endpoint, data) {
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch(`http://127.0.0.1:8000${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Request failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    getModelInfo() {
        return {
            name: this.modelName,
            path: this.modelPath,
            initialized: this.isInitialized,
            backend: this.backend,
            config: {
                device: this.device,
                dtype: this.dtype,
                maxModelLen: this.maxModelLen
            }
        };
    }

    getStats() {
        return { ...this.stats };
    }

    async shutdown() {
        if (this.serverProcess) {
            console.log(`🔄 Shutting down ${this.backend} server...`);
            this.serverProcess.kill('SIGTERM');
            
            setTimeout(() => {
                if (this.serverProcess) {
                    this.serverProcess.kill('SIGKILL');
                }
            }, 5000);
        }
        
        this.isInitialized = false;
    }
}

module.exports = GPTOssWindowsInterface;