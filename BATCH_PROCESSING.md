# Batch Transcription Processing

This document outlines the batch processing feature for TubeScript, which allows users to process multiple videos at once from YouTube playlists or channels.

## Overview

The batch processing feature enables users to:
- Process all videos in a YouTube playlist
- Process recent videos from a YouTube channel
- Set limits on how many videos to process
- Control processing options like speaker diarization and enhanced exports
- Monitor batch job progress
- Download all transcripts in a single operation

## Implementation Details

### Backend Changes

#### 1. Playlist/Channel Metadata Extraction
- Enhanced `youtube.py` module to extract playlist and channel metadata
- Added support for parsing playlist IDs from various YouTube URL formats
- Implemented channel video listing with configurable limits

#### 2. Batch Job Management
- New API endpoint: `/api/batch-process` 
- Support for job queue management with rate limiting
- Background task processing with progress tracking
- Consolidated export of all completed transcripts

#### 3. Data Structures
```python
# Batch request model
class BatchProcessRequest(BaseModel):
    url: HttpUrl                       # Playlist or channel URL
    type: str = "playlist"             # "playlist" or "channel"
    limit: Optional[int] = None        # Max videos to process (None = all)
    options: Optional[dict] = None     # Processing options
```

### Frontend Implementation

#### 1. Batch Processing UI Component
- Tab-based interface with separate flows for single videos vs. batch processing
- Input fields for playlist/channel URL
- Options for limiting the number of videos
- Expanded progress tracking interface

#### 2. Batch Job Monitoring
- List view of all videos in the batch
- Individual progress indicators
- Batch-level overall progress
- Cancel/pause functionality

#### 3. Batch Download
- Consolidated download options for all completed transcripts
- Format selection (TXT, SRT, VTT)
- Zip file packaging of multiple transcript files

## User Workflow

1. **Input**
   - User enters a YouTube playlist or channel URL
   - User selects processing type (playlist/channel)
   - User sets optional limit on number of videos

2. **Validation & Preview**
   - System validates URL and checks video count
   - Displays preview of videos to be processed
   - User confirms batch processing start

3. **Processing**
   - System queues all videos for processing
   - Processes videos sequentially with progress tracking
   - Handles failures gracefully without stopping entire batch

4. **Results & Export**
   - Displays all completed transcripts with options to:
     - View individual transcripts
     - Rename speakers across all transcripts
     - Download individual or all transcripts
     - Apply enhanced export options to entire batch

## Technical Considerations

### Performance Optimization
- Rate limiting to respect YouTube API quotas
- Configurable concurrency for parallel processing (based on system capabilities)
- Disk space management for temporary audio files

### Error Handling
- Retry mechanism for transient failures
- Skip strategy for persistently problematic videos
- Detailed error reporting per video

### Resource Management
- Estimated disk space requirements displayed before processing
- Automatic cleanup of temporary files
- Cache management for repeated batch processing

## Future Enhancements

- **Scheduled Processing**: Queue batch jobs for off-peak hours
- **Custom Naming Templates**: User-defined naming patterns for exported files
- **Filters**: Process only videos matching certain criteria (length, date, etc.)
- **Resume Capability**: Resume interrupted batch processing
- **Export Templates**: Save and reuse export settings across batches

## Technical Implementation Timeline

1. Backend YouTube module enhancement (2-3 days)
2. Batch job management system (2-3 days)
3. Frontend batch UI implementation (2-3 days)
4. Testing and optimization (1-2 days)

## Example API Usage

```javascript
// JavaScript example for batch processing
async function processBatch(playlistUrl, limit = 10) {
  try {
    const response = await api.post('/api/batch-process', {
      url: playlistUrl,
      type: 'playlist',
      limit: limit
    });
    return response.data.batch_id;
  } catch (error) {
    console.error('Batch processing error:', error);
    throw error;
  }
}
```