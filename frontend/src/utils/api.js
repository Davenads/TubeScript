import axios from 'axios';

// API endpoint configuration
const API_BASE_URL = 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Process YouTube video
export async function processYouTubeVideo(url, options = {}) {
  try {
    const response = await api.post('/api/process', { 
      url,
      ...options
    });
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw new Error(error.response?.data?.detail || error.message || 'Failed to process video');
  }
}

// Get job status
export async function getJobStatus(jobId) {
  try {
    const response = await api.get(`/api/status/${jobId}`);
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw new Error(error.response?.data?.detail || error.message || 'Failed to get job status');
  }
}

// Fetch transcript
export async function fetchTranscript(jobId) {
  try {
    const response = await api.get(`/api/transcript/${jobId}`);
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch transcript');
  }
}

// Rename speakers
export async function renameSpeakers(jobId, speakerMapping) {
  try {
    console.log(`Sending rename request for job ${jobId} with mapping:`, speakerMapping);
    const response = await api.post(`/api/rename/${jobId}`, { 
      speaker_mapping: speakerMapping 
    });
    console.log('Rename response:', response.data);
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw new Error(error.response?.data?.detail || error.message || 'Failed to rename speakers');
  }
}

// Merge speakers
export async function mergeSpeakers(jobId, speakersToMerge, newName) {
  try {
    console.log(`Sending merge request for job ${jobId}:`, {
      speakers_to_merge: speakersToMerge,
      new_name: newName
    });
    
    const response = await api.post(`/api/merge/${jobId}`, {
      speakers_to_merge: speakersToMerge,
      new_name: newName
    });
    
    console.log('Merge response:', response.data);
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw new Error(error.response?.data?.detail || error.message || 'Failed to merge speakers');
  }
}

// Export transcript
export async function exportTranscript(jobId, format, options = null) {
  try {
    // Use blob response type for file download
    const response = await api.get(`/api/export/${jobId}`, {
      params: {
        format,
        ...(options && { options: JSON.stringify(options) })
      },
      responseType: 'blob'
    });
    
    // Create a blob URL for the file
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    
    // Get filename from Content-Disposition header if available
    let filename = `transcript.${format}`;
    const contentDisposition = response.headers['content-disposition'];
    
    if (contentDisposition) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = filenameRegex.exec(contentDisposition);
      if (matches != null && matches[1]) {
        filename = matches[1].replace(/['"]/g, '');
      }
    }
    
    // Create a temporary link element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    return true;
  } catch (error) {
    console.error('API Error:', error);
    
    // Check if the error response is JSON
    if (error.response?.data instanceof Blob) {
      try {
        // Convert blob to text to see if it contains error message
        const text = await error.response.data.text();
        const json = JSON.parse(text);
        throw new Error(json.detail || `Failed to export as ${format}`);
      } catch (e) {
        // If blob can't be parsed as JSON, throw generic error
        throw new Error(`Failed to export as ${format}`);
      }
    }
    
    throw new Error(error.response?.data?.detail || error.message || `Failed to export as ${format}`);
  }
}
