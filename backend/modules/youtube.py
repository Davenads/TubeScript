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
        'no_warnings': True,
        'noprogress': True  # Suppress download progress output
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
        'noprogress': True,  # Suppress progress output
        'extract_flat': True,  # Don't download, just get metadata
        'socket_timeout': 30,  # 30 second timeout
        'retries': 2,
    }
    
    # For channels, try to get videos directly first, fallback to uploads playlist if needed
    if url_type == 'channel':
        print(f"Channel URL detected: {url}")
        # For @username format and other channel formats, let yt-dlp handle it directly first
        # If that doesn't work, we'll extract the channel ID and use uploads playlist
    
    def extract():
        with YoutubeDL(ydl_opts) as ydl:
            try:
                print(f"Extracting info from: {url}")
                info = ydl.extract_info(url, download=False)
                print(f"Extraction successful. Info keys: {list(info.keys()) if info else 'None'}")
                
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
                print(f"Found {len(entries)} entries")
                
                # For channels, if we don't get entries, try to get the uploads playlist
                if url_type == 'channel' and not entries:
                    print("No entries found for channel, trying uploads playlist...")
                    channel_id = info.get('channel_id') or info.get('id')
                    if channel_id and channel_id.startswith('UC'):
                        uploads_url = f"https://www.youtube.com/playlist?list=UU{channel_id[2:]}"
                        print(f"Trying uploads playlist: {uploads_url}")
                        uploads_info = ydl.extract_info(uploads_url, download=False)
                        entries = uploads_info.get('entries', [])
                        print(f"Found {len(entries)} entries in uploads playlist")
                
                # Filter out None entries and entries without IDs (these are often playlist sections)
                valid_entries = []
                for entry in entries:
                    if entry and entry.get('id') and entry.get('_type') != 'playlist':
                        valid_entries.append(entry)
                
                print(f"Filtered to {len(valid_entries)} valid video entries")
                
                if limit:
                    valid_entries = valid_entries[:limit]
                    print(f"Limited to {len(valid_entries)} entries")
                
                for entry in valid_entries:
                    video_info = {
                        'id': entry.get('id'),
                        'title': entry.get('title', 'Unknown'),
                        'duration': entry.get('duration', 0),
                        'url': f"https://youtube.com/watch?v={entry.get('id')}",
                        'thumbnail': entry.get('thumbnail'),
                        'upload_date': entry.get('upload_date'),
                        'view_count': entry.get('view_count', 0),
                    }
                    batch_info['videos'].append(video_info)
                
                batch_info['total_videos'] = len(batch_info['videos'])
                print(f"Final batch info: {batch_info['total_videos']} videos")
                return batch_info
                
            except Exception as e:
                print(f"Error extracting info: {e}")
                raise
    
    # Run extraction in a thread pool
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, extract)

async def get_video_list_preview(url: str, limit: int = 10) -> Dict:
    """Get a preview of videos from playlist/channel for frontend display"""
    batch_info = await extract_batch_info(url, limit)
    return {
        'type': batch_info['type'],
        'title': batch_info['title'],
        'total_videos': batch_info['total_videos'],
        'preview_videos': batch_info['videos'][:limit],
        'has_more': batch_info['total_videos'] > limit
    }

async def get_all_videos_from_source(url: str, offset: int = 0, limit: int = 50) -> Dict:
    """Get all videos from playlist/channel with pagination for interactive selection"""
    batch_info = await extract_batch_info(url, None)  # Get all videos
    
    total_videos = len(batch_info['videos'])
    paginated_videos = batch_info['videos'][offset:offset + limit]
    
    return {
        'type': batch_info['type'],
        'title': batch_info['title'],
        'uploader': batch_info['uploader'],
        'total_videos': total_videos,
        'videos': paginated_videos,
        'offset': offset,
        'limit': limit,
        'has_more': offset + limit < total_videos
    }
