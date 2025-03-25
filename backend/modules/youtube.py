import os
import asyncio
import tempfile
from yt_dlp import YoutubeDL
from pydub import AudioSegment

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
