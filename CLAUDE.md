# NEURAL SYMPHONY - AI Reasoning Orchestrator
## Claude Project Brief & Development Guide

---

## 🎼 PROJECT OVERVIEW

**Neural Symphony** transforms GPT-oss-20b into a live reasoning performance studio where users can conduct AI thinking like a maestro conducting an orchestra. This is a web-based real-time interface that visualizes and controls the model's chain-of-thought reasoning process.

**Contest Page Dump** @hackathon_rules.txt
**Contest Categories:** Best Overall + Best Local Agent + Wildcard  
**Timeline:** 35 days  
**Hardware:** RTX 4060 Ti (16GB VRAM), 32GB RAM, x86 architecture
**Software Env** Ubuntu w/ CUDA 12.9
**Development Env** Create one with `conda`

---

## 🎯 CORE CONCEPT

Transform raw GPT-oss chain-of-thought reasoning into an interactive, visual performance where users can:
- **Conduct reasoning** with real-time controls
- **Visualize thought processes** as they happen
- **Race multiple reasoning approaches** simultaneously  
- **Control expert activation** and reasoning depth
- **Blend analysis/final channels** like a DJ mixer

---

## 🔧 TECHNICAL ARCHITECTURE

### Backend Stack
- **Model:** GPT-oss-20b (runs in 16GB VRAM)
- **Inference:** vLLM or Transformers with optimized settings
- **Runtime:** Node.js with Express/Fastify
- **WebSockets:** Real-time bidirectional communication
- **CoT Parser:** Custom harmony format parser for dual channels

### Frontend Stack
- **Framework:** React/Vue.js with real-time updates
- **Visualization:** D3.js, Three.js, or WebGL for reasoning flows
- **UI Controls:** Custom slider/knob components
- **Styling:** Modern dark theme with neon accents (cyberpunk aesthetic)

### Key Components
1. **Reasoning Engine:** Multi-stream parallel processing
2. **CoT Parser:** Extract analysis vs final channels
3. **Expert Monitor:** Track MoE expert activations
4. **Control Interface:** Real-time parameter adjustment
5. **Visualization Engine:** Live reasoning flow display

---

## 🎮 USER INTERFACE DESIGN

### Main Dashboard Layout
```
┌─────────────────────────────────────────────────────────┐
│ [PROBLEM INPUT]                    [REASONING CONTROLS] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│           LIVE REASONING VISUALIZATION                  │
│     ┌─ Analysis Track ─┐  ┌─ Creative Track ─┐        │
│     │   Raw thinking   │  │  Alternative paths │        │
│     └──────────────────┘  └────────────────────┘        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ [EXPERT HEATMAP]        [OUTPUT MIXER]    [FINAL OUTPUT]│
└─────────────────────────────────────────────────────────┘
```

### Control Panel Features
- **Reasoning Effort Slider:** Low/Medium/High (affects model reasoning depth)
- **Expert Bias Knobs:** Math, Creative, Logic, Analysis weights
- **Speed/Quality Mixer:** Real-time performance vs accuracy trade-off
- **Channel Blend:** Mix analysis (raw) vs final (polished) output
- **Problem Complexity:** Auto-scaling reasoning approach
- **Parallel Tracks:** Enable/disable multiple reasoning streams

---

## 🚀 DEVELOPMENT PHASES

### Phase 1: Core Engine (Days 1-14)
**Goal:** Get GPT-oss-20b running with basic CoT extraction

**Tasks:**
- [ ] Set up gpt-oss-20b inference pipeline (vLLM recommended)
- [ ] Implement harmony format parser for dual channels
- [ ] Build basic Node.js API with model integration
- [ ] Create WebSocket connection for real-time communication
- [ ] Test basic reasoning parameter control (effort levels)

**Key Files:**
- `src/models/gpt-oss-interface.js` - Model wrapper
- `src/parsers/harmony-parser.js` - CoT channel extractor
- `src/api/reasoning-engine.js` - Core reasoning API
- `src/websocket/real-time-handler.js` - Live updates

### Phase 2: Visualization Engine (Days 15-28)
**Goal:** Build the live reasoning visualization interface

**Tasks:**
- [ ] Design and implement reasoning flow visualization
- [ ] Create expert activity heatmap display
- [ ] Build control panel with real-time sliders/knobs
- [ ] Implement parallel reasoning track display
- [ ] Add analysis/final channel mixer interface

**Key Files:**
- `src/components/ReasoningVisualizer.jsx` - Main viz component
- `src/components/ExpertHeatmap.jsx` - MoE expert display
- `src/components/ControlPanel.jsx` - Interactive controls
- `src/utils/visualization-engine.js` - Rendering logic

### Phase 3: Performance & Polish (Days 29-35)
**Goal:** Optimize performance and create demo scenarios

**Tasks:**
- [ ] Performance optimization for real-time updates
- [ ] Create compelling demo scenarios
- [ ] Record demonstration video (<3 minutes)
- [ ] Write comprehensive documentation
- [ ] Final testing and bug fixes

**Key Files:**
- `demos/` - Curated demo scenarios
- `docs/` - Setup and usage documentation
- `scripts/` - Performance optimization scripts

---

## 🎨 VISUAL DESIGN SYSTEM

