try:
    import tensorrt_llm
    print('TensorRT-LLM version:', tensorrt_llm.__version__)
except ImportError:
    print('TensorRT-LLM not installed')
    
try:
    import transformers
    print('Transformers version:', transformers.__version__)
except ImportError:
    print('Transformers not available')