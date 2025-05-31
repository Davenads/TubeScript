import os
import asyncio
import tempfile
from typing import List, Dict, Optional
from yt_dlp import YoutubeDL
from pydub import AudioSegment
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.validators import get_youtube_url_type

async def download_youtube_audio(youtube_url: str):
    """Download audio from a YouTube video"""
    print(f"Starting download of YouTube URL: {youtube_url}")
    """Download audio from a YouTube video and extract metadata"""
    # Create a temporary directory for the download
    temp_dir = tempfile.mkdtemp()
    output_path = os.path.join(temp_dir, "audio.wav")
    
    # Video information storage
    video_info = {}
    
    # Define download options
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(temp_dir, 'audio'),
        'postprocessors': [{  
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'wav',
        }],
        'quiet': True,
        'no_warnings': True
    }
    
    # Run the download process in a thread pool
    def download():
        with YoutubeDL(ydl_opts) as ydl:
            # Download the video and extract info
            info = ydl.extract_info(youtube_url, download=True)
            
            if 'entries' in info:
                # Playlist, take first video
                info = info['entries'][0]
            
            # Store relevant video metadata
            video_info['title'] = info.get('title', 'Unknown')
            video_info['duration'] = info.get('duration', 0)
            video_info['url'] = youtube_url
            video_info['uploader'] = info.get('uploader', 'Unknown')
            
            # Find the downloaded file
            audio_file = os.path.join(temp_dir, 'audio.wav')
            return audio_file
    
    # Run download in a thread pool
    loop = asyncio.get_event_loop()
    audio_file = await loop.run_in_executor(None, download)
    
    # Convert to mono 16kHz WAV for optimal model performance
    def convert_audio():
        audio = AudioSegment.from_wav(audio_file)
        audio = audio.set_channels(1)  # Convert to mono
        audio = audio.set_frame_rate(16000)  # Convert to 16kHz
        audio.export(output_path, format="wav")
        return output_path
    
    # Run audio conversion in a thread pool
    final_audio_path = await loop.run_in_executor(None, convert_audio)
    
    return final_audio_path, video_info

async def extract_batch_info(url: str, limit: Optional[int] = None) -> Dict:
    """Extract information about playlist or channel videos"""
    url_type = get_youtube_url_type(url)
    
    if url_type not in ['playlist', 'channel']:
        raise ValueError(f"URL type '{url_type}' is not supported for batch processing")
    
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': True,  # Don't download, just get metadata
    }
    
    def extract():
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Extract batch metadata
            batch_info = {
                'type': url_type,
                'url': url,
                'title': info.get('title', 'Unknown'),
                'uploader': info.get('uploader', 'Unknown'),
                'videos': []
            }
            
            # Process video entries
            entries = info.get('entries', [])
            if limit:
                entries = entries[:limit]
            
            for entry in entries:
                if entry:  # Some entries might be None
                    video_info = {
                        'id': entry.get('id'),
                        'title': entry.get('title', 'Unknown'),
                        'duration': entry.get('duration', 0),
                        'url': f"https://youtube.com/watch?v={entry.get('id')}",
                        'thumbnail': entry.get('thumbnail'),
                    }
                    batch_info['videos'].append(video_info)
            
            batch_info['total_videos'] = len(batch_info['videos'])
            return batch_info
    
    # Run extraction in a thread pool
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, extract)

async def get_video_list_preview(url: str, limit: int = 10) -> List[Dict]:
    """Get a preview of videos from playlist/channel for frontend display"""
    batch_info = await extract_batch_info(url, limit)
    return {
        'type': batch_info['type'],
        'title': batch_info['title'],
        'total_videos': batch_info['total_videos'],
        'preview_videos': batch_info['videos'][:limit],
        'has_more': batch_info['total_videos'] > limit
    }
