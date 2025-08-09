const path = require('path');

class Config {
    constructor() {
        this.env = process.env.NODE_ENV || 'development';
        this.isDevelopment = this.env === 'development';
        this.isProduction = this.env === 'production';
        
        // Server configuration
        this.server = {
            port: parseInt(process.env.PORT) || 3001,
            wsPort: parseInt(process.env.WS_PORT) || 3002,
            host: process.env.HOST || '0.0.0.0'
        };
        
        // AI Backend configuration
        this.ai = {
            backendUrl: process.env.AI_BACKEND_URL || 'http://127.0.0.1:8000',
            modelName: process.env.MODEL_NAME || 'gpt-oss-20b',
            modelPath: process.env.MODEL_PATH || '/app/models/gpt-oss-20b',
            maxTokens: parseInt(process.env.MAX_TOKENS) || 2048,
            temperature: parseFloat(process.env.TEMPERATURE) || 0.7,
            topP: parseFloat(process.env.TOP_P) || 0.9
        };
        
        // CUDA configuration
        this.cuda = {
            visibleDevices: process.env.CUDA_VISIBLE_DEVICES || '0',
            memoryFraction: parseFloat(process.env.GPU_MEMORY_FRACTION) || 0.95
        };
        
        // Paths
        this.paths = {
            root: process.cwd(),
            models: process.env.MODELS_PATH || path.join(process.cwd(), 'models'),
            logs: process.env.LOG_PATH || path.join(process.cwd(), 'logs'),
            cache: process.env.CACHE_PATH || path.join(process.cwd(), '.cache'),
            frontend: path.join(process.cwd(), 'src', 'frontend', 'build')
        };
        
        // Logging configuration
        this.logging = {
            level: process.env.LOG_LEVEL || (this.isDevelopment ? 'debug' : 'info'),
            console: process.env.LOG_CONSOLE !== 'false',
            file: process.env.LOG_FILE !== 'false'
        };
        
        // CORS configuration
        this.cors = {
            origin: this.isDevelopment ? 
                ['http://localhost:3000', 'http://127.0.0.1:3000'] :
                process.env.CORS_ORIGIN?.split(',') || ['*'],
            credentials: true
        };
        
        // Rate limiting
        this.rateLimit = {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
            maxRequests: parseInt(process.env.RATE_LIMIT_MAX) || 100,
            enabled: process.env.RATE_LIMIT_ENABLED !== 'false'
        };
        
        // WebSocket configuration
        this.websocket = {
            heartbeatInterval: parseInt(process.env.WS_HEARTBEAT) || 30000,
            maxConnections: parseInt(process.env.WS_MAX_CONNECTIONS) || 100,
            compression: process.env.WS_COMPRESSION !== 'false'
        };
        
        // Demo configuration
        this.demos = {
            enabled: process.env.DEMOS_ENABLED !== 'false',
            path: path.join(process.cwd(), 'demos'),
            scenarios: [
                'climate-solution-demo',
                'creative-racing-demo', 
                'debugging-demo'
            ]
        };
        
        // Security configuration
        this.security = {
            apiKey: process.env.API_KEY || 'neural-symphony-key',
            encryptionKey: process.env.ENCRYPTION_KEY,
            sessionSecret: process.env.SESSION_SECRET || 'neural-symphony-secret',
            bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
        };
    }
    
    // Get configuration for specific module
    getServerConfig() {
        return {
            port: this.server.port,
            host: this.server.host,
            cors: this.cors,
            rateLimit: this.rateLimit,
            env: this.env
        };
    }
    
    getWebSocketConfig() {
        return {
            port: this.server.wsPort,
            host: this.server.host,
            heartbeatInterval: this.websocket.heartbeatInterval,
            maxConnections: this.websocket.maxConnections,
            compression: this.websocket.compression
        };
    }
    
    getAIConfig() {
        return {
            backendUrl: this.ai.backendUrl,
            modelName: this.ai.modelName,
            modelPath: this.ai.modelPath,
            defaultParams: {
                maxTokens: this.ai.maxTokens,
                temperature: this.ai.temperature,
                topP: this.ai.topP
            }
        };
    }
    
    // Environment checks
    isValidConfig() {
        const required = [
            'server.port',
            'ai.modelName'
        ];
        
        for (const key of required) {
            const value = this.getNestedValue(key);
            if (value === undefined || value === null) {
                console.error(`Missing required configuration: ${key}`);
                return false;
            }
        }
        
        return true;
    }
    
    getNestedValue(key) {
        return key.split('.').reduce((obj, k) => obj && obj[k], this);
    }
    
    // Print configuration summary
    printSummary() {
        console.log('🔧 Neural Symphony Configuration:');
        console.log(`   Environment: ${this.env}`);
        console.log(`   Server: ${this.server.host}:${this.server.port}`);
        console.log(`   WebSocket: ${this.server.host}:${this.server.wsPort}`);
        console.log(`   AI Backend: ${this.ai.backendUrl}`);
        console.log(`   Model: ${this.ai.modelName}`);
        console.log(`   Log Level: ${this.logging.level}`);
        console.log(`   CORS: ${JSON.stringify(this.cors.origin)}`);
    }
}

// Export singleton instance
module.exports = new Config();