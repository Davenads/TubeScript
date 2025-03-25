import os
import numpy as np
from pydub import AudioSegment
import torch
import torchaudio
import threading
import time

def convert_to_mono_16khz(input_path: str, output_path: str = None):
    """Convert audio to mono 16kHz for optimal model performance"""
    if output_path is None:
        # If no output path provided, modify the input file
        base, ext = os.path.splitext(input_path)
        output_path = f"{base}_mono_16k{ext}"
    
    # Load the audio
    audio = AudioSegment.from_file(input_path)
    
    # Convert to mono
    audio = audio.set_channels(1)
    
    # Convert to 16kHz
    audio = audio.set_frame_rate(16000)
    
    # Export
    audio.export(output_path, format=output_path.split('.')[-1])
    
    return output_path

def load_audio_tensor(file_path: str, device="auto"):
    """Load audio as a PyTorch tensor"""
    if device == "auto":
        device = "cuda" if torch.cuda.is_available() else "cpu"
    
    print(f"Loading audio tensor on {device}")
    
    # Load the audio file (directly to the right device if possible)
    try:
        # New way - load directly to target device with torchaudio 2.0+
        waveform, sample_rate = torchaudio.load(file_path, device=device)
        print(f"Audio loaded directly to {device}")
    except TypeError:
        # Fallback for older torchaudio versions
        waveform, sample_rate = torchaudio.load(file_path)
        print(f"Audio loaded to CPU, will transfer to {device} later")
    
    # Convert to mono if it's stereo
    if waveform.shape[0] > 1:
        waveform = torch.mean(waveform, dim=0, keepdim=True)
    
    # Resample to 16kHz if needed (perform on the target device for speed)
    if sample_rate != 16000:
        if device.startswith("cuda") and waveform.device.type != "cuda":
            # Move to CUDA before resampling for speed
            waveform = waveform.to(device)
            
        resampler = torchaudio.transforms.Resample(sample_rate, 16000).to(waveform.device)
        waveform = resampler(waveform)
        sample_rate = 16000
        
    # Ensure waveform is on the correct device
    if waveform.device.type != device.split(":")[0]:
        waveform = waveform.to(device)
        
    print(f"Audio tensor ready on {waveform.device}, shape: {waveform.shape}")
    return waveform, sample_rate

def start_gpu_monitoring(interval=5.0):
    """Start a background thread that monitors GPU usage.
    
    Args:
        interval: Time in seconds between monitoring updates
        
    Returns:
        A stop function that can be called to stop monitoring
    """
    if not torch.cuda.is_available():
        print("GPU monitoring not started - CUDA not available")
        return lambda: None
        
    stop_event = threading.Event()
    
    def monitor_thread():
        gpu_id = torch.cuda.current_device()
        iteration = 0
        
        print("\n===== Starting GPU Monitoring =====")
        print(f"GPU: {torch.cuda.get_device_name(gpu_id)}")
        
        while not stop_event.is_set():
            # Get memory statistics
            allocated = torch.cuda.memory_allocated(gpu_id) / 1024**2
            reserved = torch.cuda.memory_reserved(gpu_id) / 1024**2
            
            # Get GPU utilization if nvml is available
            gpu_util = "N/A"
            try:
                import pynvml
                pynvml.nvmlInit()
                handle = pynvml.nvmlDeviceGetHandleByIndex(gpu_id)
                util = pynvml.nvmlDeviceGetUtilizationRates(handle)
                gpu_util = f"{util.gpu}%"
                pynvml.nvmlShutdown()
            except:
                pass
                
            print(f"[GPU Monitor] Iteration {iteration}: Allocated: {allocated:.1f} MB, "
                  f"Reserved: {reserved:.1f} MB, Utilization: {gpu_util}")
                  
            iteration += 1
            time.sleep(interval)
    
    # Start monitoring thread
    thread = threading.Thread(target=monitor_thread, daemon=True)
    thread.start()
    
    # Return function to stop monitoring
    def stop_monitoring():
        stop_event.set()
        thread.join(timeout=1.0)
        print("GPU monitoring stopped")
        
    return stop_monitoring
