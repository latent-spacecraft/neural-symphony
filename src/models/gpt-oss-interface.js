const { spawn } = require('child_process');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class GPTOssInterface extends EventEmitter {
    constructor(config = {}) {
        super();
        this.modelName = config.modelName || process.env.MODEL_NAME || 'gpt-oss-20b';
        this.modelPath = config.modelPath || process.env.MODEL_PATH;
        this.gpuMemoryUtilization = config.gpuMemoryUtilization || process.env.VLLM_GPU_MEMORY_UTILIZATION || 0.95;
        this.maxModelLen = config.maxModelLen || process.env.VLLM_MAX_MODEL_LEN || 4096;
        this.tensorParallelSize = config.tensorParallelSize || process.env.VLLM_TENSOR_PARALLEL_SIZE || 1;
        
        this.isInitialized = false;
        this.isStreaming = false;
        this.requestQueue = [];
        this.activeRequests = new Map();
        
        this.stats = {
            totalRequests: 0,
            completedRequests: 0,
            failedRequests: 0,
            averageLatency: 0,
            totalTokens: 0
        };
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        console.log(`🔄 Initializing GPT-oss-20b model...`);
        console.log(`📍 Model: ${this.modelName}`);
        
        try {
            if (!await this.checkModelAvailability()) {
                throw new Error(`Model ${this.modelName} not found. Please ensure it's downloaded.`);
            }

            await this.startVLLMServer();
            this.isInitialized = true;
            console.log(`✅ GPT-oss-20b model initialized successfully`);
            
        } catch (error) {
            console.error(`❌ Failed to initialize model:`, error.message);
            throw error;
        }
    }

    async checkModelAvailability() {
        try {
            if (this.modelPath && fs.existsSync(this.modelPath)) {
                return true;
            }
            
            const { exec } = require('child_process');
            return new Promise((resolve) => {
                exec(`huggingface-cli scan-cache | grep -q "${this.modelName}"`, (error) => {
                    resolve(!error);
                });
            });
        } catch {
            return false;
        }
    }

    async startVLLMServer() {
        return new Promise((resolve, reject) => {
            const vllmArgs = [
                '--model', this.modelName,
                '--gpu-memory-utilization', this.gpuMemoryUtilization.toString(),
                '--max-model-len', this.maxModelLen.toString(),
                '--tensor-parallel-size', this.tensorParallelSize.toString(),
                '--host', '127.0.0.1',
                '--port', '8000',
                '--api-key', 'neural-symphony-key',
                '--served-model-name', 'gpt-oss-20b'
            ];

            if (this.modelPath) {
                vllmArgs[1] = this.modelPath;
            }

            console.log(`🚀 Starting vLLM server with args:`, vllmArgs);
            
            // Use the correct Python path from the environment or system defaults
            const pythonPath = process.env.PYTHON_PATH || 
                              process.env.CONDA_PREFIX ? `${process.env.CONDA_PREFIX}/bin/python` :
                              'python3';
            
            console.log(`🐍 Using Python: ${pythonPath}`);
            console.log(`🔧 Using Windows vLLM wrapper for compatibility`);
            
            // Use Windows wrapper to handle uvloop compatibility
            const wrapperPath = path.join(__dirname, '../../scripts/vllm-windows-wrapper.py');
            
            this.vllmProcess = spawn(pythonPath, [wrapperPath, ...vllmArgs], {
                stdio: ['ignore', 'pipe', 'pipe'],
                env: { 
                    ...process.env,
                    CUDA_VISIBLE_DEVICES: process.env.CUDA_VISIBLE_DEVICES || '0',
                    // Disable uvloop for Windows compatibility
                    VLLM_USE_UVLOOP: 'false',
                    VLLM_UVLOOP_DISABLED: '1'
                }
            });

            let startupOutput = '';
            let hasStarted = false;

            this.vllmProcess.stdout.on('data', (data) => {
                const output = data.toString();
                startupOutput += output;
                console.log(`[vLLM] ${output.trim()}`);

                if (!hasStarted && (output.includes('Uvicorn running') || output.includes('Application startup complete'))) {
                    hasStarted = true;
                    setTimeout(() => resolve(), 2000);
                }
            });

            this.vllmProcess.stderr.on('data', (data) => {
                const output = data.toString();
                console.error(`[vLLM Error] ${output.trim()}`);
            });

            this.vllmProcess.on('close', (code) => {
                console.log(`vLLM process exited with code ${code}`);
                if (!hasStarted) {
                    reject(new Error(`vLLM failed to start: ${startupOutput}`));
                }
            });

            setTimeout(() => {
                if (!hasStarted) {
                    reject(new Error('vLLM startup timeout'));
                }
            }, 30000);
        });
    }

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
            stream: options.stream || false,
            extra_body: {
                guided_decoding_backend: 'lm-format-enforcer',
                guided_regex: options.guidedRegex || null
            }
        };

        try {
            const response = await this.makeVLLMRequest('/v1/chat/completions', requestData);
            
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
        if (!this.isInitialized) {
            throw new Error('Model not initialized. Call initialize() first.');
        }

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
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer neural-symphony-key'
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
                    const lines = chunk.split('\n');

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

    async makeVLLMRequest(endpoint, data) {
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch(`http://127.0.0.1:8000${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer neural-symphony-key'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`vLLM request failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    getModelInfo() {
        return {
            name: this.modelName,
            path: this.modelPath,
            initialized: this.isInitialized,
            config: {
                gpuMemoryUtilization: this.gpuMemoryUtilization,
                maxModelLen: this.maxModelLen,
                tensorParallelSize: this.tensorParallelSize
            }
        };
    }

    getStats() {
        return { ...this.stats };
    }

    async shutdown() {
        if (this.vllmProcess) {
            console.log('🔄 Shutting down vLLM server...');
            this.vllmProcess.kill('SIGTERM');
            
            setTimeout(() => {
                if (this.vllmProcess) {
                    this.vllmProcess.kill('SIGKILL');
                }
            }, 5000);
        }
        
        this.isInitialized = false;
    }
}

module.exports = GPTOssInterface;