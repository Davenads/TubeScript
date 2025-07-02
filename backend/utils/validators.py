import re
import os
from pydantic import ValidationError, validator

def is_valid_youtube_url(url: str) -> bool:
    """Validate a YouTube URL (video, playlist, or channel)"""
    patterns = [
        r'^(https?://)?(www\.)?(youtube\.com/watch\?v=|youtu\.be/)([a-zA-Z0-9_-]{11})(\S*)?$',  # Individual videos
        r'^(https?://)?(www\.)?youtube\.com/playlist\?list=([a-zA-Z0-9_.-]+)(\S*)?$',  # Playlists
        r'^(https?://)?(www\.)?youtube\.com/channel/([a-zA-Z0-9_-]+)(\S*)?$',  # Channels
        r'^(https?://)?(www\.)?youtube\.com/c/([a-zA-Z0-9_.-]+)(\S*)?$',  # Custom channel URLs
        r'^(https?://)?(www\.)?youtube\.com/@([a-zA-Z0-9_.-]+)(\S*)?$',  # Handle format
    ]
    
    for pattern in patterns:
        if re.match(pattern, url.strip()):
            return True
    return False

def get_youtube_url_type(url: str) -> str:
    """Determine the type of YouTube URL"""
    url = url.strip()
    if re.match(r'^(https?://)?(www\.)?(youtube\.com/watch\?v=|youtu\.be/)([a-zA-Z0-9_-]{11})(\S*)?$', url):
        return 'video'
    elif re.match(r'^(https?://)?(www\.)?youtube\.com/playlist\?list=([a-zA-Z0-9_.-]+)(\S*)?$', url):
        return 'playlist'
    elif re.match(r'^(https?://)?(www\.)?youtube\.com/channel/([a-zA-Z0-9_-]+)(\S*)?$', url):
        return 'channel'
    elif re.match(r'^(https?://)?(www\.)?youtube\.com/c/([a-zA-Z0-9_.-]+)(\S*)?$', url):
        return 'channel'
    elif re.match(r'^(https?://)?(www\.)?youtube\.com/@([a-zA-Z0-9_.-]+)(\S*)?$', url):
        return 'channel'
    else:
        return 'unknown'

def validate_timestamp_format(timestamp: str) -> bool:
    """Validate timestamp format (HH:MM:SS.mmm)"""
    pattern = r'^\d{2}:\d{2}:\d{2}\.\d{3}$'
    return re.match(pattern, timestamp) is not None

def sanitize_filename(filename: str) -> str:
    """Sanitize a filename to be safe for the filesystem"""
    # Remove invalid characters
    sanitized = re.sub(r'[<>:"/\\|?*]', '_', filename)
    
    # Truncate if necessary (max filename length is typically 255 chars)
    if len(sanitized) > 255:
        base, ext = os.path.splitext(sanitized)
        base = base[:255 - len(ext) - 1]
        sanitized = f"{base}{ext}"
    
    return sanitized
