from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
import uuid
import os
from dotenv import load_dotenv
from typing import Optional

# Load environment variables
load_dotenv()

# Import modules
from modules.youtube import download_youtube_audio
from modules.diarization import perform_diarization
from modules.transcription import transcribe_segments
from modules.assembler import assemble_transcript
from modules.enhanced_export import EnhancedExport

# Create app instance
app = FastAPI(title="TubeScript API", description="YouTube Audio Diarization and Transcription API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Job storage (in-memory for demonstration, use database in production)
job_store = {}

# Request models
class YouTubeRequest(BaseModel):
    url: HttpUrl

class RenameRequest(BaseModel):
    speaker_mapping: dict[str, str]

class MergeSpeakersRequest(BaseModel):
    speakers_to_merge: list[str]
    new_name: str

# Status response model
class JobStatus(BaseModel):
    job_id: str
    status: str
    progress: float = 0.0
    message: str = ""

@app.get("/")
async def read_root():
    return {"message": "TubeScript API is running"}

@app.post("/api/process", response_model=JobStatus)
async def process_youtube(request: YouTubeRequest, background_tasks: BackgroundTasks):
    # Generate a unique job ID
    job_id = str(uuid.uuid4())
    
    # Create job entry
    job_store[job_id] = {
        "status": "queued",
        "progress": 0.0,
        "message": "Job queued for processing",
        "result": None,
        "original_speakers": {}
    }
    
    # Add task to background queue
    background_tasks.add_task(
        process_video, 
        job_id=job_id, 
        youtube_url=str(request.url)
    )
    
    return JobStatus(
        job_id=job_id,
        status="queued",
        progress=0.0,
        message="Job queued for processing"
    )

@app.get("/api/status/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    if job_id not in job_store:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = job_store[job_id]
    
    return JobStatus(
        job_id=job_id,
        status=job["status"],
        progress=job["progress"],
        message=job["message"]
    )

@app.get("/api/transcript/{job_id}")
async def get_transcript(job_id: str):
    if job_id not in job_store:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = job_store[job_id]
    
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Transcript not ready yet")
    
    return job["result"]

@app.post("/api/rename/{job_id}")
async def rename_speakers(job_id: str, request: RenameRequest):
    if job_id not in job_store:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = job_store[job_id]
    
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Transcript not ready yet")
    
    # Apply speaker renaming
    transcript = job["result"]
    segments = transcript["segments"]
    
    # Count renamed speakers for debugging
    renamed_count = 0
    
    # Log the mapping for debugging
    print(f"[JOB {job_id}] Renaming speakers with mapping: {request.speaker_mapping}")
    
    for segment in segments:
        current_speaker = segment["speaker"]
        if current_speaker in request.speaker_mapping:
            segment["speaker"] = request.speaker_mapping[current_speaker]
            renamed_count += 1
    
    # Update job store
    job_store[job_id]["result"] = transcript
    
    print(f"[JOB {job_id}] Renamed {renamed_count} segments successfully")
    
    # Return the updated mapping for the client
    return {
        "message": "Speakers renamed successfully",
        "renamed_segments": renamed_count,
        "speaker_mapping": request.speaker_mapping
    }

@app.post("/api/merge/{job_id}")
async def merge_speakers(job_id: str, request: MergeSpeakersRequest):
    if job_id not in job_store:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = job_store[job_id]
    
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Transcript not ready yet")
    
    # Validate request
    if len(request.speakers_to_merge) < 2:
        raise HTTPException(status_code=400, detail="At least two speakers must be provided for merging")
    
    # Apply speaker merging
    transcript = job["result"]
    segments = transcript["segments"]
    
    # Track which speakers were merged for metadata update
    merged_speakers = set()
    merged_segment_count = 0
    
    # Log the request for debugging
    print(f"[JOB {job_id}] Merging speakers: {request.speakers_to_merge} into: {request.new_name}")
    
    # Replace all speakers in the list with the new merged name
    for segment in segments:
        current_speaker = segment["speaker"]
        if current_speaker in request.speakers_to_merge:
            segment["speaker"] = request.new_name
            merged_speakers.add(current_speaker)
            merged_segment_count += 1
    
    # Update the speaker count in metadata if needed
    metadata = transcript["metadata"]
    original_speaker_count = metadata["num_speakers"]
    
    # Count unique speakers after merging
    unique_speakers = set()
    for segment in segments:
        unique_speakers.add(segment["speaker"])
    
    metadata["num_speakers"] = len(unique_speakers)
    
    # Log results for debugging
    print(f"[JOB {job_id}] Merged {len(merged_speakers)} speakers affecting {merged_segment_count} segments")
    print(f"[JOB {job_id}] New speaker count: {metadata['num_speakers']}")
    
    # Update job store
    job_store[job_id]["result"] = transcript
    
    return {
        "message": "Speakers merged successfully", 
        "merged": list(merged_speakers),
        "new_name": request.new_name,
        "updated_speaker_count": metadata["num_speakers"],
        "affected_segments": merged_segment_count,
        "unique_speakers": list(unique_speakers)
    }

@app.get("/api/export/{job_id}")
async def export_transcript(job_id: str, format: str = "txt", options: Optional[str] = None):
    from fastapi.responses import PlainTextResponse, Response
    from starlette.responses import StreamingResponse
    import io
    import json
    from modules.assembler import format_timestamp
    from datetime import timedelta
    
    if job_id not in job_store:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = job_store[job_id]
    
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Transcript not ready yet")
    
    # Get the most up-to-date transcript with any renamed speakers
    transcript = job["result"]
    
    # Handle enhanced export options
    if options:
        try:
            # Parse options from JSON string
            export_options = json.loads(options)
            
            # Initialize enhanced export
            enhanced_export = EnhancedExport(transcript, export_options)
            
            # Generate export content
            content = enhanced_export.generate_export()
            
            # Determine filename based on format
            filename_base = transcript['metadata']['title'].replace(' ', '_')
            filename = f"{filename_base}_enhanced.{format}"
            
            return PlainTextResponse(
                content=content,
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"',
                    "Content-Type": f"text/{format}"
                }
            )
            
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid export options format")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    # Handle standard export formats
    filename_base = transcript['metadata']['title'].replace(' ', '_')
    
    # Handle TXT format (plaintext export)
    if format.lower() == "txt":
        # The plaintext version is already generated in the assembler
        content = transcript.get("plaintext", "")
        filename = f"{filename_base}_transcript.txt"
        
        return PlainTextResponse(
            content=content,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    
    # Handle SRT format (SubRip Text)
    elif format.lower() == "srt":
        # Format timestamps for SRT (00:00:00,000)
        def format_srt_timestamp(seconds):
            td = timedelta(seconds=seconds)
            hours, remainder = divmod(td.seconds, 3600)
            minutes, seconds = divmod(remainder, 60)
            milliseconds = int(td.microseconds / 1000)
            return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"
        
        # Generate SRT content
        srt_content = ""
        for i, segment in enumerate(transcript["segments"], 1):
            # 1. Subtitle number
            srt_content += f"{i}\n"
            
            # 2. Timestamps in SRT format
            start_time = format_srt_timestamp(segment["start"])
            end_time = format_srt_timestamp(segment["end"])
            srt_content += f"{start_time} --> {end_time}\n"
            
            # 3. Text with speaker label
            srt_content += f"{segment['speaker']}: {segment['text']}\n\n"
        
        filename = f"{filename_base}_subtitle.srt"
        
        return PlainTextResponse(
            content=srt_content,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    
    # Handle VTT format (Web Video Text Tracks)
    elif format.lower() == "vtt":
        # Format timestamps for VTT (00:00:00.000)
        def format_vtt_timestamp(seconds):
            td = timedelta(seconds=seconds)
            hours, remainder = divmod(td.seconds, 3600)
            minutes, seconds = divmod(remainder, 60)
            milliseconds = int(td.microseconds / 1000)
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}.{milliseconds:03d}"
        
        # Generate VTT content
        vtt_content = "WEBVTT\n\n"
        
        # Add metadata as NOTE comments
        vtt_content += "NOTE\n"
        vtt_content += f"Title: {transcript['metadata']['title']}\n"
        vtt_content += f"Duration: {transcript['metadata']['duration']}\n"
        vtt_content += f"Speakers: {transcript['metadata']['num_speakers']}\n\n"
        
        # Add cues
        for i, segment in enumerate(transcript["segments"], 1):
            # Optional cue identifier
            vtt_content += f"Cue{i}\n"
            
            # Timestamps in VTT format
            start_time = format_vtt_timestamp(segment["start"])
            end_time = format_vtt_timestamp(segment["end"])
            vtt_content += f"{start_time} --> {end_time}\n"
            
            # Text with speaker label
            # We use <v> voice tags which are part of the VTT spec
            vtt_content += f"<v {segment['speaker']}>{segment['text']}</v>\n\n"
        
        filename = f"{filename_base}_subtitle.vtt"
        
        return PlainTextResponse(
            content=vtt_content,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": "text/vtt"
            }
        )
    
    # Other formats
    else:
        return {"message": f"Export in {format} format not implemented yet"}

async def process_video(job_id: str, youtube_url: str):
    """Background task to process a YouTube video"""
    job = job_store[job_id]
    
    try:
        print(f"\n[JOB {job_id}] Starting processing of YouTube URL: {youtube_url}")
        # Update status to processing
        job["status"] = "processing"
        job["message"] = "Downloading YouTube audio"
        job["progress"] = 0.1
        
        # Step 1: Download YouTube audio
        print(f"[JOB {job_id}] Downloading YouTube audio...")
        audio_path, video_info = await download_youtube_audio(youtube_url)
        print(f"[JOB {job_id}] YouTube audio downloaded to {audio_path}")
        job["progress"] = 0.3
        job["message"] = "Performing speaker diarization"
        
        # Step 2: Perform speaker diarization
        print(f"[JOB {job_id}] Starting speaker diarization...")
        diarization_result = await perform_diarization(audio_path)
        print(f"[JOB {job_id}] Speaker diarization completed. Found {len(diarization_result)} segments")
        job["progress"] = 0.6
        job["message"] = "Transcribing audio segments"
        
        # Step 3: Transcribe segments with Whisper
        total_segments = len(diarization_result)
        
        # Create a callback to update progress during transcription
        def update_progress(current_segment):
            progress = 0.6 + (0.2 * (current_segment / total_segments))
            job["progress"] = progress
            job["message"] = f"Transcribing audio segments ({current_segment}/{total_segments})"
        
        transcription_result = await transcribe_segments(audio_path, diarization_result, update_progress)
        job["progress"] = 0.8
        job["message"] = "Assembling final transcript"
        
        # Step 4: Assemble final transcript
        print(f"[JOB {job_id}] Assembling final transcript...")
        final_transcript = await assemble_transcript(transcription_result, video_info)
        print(f"[JOB {job_id}] Final transcript assembled successfully")
        job["progress"] = 1.0
        
        # Store original speaker mapping
        speakers = set()
        for segment in final_transcript["segments"]:
            speakers.add(segment["speaker"])
        
        job["original_speakers"] = {speaker: speaker for speaker in speakers}
        
        # Update job with completed result
        job["status"] = "completed"
        job["message"] = "Processing complete"
        job["result"] = final_transcript
        
    except Exception as e:
        # Handle any exceptions
        job["status"] = "failed"
        job["message"] = f"Error: {str(e)}"
        job["progress"] = 0.0

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
