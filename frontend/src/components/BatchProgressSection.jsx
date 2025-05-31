import React, { useState, useEffect } from 'react';
import { getBatchStatus } from '../utils/api';

const BatchProgressSection = ({ batchId, onBatchComplete }) => {
  const [batchStatus, setBatchStatus] = useState(null);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    if (!batchId || !isPolling) return;

    const pollStatus = async () => {
      try {
        const status = await getBatchStatus(batchId);
        setBatchStatus(status);
        
        // Stop polling if batch is completed, failed, or partial
        if (['completed', 'failed', 'partial'].includes(status.status)) {
          setIsPolling(false);
          onBatchComplete(status);
        }
      } catch (error) {
        console.error('Error polling batch status:', error);
      }
    };

    // Initial call
    pollStatus();
    
    // Set up polling interval
    const interval = setInterval(pollStatus, 2000);
    
    return () => clearInterval(interval);
  }, [batchId, isPolling, onBatchComplete]);

  if (!batchStatus) {
    return (
      <section>
        <h2 className="text-2xl mb-4 text-emerald-400">Batch Processing</h2>
        <div className="card">
          <div className="text-center">Loading batch status...</div>
        </div>
      </section>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'partial': return 'text-yellow-400';
      case 'processing': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'partial': return '⚠️';
      case 'processing': return '🔄';
      default: return '⏳';
    }
  };

  return (
    <section>
      <h2 className="text-2xl mb-4 text-emerald-400">Batch Processing Progress</h2>
      <div className="card">
        
        {/* Overall Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Overall Progress</span>
            <span className={`font-semibold ${getStatusColor(batchStatus.status)}`}>
              {getStatusIcon(batchStatus.status)} {batchStatus.status.toUpperCase()}
            </span>
          </div>
          
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(batchStatus.progress * 100).toFixed(1)}%` }}
            ></div>
          </div>
          
          <div className="progress-status mt-2">
            {batchStatus.message}
          </div>
          
          <div className="text-sm text-gray-400 mt-2">
            {batchStatus.completed}/{batchStatus.total_videos} videos completed
            {batchStatus.failed > 0 && `, ${batchStatus.failed} failed`}
          </div>
        </div>

        {/* Individual Video Progress */}
        {batchStatus.videos && batchStatus.videos.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-emerald-400 mb-4">Video List</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {batchStatus.videos.map((video, index) => {
                const isCompleted = batchStatus.completed > index;
                const isFailed = batchStatus.failed > 0 && !isCompleted;
                const isProcessing = !isCompleted && !isFailed && batchStatus.completed === index;
                
                return (
                  <div 
                    key={video.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      isCompleted ? 'bg-green-900/20 border-green-700' :
                      isFailed ? 'bg-red-900/20 border-red-700' :
                      isProcessing ? 'bg-blue-900/20 border-blue-700' :
                      'bg-gray-800/50 border-gray-700'
                    }`}
                  >
                    <span className="text-xs text-gray-500 w-8">{index + 1}.</span>
                    
                    <div className="flex-1">
                      <div className="text-sm text-gray-200 truncate">{video.title}</div>
                      <div className="text-xs text-gray-400">
                        {video.duration ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}` : 'Unknown duration'}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {isCompleted && <span className="text-green-400">✅ Complete</span>}
                      {isFailed && <span className="text-red-400">❌ Failed</span>}
                      {isProcessing && <span className="text-blue-400">🔄 Processing</span>}
                      {!isCompleted && !isFailed && !isProcessing && <span className="text-gray-500">⏳ Queued</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {['completed', 'partial'].includes(batchStatus.status) && (
          <div className="mt-6 pt-4 border-t border-gray-700">
            <button 
              className="btn-primary"
              onClick={() => onBatchComplete(batchStatus)}
            >
              View Results ({batchStatus.completed} transcripts)
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default BatchProgressSection;