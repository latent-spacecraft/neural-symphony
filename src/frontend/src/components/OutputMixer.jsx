import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

const OutputMixer = ({ channels, onChannelMixChange }) => {
  const [channelMix, setChannelMix] = useState(0.5); // 0 = analysis, 1 = final
  const [displayMode, setDisplayMode] = useState('mixed'); // 'analysis', 'final', 'mixed', 'split'
  const [autoScroll, setAutoScroll] = useState(true);
  
  useEffect(() => {
    if (onChannelMixChange) {
      onChannelMixChange(channelMix);
    }
  }, [channelMix, onChannelMixChange]);
  
  const handleMixChange = (value) => {
    const mix = value / 100;
    setChannelMix(mix);
  };
  
  const getMixedContent = () => {
    if (!channels?.analysis || !channels?.final) {
      return channels?.raw || '';
    }
    
    const analysisWords = channels.analysis.split(' ').filter(w => w.trim());
    const finalWords = channels.final.split(' ').filter(w => w.trim());
    
    const maxLength = Math.max(analysisWords.length, finalWords.length);
    const mixed = [];
    
    for (let i = 0; i < maxLength; i++) {
      // Weighted random selection based on mix value
      const useAnalysis = Math.random() > channelMix;
      
      if (useAnalysis && analysisWords[i]) {
        mixed.push(analysisWords[i]);
      } else if (finalWords[i]) {
        mixed.push(finalWords[i]);
      }
    }
    
    return mixed.join(' ');
  };
  
  const getDisplayContent = () => {
    if (!channels) return 'No content available...';
    
    switch (displayMode) {
      case 'analysis':
        return channels.analysis || 'No analysis content...';
      case 'final':
        return channels.final || 'No final content...';
      case 'mixed':
        return getMixedContent();
      case 'split':
        return {
          analysis: channels.analysis || 'No analysis content...',
          final: channels.final || 'No final content...'
        };
      default:
        return channels.raw || 'No content available...';
    }
  };
  
  const getMixLabel = () => {
    if (channelMix < 0.2) return 'RAW ANALYSIS';
    if (channelMix < 0.4) return 'ANALYSIS HEAVY';
    if (channelMix < 0.6) return 'BALANCED';
    if (channelMix < 0.8) return 'FINAL HEAVY';
    return 'POLISHED FINAL';
  };
  
  const getMixColor = () => {
    if (channelMix < 0.33) return 'cyber-green';
    if (channelMix < 0.66) return 'cyber-blue';
    return 'cyber-pink';
  };
  
  return (
    <div className="h-full p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-cyber text-cyber-blue">
          🎚️ OUTPUT MIXER
        </h3>
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            autoScroll 
              ? 'bg-cyber-green text-cyber-black' 
              : 'bg-cyber-gray text-cyber-white hover:bg-cyber-blue hover:text-cyber-black'
          }`}
        >
          {autoScroll ? 'AUTO' : 'MANUAL'}
        </button>
      </div>
      
      {/* Channel Mix Control */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-cyber-white">
            Channel Blend
          </label>
          <span className={`text-sm font-cyber px-2 py-1 rounded text-xs bg-${getMixColor()}/20 text-${getMixColor()}`}>
            {getMixLabel()}
          </span>
        </div>
        <div className="relative">
          <Slider
            min={0}
            max={100}
            value={Math.round(channelMix * 100)}
            onChange={(value) => handleMixChange(value)}
            trackStyle={{ backgroundColor: '#FF1493' }}
            handleStyle={{ 
              borderColor: '#FF1493', 
              backgroundColor: '#FF1493',
              boxShadow: '0 0 10px rgba(255, 20, 147, 0.5)'
            }}
            railStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Analysis</span>
            <span>Mixed</span>
            <span>Final</span>
          </div>
        </div>
      </div>
      
      {/* Display Mode Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-cyber-white">
          Display Mode
        </label>
        <div className="grid grid-cols-4 gap-1">
          {[
            { mode: 'analysis', label: 'RAW', color: 'cyber-green' },
            { mode: 'final', label: 'FINAL', color: 'cyber-pink' },
            { mode: 'mixed', label: 'MIX', color: 'cyber-blue' },
            { mode: 'split', label: 'SPLIT', color: 'cyber-purple' }
          ].map((option) => (
            <button
              key={option.mode}
              onClick={() => setDisplayMode(option.mode)}
              className={`text-xs py-1 px-2 rounded font-cyber transition-colors ${
                displayMode === option.mode
                  ? `bg-${option.color} text-cyber-black`
                  : 'bg-cyber-gray text-cyber-white hover:bg-cyber-blue/20'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content Display */}
      <div className="flex-1 min-h-0">
        {displayMode === 'split' ? (
          // Split view
          <div className="h-full grid grid-rows-2 gap-2">
            <div className="space-y-1">
              <div className="text-xs font-cyber text-cyber-green">ANALYSIS CHANNEL</div>
              <div className="h-full bg-cyber-dark/50 rounded-cyber p-3 text-xs text-cyber-white font-mono overflow-y-auto">
                {getDisplayContent().analysis}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-cyber text-cyber-pink">FINAL CHANNEL</div>
              <div className="h-full bg-cyber-dark/50 rounded-cyber p-3 text-xs text-cyber-white font-mono overflow-y-auto">
                {getDisplayContent().final}
              </div>
            </div>
          </div>
        ) : (
          // Single view
          <div className="h-full space-y-2">
            <div className="flex items-center justify-between">
              <div className={`text-xs font-cyber text-${getMixColor()}`}>
                {displayMode.toUpperCase()} OUTPUT
              </div>
              <div className="text-xs text-gray-400">
                {typeof getDisplayContent() === 'string' ? getDisplayContent().length : 0} chars
              </div>
            </div>
            <motion.div
              key={displayMode + channelMix}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full bg-cyber-dark/50 rounded-cyber p-3 text-xs text-cyber-white font-mono overflow-y-auto relative"
            >
              {typeof getDisplayContent() === 'string' ? getDisplayContent() : 'Mixed content not available'}
              
              {/* Scroll indicator */}
              {autoScroll && (
                <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                  <div className="w-2 h-2 bg-cyber-blue rounded-full animate-pulse" />
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>
      
      {/* Channel Statistics */}
      {channels && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="panel-cyber-glass p-2 rounded text-center">
            <div className="text-gray-400 mb-1">Analysis</div>
            <div className="text-cyber-green font-bold">
              {channels.analysis?.length || 0}
            </div>
          </div>
          <div className="panel-cyber-glass p-2 rounded text-center">
            <div className="text-gray-400 mb-1">Final</div>
            <div className="text-cyber-pink font-bold">
              {channels.final?.length || 0}
            </div>
          </div>
          <div className="panel-cyber-glass p-2 rounded text-center">
            <div className="text-gray-400 mb-1">Total</div>
            <div className="text-cyber-blue font-bold">
              {channels.raw?.length || 0}
            </div>
          </div>
        </div>
      )}
      
      {/* No Content State */}
      {!channels && (
        <div className="flex-cyber h-32 text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-2">🎚️</div>
            <div className="text-sm">No content to mix</div>
            <div className="text-xs mt-1">Start reasoning to see output</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutputMixer;