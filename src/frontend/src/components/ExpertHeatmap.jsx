import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';

const ExpertHeatmap = ({ expertActivity, isActive }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  
  const experts = [
    { key: 'math', name: 'Mathematics', color: '#00D4FF', icon: '📊' },
    { key: 'creative', name: 'Creative', color: '#39FF14', icon: '🎨' },
    { key: 'logic', name: 'Logic', color: '#FF1493', icon: '🧠' },
    { key: 'analysis', name: 'Analysis', color: '#9D4EDD', icon: '🔬' }
  ];
  
  useEffect(() => {
    if (!svgRef.current || !expertActivity) return;
    
    const svg = d3.select(svgRef.current);
    const width = 280;
    const height = 200;
    
    svg.selectAll('*').remove();
    
    // Create heatmap for each expert
    experts.forEach((expert, expertIndex) => {
      const activity = expertActivity[expert.key] || { totalScore: 0, intensity: 0, count: 0 };
      const intensity = Math.min(activity.totalScore || 0, 1);
      
      const expertGroup = svg.append('g')
        .attr('class', `expert-group-${expert.key}`)
        .attr('transform', `translate(10, ${expertIndex * 45 + 10})`);
      
      // Expert label
      expertGroup.append('text')
        .attr('x', 0)
        .attr('y', 15)
        .attr('fill', expert.color)
        .attr('font-size', '12px')
        .attr('font-family', 'Rajdhani, sans-serif')
        .attr('font-weight', 'bold')
        .text(`${expert.icon} ${expert.name}`);
      
      // Activity bar
      const barWidth = 180;
      const barHeight = 8;
      
      expertGroup.append('rect')
        .attr('x', 80)
        .attr('y', 8)
        .attr('width', barWidth)
        .attr('height', barHeight)
        .attr('fill', 'rgba(255, 255, 255, 0.1)')
        .attr('rx', 4);
      
      expertGroup.append('rect')
        .attr('x', 80)
        .attr('y', 8)
        .attr('width', 0)
        .attr('height', barHeight)
        .attr('fill', expert.color)
        .attr('opacity', 0.8)
        .attr('rx', 4)
        .transition()
        .duration(1000)
        .ease(d3.easeElastic)
        .attr('width', intensity * barWidth);
      
      // Score text
      expertGroup.append('text')
        .attr('x', 270)
        .attr('y', 15)
        .attr('fill', expert.color)
        .attr('font-size', '11px')
        .attr('font-family', 'monospace')
        .attr('text-anchor', 'end')
        .text((intensity * 100).toFixed(1) + '%');
      
      // Activity indicators (mini heatmap cells)
      const cellSize = 6;
      const cellsPerRow = 20;
      const numRows = 3;
      
      for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < cellsPerRow; col++) {
          const cellIntensity = Math.max(0, intensity - (row * 0.3) - (col / cellsPerRow * 0.2));
          
          expertGroup.append('rect')
            .attr('x', 80 + col * (cellSize + 1))
            .attr('y', 20 + row * (cellSize + 1))
            .attr('width', cellSize)
            .attr('height', cellSize)
            .attr('fill', expert.color)
            .attr('opacity', cellIntensity * 0.7)
            .attr('rx', 1)
            .style('animation', isActive && cellIntensity > 0.1 ? `expert-pulse 2s ease-in-out infinite ${col * 0.1}s` : 'none');
        }
      }
    });
    
  }, [expertActivity, isActive]);
  
  const getTotalActivity = () => {
    if (!expertActivity) return 0;
    return Object.values(expertActivity).reduce((sum, activity) => sum + (activity.totalScore || 0), 0);
  };
  
  const getActiveExperts = () => {
    if (!expertActivity) return 0;
    return Object.values(expertActivity).filter(activity => (activity.totalScore || 0) > 0.1).length;
  };
  
  return (
    <div ref={containerRef} className="h-full p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-cyber text-cyber-blue">
          🧠 EXPERT ACTIVITY
        </h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-cyber-green animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-xs text-gray-400">
            {isActive ? 'MONITORING' : 'IDLE'}
          </span>
        </div>
      </div>
      
      {/* Activity Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="panel-cyber-glass p-3 rounded-cyber">
          <div className="text-xs text-gray-400 mb-1">Total Activity</div>
          <div className="text-xl font-bold text-cyber-blue">
            {(getTotalActivity() * 100).toFixed(1)}%
          </div>
        </div>
        <div className="panel-cyber-glass p-3 rounded-cyber">
          <div className="text-xs text-gray-400 mb-1">Active Experts</div>
          <div className="text-xl font-bold text-cyber-green">
            {getActiveExperts()}/4
          </div>
        </div>
      </div>
      
      {/* Heatmap Visualization */}
      <div className="panel-cyber-glass rounded-cyber p-3">
        <svg
          ref={svgRef}
          width="100%"
          height="200"
          className="overflow-visible"
        />
      </div>
      
      {/* Expert Details */}
      {expertActivity && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-cyber-white">Expert Details</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {experts.map((expert) => {
              const activity = expertActivity[expert.key];
              if (!activity || activity.totalScore < 0.01) return null;
              
              return (
                <motion.div
                  key={expert.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between text-xs p-2 bg-cyber-dark/50 rounded"
                >
                  <span style={{ color: expert.color }}>
                    {expert.icon} {expert.name}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">{activity.count} matches</span>
                    <span style={{ color: expert.color }} className="font-mono">
                      {(activity.totalScore * 100).toFixed(1)}%
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* No Activity State */}
      {!expertActivity && (
        <div className="flex-cyber h-32 text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-2">💤</div>
            <div className="text-sm">No expert activity detected</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpertHeatmap;