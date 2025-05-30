import React, { useState } from 'react';
import { processYouTubeVideo } from '../utils/api';

const InputSection = ({ onProcessStart }) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [diarizationEnabled, setDiarizationEnabled] = useState(true);
  const [diarizationSensitivity, setDiarizationSensitivity] = useState(0.5);
  const [showDiarizationInfo, setShowDiarizationInfo] = useState(false);
  
  const handleProcessVideo = async (e) => {
    e.preventDefault();
    
    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }
    
    try {
      setError('');
      setIsProcessing(true);
      
      const response = await processYouTubeVideo(youtubeUrl, {
        diarization_enabled: diarizationEnabled,
        diarization_sensitivity: diarizationSensitivity
      });
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
          
          <div className="form-group">
            <div className="flex items-center justify-between mb-2">
              <label className="form-label mb-0">Speaker Diarization</label>
              <button
                type="button"
                className="text-xs text-emerald-400 hover:text-emerald-300 underline"
                onClick={() => setShowDiarizationInfo(!showDiarizationInfo)}
              >
                Why diarize?
              </button>
            </div>
            
            {showDiarizationInfo && (
              <div className="mb-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                <div className="mb-2 font-semibold text-emerald-400">Speaker Diarization Benefits:</div>
                <div className="space-y-1 text-sm text-gray-300">
                  <div>• Identifies different speakers in audio</div>
                  <div>• Enables color-coded speaker styling in exports</div>
                  <div>• Creates professional YouTube subtitles (.vtt)</div>
                  <div>• Improves over YouTube auto-generated captions</div>
                  <div>• Enhances AI/LLM analysis with speaker-specific context</div>
                  <div>• Perfect for interviews, podcasts, meetings</div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-600 text-sm text-gray-400">
                  <div><strong>Tip:</strong> Turn off for single-speaker content like lectures.</div>
                  <div><strong>Sensitivity:</strong> Higher values create more speaker splits.</div>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                id="diarization-toggle"
                checked={diarizationEnabled}
                onChange={(e) => setDiarizationEnabled(e.target.checked)}
                disabled={isProcessing}
                className="form-checkbox"
              />
              <label htmlFor="diarization-toggle" className="text-sm text-gray-300">
                Enable speaker separation
              </label>
            </div>
            
            {diarizationEnabled && (
              <div className="space-y-2">
                <label className="text-sm text-gray-400">
                  Sensitivity: {diarizationSensitivity.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.1"
                  value={diarizationSensitivity}
                  onChange={(e) => setDiarizationSensitivity(parseFloat(e.target.value))}
                  disabled={isProcessing}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Less sensitive</span>
                  <span>More sensitive</span>
                </div>
              </div>
            )}
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