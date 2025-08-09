import { useState, useEffect, useRef, useCallback } from 'react';

export const useWebSocket = (url) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [clientCount, setClientCount] = useState(0);
  const [connectionError, setConnectionError] = useState(null);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  
  const connect = useCallback(() => {
    if (!url) return;
    
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('🔌 WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        
        // Join default room
        ws.send(JSON.stringify({
          type: 'join_room',
          room: 'main'
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
          
          // Handle specific message types
          switch (message.type) {
            case 'client_count':
              setClientCount(message.count);
              break;
              
            case 'system_status':
              setClientCount(message.totalClients);
              break;
              
            case 'connection_established':
              console.log(`✅ WebSocket client ID: ${message.clientId}`);
              break;
              
            case 'joined_room':
              console.log(`🏠 Joined room: ${message.room}`);
              setClientCount(message.clientCount);
              break;
              
            case 'reasoning_chunk':
              // Handled by useReasoningSession
              break;
              
            case 'reasoning_complete':
              console.log(`✅ Reasoning completed for session ${message.sessionId}`);
              break;
              
            case 'reasoning_error':
              console.error(`❌ Reasoning error for session ${message.sessionId}:`, message.error);
              break;
              
            case 'expert_activity':
              // Handled by ExpertHeatmap component
              break;
              
            case 'controls_updated':
              console.log('🎛️ Controls updated by another client');
              break;
              
            default:
              console.log('📨 Received message:', message.type);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000; // Exponential backoff
          console.log(`🔄 Attempting to reconnect in ${delay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          setConnectionError('Max reconnection attempts reached');
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection failed');
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionError(error.message);
    }
  }, [url]);
  
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);
  
  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        return false;
      }
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
      return false;
    }
  }, []);
  
  const sendReasoningRequest = useCallback((prompt, config = {}) => {
    return sendMessage({
      type: 'start_reasoning',
      prompt,
      config: {
        effort: 'medium',
        temperature: 0.7,
        maxTokens: 1024,
        expertBias: {},
        parallelTracks: false,
        streamResponse: true,
        ...config
      }
    });
  }, [sendMessage]);
  
  const pauseReasoning = useCallback((sessionId) => {
    return sendMessage({
      type: 'pause_reasoning',
      sessionId
    });
  }, [sendMessage]);
  
  const resumeReasoning = useCallback((sessionId) => {
    return sendMessage({
      type: 'resume_reasoning',
      sessionId
    });
  }, [sendMessage]);
  
  const stopReasoning = useCallback((sessionId) => {
    return sendMessage({
      type: 'stop_reasoning',
      sessionId
    });
  }, [sendMessage]);
  
  const updateControls = useCallback((controls) => {
    return sendMessage({
      type: 'update_controls',
      controls
    });
  }, [sendMessage]);
  
  // Initialize connection on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);
  
  return {
    isConnected,
    lastMessage,
    clientCount,
    connectionError,
    sendMessage,
    sendReasoningRequest,
    pauseReasoning,
    resumeReasoning,
    stopReasoning,
    updateControls,
    connect,
    disconnect
  };
};