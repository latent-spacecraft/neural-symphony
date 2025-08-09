import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';

const ReasoningVisualizer = ({ session, onPause, onStop }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [visualizationMode, setVisualizationMode] = useState('neural'); // 'neural', 'flow', 'tree'
  
  const [particleSystem, setParticleSystem] = useState({
    particles: [],
    connections: [],
    nodes: []
  });
  
  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height
        });
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Initialize D3 visualization
  useEffect(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous
    
    // Create main groups
    const defs = svg.append('defs');
    const mainGroup = svg.append('g').attr('class', 'main-group');
    const particlesGroup = mainGroup.append('g').attr('class', 'particles');
    const connectionsGroup = mainGroup.append('g').attr('class', 'connections');
    const nodesGroup = mainGroup.append('g').attr('class', 'nodes');
    const overlayGroup = mainGroup.append('g').attr('class', 'overlay');
    
    // Create gradient definitions
    createGradients(defs);
    
    // Initialize visualization based on mode
    switch (visualizationMode) {
      case 'neural':
        initializeNeuralNetwork(svg, dimensions);
        break;
      case 'flow':
        initializeReasoningFlow(svg, dimensions);
        break;
      case 'tree':
        initializeReasoningTree(svg, dimensions);
        break;
      default:
        initializeNeuralNetwork(svg, dimensions);
    }
    
  }, [dimensions, visualizationMode]);
  
  // Update visualization with session data
  useEffect(() => {
    if (!session || !svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    updateVisualization(svg, session, dimensions);
    
  }, [session, dimensions]);
  
  // Animation loop
  useEffect(() => {
    const animate = () => {
      if (!svgRef.current) return;
      
      const svg = d3.select(svgRef.current);
      
      // Update particles
      updateParticles(svg, session?.status === 'active');
      
      // Update neural activity
      if (session?.expertActivity) {
        updateNeuralActivity(svg, session.expertActivity);
      }
      
      // Update reasoning flow
      if (session?.reasoning?.steps) {
        updateReasoningSteps(svg, session.reasoning.steps);
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    if (session?.status === 'active') {
      animate();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [session]);
  
  const createGradients = (defs) => {
    // Neural gradient
    const neuralGradient = defs.append('linearGradient')
      .attr('id', 'neural-gradient')
      .attr('gradientUnits', 'userSpaceOnUse');
    
    neuralGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#00D4FF');
    
    neuralGradient.append('stop')
      .attr('offset', '50%')
      .attr('stop-color', '#39FF14');
    
    neuralGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#FF1493');
    
    // Expert gradients
    const expertColors = {
      math: '#00D4FF',
      creative: '#39FF14',
      logic: '#FF1493',
      analysis: '#9D4EDD'
    };
    
    Object.entries(expertColors).forEach(([expert, color]) => {
      const gradient = defs.append('radialGradient')
        .attr('id', `expert-${expert}-gradient`)
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%');
      
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', color)
        .attr('stop-opacity', '0.8');
      
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', color)
        .attr('stop-opacity', '0.1');
    });
    
    // Connection glow filter
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');
    
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
  };
  
  const initializeNeuralNetwork = (svg, { width, height }) => {
    const nodes = generateNeuralNodes(width, height);
    const connections = generateNeuralConnections(nodes);
    
    // Draw connections
    svg.select('.connections')
      .selectAll('.connection')
      .data(connections)
      .enter()
      .append('line')
      .attr('class', 'connection neural-connection')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)
      .attr('stroke', 'url(#neural-gradient)')
      .attr('stroke-width', 1)
      .attr('opacity', 0.3)
      .attr('filter', 'url(#glow)');
    
    // Draw nodes
    svg.select('.nodes')
      .selectAll('.node')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('class', d => `node expert-${d.expert}`)
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => d.radius)
      .attr('fill', d => `url(#expert-${d.expert}-gradient)`)
      .attr('stroke', d => getExpertColor(d.expert))
      .attr('stroke-width', 2)
      .attr('opacity', 0.7);
  };
  
  const initializeReasoningFlow = (svg, { width, height }) => {
    const flowPath = generateFlowPath(width, height);
    
    svg.select('.connections')
      .append('path')
      .attr('d', flowPath)
      .attr('stroke', 'url(#neural-gradient)')
      .attr('stroke-width', 3)
      .attr('fill', 'none')
      .attr('opacity', 0.6)
      .attr('filter', 'url(#glow)');
  };
  
  const initializeReasoningTree = (svg, { width, height }) => {
    // Tree visualization would go here
    // For now, fall back to neural network
    initializeNeuralNetwork(svg, { width, height });
  };
  
  const updateVisualization = (svg, session, dimensions) => {
    if (!session) return;
    
    // Update based on session status
    switch (session.status) {
      case 'active':
        animateActiveState(svg);
        break;
      case 'paused':
        animatePausedState(svg);
        break;
      case 'completed':
        animateCompletedState(svg);
        break;
      case 'error':
        animateErrorState(svg);
        break;
      default:
        break;
    }
    
    // Update text display
    updateReasoningText(svg, session, dimensions);
  };
  
  const updateParticles = (svg, isActive) => {
    if (!isActive) return;
    
    const particles = svg.select('.particles')
      .selectAll('.particle')
      .data(generateParticles(10));
    
    particles.enter()
      .append('circle')
      .attr('class', 'particle')
      .attr('r', 2)
      .attr('fill', '#00D4FF')
      .attr('opacity', 0.8)
      .merge(particles)
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);
    
    particles.exit().remove();
  };
  
  const updateNeuralActivity = (svg, expertActivity) => {
    svg.selectAll('.node').each(function(d) {
      const node = d3.select(this);
      const activity = expertActivity[d.expert];
      
      if (activity && activity.totalScore > 0.1) {
        node
          .transition()
          .duration(300)
          .attr('r', d.radius * (1 + activity.totalScore))
          .attr('opacity', 0.9)
          .attr('stroke-width', 3);
      } else {
        node
          .transition()
          .duration(300)
          .attr('r', d.radius)
          .attr('opacity', 0.7)
          .attr('stroke-width', 2);
      }
    });
  };
  
  const updateReasoningSteps = (svg, steps) => {
    const stepHeight = 30;
    const stepData = steps.slice(-5); // Show last 5 steps
    
    const stepGroups = svg.select('.overlay')
      .selectAll('.reasoning-step')
      .data(stepData);
    
    const stepEnter = stepGroups.enter()
      .append('g')
      .attr('class', 'reasoning-step');
    
    stepEnter
      .append('rect')
      .attr('width', 300)
      .attr('height', stepHeight - 5)
      .attr('rx', 5)
      .attr('fill', 'rgba(0, 212, 255, 0.1)')
      .attr('stroke', '#00D4FF')
      .attr('stroke-width', 1);
    
    stepEnter
      .append('text')
      .attr('x', 10)
      .attr('y', stepHeight / 2)
      .attr('dy', '0.35em')
      .attr('fill', '#FFFFFF')
      .attr('font-size', '12px')
      .attr('font-family', 'Rajdhani, sans-serif');
    
    stepGroups.merge(stepEnter)
      .attr('transform', (d, i) => `translate(20, ${20 + i * stepHeight})`)
      .select('text')
      .text(d => d.content.substring(0, 40) + (d.content.length > 40 ? '...' : ''));
    
    stepGroups.exit().remove();
  };
  
  const updateReasoningText = (svg, session, { width, height }) => {
    const textGroup = svg.select('.overlay')
      .selectAll('.reasoning-text')
      .data([session]);
    
    const textEnter = textGroup.enter()
      .append('g')
      .attr('class', 'reasoning-text');
    
    // Analysis channel
    if (session.channels?.analysis) {
      textEnter
        .append('text')
        .attr('class', 'analysis-text')
        .attr('x', width - 320)
        .attr('y', height - 200)
        .attr('fill', '#39FF14')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .text('ANALYSIS CHANNEL')
        .append('tspan')
        .attr('x', width - 320)
        .attr('dy', '15')
        .attr('fill', '#FFFFFF')
        .attr('opacity', 0.8)
        .text(session.channels.analysis.substring(0, 100) + '...');
    }
    
    // Final channel
    if (session.channels?.final) {
      textEnter
        .append('text')
        .attr('class', 'final-text')
        .attr('x', width - 320)
        .attr('y', height - 100)
        .attr('fill', '#00D4FF')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .text('FINAL CHANNEL')
        .append('tspan')
        .attr('x', width - 320)
        .attr('dy', '15')
        .attr('fill', '#FFFFFF')
        .attr('opacity', 0.8)
        .text(session.channels.final.substring(0, 100) + '...');
    }
  };
  
  const animateActiveState = (svg) => {
    svg.selectAll('.connection')
      .transition()
      .duration(500)
      .attr('opacity', 0.8)
      .attr('stroke-width', 2);
    
    svg.selectAll('.node')
      .classed('active', true);
  };
  
  const animatePausedState = (svg) => {
    svg.selectAll('.connection')
      .transition()
      .duration(500)
      .attr('opacity', 0.3)
      .attr('stroke-width', 1);
    
    svg.selectAll('.node')
      .classed('active', false);
  };
  
  const animateCompletedState = (svg) => {
    svg.selectAll('.connection')
      .transition()
      .duration(1000)
      .attr('stroke', '#39FF14')
      .attr('opacity', 1.0);
    
    svg.selectAll('.node')
      .transition()
      .duration(1000)
      .attr('stroke', '#39FF14')
      .attr('stroke-width', 3);
  };
  
  const animateErrorState = (svg) => {
    svg.selectAll('.connection')
      .transition()
      .duration(500)
      .attr('stroke', '#FF1493')
      .attr('opacity', 0.6);
    
    svg.selectAll('.node')
      .transition()
      .duration(500)
      .attr('stroke', '#FF1493')
      .classed('active', false);
  };
  
  // Utility functions
  const generateNeuralNodes = (width, height) => {
    const experts = ['math', 'creative', 'logic', 'analysis'];
    const nodes = [];
    
    experts.forEach((expert, i) => {
      const angle = (i / experts.length) * 2 * Math.PI;
      const radius = Math.min(width, height) * 0.3;
      const centerX = width / 2;
      const centerY = height / 2;
      
      nodes.push({
        id: expert,
        expert,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        radius: 20
      });
    });
    
    return nodes;
  };
  
  const generateNeuralConnections = (nodes) => {
    const connections = [];
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        connections.push({
          source: nodes[i],
          target: nodes[j]
        });
      }
    }
    
    return connections;
  };
  
  const generateFlowPath = (width, height) => {
    return `M50,${height/2} Q${width/3},${height/4} ${width/2},${height/2} T${width-50},${height/2}`;
  };
  
  const generateParticles = (count) => {
    const particles = [];
    
    for (let i = 0; i < count; i++) {
      particles.push({
        id: i,
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2
      });
    }
    
    return particles;
  };
  
  const getExpertColor = (expert) => {
    const colors = {
      math: '#00D4FF',
      creative: '#39FF14',
      logic: '#FF1493',
      analysis: '#9D4EDD'
    };
    return colors[expert] || '#FFFFFF';
  };
  
  return (
    <div ref={containerRef} className="relative w-full h-full bg-cyber-black rounded-neural overflow-hidden">
      {/* Visualization Controls */}
      <div className="absolute top-4 left-4 z-10 flex space-x-2">
        {['neural', 'flow', 'tree'].map((mode) => (
          <button
            key={mode}
            onClick={() => setVisualizationMode(mode)}
            className={`px-3 py-1 text-xs font-cyber uppercase rounded ${
              visualizationMode === mode
                ? 'bg-cyber-blue text-cyber-black'
                : 'bg-cyber-dark text-cyber-blue border border-cyber-blue'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>
      
      {/* Session Controls */}
      {session && (
        <div className="absolute top-4 right-4 z-10 flex space-x-2">
          {session.status === 'active' && (
            <>
              <button
                onClick={onPause}
                className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-500"
              >
                ⏸️ PAUSE
              </button>
              <button
                onClick={onStop}
                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-500"
              >
                ⏹️ STOP
              </button>
            </>
          )}
        </div>
      )}
      
      {/* Main SVG Visualization */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
        style={{ background: 'radial-gradient(circle at center, rgba(0,212,255,0.05) 0%, transparent 70%)' }}
      />
      
      {/* Status Overlay */}
      <AnimatePresence>
        {session && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-4 left-4 z-10 panel-cyber-glass p-3 rounded-cyber"
          >
            <div className="text-xs font-cyber text-cyber-blue mb-1">
              SESSION STATUS
            </div>
            <div className={`text-sm font-bold ${
              session.status === 'active' ? 'text-cyber-green animate-pulse' :
              session.status === 'completed' ? 'text-cyber-blue' :
              session.status === 'error' ? 'text-cyber-pink' :
              'text-yellow-400'
            }`}>
              {session.status.toUpperCase()}
            </div>
            {session.performance && (
              <div className="text-xs text-gray-400 mt-1">
                {session.performance.chunkCount} chunks • {session.performance.tokensPerSecond} tok/s
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* No Session State */}
      {!session && (
        <div className="absolute inset-0 flex-cyber">
          <div className="text-center text-gray-400">
            <div className="text-6xl mb-4">🎼</div>
            <div className="text-lg font-cyber">Ready to Conduct</div>
            <div className="text-sm">Start a reasoning session to see the magic</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReasoningVisualizer;