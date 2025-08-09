const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
require('dotenv').config();

const ReasoningEngine = require('../api/reasoning-engine');
const RealTimeHandler = require('../websocket/real-time-handler');

class NeuralSymphonyServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });
        this.port = process.env.PORT || 3001;
        this.wsPort = process.env.WS_PORT || 3002;
        
        this.reasoningEngine = new ReasoningEngine();
        this.realTimeHandler = new RealTimeHandler(this.wss);
        
        this.setupReasoningEngineEvents();
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSockets();
    }

    setupMiddleware() {
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    connectSrc: ["'self'", `ws://localhost:${this.wsPort}`, `wss://localhost:${this.wsPort}`],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "blob:"]
                }
            }
        }));
        
        this.app.use(compression());
        this.app.use(cors({
            origin: process.env.NODE_ENV === 'production' 
                ? false 
                : true, // Allow all origins for WSL2 development
            credentials: true
        }));
        
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        if (process.env.NODE_ENV === 'production') {
            this.app.use(express.static(path.join(__dirname, '../frontend/build')));
        }
    }

    setupRoutes() {
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                model: this.reasoningEngine.getModelInfo(),
                uptime: process.uptime()
            });
        });

        this.app.post('/api/reason', async (req, res) => {
            try {
                const { prompt, config = {} } = req.body;
                
                if (!prompt) {
                    return res.status(400).json({ error: 'Prompt is required' });
                }

                const reasoningConfig = {
                    effort: config.effort || 'medium',
                    expertBias: config.expertBias || {},
                    temperature: config.temperature || 0.7,
                    maxTokens: config.maxTokens || 1024,
                    parallelTracks: config.parallelTracks || false,
                    streamResponse: config.streamResponse !== false
                };

                if (reasoningConfig.streamResponse) {
                    res.writeHead(200, {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                        'Access-Control-Allow-Origin': '*'
                    });

                    await this.reasoningEngine.streamReason(prompt, reasoningConfig, (chunk) => {
                        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
                    });

                    res.write('data: [DONE]\n\n');
                    res.end();
                } else {
                    const result = await this.reasoningEngine.reason(prompt, reasoningConfig);
                    res.json(result);
                }
            } catch (error) {
                console.error('Reasoning error:', error);
                res.status(500).json({ 
                    error: 'Internal server error', 
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined 
                });
            }
        });

        this.app.get('/api/model/info', (req, res) => {
            res.json(this.reasoningEngine.getModelInfo());
        });

        this.app.get('/api/model/stats', (req, res) => {
            res.json(this.reasoningEngine.getModelStats());
        });

        if (process.env.NODE_ENV === 'production') {
            this.app.get('*', (req, res) => {
                res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
            });
        }

        this.app.use((error, req, res, next) => {
            console.error('Unhandled error:', error);
            res.status(500).json({ 
                error: 'Internal server error',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        });
    }

    setupWebSockets() {
        this.wss.on('connection', (ws, req) => {
            console.log(`WebSocket client connected from ${req.socket.remoteAddress}`);
            this.realTimeHandler.handleConnection(ws);
            
            ws.on('close', () => {
                console.log('WebSocket client disconnected');
            });
        });
    }

    setupReasoningEngineEvents() {
        this.realTimeHandler.on('startReasoning', async (request) => {
            try {
                await this.reasoningEngine.streamReason(
                    request.prompt,
                    request.config,
                    request.onChunk
                );
            } catch (error) {
                request.onError(error);
            }
        });

        this.realTimeHandler.on('pauseReasoning', (request) => {
            console.log(`⏸️ Pause reasoning requested for session ${request.sessionId}`);
        });

        this.realTimeHandler.on('resumeReasoning', (request) => {
            console.log(`▶️ Resume reasoning requested for session ${request.sessionId}`);
        });

        this.realTimeHandler.on('stopReasoning', (request) => {
            console.log(`⏹️ Stop reasoning requested for session ${request.sessionId}`);
        });
    }

    async start() {
        try {
            await this.reasoningEngine.initialize();
            console.log('🧠 Reasoning engine initialized');
            
            this.server.listen(this.port, '0.0.0.0', () => {
                console.log(`🎼 Neural Symphony server running on port ${this.port}`);
                console.log(`🔌 WebSocket server ready on port ${this.port}`);
                console.log(`🚀 Ready to conduct AI reasoning!`);
            });
        } catch (error) {
            console.error('❌ Failed to start server:', error);
            process.exit(1);
        }
    }
}

if (require.main === module) {
    const server = new NeuralSymphonyServer();
    server.start().catch(console.error);
}

module.exports = NeuralSymphonyServer;