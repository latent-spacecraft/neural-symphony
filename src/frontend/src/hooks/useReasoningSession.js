import { useState, useEffect, useRef, useCallback } from 'react';

export const useReasoningSession = (sendMessage) => {
  const [activeSession, setActiveSession] = useState(null);
  const [reasoningHistory, setReasoningHistory] = useState([]);
  const [sessionStats, setSessionStats] = useState({
    totalSessions: 0,
    completedSessions: 0,
    averageLatency: 0
  });
  
  const sessionTimeoutRef = useRef(null);
  const performanceMonitorRef = useRef(null);
  
  const generateSessionId = useCallback(() => {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }, []);
  
  const startReasoning = useCallback((prompt, config = {}) => {
    if (!sendMessage) {
      console.error('WebSocket not available');
      return null;
    }
    
    const sessionId = generateSessionId();
    const startTime = Date.now();
    
    const session = {
      id: sessionId,
      prompt,
      config,
      status: 'starting',
      startTime,
      chunks: [],
      channels: {
        analysis: '',
        final: '',
        raw: ''
      },
      expertActivity: {},
      reasoning: {
        steps: [],
        complexity: 0
      },
      performance: {
        latency: 0,
        tokensPerSecond: 0,
        totalTokens: 0,
        chunkCount: 0
      }
    };
    
    setActiveSession(session);
    
    // Start performance monitoring
    performanceMonitorRef.current = setInterval(() => {
      setActiveSession(prev => {
        if (!prev || prev.status !== 'active') return prev;
        
        const elapsedTime = Date.now() - prev.startTime;
        const tokensPerSecond = prev.performance.totalTokens / (elapsedTime / 1000) || 0;
        
        return {
          ...prev,
          performance: {
            ...prev.performance,
            latency: elapsedTime,
            tokensPerSecond: Math.round(tokensPerSecond)
          }
        };
      });
    }, 500);
    
    // Set timeout for stalled sessions
    sessionTimeoutRef.current = setTimeout(() => {
      setActiveSession(prev => {
        if (prev && prev.id === sessionId && prev.status === 'starting') {
          return {
            ...prev,
            status: 'timeout',
            error: 'Session timed out - no response from server'
          };
        }
        return prev;
      });
    }, 30000); // 30 second timeout
    
    // Send reasoning request
    const success = sendMessage({
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
    
    if (success) {
      console.log(`🧠 Started reasoning session: ${sessionId}`);
      
      setSessionStats(prev => ({
        ...prev,
        totalSessions: prev.totalSessions + 1
      }));
    } else {
      setActiveSession(prev => ({
        ...prev,
        status: 'error',
        error: 'Failed to send reasoning request'
      }));
    }
    
    return sessionId;
  }, [sendMessage, generateSessionId]);
  
  const pauseReasoning = useCallback((sessionId) => {
    if (!sessionId || !sendMessage) return;
    
    setActiveSession(prev => {
      if (prev && prev.id === sessionId) {
        return {
          ...prev,
          status: 'paused',
          pausedAt: Date.now()
        };
      }
      return prev;
    });
    
    sendMessage({
      type: 'pause_reasoning',
      sessionId
    });
    
    console.log(`⏸️ Paused reasoning session: ${sessionId}`);
  }, [sendMessage]);
  
  const resumeReasoning = useCallback((sessionId) => {
    if (!sessionId || !sendMessage) return;
    
    setActiveSession(prev => {
      if (prev && prev.id === sessionId) {
        const pausedDuration = prev.pausedAt ? Date.now() - prev.pausedAt : 0;
        return {
          ...prev,
          status: 'active',
          pausedAt: undefined,
          pausedDuration: (prev.pausedDuration || 0) + pausedDuration
        };
      }
      return prev;
    });
    
    sendMessage({
      type: 'resume_reasoning',
      sessionId
    });
    
    console.log(`▶️ Resumed reasoning session: ${sessionId}`);
  }, [sendMessage]);
  
  const stopReasoning = useCallback((sessionId) => {
    if (!sessionId || !sendMessage) return;
    
    setActiveSession(prev => {
      if (prev && prev.id === sessionId) {
        const stoppedSession = {
          ...prev,
          status: 'stopped',
          stoppedAt: Date.now()
        };
        
        // Add to history
        setReasoningHistory(history => [stoppedSession, ...history.slice(0, 9)]);
        
        return null; // Clear active session
      }
      return prev;
    });
    
    // Clear timers
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }
    if (performanceMonitorRef.current) {
      clearInterval(performanceMonitorRef.current);
    }
    
    sendMessage({
      type: 'stop_reasoning',
      sessionId
    });
    
    console.log(`⏹️ Stopped reasoning session: ${sessionId}`);
  }, [sendMessage]);
  
  // Handle incoming WebSocket messages
  useEffect(() => {
    const handleMessage = (message) => {
      if (!message) return;
      
      switch (message.type) {
        case 'reasoning_session_started':
          setActiveSession(prev => {
            if (prev && prev.status === 'starting') {
              if (sessionTimeoutRef.current) {
                clearTimeout(sessionTimeoutRef.current);
              }
              return {
                ...prev,
                status: 'active',
                serverSessionId: message.sessionId
              };
            }
            return prev;
          });
          break;
          
        case 'reasoning_chunk':
          setActiveSession(prev => {
            if (!prev || prev.status !== 'active') return prev;
            
            const chunk = message.chunk;
            const newChunk = {
              id: chunk.chunkId,
              content: chunk.content,
              timestamp: chunk.timestamp,
              parsed: chunk.parsed
            };
            
            const updatedSession = {
              ...prev,
              chunks: [...prev.chunks, newChunk],
              performance: {
                ...prev.performance,
                chunkCount: prev.performance.chunkCount + 1,
                totalTokens: prev.performance.totalTokens + (chunk.content?.length || 0)
              }
            };
            
            // Update channels if parsed data is available
            if (chunk.parsed && chunk.parsed.channels) {
              updatedSession.channels = {
                analysis: chunk.parsed.channels.analysis || prev.channels.analysis,
                final: chunk.parsed.channels.final || prev.channels.final,
                raw: chunk.parsed.channels.raw || prev.channels.raw
              };
            }
            
            return updatedSession;
          });
          break;
          
        case 'reasoning_complete':
          setActiveSession(prev => {
            if (!prev) return prev;
            
            const completedSession = {
              ...prev,
              status: 'completed',
              completedAt: Date.now(),
              result: message.result,
              performance: {
                ...prev.performance,
                latency: message.metadata?.totalTime || (Date.now() - prev.startTime)
              }
            };
            
            // Update final channels and reasoning data
            if (message.result?.response) {
              const response = message.result.response;
              completedSession.channels = response.channels || prev.channels;
              completedSession.expertActivity = response.expertActivity || prev.expertActivity;
              completedSession.reasoning = response.reasoning || prev.reasoning;
            }
            
            // Add to history
            setReasoningHistory(history => [completedSession, ...history.slice(0, 9)]);
            
            // Update stats
            setSessionStats(prevStats => ({
              ...prevStats,
              completedSessions: prevStats.completedSessions + 1,
              averageLatency: prevStats.completedSessions === 0 
                ? completedSession.performance.latency
                : (prevStats.averageLatency * prevStats.completedSessions + completedSession.performance.latency) / (prevStats.completedSessions + 1)
            }));
            
            // Clear active session after a delay
            setTimeout(() => {
              setActiveSession(current => 
                current && current.id === completedSession.id ? null : current
              );
            }, 5000);
            
            return completedSession;
          });
          
          // Clear timers
          if (sessionTimeoutRef.current) {
            clearTimeout(sessionTimeoutRef.current);
          }
          if (performanceMonitorRef.current) {
            clearInterval(performanceMonitorRef.current);
          }
          break;
          
        case 'reasoning_error':
          setActiveSession(prev => {
            if (!prev) return prev;
            
            const errorSession = {
              ...prev,
              status: 'error',
              error: message.error?.message || 'Unknown reasoning error',
              errorAt: Date.now()
            };
            
            // Add to history
            setReasoningHistory(history => [errorSession, ...history.slice(0, 9)]);
            
            // Clear active session after a delay
            setTimeout(() => {
              setActiveSession(current => 
                current && current.id === errorSession.id ? null : current
              );
            }, 10000);
            
            return errorSession;
          });
          
          // Clear timers
          if (sessionTimeoutRef.current) {
            clearTimeout(sessionTimeoutRef.current);
          }
          if (performanceMonitorRef.current) {
            clearInterval(performanceMonitorRef.current);
          }
          break;
          
        case 'expert_activity':
          setActiveSession(prev => {
            if (!prev || prev.status !== 'active') return prev;
            
            return {
              ...prev,
              expertActivity: message.activity || {}
            };
          });
          break;
          
        default:
          // Ignore other message types
          break;
      }
    };
    
    // This would be called from the WebSocket hook
    // For now, we'll assume messages are passed in somehow
    window.addEventListener('websocket-message', (event) => {
      handleMessage(event.detail);
    });
    
    return () => {
      window.removeEventListener('websocket-message', handleMessage);
    };
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
      if (performanceMonitorRef.current) {
        clearInterval(performanceMonitorRef.current);
      }
    };
  }, []);
  
  return {
    activeSession,
    reasoningHistory,
    sessionStats,
    startReasoning,
    pauseReasoning,
    resumeReasoning,
    stopReasoning
  };
};