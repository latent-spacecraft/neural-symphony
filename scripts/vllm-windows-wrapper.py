#!/usr/bin/env python3
"""
Windows wrapper for vLLM to handle uvloop compatibility issues.
"""
import sys
import os
import subprocess
from unittest.mock import MagicMock

# Mock uvloop for Windows compatibility
sys.modules['uvloop'] = MagicMock()

# Add mock objects to prevent import errors
uvloop_mock = MagicMock()
uvloop_mock.EventLoopPolicy = MagicMock
uvloop_mock.new_event_loop = MagicMock
uvloop_mock.install = lambda: None
sys.modules['uvloop'] = uvloop_mock

print("Windows vLLM wrapper - uvloop mocked for compatibility")

try:
    # Now import and run the vLLM server
    from vllm.entrypoints.openai import api_server
    
    if __name__ == "__main__":
        # Pass through all command line arguments
        api_server.main()
        
except ImportError as e:
    print(f"Import error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"Error starting vLLM: {e}")
    sys.exit(1)