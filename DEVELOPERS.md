# TubeScript Developer Documentation

This document provides a technical overview of the TubeScript application flow from a developer's perspective. It's intended to help developers understand the architecture, data flow, and key components of the system.

## System Overview

TubeScript is a web application that transcribes YouTube videos with speaker diarization, producing professional-grade transcripts with timestamps and speaker labels. The application consists of:

1. A **Python backend** (FastAPI) that handles video processing, AI inference, and transcript generation
2. A **JavaScript frontend** that provides the user interface for submitting videos and viewing results

The system leverages advanced AI models:
- `pyannote/speaker-diarization` for identifying different speakers
- `openai/whisper` for high-quality speech transcription with punctuation

## Application Flow

### 1. Request Handling

When a user submits a YouTube URL through the frontend:

```
User -> Frontend -> API Request -> Backend -> Background Processing
```

1. The frontend sends a POST request to `/api/process` with the YouTube URL
2. The backend generates a unique job ID and queues the processing task
3. The response includes the job ID for status tracking

### 2. Background Processing Pipeline

The backend processes videos asynchronously in these steps:

```
YouTube Download -> Audio Extraction -> Speaker Diarization -> Segment Transcription -> Transcript Assembly
```

#### 2.1 YouTube Audio Download (`youtube.py`)

- Uses `yt-dlp` to download the best audio quality
- Extracts video metadata (title, duration, URL)
- Converts audio to mono 16kHz WAV format for optimal model compatibility
- Implementation uses thread pools via `asyncio.loop.run_in_executor()` to avoid blocking

#### 2.2 Speaker Diarization (`diarization.py`)

- Loads the `pyannote/speaker-diarization` model (GPU accelerated if available)
- Processes the audio to identify different speakers and segment boundaries
- Returns a list of segments with start/end times and speaker labels
- Includes GPU monitoring and optimization with detailed performance metrics

#### 2.3 Segment Transcription (`transcription.py`)

- Loads the `whisper` large model for high-quality transcription
- Transcribes each diarized segment individually for better speaker accuracy
- Manages GPU resources efficiently with memory tracking
- Implements progress tracking via callbacks

#### 2.4 Transcript Assembly (`assembler.py`)

- Combines diarization and transcription results into a structured format
- Adds video metadata (title, URL, duration, speaker count)
- Generates a plaintext version of the transcript
- Creates the final transcript object with segments and metadata

### 3. Status Monitoring

The frontend regularly polls the backend for job status:

```
Frontend -> GET /api/status/{job_id} -> Backend -> Status Response
```

- The backend tracks job progress through the pipeline (0.0 to 1.0)
- Status updates include the current processing step and progress percentage
- The frontend displays this information as a progress indicator

### 4. Result Retrieval and Display

Once processing completes:

```
Frontend -> GET /api/transcript/{job_id} -> Backend -> Transcript Data
```

- The frontend fetches the complete transcript data
- Data includes all segments with timestamps, speaker labels, and text
- The transcript is presented in the UI with speaker colors and timestamps

### 5. Post-Processing Features

#### Speaker Renaming

```
Frontend -> POST /api/rename/{job_id} -> Backend -> Updated Transcript
```

- Users can rename generic "Speaker X" labels to actual names
- The frontend sends a mapping of original to new speaker names
- The backend applies these changes to the transcript

#### Export Options

```
Frontend -> GET /api/export/{job_id}?format=FORMAT -> Backend -> Downloadable File
```

- Users can export transcripts in different formats (TXT, SRT, VTT)
- The backend formats the transcript appropriately for each format
- The file is sent as a download with the proper content type and filename

## Technical Implementation Details

### Asynchronous Processing

The backend uses FastAPI's `BackgroundTasks` for non-blocking processing:

```python
@app.post("/api/process", response_model=JobStatus)
async def process_youtube(request: YouTubeRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    job_store[job_id] = {"status": "queued", "progress": 0.0, ...}
    background_tasks.add_task(process_video, job_id=job_id, youtube_url=str(request.url))
    return JobStatus(job_id=job_id, status="queued", ...)
```

### GPU Optimization

The application optimizes GPU usage for AI processing:

```python
# Check CUDA availability and select device
if torch.cuda.is_available():
    device = f"cuda:{torch.cuda.current_device()}"
    print(f"Using GPU: {torch.cuda.get_device_name()}")
else:
    device = "cpu"
    print("WARNING: Using CPU (slower performance)")

# Move models to appropriate device
pipeline = pipeline.to(torch.device(device))
```

### Memory Management

The code includes detailed memory tracking and management:

```python
# Monitor GPU memory usage
print(f"CUDA memory allocated: {torch.cuda.memory_allocated() / 1024**2:.2f} MB")
print(f"Peak CUDA memory: {torch.cuda.max_memory_allocated() / 1024**2:.2f} MB")

# Clean up after processing
del model
torch.cuda.empty_cache()
```

### Error Handling

Robust error handling throughout the pipeline:

```python
try:
    # Processing steps
except Exception as e:
    job["status"] = "failed"
    job["message"] = f"Error: {str(e)}"
    job["progress"] = 0.0
```

## Frontend-Backend Communication

The frontend API client (`api.js`) handles all communication with the backend:

```javascript
// Process YouTube video
export async function processYouTubeVideo(url) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to process video');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
```

## Data Structures

### Job Store (In-Memory Database)

```javascript
job_store = {
  "job_id_1": {
    "status": "completed",
    "progress": 1.0,
    "message": "Processing complete",
    "result": {
      "metadata": {
        "title": "Video Title",
        "url": "https://youtube.com/...",
        "duration": "12:34:56",
        "num_speakers": 2
      },
      "segments": [
        {
          "start": 0.0,
          "end": 3.5,
          "speaker": "Speaker 1",
          "text": "Hello, welcome to this video."
        },
        // More segments...
      ],
      "plaintext": "Title: Video Title\nURL: https://youtube.com/...\n..."
    },
    "original_speakers": {
      "Speaker 1": "Speaker 1",
      "Speaker 2": "Speaker 2"
    }
  }
}
```

## Development Notes

### Performance Considerations

- GPU memory usage is a primary constraint, especially for longer videos
- Both diarization and transcription models require significant VRAM
- The pipeline design processes segments in sequence to manage memory effectively

### Future Improvements

- Replace in-memory job store with a persistent database (e.g., SQLite, PostgreSQL)
- Add authentication and user accounts for saving transcripts
- Implement WebSocket for real-time progress updates instead of polling
- Optimize for CPU-only environments with smaller model variants

## Conclusion

TubeScript combines multiple AI technologies to provide high-quality video transcription with speaker detection. The application's modular design allows for easy extension and modification, while the asynchronous processing approach ensures the UI remains responsive during complex AI operations.

The separation between frontend and backend via a REST API enables potential future development of alternative clients (mobile apps, desktop applications) that can leverage the same processing pipeline.