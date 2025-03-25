# TubeScript Architecture

## Directory Structure

```
TubeScript/
├── backend/
│   ├── app.py                 # Main application server (FastAPI)
│   ├── preload_models.py      # Script to download and cache models
│   ├── requirements.txt       # Python dependencies
│   ├── modules/
│   │   ├── __init__.py
│   │   ├── youtube.py         # YouTube download functionality (yt-dlp)
│   │   ├── diarization.py     # Speaker diarization (pyannote)
│   │   ├── transcription.py   # Transcription (Whisper)
│   │   └── assembler.py       # Transcript assembly and formatting
│   └── utils/
│       ├── __init__.py
│       ├── audio.py           # Audio processing utilities
│       └── validators.py      # Input validation functions
├── frontend/
│   ├── index.html             # Main HTML page
│   ├── package.json           # JS dependencies
│   ├── src/
│   │   ├── main.js            # Main application entry point
│   │   ├── components/        # UI components
│   │   │   ├── App.js
│   │   │   ├── VideoInput.js
│   │   │   ├── TranscriptView.js
│   │   │   ├── SpeakerEditor.js
│   │   │   └── ExportOptions.js
│   │   ├── utils/             # Frontend utilities
│   │   │   ├── api.js         # API communication
│   │   │   └── formatters.js  # Transcript formatting
│   │   └── styles/            # CSS styles
│   └── public/                # Static assets
└── README.md                  # Project documentation
```

## Implementation Plan

### 1. Backend Setup (Python)

1. Set up FastAPI environment with necessary dependencies
2. Implement YouTube download functionality using `yt-dlp`
3. Integrate `pyannote.audio` for speaker diarization
4. Implement Whisper transcription with punctuation
5. Create transcript assembly logic
6. Build REST API endpoints for frontend communication

### 2. Frontend Setup (JavaScript/HTML)

1. Create responsive UI for YouTube URL input
2. Implement API communication with backend
3. Design transcript display with speaker labels and timestamps
4. Build speaker renaming functionality
5. Implement export options (.txt, .srt, .vtt)
6. Add styling and UX improvements

### 3. API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/process` | POST | Process YouTube URL, returns job ID |
| `/api/status/{job_id}` | GET | Get processing status |
| `/api/transcript/{job_id}` | GET | Get completed transcript |
| `/api/rename/{job_id}` | POST | Rename speakers in transcript |
| `/api/export/{job_id}` | GET | Export transcript in requested format |

### 4. Data Flow

1. User submits YouTube URL via frontend
2. Backend downloads audio and processes in sequence:
   - Extract audio from video
   - Perform speaker diarization
   - Transcribe each speaker segment
   - Assemble final transcript
3. Frontend polls status endpoint until complete
4. Transcript is displayed with speaker labels
5. User can rename speakers and export in desired format

### 5. Development Sequence

1. Backend core functionality (YouTube download, diarization, transcription)
2. API endpoint implementation
3. Frontend basic UI and API integration
4. Speaker renaming functionality
5. Export options
6. Testing and refinement
7. Documentation and deployment instructions