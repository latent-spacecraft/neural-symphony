const EventEmitter = require('events');

class RealTimeHandler extends EventEmitter {
    constructor(wss) {
        super();
        this.wss = wss;
        this.clients = new Map();
        this.rooms = new Map();
        this.reasoningSessions = new Map();
        
        this.messageTypes = {
            // Client -> Server
            JOIN_ROOM: 'join_room',
            START_REASONING: 'start_reasoning',
            UPDATE_CONTROLS: 'update_controls',
            PAUSE_REASONING: 'pause_reasoning',
            RESUME_REASONING: 'resume_reasoning',
            STOP_REASONING: 'stop_reasoning',
            
            // Server -> Client
            REASONING_CHUNK: 'reasoning_chunk',
            REASONING_COMPLETE: 'reasoning_complete',
            REASONING_ERROR: 'reasoning_error',
            EXPERT_ACTIVITY: 'expert_activity',
            CONTROLS_UPDATED: 'controls_updated',
            CLIENT_COUNT: 'client_count',
            SYSTEM_STATUS: 'system_status'
        };
    }

    handleConnection(ws) {
        const clientId = this.generateClientId();
        const client = {
            id: clientId,
            ws: ws,
            room: null,
            isActive: true,
            connectedAt: Date.now(),
            lastActivity: Date.now()
        };
        
        this.clients.set(clientId, client);
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleMessage(clientId, message);
            } catch (error) {
                console.error(`Invalid message from client ${clientId}:`, error);
                this.sendToClient(clientId, {
                    type: 'error',
                    error: 'Invalid message format'
                });
            }
        });
        
        ws.on('close', () => {
            this.handleDisconnection(clientId);
        });
        
        ws.on('error', (error) => {
            console.error(`WebSocket error for client ${clientId}:`, error);
            this.handleDisconnection(clientId);
        });
        
        this.sendToClient(clientId, {
            type: 'connection_established',
            clientId: clientId,
            timestamp: Date.now()
        });
        
        console.log(`🔌 Client ${clientId} connected`);
        this.broadcastSystemStatus();
    }

    handleMessage(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || !client.isActive) {
            return;
        }
        
        client.lastActivity = Date.now();
        
        switch (message.type) {
            case this.messageTypes.JOIN_ROOM:
                this.handleJoinRoom(clientId, message.room || 'default');
                break;
                
            case this.messageTypes.START_REASONING:
                this.handleStartReasoning(clientId, message);
                break;
                
            case this.messageTypes.UPDATE_CONTROLS:
                this.handleUpdateControls(clientId, message);
                break;
                
            case this.messageTypes.PAUSE_REASONING:
                this.handlePauseReasoning(clientId, message);
                break;
                
            case this.messageTypes.RESUME_REASONING:
                this.handleResumeReasoning(clientId, message);
                break;
                
            case this.messageTypes.STOP_REASONING:
                this.handleStopReasoning(clientId, message);
                break;
                
            default:
                console.warn(`Unknown message type from client ${clientId}:`, message.type);
        }
    }

    handleJoinRoom(clientId, roomName) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        if (client.room) {
            this.removeClientFromRoom(clientId, client.room);
        }
        
        if (!this.rooms.has(roomName)) {
            this.rooms.set(roomName, {
                name: roomName,
                clients: new Set(),
                createdAt: Date.now(),
                activeReasoningSessions: new Map(),
                controlState: this.getDefaultControlState()
            });
        }
        
        const room = this.rooms.get(roomName);
        room.clients.add(clientId);
        client.room = roomName;
        
        this.sendToClient(clientId, {
            type: 'joined_room',
            room: roomName,
            controlState: room.controlState,
            clientCount: room.clients.size
        });
        
        this.broadcastToRoom(roomName, {
            type: this.messageTypes.CLIENT_COUNT,
            count: room.clients.size
        });
        
        console.log(`👥 Client ${clientId} joined room ${roomName}`);
    }

    handleStartReasoning(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || !client.room) return;
        
        const room = this.rooms.get(client.room);
        if (!room) return;
        
        const sessionId = this.generateSessionId();
        const session = {
            id: sessionId,
            clientId: clientId,
            room: client.room,
            prompt: message.prompt,
            config: message.config || {},
            startTime: Date.now(),
            status: 'active',
            chunkCount: 0
        };
        
        this.reasoningSessions.set(sessionId, session);
        room.activeReasoningSessions.set(sessionId, session);
        
        this.broadcastToRoom(client.room, {
            type: 'reasoning_session_started',
            sessionId: sessionId,
            prompt: message.prompt,
            config: message.config
        });
        
        this.emit('startReasoning', {
            sessionId,
            prompt: message.prompt,
            config: message.config,
            onChunk: (chunk) => this.handleReasoningChunk(sessionId, chunk),
            onComplete: (result) => this.handleReasoningComplete(sessionId, result),
            onError: (error) => this.handleReasoningError(sessionId, error)
        });
        
        console.log(`🧠 Started reasoning session ${sessionId} for client ${clientId}`);
    }

    handleUpdateControls(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || !client.room) return;
        
        const room = this.rooms.get(client.room);
        if (!room) return;
        
        const updates = message.controls || {};
        
        Object.assign(room.controlState, updates);
        
        this.broadcastToRoom(client.room, {
            type: this.messageTypes.CONTROLS_UPDATED,
            controls: room.controlState,
            updatedBy: clientId
        }, clientId);
        
        console.log(`🎛️  Controls updated in room ${client.room} by client ${clientId}`);
    }

    handlePauseReasoning(clientId, message) {
        const session = this.reasoningSessions.get(message.sessionId);
        if (!session || session.clientId !== clientId) return;
        
        session.status = 'paused';
        session.pausedAt = Date.now();
        
        this.broadcastToRoom(session.room, {
            type: 'reasoning_session_paused',
            sessionId: message.sessionId
        });
        
        this.emit('pauseReasoning', { sessionId: message.sessionId });
        
        console.log(`⏸️  Paused reasoning session ${message.sessionId}`);
    }

    handleResumeReasoning(clientId, message) {
        const session = this.reasoningSessions.get(message.sessionId);
        if (!session || session.clientId !== clientId) return;
        
        session.status = 'active';
        delete session.pausedAt;
        
        this.broadcastToRoom(session.room, {
            type: 'reasoning_session_resumed',
            sessionId: message.sessionId
        });
        
        this.emit('resumeReasoning', { sessionId: message.sessionId });
        
        console.log(`▶️  Resumed reasoning session ${message.sessionId}`);
    }

    handleStopReasoning(clientId, message) {
        const session = this.reasoningSessions.get(message.sessionId);
        if (!session || session.clientId !== clientId) return;
        
        this.cleanupReasoningSession(message.sessionId);
        
        this.emit('stopReasoning', { sessionId: message.sessionId });
        
        console.log(`⏹️  Stopped reasoning session ${message.sessionId}`);
    }

    handleReasoningChunk(sessionId, chunk) {
        const session = this.reasoningSessions.get(sessionId);
        if (!session || session.status !== 'active') return;
        
        session.chunkCount++;
        session.lastChunkAt = Date.now();
        
        this.broadcastToRoom(session.room, {
            type: this.messageTypes.REASONING_CHUNK,
            sessionId: sessionId,
            chunk: chunk,
            metadata: {
                chunkCount: session.chunkCount,
                elapsedTime: Date.now() - session.startTime
            }
        });
        
        if (chunk.parsed && chunk.parsed.expertActivity) {
            this.broadcastToRoom(session.room, {
                type: this.messageTypes.EXPERT_ACTIVITY,
                sessionId: sessionId,
                activity: chunk.parsed.expertActivity
            });
        }
    }

    handleReasoningComplete(sessionId, result) {
        const session = this.reasoningSessions.get(sessionId);
        if (!session) return;
        
        session.status = 'completed';
        session.completedAt = Date.now();
        session.result = result;
        
        this.broadcastToRoom(session.room, {
            type: this.messageTypes.REASONING_COMPLETE,
            sessionId: sessionId,
            result: result,
            metadata: {
                totalTime: session.completedAt - session.startTime,
                totalChunks: session.chunkCount
            }
        });
        
        setTimeout(() => this.cleanupReasoningSession(sessionId), 60000);
        
        console.log(`✅ Reasoning session ${sessionId} completed`);
    }

    handleReasoningError(sessionId, error) {
        const session = this.reasoningSessions.get(sessionId);
        if (!session) return;
        
        session.status = 'error';
        session.errorAt = Date.now();
        session.error = error;
        
        this.broadcastToRoom(session.room, {
            type: this.messageTypes.REASONING_ERROR,
            sessionId: sessionId,
            error: {
                message: error.message,
                code: error.code || 'REASONING_ERROR'
            }
        });
        
        setTimeout(() => this.cleanupReasoningSession(sessionId), 5000);
        
        console.error(`❌ Reasoning session ${sessionId} failed:`, error.message);
    }

    handleDisconnection(clientId) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        client.isActive = false;
        
        if (client.room) {
            this.removeClientFromRoom(clientId, client.room);
        }
        
        const activeSessions = Array.from(this.reasoningSessions.values())
            .filter(session => session.clientId === clientId && session.status === 'active');
        
        for (const session of activeSessions) {
            this.cleanupReasoningSession(session.id);
        }
        
        this.clients.delete(clientId);
        
        console.log(`🔌 Client ${clientId} disconnected`);
        this.broadcastSystemStatus();
    }

    removeClientFromRoom(clientId, roomName) {
        const room = this.rooms.get(roomName);
        if (!room) return;
        
        room.clients.delete(clientId);
        
        this.broadcastToRoom(roomName, {
            type: this.messageTypes.CLIENT_COUNT,
            count: room.clients.size
        });
        
        if (room.clients.size === 0) {
            this.rooms.delete(roomName);
            console.log(`🏠 Room ${roomName} deleted (no clients)`);
        }
    }

    cleanupReasoningSession(sessionId) {
        const session = this.reasoningSessions.get(sessionId);
        if (!session) return;
        
        const room = this.rooms.get(session.room);
        if (room) {
            room.activeReasoningSessions.delete(sessionId);
            
            this.broadcastToRoom(session.room, {
                type: 'reasoning_session_ended',
                sessionId: sessionId
            });
        }
        
        this.reasoningSessions.delete(sessionId);
    }

    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || !client.isActive) return;
        
        try {
            client.ws.send(JSON.stringify({
                ...message,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error(`Failed to send message to client ${clientId}:`, error);
            this.handleDisconnection(clientId);
        }
    }

    broadcastToRoom(roomName, message, excludeClientId = null) {
        const room = this.rooms.get(roomName);
        if (!room) return;
        
        for (const clientId of room.clients) {
            if (clientId !== excludeClientId) {
                this.sendToClient(clientId, message);
            }
        }
    }

    broadcastSystemStatus() {
        const status = {
            type: this.messageTypes.SYSTEM_STATUS,
            totalClients: this.clients.size,
            activeClients: Array.from(this.clients.values()).filter(c => c.isActive).length,
            totalRooms: this.rooms.size,
            activeReasoningSessions: this.reasoningSessions.size
        };
        
        for (const client of this.clients.values()) {
            if (client.isActive) {
                this.sendToClient(client.id, status);
            }
        }
    }

    getDefaultControlState() {
        return {
            reasoningEffort: 0.7,
            expertBias: {
                math: 0.5,
                creative: 0.5,
                logic: 0.5,
                analysis: 0.5
            },
            speedQualityMixer: 0.6,
            channelBlend: 0.5,
            problemComplexity: 'auto',
            parallelTracks: false,
            temperature: 0.7,
            maxTokens: 1024
        };
    }

    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    getStats() {
        return {
            totalClients: this.clients.size,
            activeClients: Array.from(this.clients.values()).filter(c => c.isActive).length,
            totalRooms: this.rooms.size,
            activeReasoningSessions: this.reasoningSessions.size,
            rooms: Array.from(this.rooms.values()).map(room => ({
                name: room.name,
                clients: room.clients.size,
                activeSessions: room.activeReasoningSessions.size
            }))
        };
    }
}

module.exports = RealTimeHandler;