### Color Palette
- **Primary:** Electric blue (#00D4FF)
- **Secondary:** Neon green (#39FF14) 
- **Accent:** Hot pink (#FF1493)
- **Background:** Deep space black (#0A0A0A)
- **Text:** Pure white (#FFFFFF)

### Visual Metaphors
- **Reasoning flows:** Neural pathways with particle effects
- **Expert activation:** Pulsing neural nodes
- **Thinking intensity:** Color temperature shifts
- **Problem complexity:** Geometric complexity patterns
- **Speed/quality:** Racing visual metaphors

---

## 🎯 DEMO SCENARIOS

### 1. "Climate Solution Conductor" (Primary Demo)
**Problem:** "Design a carbon-negative city that's economically profitable"
**Show:** Expert bias shifting, parallel reasoning, complexity scaling

### 2. "Creative Problem Racing"
**Problem:** "Invent a new form of entertainment for the year 2050"
**Show:** Multiple reasoning tracks, creative vs logical approaches

### 3. "Real-time Debugging"
**Problem:** Complex logic puzzle with interactive reasoning adjustment
**Show:** Pause/resume reasoning, branch exploration, solution optimization

---

## 🛠 TECHNICAL REQUIREMENTS

### System Requirements
- **GPU:** 16GB VRAM minimum (RTX 4060 Ti confirmed compatible)
- **RAM:** 32GB system memory
- **Storage:** 50GB free space for model weights
- **OS:** Linux/Windows with CUDA support

### Dependencies
```json
{
  "backend": {
    "node": ">=18.0.0",
    "express": "^4.18.0",
    "ws": "^8.13.0",
    "transformers": "^4.55.0"
  },
  "frontend": {
    "react": "^18.0.0",
    "d3": "^7.8.0",
    "three": "^0.150.0",
    "tailwindcss": "^3.3.0"
  },
  "ai": {
    "gpt-oss-20b": "openai/gpt-oss-20b",
    "vllm": "^0.3.0",
    "torch": ">=2.0.0"
  }
}
```

---

## 🎪 UNIQUE SELLING POINTS

### What Makes This Special
1. **First AI reasoning conductor** - Turn thinking into performance art
2. **Real-time CoT manipulation** - Control AI thoughts as they happen
3. **Dual-channel exploitation** - Leverage gpt-oss's unique architecture
4. **Expert orchestration** - Manually bias MoE expert selection
5. **Offline powerhouse** - Zero internet dependency
6. **Visual thinking** - Make abstract reasoning tangible

### Wildcard Elements
- **Reasoning as performance art** - Never been done before
- **Live AI conducting** - Interactive real-time thought control
- **Multi-track thinking** - Racing reasoning approaches
- **Hardware integration** - Could add physical controls later

---

## 📋 SUCCESS METRICS

### Technical Goals
- [ ] Sub-2 second response time for simple queries
- [ ] Real-time visualization at 30+ FPS
- [ ] Stable WebSocket connections under load
- [ ] Clean harmony format parsing (95%+ accuracy)
- [ ] Smooth expert activation tracking

### User Experience Goals
- [ ] Intuitive controls that feel like conducting
- [ ] Mesmerizing visual feedback that draws attention
- [ ] Clear demonstration of AI reasoning process
- [ ] "Holy crap" moments that wow judges
- [ ] Practical utility for complex problem-solving

---

## 🎬 DEMO VIDEO OUTLINE

### 3-Minute Demo Structure
**0:00-0:30** - Hook: "What if you could conduct AI thinking like music?"
**0:30-1:30** - Live demo: Solving complex problem with visual reasoning
**1:30-2:30** - Feature showcase: Controls, expert bias, parallel tracks
**2:30-3:00** - Impact: "The future of human-AI collaboration"

---

## 📂 PROJECT STRUCTURE

```
neural-symphony/
├── README.md                 # Project overview & setup
├── CLAUDE.md                # This file - dev guide
├── package.json             # Dependencies
├── docker-compose.yml       # Easy deployment
├── src/
│   ├── backend/             # Node.js API server
│   ├── frontend/            # React web interface  
│   ├── models/              # GPT-oss integration
│   ├── parsers/             # Harmony format handling
│   └── utils/               # Shared utilities
├── demos/                   # Curated scenarios
├── docs/                    # Documentation
├── scripts/                 # Setup & optimization
└── assets/                  # Media & resources
```

---

## 🚨 CRITICAL SUCCESS FACTORS

### Must-Have Features
1. **Real-time CoT visualization** - Core differentiator
2. **Interactive reasoning control** - The "conducting" experience
3. **Stable offline operation** - No internet dependency
4. **Expert activity monitoring** - Show MoE in action
5. **Parallel reasoning streams** - Multi-track thinking

### Performance Requirements
- **First token latency:** <2 seconds
- **Streaming tokens:** 50+ tokens/second
- **UI responsiveness:** <100ms control feedback
- **Memory efficiency:** Stay within 32GB system RAM
- **GPU utilization:** Maximize 16GB VRAM usage

---

## 🏆 WINNING STRATEGY

This project wins by being the **first to make AI reasoning into a performative art**. We're not just using GPT-oss - we're creating an entirely new paradigm for human-AI interaction that's:

- **Visually stunning** (impossible to ignore)
- **Technically impressive** (exploits unique gpt-oss features)
- **Practically useful** (real problem-solving tool)
- **Completely novel** (reasoning conductor concept)
- **Demo-friendly** (makes for incredible video)

**Let's build the world's first AI reasoning orchestra!** 🎼🤖

---

*Ready to code? Start with Phase 1 and let's make something that changes how people think about AI interaction forever.*