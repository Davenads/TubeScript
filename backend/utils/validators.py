import re
from pydantic import ValidationError, validator

def is_valid_youtube_url(url: str) -> bool:
    """Validate a YouTube URL"""
    youtube_regex = (
        r'(https?://)?(www\.)?(youtube\.com/watch\?v=|youtu\.be/)([a-zA-Z0-9_-]{11})'
    )
    match = re.match(youtube_regex, url)
    return match is not None

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
