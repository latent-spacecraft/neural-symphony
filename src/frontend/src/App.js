import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './index.css';

// Core Components
import ReasoningVisualizer from './components/ReasoningVisualizer';
import ControlPanel from './components/ControlPanel';
import ExpertHeatmap from './components/ExpertHeatmap';
import ProblemInput from './components/ProblemInput';
import OutputMixer from './components/OutputMixer';
import SystemStatus from './components/SystemStatus';

// Hooks
import { useWebSocket } from './hooks/useWebSocket';
import { useReasoningSession } from './hooks/useReasoningSession';

// Utils
import { connectionManager } from './utils/ConnectionManager';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentView, setCurrentView] = useState('main');
  const [systemStatus, setSystemStatus] = useState({
    connected: false,
    modelLoaded: false,
    performanceGood: true
  });

  // WebSocket connection
  const {
    isConnected,
    clientCount,
    sendMessage,
    lastMessage
  } = useWebSocket(process.env.REACT_APP_WS_URL || 'ws://localhost:3001');

  // Reasoning session management
  const {
    activeSession,
    startReasoning,
    pauseReasoning,
    stopReasoning,
    reasoningHistory
  } = useReasoningSession(sendMessage);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Hide loading screen
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
          setTimeout(() => {
            loadingEl.style.opacity = '0';
            setTimeout(() => loadingEl.remove(), 500);
          }, 2000);
        }

        // Initialize connection manager
        await connectionManager.initialize();
        
        setSystemStatus(prev => ({
          ...prev,
          connected: true,
          modelLoaded: true
        }));

        setIsInitialized(true);
      } catch (error) {
        console.error('App initialization failed:', error);
        setSystemStatus(prev => ({
          ...prev,
          performanceGood: false
        }));
      }
    };

    initializeApp();
  }, []);

  const handleStartReasoning = (prompt, config) => {
    startReasoning(prompt, {
      ...config,
      timestamp: Date.now()
    });
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-cyber-black flex-cyber">
        <div className="text-center">
          <div className="text-4xl font-cyber text-cyber-blue animate-glow mb-4">
            🎼 NEURAL SYMPHONY
          </div>
          <div className="text-lg font-neural text-gray-400">
            Initializing AI Reasoning Orchestrator<span className="loading-dots"></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-black font-neural text-cyber-white overflow-hidden">
      {/* Background Neural Network Animation */}
      <div className="fixed inset-0 bg-neural-gradient opacity-10 pointer-events-none" />
      
      {/* Main Application Layout */}
      <div className="relative z-10 h-screen grid grid-cols-12 grid-rows-12 gap-4 p-4">
        
        {/* Header Bar */}
        <motion.header 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="col-span-12 row-span-1 panel-cyber-glass flex items-center justify-between px-6"
        >
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-cyber text-cyber-gradient font-bold">
              🎼 NEURAL SYMPHONY
            </h1>
            <div className="text-sm font-medium text-gray-400">
              AI Reasoning Orchestrator
            </div>
          </div>
          
          <SystemStatus 
            status={systemStatus}
            isConnected={isConnected}
            clientCount={clientCount}
          />
        </motion.header>

        {/* Problem Input */}
        <motion.section
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="col-span-4 row-span-2 panel-cyber"
        >
          <ProblemInput 
            onStartReasoning={handleStartReasoning}
            isProcessing={activeSession?.status === 'active'}
          />
        </motion.section>

        {/* Control Panel */}
        <motion.section
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="col-span-4 row-span-2 panel-cyber"
        >
          <ControlPanel 
            onConfigChange={(config) => {
              if (sendMessage) {
                sendMessage({
                  type: 'update_controls',
                  controls: config
                });
              }
            }}
            isActive={activeSession?.status === 'active'}
          />
        </motion.section>

        {/* System Performance */}
        <motion.section
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="col-span-4 row-span-2 panel-cyber"
        >
          <div className="p-4 h-full">
            <h3 className="text-lg font-cyber text-cyber-blue mb-3">
              Performance Metrics
            </h3>
            <div className="grid grid-cols-2 gap-3 h-full">
              <div className="panel-cyber-glass p-3 rounded-cyber">
                <div className="text-xs text-gray-400 mb-1">Latency</div>
                <div className="text-xl font-bold text-cyber-green">
                  {activeSession?.latency || '-- '}ms
                </div>
              </div>
              <div className="panel-cyber-glass p-3 rounded-cyber">
                <div className="text-xs text-gray-400 mb-1">Tokens/sec</div>
                <div className="text-xl font-bold text-cyber-blue">
                  {activeSession?.tokensPerSecond || '--'}
                </div>
              </div>
              <div className="panel-cyber-glass p-3 rounded-cyber">
                <div className="text-xs text-gray-400 mb-1">Complexity</div>
                <div className="text-xl font-bold text-cyber-pink">
                  {activeSession?.complexity ? (activeSession.complexity * 100).toFixed(0) + '%' : '--'}
                </div>
              </div>
              <div className="panel-cyber-glass p-3 rounded-cyber">
                <div className="text-xs text-gray-400 mb-1">Steps</div>
                <div className="text-xl font-bold text-cyber-purple">
                  {activeSession?.reasoningSteps || '--'}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Main Reasoning Visualization */}
        <motion.section
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="col-span-8 row-span-7 panel-cyber relative overflow-hidden"
        >
          <ReasoningVisualizer 
            session={activeSession}
            onPause={() => pauseReasoning(activeSession?.id)}
            onStop={() => stopReasoning(activeSession?.id)}
          />
        </motion.section>

        {/* Expert Activity Heatmap */}
        <motion.section
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="col-span-4 row-span-4 panel-cyber"
        >
          <ExpertHeatmap 
            expertActivity={activeSession?.expertActivity}
            isActive={activeSession?.status === 'active'}
          />
        </motion.section>

        {/* Output Mixer */}
        <motion.section
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="col-span-4 row-span-3 panel-cyber"
        >
          <OutputMixer 
            channels={activeSession?.channels}
            onChannelMixChange={(mix) => {
              if (sendMessage) {
                sendMessage({
                  type: 'update_controls',
                  controls: { channelBlend: mix }
                });
              }
            }}
          />
        </motion.section>

        {/* Footer Status */}
        <motion.footer
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="col-span-12 row-span-1 panel-cyber-glass flex items-center justify-between px-6"
        >
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-cyber-green animate-pulse' : 'bg-red-500'}`} />
              <span className="text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {activeSession && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-cyber-blue animate-pulse" />
                <span className="text-gray-400">
                  Session: {activeSession.id.split('_').pop()}
                </span>
              </div>
            )}
            
            <div className="text-gray-400">
              History: {reasoningHistory.length} sessions
            </div>
          </div>
          
          <div className="text-xs text-gray-500 font-cyber">
            NEURAL SYMPHONY v1.0 • OpenAI Hackathon 2025
          </div>
        </motion.footer>
      </div>

      {/* Session Status Notifications */}
      <AnimatePresence>
        {activeSession?.status === 'error' && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed top-20 right-4 bg-red-900/80 backdrop-blur-cyber border border-red-500 rounded-cyber p-4 max-w-sm"
          >
            <div className="flex items-center space-x-2">
              <div className="text-red-400">⚠️</div>
              <div>
                <div className="font-semibold text-red-300">Reasoning Error</div>
                <div className="text-sm text-red-400">{activeSession.error}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;