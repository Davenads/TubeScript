# TubeScript

TubeScript is an application for generating speaker-labeled transcripts from YouTube videos with timestamps and punctuation using state-of-the-art AI models.

## Features

- Extract audio from YouTube videos
- Perform speaker diarization (who spoke when)
- Generate accurate transcriptions with proper punctuation
- Label speakers and timestamps
- Interactive UI for reviewing and editing transcripts
- Export in multiple formats (.txt, .srt, .vtt)

## Requirements

- Python 3.9+
- GPU with CUDA support (NVIDIA RTX 4070 Super or better recommended)
- FFmpeg installed and accessible via system PATH
- HuggingFace account and API token (for accessing pyannote.audio models)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/TubeScript.git
cd TubeScript
```

### 2. Set up the Python backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file in the `backend` directory with the following content:

```
HUGGINGFACE_TOKEN=your_huggingface_token_here
```

You can obtain your HuggingFace token from: https://huggingface.co/settings/tokens

### 4. Preload AI models (recommended)

```bash
python preload_models.py
```

### 5. Set up the frontend

```bash
cd ../frontend
npm install
```

## Usage

### 1. Start the backend server

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python app.py
```

The API will be available at http://localhost:8000

### 2. Start the frontend development server

```bash
cd frontend
npm run dev
```

The web interface will be available at http://localhost:5173

### 3. Process a YouTube video

1. Enter a YouTube URL in the input field
2. Click "Process Video"
3. Wait for the processing to complete
4. Review the transcript and rename speakers if desired
5. Export the transcript in your preferred format

## How It Works

1. **YouTube Audio Extraction**: Downloads and extracts audio using yt-dlp
2. **Speaker Diarization**: Uses pyannote.audio to identify different speakers
3. **Transcription**: Applies OpenAI's Whisper to generate accurate text with punctuation
4. **Transcript Assembly**: Combines speaker information with transcribed text
5. **Frontend Display**: Shows an interactive transcript with editing capabilities

## License

MIT License

## Acknowledgements

- [Pyannote Audio](https://github.com/pyannote/pyannote-audio) for speaker diarization
- [OpenAI Whisper](https://github.com/openai/whisper) for transcription
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) for YouTube downloading
