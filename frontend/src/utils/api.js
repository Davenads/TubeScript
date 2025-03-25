// API endpoint configuration
const API_BASE_URL = 'http://localhost:8000';

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

// Get job status
export async function getJobStatus(jobId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/status/${jobId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to get job status');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Fetch transcript
export async function fetchTranscript(jobId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/transcript/${jobId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to fetch transcript');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Rename speakers
export async function renameSpeakers(jobId, speakerMapping) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rename/${jobId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ speaker_mapping: speakerMapping })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to rename speakers');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Export transcript
export async function exportTranscript(jobId, format) {
  try {
    // Create a temporary link to download the file
    const response = await fetch(`${API_BASE_URL}/api/export/${jobId}?format=${format}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to export as ${format}`);
    }
    
    // Check if response is JSON (error) or file (success)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const jsonData = await response.json();
      // If server returns a message instead of a file
      if (jsonData.message) {
        throw new Error(jsonData.message);
      }
    }
    
    // Use Blob to handle the response as a file
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    // Get filename from Content-Disposition header if available
    let filename = `transcript.${format}`;
    const disposition = response.headers.get('content-disposition');
    if (disposition && disposition.includes('filename=')) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = filenameRegex.exec(disposition);
      if (matches != null && matches[1]) {
        filename = matches[1].replace(/['"]/g, '');
      }
    }
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    return true;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
