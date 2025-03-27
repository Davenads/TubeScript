import React, { useState } from 'react';
import { processYouTubeVideo } from '../utils/api';

const InputSection = ({ onProcessStart }) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  const handleProcessVideo = async (e) => {
    e.preventDefault();
    
    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }
    
    try {
      setError('');
      setIsProcessing(true);
      
      const response = await processYouTubeVideo(youtubeUrl);
      onProcessStart(response.job_id);
    } catch (error) {
      console.error('Error processing video:', error);
      setError(error.message || 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <section>
      <h2 className="text-2xl mb-4 text-emerald-400">Video Input</h2>
      <div className="card">
        <form onSubmit={handleProcessVideo}>
          <div className="form-group">
            <label htmlFor="youtube-url" className="form-label">Enter YouTube URL:</label>
            <input 
              type="text" 
              id="youtube-url" 
              className="form-input" 
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              disabled={isProcessing}
            />
          </div>
          
          {error && <div className="text-red-500 mb-4">{error}</div>}
          
          <button 
            type="submit" 
            className="btn-primary"
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Process Video'}
          </button>
        </form>
      </div>
    </section>
  );
};

export default InputSection;