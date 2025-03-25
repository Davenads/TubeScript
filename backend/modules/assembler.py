import os
import asyncio
from datetime import timedelta

def format_timestamp(seconds: float) -> str:
    """Format seconds to [HH:MM:SS.mmm] timestamp"""
    td = timedelta(seconds=seconds)
    hours, remainder = divmod(td.seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}.{int(td.microseconds / 1000):03d}"

async def assemble_transcript(segments: list, video_info: dict):
    """Assemble the final transcript with metadata"""
    # Format the duration as HH:MM:SS
    duration_str = format_timestamp(video_info.get("duration", 0))
    
    # Get the number of unique speakers
    speakers = set()
    for segment in segments:
        speakers.add(segment["speaker"])
    
    # Build the metadata section
    metadata = {
        "title": video_info.get("title", "Unknown"),
        "url": video_info.get("url", ""),
        "duration": duration_str,
        "num_speakers": len(speakers)
    }
    
    # Build the transcript object
    transcript = {
        "metadata": metadata,
        "segments": segments
    }
    
    # For convenience, generate a plaintext version
    plaintext = f"Title: {metadata['title']}\n"
    plaintext += f"URL: {metadata['url']}\n"
    plaintext += f"Duration: {metadata['duration']}\n"
    plaintext += f"Speakers Detected: {metadata['num_speakers']}\n\n"
    
    for segment in segments:
        start_str = format_timestamp(segment["start"])
        end_str = format_timestamp(segment["end"])
        plaintext += f"[{start_str} --> {end_str}] {segment['speaker']}: {segment['text']}\n\n"
    
    transcript["plaintext"] = plaintext
    
    return transcript
