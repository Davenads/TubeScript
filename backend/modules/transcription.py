import os
import asyncio
import torch
import numpy as np
import whisper
import time
from pydub import AudioSegment
from utils.audio import start_gpu_monitoring

async def transcribe_segments(audio_path: str, segments: list, progress_callback=None):
    """Transcribe each diarized segment using Whisper"""
    loop = asyncio.get_event_loop()
    
    # Start GPU monitoring if CUDA is available
    if torch.cuda.is_available():
        print("\nStarting GPU monitoring during transcription...")
        stop_monitoring = start_gpu_monitoring(interval=10.0)  # Check every 10 seconds
    else:
        stop_monitoring = lambda: None
    
    def load_audio():
        # Load the audio file
        return AudioSegment.from_wav(audio_path)
    
    # Load the audio file in a thread pool
    audio = await loop.run_in_executor(None, load_audio)
    
    def load_model():
        # Load the Whisper model
        # Use large model for high accuracy
        print("Loading Whisper large model...")
        
        # Check CUDA availability and device properties
        if torch.cuda.is_available():
            cuda_device = torch.cuda.current_device()
            print(f"CUDA available: Using {torch.cuda.get_device_name(cuda_device)}")
            print(f"CUDA memory allocated: {torch.cuda.memory_allocated(cuda_device) / 1024**2:.2f} MB")
            # Enable TensorFloat32 precision if available (for Ampere+ GPUs)
            if torch.cuda.get_device_capability(cuda_device)[0] >= 8:
                print("Enabling TensorFloat32 for faster inference")
                torch.set_float32_matmul_precision('high')
        else:
            print("WARNING: CUDA not available, using CPU (will be much slower)")
        
        # Load model (directly specifying device to avoid double transfer)
        device = "cuda" if torch.cuda.is_available() else "cpu"
        model = whisper.load_model("large", device=device)
        print(f"Whisper large model loaded successfully on {device}")
        
        return model
    
    # Load the Whisper model in a thread pool
    model = await loop.run_in_executor(None, load_model)
    
    # Process each segment
    transcribed_segments = []
    
    # Track total processing time
    whisper_start_time = time.time()
    
    for i, segment in enumerate(segments):
        # Get the segment timing
        start_ms = int(segment["start"] * 1000)
        end_ms = int(segment["end"] * 1000)
        
        # Extract the audio segment
        segment_audio = audio[start_ms:end_ms]
        
        # Save to a temporary file
        temp_path = f"temp_segment_{i}.wav"
        
        def process_segment():
            # Export segment to a temporary file
            segment_audio.export(temp_path, format="wav")
            
            # Detailed CUDA diagnostics
            is_cuda_available = torch.cuda.is_available()
            if i == 0:  # Only for first segment
                # Print detailed CUDA info
                if is_cuda_available:
                    print("\n===== CUDA DIAGNOSTICS FOR WHISPER =====")
                    print(f"CUDA Device: {torch.cuda.get_device_name(0)}")
                    print(f"CUDA Capability: {torch.cuda.get_device_capability(0)}")
                    print(f"CUDA Memory Total: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")
                    print(f"CUDA Memory Allocated: {torch.cuda.memory_allocated() / 1024**3:.2f} GB")
                    print(f"CUDA Memory Reserved: {torch.cuda.memory_reserved() / 1024**3:.2f} GB")
                    
                    # Verify model is on CUDA
                    device_type = next(model.parameters()).device.type
                    print(f"Whisper model is on device: {device_type}")
                    if device_type != "cuda":
                        print("WARNING: Whisper model is NOT on CUDA despite CUDA being available!")
                else:
                    print("CUDA is not available - using CPU for Whisper")
            
            # Measure transcription time and memory usage
            start_time = time.time()
            if is_cuda_available:
                # Record memory before transcription
                mem_before = torch.cuda.memory_allocated() / 1024**2
                
                # Setup CUDA timing events
                start_event = torch.cuda.Event(enable_timing=True)
                end_event = torch.cuda.Event(enable_timing=True)
                start_event.record()
            
            # Transcribe with Whisper
            try:
                result = model.transcribe(
                    temp_path,
                    language="en",  # Can be made configurable for other languages
                    fp16=is_cuda_available,  # Enable half-precision for GPU speedup
                    no_speech_threshold=0.6
                )
                
                # Record timing information
                elapsed_time = time.time() - start_time
                
                if is_cuda_available:
                    # Record CUDA-specific timing and memory
                    end_event.record()
                    torch.cuda.synchronize()
                    cuda_time_ms = start_event.elapsed_time(end_event)
                    mem_after = torch.cuda.memory_allocated() / 1024**2
                    mem_diff = mem_after - mem_before
                    
                    # Log detailed information (limit to avoid spam)
                    if i % 5 == 0 or i == 0:  # Log every 5th segment and the first one
                        segment_duration_sec = (end_ms - start_ms) / 1000
                        print(f"Segment {i+1}/{len(segments)}: {segment_duration_sec:.2f}s audio processed in {cuda_time_ms:.2f}ms on CUDA "
                              f"({segment_duration_sec*1000/cuda_time_ms:.2f}x realtime)")
                        print(f"  Memory change: {mem_diff:.2f} MB, Total allocated: {mem_after:.2f} MB")
                else:
                    # CPU timing
                    if i % 5 == 0 or i == 0:
                        segment_duration_sec = (end_ms - start_ms) / 1000
                        print(f"Segment {i+1}/{len(segments)}: {segment_duration_sec:.2f}s audio processed in {elapsed_time*1000:.2f}ms on CPU "
                              f"({segment_duration_sec/elapsed_time:.2f}x realtime)")
                
            except Exception as e:
                print(f"Error during transcription: {str(e)}")
                raise
            
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
            return result
        
        # Process segment in a thread pool
        print(f"Processing segment {i+1}/{len(segments)}: {start_ms}ms to {end_ms}ms (duration: {end_ms-start_ms}ms)")
        result = await loop.run_in_executor(None, process_segment)
        
        # Add transcription to segment data
        transcribed_segment = segment.copy()
        transcribed_segment["text"] = result["text"].strip()
        print(f"Segment {i+1}/{len(segments)} processed: '{result['text'].strip()[:50]}...' (if longer)")
        
        # Update progress if callback provided
        if progress_callback:
            progress_callback(i + 1)
        
        transcribed_segments.append(transcribed_segment)
    
    # Stop GPU monitoring
    if torch.cuda.is_available():
        stop_monitoring()
        
        # Calculate overall statistics
        total_time = time.time() - whisper_start_time
        total_audio_duration = sum([(segment["end"] - segment["start"]) for segment in segments])
        
        print("\n===== WHISPER PROCESSING COMPLETED =====")
        print(f"Processed {len(segments)} segments totaling {total_audio_duration:.2f} seconds")
        print(f"Total processing time: {total_time:.2f} seconds")
        print(f"Realtime factor: {total_audio_duration/total_time:.2f}x")
        
        # Check if still using CUDA and report memory stats
        device_type = next(model.parameters()).device.type
        if device_type == "cuda":
            print(f"Model is on CUDA: Yes")
            print(f"Final CUDA memory allocated: {torch.cuda.memory_allocated() / 1024**2:.2f} MB")
            print(f"Final CUDA memory reserved: {torch.cuda.memory_reserved() / 1024**2:.2f} MB")
            print(f"Peak CUDA memory allocated: {torch.cuda.max_memory_allocated() / 1024**2:.2f} MB")
            
            # Clear GPU memory
            del model
            torch.cuda.empty_cache()
            print(f"CUDA memory after cleanup: {torch.cuda.memory_allocated() / 1024**2:.2f} MB")
            print("===== GPU PROCESSING COMPLETE =====\n")
        else:
            print("Model was on CPU at end of processing")
    
    return transcribed_segments
