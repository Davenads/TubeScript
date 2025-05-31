import React, { useState } from 'react';
import { getBatchPreview, processBatch } from '../utils/api';

const BatchProcessingSection = ({ onBatchStart }) => {
  const [batchUrl, setBatchUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [videoLimit, setVideoLimit] = useState(10);
  const [preview, setPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [diarizationEnabled, setDiarizationEnabled] = useState(true);
  const [diarizationSensitivity, setDiarizationSensitivity] = useState(0.5);
  const [showDiarizationInfo, setShowDiarizationInfo] = useState(false);

  const handlePreviewBatch = async () => {
    if (!batchUrl.trim()) {
      setError('Please enter a YouTube playlist or channel URL');
      return;
    }

    try {
      setError('');
      setIsProcessing(true);
      
      const previewData = await getBatchPreview(batchUrl, Math.min(videoLimit, 20));
      setPreview(previewData);
      setShowPreview(true);
    } catch (error) {
      console.error('Error loading preview:', error);
      setError(error.message || 'Failed to load preview');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartBatch = async () => {
    if (!preview) {
      setError('Please preview the batch first');
      return;
    }

    try {
      setError('');
      setIsProcessing(true);
      
      const batchData = await processBatch(batchUrl, {
        limit: videoLimit,
        diarization_enabled: diarizationEnabled,
        diarization_sensitivity: diarizationSensitivity
      });
      
      onBatchStart(batchData.batch_id);
    } catch (error) {
      console.error('Error starting batch:', error);
      setError(error.message || 'Failed to start batch processing');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section>
      <h2 className="text-2xl mb-4 text-emerald-400">Batch Processing</h2>
      <div className="card">
        <div className="form-group">
          <label htmlFor="batch-url" className="form-label">Enter YouTube Playlist or Channel URL:</label>
          <input 
            type="text" 
            id="batch-url" 
            className="form-input" 
            placeholder="https://youtube.com/playlist?list=... or https://youtube.com/@channel"
            value={batchUrl}
            onChange={(e) => setBatchUrl(e.target.value)}
            disabled={isProcessing}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Video Limit: {videoLimit}</label>
          <input
            type="range"
            min="1"
            max="50"
            value={videoLimit}
            onChange={(e) => setVideoLimit(parseInt(e.target.value))}
            disabled={isProcessing}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1 video</span>
            <span>50 videos</span>
          </div>
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
              id="batch-diarization-toggle"
              checked={diarizationEnabled}
              onChange={(e) => setDiarizationEnabled(e.target.checked)}
              disabled={isProcessing}
              className="form-checkbox"
            />
            <label htmlFor="batch-diarization-toggle" className="text-sm text-gray-300">
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

        <div className="btn-group">
          <button 
            type="button" 
            className="btn-secondary"
            onClick={handlePreviewBatch}
            disabled={isProcessing || !batchUrl.trim()}
          >
            {isProcessing ? 'Loading...' : 'Preview Videos'}
          </button>
          
          {preview && (
            <button 
              type="button" 
              className="btn-primary"
              onClick={handleStartBatch}
              disabled={isProcessing}
            >
              Start Batch Processing
            </button>
          )}
        </div>

        {showPreview && preview && (
          <div className="mt-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
            <h3 className="text-lg font-semibold text-emerald-400 mb-3">
              {preview.type === 'playlist' ? 'Playlist' : 'Channel'}: {preview.title}
            </h3>
            
            <div className="mb-4 text-sm text-gray-400">
              <span>Total videos: {preview.total_videos}</span>
              {preview.has_more && <span> (showing first {preview.preview_videos.length})</span>}
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {preview.preview_videos.map((video, index) => (
                <div key={video.id} className="flex items-center gap-3 p-2 bg-gray-800/50 rounded">
                  <span className="text-xs text-gray-500 w-8">{index + 1}.</span>
                  <div className="flex-1">
                    <div className="text-sm text-gray-200 truncate">{video.title}</div>
                    <div className="text-xs text-gray-400">
                      {video.duration ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}` : 'Unknown duration'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {videoLimit !== preview.preview_videos.length && (
              <div className="mt-3 text-sm text-gray-400">
                Will process {Math.min(videoLimit, preview.total_videos)} of {preview.total_videos} videos
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default BatchProcessingSection;