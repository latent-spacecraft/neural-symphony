import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Slider from 'rc-slider';
import { useKnob } from 'react-knob-headless';
import 'rc-slider/assets/index.css';

const ControlPanel = ({ onConfigChange, isActive }) => {
  const [config, setConfig] = useState({
    reasoningEffort: 0.7, // 0-1 scale
    expertBias: {
      math: 0.5,
      creative: 0.5,
      logic: 0.5,
      analysis: 0.5
    },
    speedQualityMixer: 0.6, // 0 = speed, 1 = quality
    temperature: 0.7,
    maxTokens: 1024,
    parallelTracks: false,
    complexityScale: 'auto' // 'auto', 'low', 'medium', 'high'
  });
  
  const [isDragging, setIsDragging] = useState(null);
  const [localChanges, setLocalChanges] = useState({});
  
  // Debounced config change handler
  const debouncedConfigChange = useCallback(
    debounce((newConfig) => {
      if (onConfigChange) {
        onConfigChange(newConfig);
      }
    }, 300),
    [onConfigChange]
  );
  
  // Update config and trigger change
  const updateConfig = (updates) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      debouncedConfigChange(newConfig);
      return newConfig;
    });
  };
  
  // Handle effort slider
  const handleEffortChange = (value) => {
    const effort = value / 100;
    updateConfig({ 
      reasoningEffort: effort,
      temperature: 0.3 + (effort * 0.5), // Scale temperature with effort
      maxTokens: Math.round(512 + (effort * 1536)) // Scale tokens with effort
    });
    setLocalChanges(prev => ({ ...prev, effort: Date.now() }));
  };
  
  // Handle expert bias
  const handleExpertBiasChange = (expert, value) => {
    const bias = value / 100;
    updateConfig({
      expertBias: {
        ...config.expertBias,
        [expert]: bias
      }
    });
    setLocalChanges(prev => ({ ...prev, [expert]: Date.now() }));
  };
  
  // Handle speed/quality mixer
  const handleSpeedQualityChange = (value) => {
    const mixer = value / 100;
    updateConfig({ speedQualityMixer: mixer });
    setLocalChanges(prev => ({ ...prev, speedQuality: Date.now() }));
  };
  
  // Reset all controls to defaults
  const handleReset = () => {
    const defaultConfig = {
      reasoningEffort: 0.7,
      expertBias: {
        math: 0.5,
        creative: 0.5,
        logic: 0.5,
        analysis: 0.5
      },
      speedQualityMixer: 0.6,
      temperature: 0.7,
      maxTokens: 1024,
      parallelTracks: false,
      complexityScale: 'auto'
    };
    
    setConfig(defaultConfig);
    debouncedConfigChange(defaultConfig);
    setLocalChanges({});
  };
  
  // Preset configurations
  const applyPreset = (presetName) => {
    const presets = {
      creative: {
        reasoningEffort: 0.8,
        expertBias: { math: 0.2, creative: 0.9, logic: 0.4, analysis: 0.6 },
        speedQualityMixer: 0.8,
        temperature: 0.9,
        parallelTracks: true
      },
      analytical: {
        reasoningEffort: 0.9,
        expertBias: { math: 0.8, creative: 0.3, logic: 0.9, analysis: 0.9 },
        speedQualityMixer: 0.9,
        temperature: 0.5,
        parallelTracks: false
      },
      balanced: {
        reasoningEffort: 0.7,
        expertBias: { math: 0.6, creative: 0.6, logic: 0.6, analysis: 0.6 },
        speedQualityMixer: 0.6,
        temperature: 0.7,
        parallelTracks: false
      },
      speed: {
        reasoningEffort: 0.4,
        expertBias: { math: 0.5, creative: 0.3, logic: 0.7, analysis: 0.5 },
        speedQualityMixer: 0.2,
        temperature: 0.4,
        parallelTracks: false
      }
    };
    
    const preset = presets[presetName];
    if (preset) {
      const newConfig = { ...config, ...preset };
      setConfig(newConfig);
      debouncedConfigChange(newConfig);
      setLocalChanges({});
    }
  };
  
  // Get effort level text
  const getEffortLevelText = (effort) => {
    if (effort < 0.33) return 'LOW';
    if (effort < 0.66) return 'MEDIUM';
    return 'HIGH';
  };
  
  // Get speed/quality text
  const getSpeedQualityText = (mixer) => {
    if (mixer < 0.33) return 'SPEED';
    if (mixer < 0.66) return 'BALANCED';
    return 'QUALITY';
  };
  
  return (
    <div className="h-full p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-cyber text-cyber-blue">
          🎛️ REASONING CONTROLS
        </h3>
        <button
          onClick={handleReset}
          className="text-xs px-2 py-1 bg-cyber-gray text-cyber-white rounded hover:bg-cyber-blue hover:text-cyber-black transition-colors"
          disabled={isActive}
        >
          RESET
        </button>
      </div>
      
      {/* Reasoning Effort Slider */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-cyber-white">
            Reasoning Effort
          </label>
          <span className={`text-sm font-cyber px-2 py-1 rounded text-xs ${
            config.reasoningEffort < 0.33 ? 'bg-cyber-green/20 text-cyber-green' :
            config.reasoningEffort < 0.66 ? 'bg-cyber-blue/20 text-cyber-blue' :
            'bg-cyber-pink/20 text-cyber-pink'
          } ${localChanges.effort && Date.now() - localChanges.effort < 1000 ? 'animate-pulse' : ''}`}>
            {getEffortLevelText(config.reasoningEffort)}
          </span>
        </div>
        <motion.div 
          className="relative"
          whileTap={{ scale: 0.98 }}
        >
          <Slider
            min={0}
            max={100}
            value={Math.round(config.reasoningEffort * 100)}
            onChange={(value) => handleEffortChange(value)}
            disabled={isActive}
            trackStyle={{ backgroundColor: '#00D4FF' }}
            handleStyle={{ 
              borderColor: '#00D4FF', 
              backgroundColor: '#00D4FF',
              boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)'
            }}
            railStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
          </div>
        </motion.div>
      </div>
      
      {/* Expert Bias Controls */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-cyber-white">Expert Bias</h4>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(config.expertBias).map(([expert, value]) => (
            <motion.div 
              key={expert}
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Object.keys(config.expertBias).indexOf(expert) * 0.1 }}
            >
              <div className="flex justify-between items-center">
                <label className={`text-xs font-medium capitalize expert-${expert}`}>
                  {expert}
                </label>
                <span className={`text-xs font-mono expert-${expert} ${
                  localChanges[expert] && Date.now() - localChanges[expert] < 1000 ? 'animate-pulse' : ''
                }`}>
                  {Math.round(value * 100)}%
                </span>
              </div>
              <div className="relative">
                <Slider
                  min={0}
                  max={100}
                  value={Math.round(value * 100)}
                  onChange={(val) => handleExpertBiasChange(expert, val)}
                  disabled={isActive}
                  trackStyle={{ 
                    backgroundColor: expert === 'math' ? '#00D4FF' :
                                   expert === 'creative' ? '#39FF14' :
                                   expert === 'logic' ? '#FF1493' : '#9D4EDD'
                  }}
                  handleStyle={{ 
                    borderColor: expert === 'math' ? '#00D4FF' :
                               expert === 'creative' ? '#39FF14' :
                               expert === 'logic' ? '#FF1493' : '#9D4EDD',
                    backgroundColor: expert === 'math' ? '#00D4FF' :
                                   expert === 'creative' ? '#39FF14' :
                                   expert === 'logic' ? '#FF1493' : '#9D4EDD',
                    boxShadow: `0 0 10px rgba(${expert === 'math' ? '0, 212, 255' :
                                             expert === 'creative' ? '57, 255, 20' :
                                             expert === 'logic' ? '255, 20, 147' : '157, 78, 221'}, 0.5)`
                  }}
                  railStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Speed/Quality Mixer */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-cyber-white">
            Speed/Quality
          </label>
          <span className={`text-sm font-cyber px-2 py-1 rounded text-xs ${
            config.speedQualityMixer < 0.33 ? 'bg-cyber-green/20 text-cyber-green' :
            config.speedQualityMixer < 0.66 ? 'bg-cyber-blue/20 text-cyber-blue' :
            'bg-cyber-pink/20 text-cyber-pink'
          } ${localChanges.speedQuality && Date.now() - localChanges.speedQuality < 1000 ? 'animate-pulse' : ''}`}>
            {getSpeedQualityText(config.speedQualityMixer)}
          </span>
        </div>
        <div className="relative">
          <Slider
            min={0}
            max={100}
            value={Math.round(config.speedQualityMixer * 100)}
            onChange={(value) => handleSpeedQualityChange(value)}
            disabled={isActive}
            trackStyle={{ backgroundColor: '#39FF14' }}
            handleStyle={{ 
              borderColor: '#39FF14', 
              backgroundColor: '#39FF14',
              boxShadow: '0 0 10px rgba(57, 255, 20, 0.5)'
            }}
            railStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Speed</span>
            <span>Quality</span>
          </div>
        </div>
      </div>
      
      {/* Advanced Options */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-cyber-white">Advanced</h4>
        
        {/* Parallel Tracks Toggle */}
        <motion.label 
          className="flex items-center justify-between cursor-pointer"
          whileTap={{ scale: 0.98 }}
        >
          <span className="text-sm text-cyber-white">Parallel Tracks</span>
          <div className="relative">
            <input
              type="checkbox"
              checked={config.parallelTracks}
              onChange={(e) => updateConfig({ parallelTracks: e.target.checked })}
              className="sr-only"
              disabled={isActive}
            />
            <div className={`w-10 h-6 rounded-full transition-colors ${
              config.parallelTracks ? 'bg-cyber-blue' : 'bg-cyber-gray'
            }`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform m-1 ${
                config.parallelTracks ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </div>
          </div>
        </motion.label>
        
        {/* Complexity Scale */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-cyber-white">
            Complexity Scaling
          </label>
          <div className="grid grid-cols-4 gap-1">
            {['auto', 'low', 'medium', 'high'].map((scale) => (
              <button
                key={scale}
                onClick={() => updateConfig({ complexityScale: scale })}
                className={`text-xs py-1 px-2 rounded font-cyber uppercase transition-colors ${
                  config.complexityScale === scale
                    ? 'bg-cyber-blue text-cyber-black'
                    : 'bg-cyber-gray text-cyber-white hover:bg-cyber-blue/20'
                }`}
                disabled={isActive}
              >
                {scale}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Preset Buttons */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-cyber-white">Quick Presets</h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'creative', icon: '🎨', color: 'cyber-green' },
            { name: 'analytical', icon: '🔬', color: 'cyber-blue' },
            { name: 'balanced', icon: '⚖️', color: 'cyber-purple' },
            { name: 'speed', icon: '⚡', color: 'cyber-pink' }
          ].map((preset) => (
            <motion.button
              key={preset.name}
              onClick={() => applyPreset(preset.name)}
              className={`text-xs py-2 px-3 rounded font-cyber uppercase transition-all hover:scale-105 ${
                isActive 
                  ? 'bg-cyber-gray text-gray-500 cursor-not-allowed' 
                  : `bg-${preset.color}/20 text-${preset.color} hover:bg-${preset.color}/30 border border-${preset.color}/30`
              }`}
              whileTap={{ scale: 0.95 }}
              disabled={isActive}
            >
              <span className="mr-1">{preset.icon}</span>
              {preset.name}
            </motion.button>
          ))}
        </div>
      </div>
      
      {/* Status Indicator */}
      {isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center py-2 bg-cyber-green/20 border border-cyber-green rounded-cyber"
        >
          <div className="w-2 h-2 bg-cyber-green rounded-full animate-pulse mr-2" />
          <span className="text-xs font-cyber text-cyber-green">
            REASONING ACTIVE - CONTROLS LOCKED
          </span>
        </motion.div>
      )}
    </div>
  );
};

// Utility function for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default ControlPanel;