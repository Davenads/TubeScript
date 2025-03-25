# YouTube Audio Diarization + Transcription App

This application takes a YouTube video URL, extracts the audio, and generates a **clean, speaker-labeled transcript** with **timestamps** and **punctuation** using state-of-the-art AI models. It is optimized for **local use on machines with GPU support**, such as those with an NVIDIA RTX 4070 Super or better. The app will feature a **web-based GUI frontend built in JavaScript** and a **Python backend** for all AI processing.

---

## Features

- Accepts **YouTube video URLs** as input
- Automatically downloads and extracts the **audio**
- Applies **speaker diarization** using `pyannote-audio`
- Applies **transcription with punctuation and casing** using `Whisper`
- Outputs a structured `.txt` file with:
  - Video metadata (title, duration, URL, number of speakers)
  - Speaker-labeled, timestamped, punctuated transcript
- **User interface will allow speaker renaming** after transcript generation
- Downloadable export formats planned: `.txt`, `.srt`, and `.vtt`

---

## Project Goals

To streamline the process of turning YouTube audio into professional-grade transcripts with:
- Accurate speaker separation
- Natural punctuation
- Metadata for traceability
- Local inference for privacy and performance
- A modern, user-friendly frontend for editing and exporting transcripts

---

## Architecture Overview

- **Frontend**: JavaScript (React or plain HTML/JS)
- **Backend**: Python (FastAPI or Flask)
- **Communication**: REST API or WebSocket between frontend and backend

---

## Technology Stack

### **Languages**
- JavaScript for frontend web GUI
- Python 3.9+ for backend AI processing

### **Core Models**
| Model | Purpose | Hugging Face Link |
|-------|---------|-------------------|
| `pyannote/speaker-diarization` | Speaker diarization (who spoke when) | [Link](https://huggingface.co/pyannote/speaker-diarization) |
| `openai/whisper` (via `openai-whisper` or `whisper.cpp`) | Transcription with punctuation | [Link](https://github.com/openai/whisper) |

### **Python Packages Used**
- `yt-dlp` – Downloading YouTube audio
- `pyannote.audio` – Speaker diarization
- `openai-whisper` – Transcription (with punctuation)
- `ffmpeg` – Audio conversion
- `torchaudio`, `numpy`, `pydub` – Audio preprocessing
- `fastapi` or `flask` – Backend API service

---

## Workflow Overview

1. **YouTube Audio Extraction**
   - Input: YouTube URL
   - Output: Clean mono `.wav` file (16kHz)

2. **Speaker Diarization** *(Pyannote)*
   - Model: `pyannote/speaker-diarization`
   - Output: List of time segments with `Speaker X` labels

3. **Segmented Transcription** *(Whisper)*
   - Each diarized segment is fed into `Whisper`
   - Whisper returns punctuated, capitalized text for each segment

4. **Transcript Assembly**
   - Timestamps + Speaker labels + Whisper output combined into final `.txt` file

5. **Metadata Inclusion**
   - Video title
   - Original URL
   - Duration
   - Number of speakers detected

6. **Speaker Naming (Frontend)**
   - GUI allows users to rename "Speaker 1", "Speaker 2", etc.
   - Renaming is applied dynamically before exporting

---

## Output Example (Transcript)

```
Title: The Future of AI and Society
URL: https://youtube.com/watch?v=example123
Duration: 12:34
Speakers Detected: 2

[00:00:00.000 --> 00:00:03.250] Speaker 1: Welcome back, everyone. Today we're discussing the future of artificial intelligence.

[00:00:03.250 --> 00:00:05.100] Speaker 2: Thanks for having me. I'm really excited to be here.

[00:00:05.100 --> 00:00:08.900] Speaker 1: Let's jump right in—what do you think are the most pressing ethical concerns?
```

---

## System Requirements

- **GPU strongly recommended** (e.g., NVIDIA RTX 4070 Super or better)
- Python 3.9+
- PyTorch with CUDA support
- FFmpeg installed and accessible via system PATH

---

## Setup Instructions

```bash
# 1. Clone the repository
git clone https://github.com/yourname/youtube-diarizer.git
cd youtube-diarizer

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# 3. Install Python backend dependencies
pip install -r requirements.txt

# 4. Download and cache models (run once)
python preload_models.py

# 5. Start the Python backend API
uvicorn main:app --reload  # for FastAPI backend

# 6. Set up the frontend GUI (optional example for React)
cd frontend
npm install
npm run dev
```

---

## TODO (Roadmap)

- [ ] Web-based GUI for upload, playback, and speaker renaming
- [ ] Subtitle file exports: `.srt`, `.vtt`
- [ ] Audio snippet previews for each speaker
- [ ] Drag-and-drop YouTube link or file input
- [ ] Dark mode / accessibility options

---

## License

MIT License — free to use and modify. Attribution appreciated.

---

## Credits

- [Pyannote](https://github.com/pyannote/pyannote-audio)
- [OpenAI Whisper](https://github.com/openai/whisper)
- [Hugging Face](https://huggingface.co/)


