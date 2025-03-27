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
export async function processYouTubeVideo(url) {
  try {
    const response = await api.post('/api/process', { url });
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
    const response = await api.post(`/api/rename/${jobId}`, { 
      speaker_mapping: speakerMapping 
    });
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw new Error(error.response?.data?.detail || error.message || 'Failed to rename speakers');
  }
}

// Export transcript
export async function exportTranscript(jobId, format) {
  try {
    // Use blob response type for file download
    const response = await api.get(`/api/export/${jobId}?format=${format}`, {
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
