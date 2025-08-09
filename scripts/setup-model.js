const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const readline = require('readline');

class ModelSetup {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        this.modelName = 'openai/gpt-oss-20b';
        this.vllmInstalled = false;
        this.modelDownloaded = false;
        this.condaEnvCreated = false;
    }

    async setup() {
        console.log('🎼 Neural Symphony Model Setup');
        console.log('=' * 50);
        
        try {
            await this.checkSystemRequirements();
            await this.setupCondaEnvironment();
            await this.installDependencies();
            await this.downloadModel();
            await this.testModelLoading();
            
            console.log('\n✅ Setup completed successfully!');
            console.log('\n🚀 To start the server:');
            console.log('   conda activate neural-symphony');
            console.log('   npm run dev');
            
        } catch (error) {
            console.error('\n❌ Setup failed:', error.message);
            process.exit(1);
        } finally {
            this.rl.close();
        }
    }

    async checkSystemRequirements() {
        console.log('\n🔍 Checking system requirements...');
        
        const requirements = [
            { name: 'CUDA', check: () => this.checkCUDA() },
            { name: 'Python', check: () => this.checkPython() },
            { name: 'Node.js', check: () => this.checkNode() },
            { name: 'GPU Memory', check: () => this.checkGPUMemory() }
        ];
        
        for (const req of requirements) {
            process.stdout.write(`  Checking ${req.name}... `);
            try {
                await req.check();
                console.log('✅');
            } catch (error) {
                console.log('❌');
                throw new Error(`${req.name} requirement not met: ${error.message}`);
            }
        }
    }

    async checkCUDA() {
        return new Promise((resolve, reject) => {
            exec('nvidia-smi', (error, stdout) => {
                if (error) {
                    reject(new Error('CUDA/nvidia-smi not found. Please install CUDA 12.x'));
                    return;
                }
                
                if (!stdout.includes('CUDA Version')) {
                    reject(new Error('CUDA version not detected'));
                    return;
                }
                
                resolve();
            });
        });
    }

    async checkPython() {
        return new Promise((resolve, reject) => {
            exec('python3 --version', (error, stdout) => {
                if (error) {
                    reject(new Error('Python 3 not found. Please install Python 3.8+'));
                    return;
                }
                
                const version = stdout.match(/Python 3\.(\d+)/);
                if (!version || parseInt(version[1]) < 8) {
                    reject(new Error('Python 3.8+ required'));
                    return;
                }
                
                resolve();
            });
        });
    }

    async checkNode() {
        return new Promise((resolve, reject) => {
            exec('node --version', (error, stdout) => {
                if (error) {
                    reject(new Error('Node.js not found. Please install Node.js 18+'));
                    return;
                }
                
                const version = stdout.match(/v(\d+)/);
                if (!version || parseInt(version[1]) < 18) {
                    reject(new Error('Node.js 18+ required'));
                    return;
                }
                
                resolve();
            });
        });
    }

    async checkGPUMemory() {
        return new Promise((resolve, reject) => {
            exec('nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits', (error, stdout) => {
                if (error) {
                    reject(new Error('Could not check GPU memory'));
                    return;
                }
                
                const memoryMB = parseInt(stdout.trim());
                const memoryGB = memoryMB / 1024;
                
                if (memoryGB < 15) {
                    reject(new Error(`GPU has ${memoryGB.toFixed(1)}GB, but 16GB+ required for gpt-oss-20b`));
                    return;
                }
                
                console.log(`(${memoryGB.toFixed(1)}GB available)`);
                resolve();
            });
        });
    }

    async setupCondaEnvironment() {
        console.log('\n🐍 Setting up Conda environment...');
        
        const envExists = await this.checkCondaEnvExists();
        
        if (envExists) {
            const recreate = await this.ask('Conda environment "neural-symphony" already exists. Recreate? (y/n): ');
            if (recreate.toLowerCase() === 'y') {
                await this.runCommand('conda', ['env', 'remove', '-n', 'neural-symphony', '-y']);
            } else {
                this.condaEnvCreated = true;
                return;
            }
        }
        
        console.log('  Creating conda environment...');
        await this.runCommand('conda', [
            'create', '-n', 'neural-symphony', 
            'python=3.10', 'pytorch', 'pytorch-cuda=12.1', 
            '-c', 'pytorch', '-c', 'nvidia', '-y'
        ]);
        
        this.condaEnvCreated = true;
        console.log('✅ Conda environment created');
    }

    async installDependencies() {
        console.log('\n📦 Installing dependencies...');
        
        console.log('  Installing Python packages...');
        await this.runCondaCommand('pip', [
            'install', 'vllm', 'transformers', 'torch', 'accelerate',
            'huggingface-hub', 'sentencepiece', 'protobuf'
        ]);
        
        console.log('  Installing Node.js packages...');
        await this.runCommand('npm', ['install']);
        
        this.vllmInstalled = true;
        console.log('✅ Dependencies installed');
    }

    async downloadModel() {
        console.log('\n🧠 Checking model availability...');
        
        const modelExists = await this.checkModelExists();
        
        if (modelExists) {
            console.log('✅ Model already downloaded');
            this.modelDownloaded = true;
            return;
        }
        
        console.log(`  Downloading ${this.modelName}...`);
        console.log('  This may take a while (model is ~40GB)...');
        
        try {
            await this.runCondaCommand('huggingface-cli', [
                'download', this.modelName,
                '--local-dir', './models/gpt-oss-20b',
                '--local-dir-use-symlinks', 'False'
            ]);
            
            this.modelDownloaded = true;
            console.log('✅ Model downloaded successfully');
            
        } catch (error) {
            console.log('\n⚠️  Direct download failed, trying alternative method...');
            
            await this.runCondaCommand('python', ['-c', `
from transformers import AutoTokenizer, AutoModel
print("Downloading ${this.modelName}...")
tokenizer = AutoTokenizer.from_pretrained("${this.modelName}")
model = AutoModel.from_pretrained("${this.modelName}")
print("Download completed!")
            `]);
            
            this.modelDownloaded = true;
            console.log('✅ Model downloaded via Transformers');
        }
    }

    async testModelLoading() {
        console.log('\n🧪 Testing model loading...');
        
        const testScript = `
import sys
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

try:
    print("Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained("${this.modelName}")
    
    print("Loading model (this may take a few minutes)...")
    model = AutoModelForCausalLM.from_pretrained(
        "${this.modelName}",
        torch_dtype=torch.float16,
        device_map="auto",
        trust_remote_code=True
    )
    
    print("Testing generation...")
    inputs = tokenizer("Hello, how are you?", return_tensors="pt")
    
    with torch.no_grad():
        outputs = model.generate(
            inputs.input_ids,
            max_length=50,
            temperature=0.7,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id
        )
    
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    print(f"Test response: {response}")
    
    print("✅ Model loading test successful!")
    
except Exception as e:
    print(f"❌ Model loading test failed: {e}")
    sys.exit(1)
        `;
        
        fs.writeFileSync('/tmp/test_model.py', testScript);
        
        try {
            await this.runCondaCommand('python', ['/tmp/test_model.py']);
            console.log('✅ Model loading test passed');
        } catch (error) {
            throw new Error(`Model loading test failed: ${error.message}`);
        } finally {
            fs.unlinkSync('/tmp/test_model.py');
        }
    }

    async checkCondaEnvExists() {
        try {
            const result = await this.runCommand('conda', ['env', 'list'], { capture: true });
            return result.includes('neural-symphony');
        } catch {
            return false;
        }
    }

    async checkModelExists() {
        try {
            const result = await this.runCondaCommand('huggingface-cli', ['scan-cache'], { capture: true });
            return result.includes(this.modelName);
        } catch {
            return false;
        }
    }

    async runCommand(command, args, options = {}) {
        return new Promise((resolve, reject) => {
            const process = spawn(command, args, {
                stdio: options.capture ? 'pipe' : 'inherit',
                shell: true
            });
            
            let output = '';
            
            if (options.capture) {
                process.stdout.on('data', (data) => {
                    output += data.toString();
                });
                
                process.stderr.on('data', (data) => {
                    output += data.toString();
                });
            }
            
            process.on('close', (code) => {
                if (code === 0) {
                    resolve(output);
                } else {
                    reject(new Error(`Command failed with code ${code}`));
                }
            });
            
            process.on('error', (error) => {
                reject(error);
            });
        });
    }

    async runCondaCommand(command, args, options = {}) {
        const condaArgs = ['run', '-n', 'neural-symphony', command, ...args];
        return this.runCommand('conda', condaArgs, options);
    }

    async ask(question) {
        return new Promise((resolve) => {
            this.rl.question(question, resolve);
        });
    }
}

if (require.main === module) {
    const setup = new ModelSetup();
    setup.setup().catch(console.error);
}

module.exports = ModelSetup;