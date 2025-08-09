#!/usr/bin/env python3
"""
Transformers server for gpt-oss models on Windows with CUDA acceleration
"""
import argparse
import json
import logging
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from fastapi import FastAPI, HTTPException
import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
model = None
tokenizer = None
pipe = None

def initialize_model(model_name: str, model_path: str = None, device: str = "cuda", dtype: str = "auto"):
    global model, tokenizer, pipe
    try:
        logger.info(f"Initializing Transformers with model: {model_name}")
        logger.info(f"Using device: {device}")
        
        # Determine model path
        model_id = model_path if model_path else model_name
        if model_path and not model_path.startswith(('/', 'C:')):
            model_id = f"./models/{model_name}"
        
        # Set torch dtype
        if dtype == "auto":
            torch_dtype = torch.bfloat16 if torch.cuda.is_available() else torch.float32
        else:
            torch_dtype = getattr(torch, dtype)
        
        logger.info(f"Loading model from: {model_id}")
        logger.info(f"Using dtype: {torch_dtype}")
        
        # Create pipeline for better Windows compatibility
        pipe = pipeline(
            "text-generation",
            model=model_id,
            torch_dtype=torch_dtype,
            device_map="auto" if device == "cuda" else device,
            trust_remote_code=True,
            model_kwargs={
                "low_cpu_mem_usage": True,
                "use_cache": True
            }
        )
        
        logger.info("Transformers model initialized successfully")
        print("Model loaded successfully - Server ready")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize model: {e}")
        print(f"Model initialization failed: {e}")
        return False

@app.post("/v1/chat/completions")
async def chat_completions(request: dict):
    if pipe is None:
        raise HTTPException(status_code=503, detail="Model not initialized")
    
    try:
        messages = request.get("messages", [])
        if not messages:
            raise HTTPException(status_code=400, detail="No messages provided")
        
        # Use the chat template for proper formatting
        prompt = pipe.tokenizer.apply_chat_template(
            messages, 
            tokenize=False, 
            add_generation_prompt=True
        )
        
        # Generation parameters
        generation_args = {
            "max_new_tokens": request.get("max_tokens", 1024),
            "temperature": request.get("temperature", 0.7),
            "top_p": request.get("top_p", 0.9),
            "do_sample": True,
            "pad_token_id": pipe.tokenizer.eos_token_id,
            "return_full_text": False
        }
        
        # Generate
        outputs = pipe(prompt, **generation_args)
        generated_text = outputs[0]["generated_text"]
        
        return {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": generated_text
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": len(prompt.split()),
                "completion_tokens": len(generated_text.split()),
                "total_tokens": len(prompt.split()) + len(generated_text.split())
            }
        }
        
    except Exception as e:
        logger.error(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "healthy", "backend": "transformers"}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="gpt-oss-20b")
    parser.add_argument("--model-path", default=None)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--device", default="cuda")
    parser.add_argument("--dtype", default="auto")
    parser.add_argument("--max-length", type=int, default=4096)
    
    args = parser.parse_args()
    
    success = initialize_model(args.model, args.model_path, args.device, args.dtype)
    if not success:
        exit(1)
    
    print(f"Transformers server ready on {args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port)

if __name__ == "__main__":
    main()
