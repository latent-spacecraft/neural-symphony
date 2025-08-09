import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const SystemStatus = ({ status, isConnected, clientCount }) => {
  const [performanceHistory, setPerformanceHistory] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  
  useEffect(() => {
    // Update performance history
    const newEntry = {
      timestamp: Date.now(),
      connected: isConnected,
      modelLoaded: status?.modelLoaded || false,
      performance: status?.performanceGood || false,
      clientCount: clientCount || 0
    };
    
    setPerformanceHistory(prev => {
      const updated = [...prev, newEntry].slice(-20); // Keep last 20 entries
      return updated;
    });
  }, [isConnected, status, clientCount]);
  
  const getConnectionStatus = () => {
    if (!isConnected) return { label: 'DISCONNECTED', color: 'text-red-400', bg: 'bg-red-400/20' };
    if (!status?.modelLoaded) return { label: 'LOADING', color: 'text-yellow-400', bg: 'bg-yellow-400/20' };
    if (!status?.performanceGood) return { label: 'DEGRADED', color: 'text-orange-400', bg: 'bg-orange-400/20' };
    return { label: 'OPTIMAL', color: 'text-cyber-green', bg: 'bg-cyber-green/20' };
  };
  
  const connectionStatus = getConnectionStatus();
  
  return (
    <div className="flex items-center space-x-4">
      {/* Main Status Indicator */}
      <motion.div 
        className={`flex items-center space-x-2 px-3 py-2 rounded-cyber ${connectionStatus.bg} cursor-pointer`}
        onClick={() => setShowDetails(!showDetails)}
        whileTap={{ scale: 0.95 }}
      >
        <div className={`w-2 h-2 rounded-full ${
          connectionStatus.label === 'OPTIMAL' ? 'bg-cyber-green animate-pulse' :
          connectionStatus.label === 'LOADING' ? 'bg-yellow-400 animate-pulse' :
          connectionStatus.label === 'DEGRADED' ? 'bg-orange-400 animate-pulse' :
          'bg-red-400'
        }`} />
        <span className={`text-sm font-cyber ${connectionStatus.color}`}>
          {connectionStatus.label}
        </span>
      </motion.div>
      
      {/* Client Count */}
      {isConnected && (
        <div className="flex items-center space-x-1 text-gray-400">
          <span className="text-xs">👥</span>
          <span className="text-sm">{clientCount}</span>
        </div>
      )}
      
      {/* Model Status */}
      {status?.modelLoaded && (
        <div className="flex items-center space-x-2 text-cyber-blue">
          <span className="text-xs">🧠</span>
          <span className="text-sm font-cyber">GPT-OSS-20B</span>
        </div>
      )}
      
      {/* Detailed Status Panel */}
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.95, x: 20 }}
          className="absolute top-full right-0 mt-2 w-80 panel-cyber-glass rounded-cyber p-4 z-50"
        >
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-cyber text-cyber-blue">System Status</h4>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-cyber-white text-lg"
              >
                ✕
              </button>
            </div>
            
            {/* Status Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="text-xs text-gray-400">CONNECTION</div>
                <div className={`text-sm font-bold ${connectionStatus.color}`}>
                  {connectionStatus.label}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-xs text-gray-400">CLIENTS</div>
                <div className="text-sm font-bold text-cyber-white">
                  {clientCount || 0} connected
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-xs text-gray-400">MODEL</div>
                <div className={`text-sm font-bold ${status?.modelLoaded ? 'text-cyber-green' : 'text-red-400'}`}>
                  {status?.modelLoaded ? 'LOADED' : 'NOT LOADED'}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-xs text-gray-400">PERFORMANCE</div>
                <div className={`text-sm font-bold ${status?.performanceGood ? 'text-cyber-green' : 'text-orange-400'}`}>
                  {status?.performanceGood ? 'GOOD' : 'DEGRADED'}
                </div>
              </div>
            </div>
            
            {/* Performance History */}
            <div className="space-y-2">
              <div className="text-xs text-gray-400">PERFORMANCE HISTORY (LAST 20 CHECKS)</div>
              <div className="flex space-x-1 h-8 items-end">
                {performanceHistory.map((entry, index) => (
                  <div
                    key={index}
                    className={`w-2 rounded-t ${
                      entry.connected && entry.modelLoaded && entry.performance
                        ? 'bg-cyber-green'
                        : entry.connected && entry.modelLoaded
                        ? 'bg-yellow-400'
                        : entry.connected
                        ? 'bg-orange-400'
                        : 'bg-red-400'
                    }`}
                    style={{
                      height: `${Math.max(4, (entry.clientCount || 1) * 4)}px`
                    }}
                    title={`${new Date(entry.timestamp).toLocaleTimeString()} - ${
                      entry.connected ? 'Connected' : 'Disconnected'
                    } - ${entry.clientCount} clients`}
                  />
                ))}
              </div>
            </div>
            
            {/* System Info */}
            <div className="space-y-2 text-xs text-gray-400 border-t border-gray-600 pt-3">
              <div>Neural Symphony v1.0</div>
              <div>WebSocket: {isConnected ? 'Connected' : 'Disconnected'}</div>
              <div>Backend: {status?.modelLoaded ? 'Ready' : 'Initializing'}</div>
              <div>Uptime: {formatUptime(Date.now() - (window.appStartTime || Date.now()))}</div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex space-x-2 pt-2 border-t border-gray-600">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 text-xs py-2 bg-cyber-gray text-cyber-white rounded hover:bg-cyber-blue hover:text-cyber-black transition-colors"
              >
                🔄 REFRESH
              </button>
              <button
                onClick={() => {
                  // Clear local storage or reset app state
                  localStorage.clear();
                  window.location.reload();
                }}
                className="flex-1 text-xs py-2 bg-cyber-gray text-cyber-white rounded hover:bg-red-600 hover:text-white transition-colors"
              >
                🔥 RESET
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// Utility function to format uptime
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export default SystemStatus;