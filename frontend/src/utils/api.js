import axios from 'axios';
import cache from './cache.js';

// API endpoint configuration
const API_BASE_URL = 'http://localhost:8001';

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
    // Check cache first
    const cachedJob = cache.getCachedJob(jobId);
    if (cachedJob && cachedJob.status === 'completed') {
      console.log(`💾 Using cached job status for ${jobId}`);
      return cachedJob;
    }

    const response = await api.get(`/api/status/${jobId}`);
    const jobData = response.data;
    
    // Cache the job data
    cache.cacheJob(jobId, jobData);
    
    return jobData;
  } catch (error) {
    console.error('API Error:', error);
    throw new Error(error.response?.data?.detail || error.message || 'Failed to get job status');
  }
}

// Fetch transcript
export async function fetchTranscript(jobId) {
  try {
    // Check cache first
    const cachedTranscript = await cache.getCachedTranscript(jobId);
    if (cachedTranscript) {
      console.log(`💾 Using cached transcript for ${jobId}`);
      return cachedTranscript.transcript;
    }

    const response = await api.get(`/api/transcript/${jobId}`);
    const transcript = response.data;
    
    // Cache the transcript
    await cache.cacheTranscript(jobId, transcript, {
      title: transcript.metadata?.title,
      url: transcript.metadata?.url,
      duration: transcript.metadata?.duration
    });
    
    return transcript;
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
    
    // Update cached transcript with new speaker names
    const cachedTranscript = await cache.getCachedTranscript(jobId);
    if (cachedTranscript) {
      // Update speaker names in cached transcript
      const updatedTranscript = { ...cachedTranscript.transcript };
      updatedTranscript.segments = updatedTranscript.segments.map(segment => ({
        ...segment,
        speaker: speakerMapping[segment.speaker] || segment.speaker
      }));
      
      // Re-cache the updated transcript
      await cache.cacheTranscript(jobId, updatedTranscript, cachedTranscript.metadata);
      console.log(`💾 Updated cached transcript with new speaker names for ${jobId}`);
    }
    
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

// Batch processing functions with caching

// Get batch preview
export async function getBatchPreview(url, limit = 10) {
  try {
    const response = await api.post('/api/batch-preview', { url, limit });
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw new Error(error.response?.data?.detail || error.message || 'Failed to get batch preview');
  }
}

// Get full video list with pagination for interactive selection
export async function getVideoList(url, offset = 0, limit = 50) {
  try {
    const response = await api.post('/api/video-list', { url, offset, limit });
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw new Error(error.response?.data?.detail || error.message || 'Failed to get video list');
  }
}

// Start batch processing
export async function processBatch(url, options = {}) {
  try {
    const response = await api.post('/api/batch-process', { url, ...options });
    const batchData = response.data;
    
    // Cache initial batch data
    cache.cacheBatch(batchData.batch_id, batchData);
    
    return batchData;
  } catch (error) {
    console.error('API Error:', error);
    throw new Error(error.response?.data?.detail || error.message || 'Failed to start batch processing');
  }
}

// Get batch status
export async function getBatchStatus(batchId) {
  try {
    // Check cache first for completed batches
    const cachedBatch = cache.getCachedBatch(batchId);
    if (cachedBatch && ['completed', 'failed', 'partial'].includes(cachedBatch.status)) {
      console.log(`💾 Using cached batch status for ${batchId}`);
      return cachedBatch;
    }

    const response = await api.get(`/api/batch-status/${batchId}`);
    const batchData = response.data;
    
    // Cache the batch data
    cache.cacheBatch(batchId, batchData);
    
    return batchData;
  } catch (error) {
    console.error('API Error:', error);
    throw new Error(error.response?.data?.detail || error.message || 'Failed to get batch status');
  }
}

// Get batch results
export async function getBatchResults(batchId) {
  try {
    const response = await api.get(`/api/batch-results/${batchId}`);
    const results = response.data;
    
    // Cache individual transcripts from batch results
    if (results.results) {
      for (const result of results.results) {
        await cache.cacheTranscript(result.job_id, result.transcript, {
          title: result.video_title,
          url: result.video_url,
          batchId: batchId
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('API Error:', error);
    throw new Error(error.response?.data?.detail || error.message || 'Failed to get batch results');
  }
}

// Cache management functions
export async function getCacheStats() {
  return await cache.getCacheStats();
}

export function clearCache() {
  cache.clearAll();
}

export async function clearExpiredCache() {
  await cache.clearExpiredCache();
}
