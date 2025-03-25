#!/usr/bin/env python3

import torch
import os
from dotenv import load_dotenv
import whisper
from pyannote.audio import Pipeline
from huggingface_hub import login

# Load environment variables
load_dotenv()

def main():
    # Check if CUDA is available and provide detailed GPU information
    print(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        device_count = torch.cuda.device_count()
        print(f"Number of CUDA devices: {device_count}")
        
        for i in range(device_count):
            props = torch.cuda.get_device_properties(i)
            print(f"CUDA device {i}: {props.name}")
            print(f"  Total memory: {props.total_memory / 1024**2:.0f} MB")
            print(f"  CUDA capability: {props.major}.{props.minor}")
            print(f"  Multi processors: {props.multi_processor_count}")
            
        # Test basic CUDA operations
        try:
            x = torch.randn(1000, 1000, device="cuda")
            y = torch.randn(1000, 1000, device="cuda")
            torch.cuda.synchronize()
            start_event = torch.cuda.Event(enable_timing=True)
            end_event = torch.cuda.Event(enable_timing=True)
            start_event.record()
            z = torch.matmul(x, y)
            end_event.record()
            torch.cuda.synchronize()
            print(f"Matrix multiplication test: {start_event.elapsed_time(end_event):.2f} ms")
            del x, y, z
            torch.cuda.empty_cache()
            print("CUDA test successful - GPU acceleration is working")
        except Exception as e:
            print(f"CUDA test failed with error: {str(e)}")
    
    # Get HuggingFace token from environment
    hf_token = os.getenv("HUGGINGFACE_TOKEN")
    if not hf_token:
        print("WARNING: HUGGINGFACE_TOKEN not found in environment or .env file")
        print("You will need to set this to access the pyannote models")
        print("Get your token from https://huggingface.co/settings/tokens")
    else:
        print("HuggingFace token found, attempting to login...")
        login(token=hf_token)
    
    # Preload and cache the Whisper model
    print("\nPreloading Whisper model...")
    try:
        # Enable TensorFloat32 precision if available for faster inference
        if torch.cuda.is_available() and torch.cuda.get_device_capability()[0] >= 8:
            print("Enabling TensorFloat32 for faster inference")
            torch.set_float32_matmul_precision('high')
            
        # Track memory before and after model loading
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            mem_before = torch.cuda.memory_allocated() / 1024**2
            print(f"GPU memory before Whisper: {mem_before:.2f} MB")
            
        # Load model directly to GPU when available
        device = "cuda" if torch.cuda.is_available() else "cpu"
        model = whisper.load_model("large", device=device)
        
        if torch.cuda.is_available():
            mem_after = torch.cuda.memory_allocated() / 1024**2
            print(f"GPU memory after Whisper: {mem_after:.2f} MB")
            print(f"Whisper model size in GPU memory: {mem_after - mem_before:.2f} MB")
            
        print(f"Whisper model loaded successfully on {device}!")
        
        # Run a small test to ensure model works as expected
        print("Running test inference with Whisper...")
        sample_audio = torch.randn(16000, device=device)  # 1 second of random noise
        with torch.inference_mode():
            # Just run the encoder to test
            encoded = model.encoder(sample_audio.unsqueeze(0))
            print(f"Test inference successful! Output shape: {encoded.shape}")
            
    except Exception as e:
        print(f"Error loading Whisper model: {e}")
    
    # Preload and cache pyannote model (requires HF token)
    if hf_token:
        print("\nPreloading pyannote diarization model...")
        try:
            # Set device for PyAnnote
            device = "cuda" if torch.cuda.is_available() else "cpu"
            
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                mem_before = torch.cuda.memory_allocated() / 1024**2
                print(f"GPU memory before diarization model: {mem_before:.2f} MB")
            
            # Load model
            pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1", 
                use_auth_token=hf_token
            )
            
            # Move model to GPU if available
            if torch.cuda.is_available():
                pipeline = pipeline.to(torch.device(device))
                mem_after = torch.cuda.memory_allocated() / 1024**2
                print(f"GPU memory after diarization model: {mem_after:.2f} MB")
                print(f"Diarization model size in GPU memory: {mem_after - mem_before:.2f} MB")
                
            print(f"Pyannote diarization model loaded successfully on {device}!")
            
            # Run a quick test to verify it's working
            if torch.cuda.is_available():
                try:
                    # Create a small test tensor and run a forward pass through part of the model
                    # to verify CUDA execution
                    print("Testing diarization model pipeline on GPU...")
                    # Note: We can't easily run a quick forward pass with the pipeline API
                    # So we just check the device placement
                    device_location = next(pipeline.parameters()).device
                    print(f"Model parameters are on: {device_location}")
                    if device_location.type == "cuda":
                        print("Diarization model is correctly loaded on GPU")
                    else:
                        print("WARNING: Diarization model is on CPU despite CUDA being available")
                except Exception as e:
                    print(f"Diarization GPU test error: {e}")
                    
        except Exception as e:
            print(f"Error loading pyannote model: {e}")
    
    print("\nPreloading complete! Models are now cached.")

if __name__ == "__main__":
    main()
