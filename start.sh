#!/bin/bash
echo "🎼 NEURAL SYMPHONY - AI REASONING ORCHESTRATOR"
echo "=============================================="
echo ""

# Check if tmux is available
if command -v tmux &> /dev/null; then
    echo "Starting with tmux (recommended)..."
    
    # Create new tmux session
    tmux new-session -d -s neural-symphony
    
    # Split into two panes
    tmux split-window -h
    
    # Start backend in first pane
    tmux send-keys -t 0 './start-backend.sh' Enter
    
    # Start frontend in second pane  
    tmux send-keys -t 1 './start-frontend.sh' Enter
    
    echo ""
    echo "✅ Neural Symphony started in tmux session 'neural-symphony'"
    echo ""
    echo "📋 Useful commands:"
    echo "   tmux attach -t neural-symphony  # Attach to session"
    echo "   tmux kill-session -t neural-symphony  # Stop everything"
    echo ""
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔗 Backend:  http://localhost:3001"
    echo ""
    echo "Press Ctrl+C to stop this script (services will continue running)"
    
    # Keep script running
    while true; do sleep 1; done
    
else
    echo "tmux not found. Starting manually..."
    echo ""
    echo "In one terminal, run: ./start-backend.sh"
    echo "In another terminal, run: ./start-frontend.sh"
    echo ""
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔗 Backend:  http://localhost:3001"
fi
