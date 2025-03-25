import os
import asyncio
import torch
import numpy as np
import time
from pyannote.audio import Pipeline
from dotenv import load_dotenv
from utils.audio import start_gpu_monitoring

# Load environment variables
load_dotenv()

async def perform_diarization(audio_path: str):
    """Perform speaker diarization on an audio file"""
    # Get HuggingFace token from environment
    hf_token = os.getenv("HUGGINGFACE_TOKEN")
    if not hf_token:
        raise ValueError("HUGGINGFACE_TOKEN not found. Required for pyannote.audio")
    
    # Run diarization in a thread pool to avoid blocking
    loop = asyncio.get_event_loop()
    
    # Start GPU monitoring if CUDA is available
    if torch.cuda.is_available():
        print("\nStarting GPU monitoring during diarization...")
        stop_monitoring = start_gpu_monitoring(interval=5.0)
    else:
        stop_monitoring = lambda: None
    
    def run_diarization():
        # Initialize the diarization pipeline with latest model
        print("Loading pyannote/speaker-diarization-3.1 model...")
        
        # Check CUDA availability and device properties for diarization
        device = "cpu"
        if torch.cuda.is_available():
            cuda_device = torch.cuda.current_device()
            device = f"cuda:{cuda_device}"
            print(f"CUDA available for diarization: Using {torch.cuda.get_device_name(cuda_device)}")
            print(f"CUDA memory before loading diarization model: {torch.cuda.memory_allocated(cuda_device) / 1024**2:.2f} MB")
        else:
            print("WARNING: CUDA not available for diarization, using CPU (will be much slower)")
        
        # Filter common PyTorch warnings that don't affect functionality
        import warnings
        warnings.filterwarnings("ignore", message="std\\(\\): degrees of freedom")
        warnings.filterwarnings("ignore", message="Reduction of non-zero size tensor to zero size")
            
        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=hf_token
        )
        
        # Move model to specified device
        pipeline = pipeline.to(torch.device(device))
        print(f"Speaker diarization model loaded successfully on {device}")
        
        if torch.cuda.is_available():
            print(f"CUDA memory after loading diarization model: {torch.cuda.memory_allocated() / 1024**2:.2f} MB")
            
        # Apply the pipeline to the audio file
        print(f"Starting diarization of {audio_path}...")
        start_time = torch.cuda.Event(enable_timing=True) if torch.cuda.is_available() else None
        end_time = torch.cuda.Event(enable_timing=True) if torch.cuda.is_available() else None
        
        if start_time:
            start_time.record()
            
        diarization = pipeline(audio_path)
        
        if end_time:
            end_time.record()
            torch.cuda.synchronize()
            elapsed_time = start_time.elapsed_time(end_time) / 1000  # Convert ms to seconds
            print(f"Diarization completed in {elapsed_time:.2f} seconds on {device}")
        else:
            print("Diarization completed successfully on CPU")
        
        # Convert the results to a list of segments
        segments = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            segments.append({
                "start": turn.start,
                "end": turn.end,
                "speaker": f"Speaker {speaker.split('_')[-1]}"  # Format as "Speaker 1", "Speaker 2", etc.
            })
        
        # Sort segments by start time
        segments.sort(key=lambda x: x["start"])
        
        return segments
    
    # Run the diarization in a thread pool
    diarization_result = await loop.run_in_executor(None, run_diarization)
    
    # Stop GPU monitoring
    if torch.cuda.is_available():
        stop_monitoring()
        
        # Report GPU memory stats after diarization
        print("\n===== DIARIZATION COMPLETED =====")
        print(f"Final CUDA memory allocated: {torch.cuda.memory_allocated() / 1024**2:.2f} MB")
        print(f"Final CUDA memory reserved: {torch.cuda.memory_reserved() / 1024**2:.2f} MB")
        print(f"Peak CUDA memory allocated: {torch.cuda.max_memory_allocated() / 1024**2:.2f} MB")
        print("==================================\n")
    
    return diarization_result
