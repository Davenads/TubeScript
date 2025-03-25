import { fetchTranscript, processYouTubeVideo, getJobStatus, renameSpeakers, exportTranscript } from './utils/api.js';

// DOM elements
const youtubeUrlInput = document.getElementById('youtube-url');
const processBtn = document.getElementById('process-btn');
const progressSection = document.getElementById('progress-section');
const resultSection = document.getElementById('result-section');
const progressFill = document.querySelector('.progress-fill');
const progressStatus = document.querySelector('.progress-status');
const videoTitle = document.getElementById('video-title');
const videoDuration = document.getElementById('video-duration');
const speakerCount = document.getElementById('speaker-count');
const speakerLabels = document.getElementById('speaker-labels');
const applyNamesBtn = document.getElementById('apply-names-btn');
const transcriptContent = document.getElementById('transcript-content');
const exportTxtBtn = document.getElementById('export-txt-btn');
const exportSrtBtn = document.getElementById('export-srt-btn');
const exportVttBtn = document.getElementById('export-vtt-btn');

// Current job state
let currentJobId = null;
let currentTranscript = null;
let pollInterval = null;

// Initialize the application
function init() {
  // Event listeners
  processBtn.addEventListener('click', handleProcessVideo);
  applyNamesBtn.addEventListener('click', handleApplyNames);
  exportTxtBtn.addEventListener('click', () => handleExport('txt'));
  exportSrtBtn.addEventListener('click', () => handleExport('srt'));
  exportVttBtn.addEventListener('click', () => handleExport('vtt'));
}

// Handle video processing
async function handleProcessVideo() {
  const youtubeUrl = youtubeUrlInput.value.trim();
  
  if (!youtubeUrl) {
    alert('Please enter a YouTube URL');
    return;
  }
  
  try {
    // Show progress section
    resultSection.classList.add('hidden');
    progressSection.classList.remove('hidden');
    progressFill.style.width = '0%';
    progressStatus.textContent = 'Submitting job...';
    
    // Process video
    const response = await processYouTubeVideo(youtubeUrl);
    currentJobId = response.job_id;
    
    // Start polling for status
    startPolling();
  } catch (error) {
    console.error('Error processing video:', error);
    progressStatus.textContent = `Error: ${error.message || 'Unknown error'}`;
  }
}

// Poll job status
function startPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
  
  pollInterval = setInterval(async () => {
    try {
      const status = await getJobStatus(currentJobId);
      
      // Update progress bar
      const progressPercent = Math.round(status.progress * 100);
      progressFill.style.width = `${progressPercent}%`;
      progressStatus.textContent = status.message;
      
      // Check if job is complete
      if (status.status === 'completed') {
        clearInterval(pollInterval);
        loadTranscript();
      } else if (status.status === 'failed') {
        clearInterval(pollInterval);
        progressStatus.textContent = `Error: ${status.message}`;
      }
    } catch (error) {
      console.error('Error polling status:', error);
      progressStatus.textContent = `Error: ${error.message || 'Unknown error'}`;
      clearInterval(pollInterval);
    }
  }, 1000);
}

// Load transcript data
async function loadTranscript() {
  try {
    const transcript = await fetchTranscript(currentJobId);
    currentTranscript = transcript;
    
    // Display transcript
    displayTranscript(transcript);
    
    // Hide progress, show results
    progressSection.classList.add('hidden');
    resultSection.classList.remove('hidden');
  } catch (error) {
    console.error('Error loading transcript:', error);
    progressStatus.textContent = `Error: ${error.message || 'Unknown error'}`;
  }
}

// Display transcript data
function displayTranscript(transcript) {
  // Display metadata
  videoTitle.textContent = `Title: ${transcript.metadata.title}`;
  videoDuration.textContent = `Duration: ${transcript.metadata.duration}`;
  speakerCount.textContent = `Speakers: ${transcript.metadata.num_speakers}`;
  
  // Create speaker label inputs
  speakerLabels.innerHTML = '';
  const speakers = new Set();
  
  transcript.segments.forEach(segment => {
    speakers.add(segment.speaker);
  });
  
  speakers.forEach(speaker => {
    const speakerDiv = document.createElement('div');
    speakerDiv.className = 'speaker-input';
    speakerDiv.innerHTML = `
      <label for="speaker-${speaker}">${speaker}:</label>
      <input type="text" id="speaker-${speaker}" value="${speaker}" data-original="${speaker}">
    `;
    speakerLabels.appendChild(speakerDiv);
  });
  
  // Display transcript content
  transcriptContent.innerHTML = '';
  
  transcript.segments.forEach(segment => {
    const segmentDiv = document.createElement('div');
    segmentDiv.className = 'transcript-segment';
    segmentDiv.innerHTML = `
      <div class="segment-time">[${formatTimestamp(segment.start)} --> ${formatTimestamp(segment.end)}]</div>
      <div class="segment-speaker" data-speaker="${segment.speaker}">${segment.speaker}:</div>
      <div class="segment-text">${segment.text}</div>
    `;
    transcriptContent.appendChild(segmentDiv);
  });
}

// Handle speaker name application
async function handleApplyNames() {
  const speakerInputs = document.querySelectorAll('.speaker-input input');
  const speakerMapping = {};
  
  speakerInputs.forEach(input => {
    const originalName = input.getAttribute('data-original');
    const newName = input.value.trim();
    
    if (originalName !== newName) {
      speakerMapping[originalName] = newName;
    }
  });
  
  if (Object.keys(speakerMapping).length === 0) {
    return; // No changes
  }
  
  try {
    // Apply rename on the server
    await renameSpeakers(currentJobId, speakerMapping);
    
    // Fetch the updated transcript to ensure frontend and backend are in sync
    const updatedTranscript = await fetchTranscript(currentJobId);
    currentTranscript = updatedTranscript;
    
    // Re-display the transcript with updated names
    displayTranscript(updatedTranscript);
    
    // Show success message
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.textContent = 'Speaker names updated successfully!';
    speakerLabels.parentNode.insertBefore(successMessage, speakerLabels.nextSibling);
    
    // Remove success message after 3 seconds
    setTimeout(() => {
      if (successMessage.parentNode) {
        successMessage.parentNode.removeChild(successMessage);
      }
    }, 3000);
    
  } catch (error) {
    console.error('Error renaming speakers:', error);
    alert(`Error: ${error.message || 'Failed to rename speakers'}`); 
  }
}

// Handle exporting transcript
async function handleExport(format) {
  try {
    await exportTranscript(currentJobId, format);
  } catch (error) {
    console.error(`Error exporting ${format}:`, error);
    alert(`Error: ${error.message || `Failed to export as ${format}`}`);
  }
}

// Format timestamp for display
function formatTimestamp(seconds) {
  const date = new Date(seconds * 1000);
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const secs = date.getUTCSeconds().toString().padStart(2, '0');
  const ms = date.getUTCMilliseconds().toString().padStart(3, '0');
  
  return `${hours}:${minutes}:${secs}.${ms}`;
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
