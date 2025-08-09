import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ProblemInput = ({ onStartReasoning, isProcessing }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedDemo, setSelectedDemo] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef(null);
  
  const demoScenarios = [
    {
      id: 'climate',
      title: '🌱 Climate Solution',
      description: 'Design a carbon-negative city',
      prompt: 'Design a carbon-negative city that\'s economically profitable. Consider urban planning, energy systems, transportation, waste management, and economic incentives. Show your reasoning for each major decision.',
      complexity: 'high',
      color: 'cyber-green'
    },
    {
      id: 'creative',
      title: '🎮 Future Entertainment',
      description: 'Invent 2050 entertainment',
      prompt: 'Invent a new form of entertainment for the year 2050. Consider technological advances, social changes, and human psychology. Explain how it would work and why people would enjoy it.',
      complexity: 'medium',
      color: 'cyber-blue'
    },
    {
      id: 'logic',
      title: '🔍 Logic Puzzle',
      description: 'Solve complex reasoning',
      prompt: 'You have 12 balls, one of which weighs differently than the others. Using a balance scale only 3 times, how can you identify which ball is different and whether it\'s heavier or lighter? Show your complete reasoning.',
      complexity: 'medium',
      color: 'cyber-pink'
    },
    {
      id: 'analysis',
      title: '📊 Business Strategy',
      description: 'Analyze market opportunity',
      prompt: 'A small coffee shop wants to compete with major chains. Analyze their competitive advantages, potential strategies, and recommendations for sustainable growth. Consider market positioning, customer experience, and operational efficiency.',
      complexity: 'high',
      color: 'cyber-purple'
    }
  ];
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing) return;
    
    const config = selectedDemo ? {
      effort: selectedDemo.complexity === 'high' ? 'high' : 'medium',
      parallelTracks: selectedDemo.complexity === 'high',
      temperature: selectedDemo.complexity === 'high' ? 0.8 : 0.7
    } : {};
    
    onStartReasoning(prompt.trim(), config);
    
    // Clear form
    setPrompt('');
    setSelectedDemo(null);
    setIsExpanded(false);
  };
  
  const handleDemoSelect = (demo) => {
    setPrompt(demo.prompt);
    setSelectedDemo(demo);
    setIsExpanded(false);
    
    // Focus textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  };
  
  const handleTextareaChange = (e) => {
    setPrompt(e.target.value);
    setSelectedDemo(null); // Clear demo selection if user types
  };
  
  const getComplexityColor = (complexity) => {
    switch (complexity) {
      case 'low': return 'text-cyber-green';
      case 'medium': return 'text-cyber-blue';
      case 'high': return 'text-cyber-pink';
      default: return 'text-cyber-white';
    }
  };
  
  return (
    <div className="h-full p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-cyber text-cyber-blue">
          💭 PROBLEM INPUT
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs px-2 py-1 bg-cyber-gray text-cyber-white rounded hover:bg-cyber-blue hover:text-cyber-black transition-colors"
        >
          {isExpanded ? 'COLLAPSE' : 'DEMOS'}
        </button>
      </div>
      
      {/* Demo Scenarios */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-2 overflow-hidden"
          >
            <h4 className="text-sm font-medium text-cyber-white">Quick Start Demos</h4>
            <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
              {demoScenarios.map((demo) => (
                <motion.button
                  key={demo.id}
                  onClick={() => handleDemoSelect(demo)}
                  className={`text-left p-2 rounded-cyber border transition-all hover:scale-[1.02] ${
                    selectedDemo?.id === demo.id
                      ? `border-${demo.color} bg-${demo.color}/10`
                      : 'border-gray-600 bg-cyber-dark/50 hover:border-gray-400'
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-cyber-white">
                      {demo.title}
                    </span>
                    <span className={`text-xs ${getComplexityColor(demo.complexity)}`}>
                      {demo.complexity.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {demo.description}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-3 flex-1 flex flex-col">
        {/* Selected Demo Indicator */}
        {selectedDemo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-2 rounded-cyber border border-${selectedDemo.color} bg-${selectedDemo.color}/10`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-cyber-white">
                {selectedDemo.title}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedDemo(null);
                  setPrompt('');
                }}
                className="text-xs text-gray-400 hover:text-cyber-white"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
        
        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={handleTextareaChange}
            placeholder="Enter your reasoning problem here... Or select a demo scenario above."
            className="input-cyber w-full h-full min-h-[120px] resize-none"
            disabled={isProcessing}
          />
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            {prompt.length}/2000
          </div>
        </div>
        
        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            {prompt.trim() && (
              <>
                <span>Words: {prompt.trim().split(/\s+/).length}</span>
                <span>•</span>
                <span>Est. tokens: {Math.round(prompt.length * 0.75)}</span>
              </>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                setPrompt('');
                setSelectedDemo(null);
              }}
              className="text-xs px-3 py-1 text-gray-400 hover:text-cyber-white transition-colors"
              disabled={isProcessing || !prompt.trim()}
            >
              CLEAR
            </button>
            
            <motion.button
              type="submit"
              className={`btn-cyber-primary px-6 py-2 ${
                isProcessing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={!prompt.trim() || isProcessing}
              whileTap={!isProcessing ? { scale: 0.95 } : {}}
            >
              {isProcessing ? (
                <span className="flex items-center">
                  <div className="w-4 h-4 border-2 border-cyber-black border-t-transparent rounded-full animate-spin mr-2" />
                  REASONING...
                </span>
              ) : (
                '🎼 START REASONING'
              )}
            </motion.button>
          </div>
        </div>
      </form>
      
      {/* Processing Indicator */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center py-3 bg-cyber-green/20 border border-cyber-green rounded-cyber"
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-cyber-green rounded-full animate-pulse" />
            <span className="text-sm font-cyber text-cyber-green">
              AI REASONING IN PROGRESS
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ProblemInput;