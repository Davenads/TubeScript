import React, { useState, useEffect } from 'react';
import { getBatchResults, exportTranscript } from '../utils/api';

const BatchResultsSection = ({ batchId, batchStatus }) => {
  const [results, setResults] = useState(null);
  const [selectedVideos, setSelectedVideos] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [expandedVideo, setExpandedVideo] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const data = await getBatchResults(batchId);
        setResults(data);
      } catch (error) {
        console.error('Error fetching batch results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [batchId]);

  const handleSelectAll = () => {
    if (selectedVideos.size === results?.results?.length) {
      setSelectedVideos(new Set());
    } else {
      setSelectedVideos(new Set(results?.results?.map(result => result.job_id) || []));
    }
  };

  const handleSelectVideo = (jobId) => {
    const newSelected = new Set(selectedVideos);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedVideos(newSelected);
  };

  const handleBulkExport = async (format) => {
    if (selectedVideos.size === 0) {
      alert('Please select at least one video to export');
      return;
    }

    // Export each selected video individually
    for (const jobId of selectedVideos) {
      try {
        await exportTranscript(jobId, format);
        console.log(`Exported ${jobId} as ${format}`);
      } catch (error) {
        console.error(`Error exporting ${jobId}:`, error);
      }
    }
  };

  if (loading) {
    return (
      <section>
        <h2 className="text-2xl mb-4 text-emerald-400">Batch Results</h2>
        <div className="card">
          <div className="text-center">Loading results...</div>
        </div>
      </section>
    );
  }

  if (!results || !results.results || results.results.length === 0) {
    return (
      <section>
        <h2 className="text-2xl mb-4 text-emerald-400">Batch Results</h2>
        <div className="card">
          <div className="text-center text-gray-400">No completed transcripts found.</div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-2xl mb-4 text-emerald-400">Batch Results</h2>
      <div className="card">
        
        {/* Summary */}
        <div className="mb-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
          <h3 className="text-lg font-semibold text-emerald-400 mb-2">Batch Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Total Videos:</span>
              <span className="ml-2 font-semibold">{results.total_videos}</span>
            </div>
            <div>
              <span className="text-gray-400">Completed:</span>
              <span className="ml-2 font-semibold text-green-400">{results.completed}</span>
            </div>
            <div>
              <span className="text-gray-400">Failed:</span>
              <span className="ml-2 font-semibold text-red-400">{results.failed}</span>
            </div>
            <div>
              <span className="text-gray-400">Status:</span>
              <span className={`ml-2 font-semibold ${
                results.status === 'completed' ? 'text-green-400' :
                results.status === 'partial' ? 'text-yellow-400' : 'text-gray-400'
              }`}>
                {results.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="mb-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
          <h3 className="text-lg font-semibold text-emerald-400 mb-3">Bulk Actions</h3>
          
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={handleSelectAll}
              className="text-sm text-emerald-400 hover:text-emerald-300 underline"
            >
              {selectedVideos.size === results.results.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-sm text-gray-400">
              {selectedVideos.size} of {results.results.length} selected
            </span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleBulkExport('txt')}
              disabled={selectedVideos.size === 0}
              className="btn-secondary"
            >
              Export TXT ({selectedVideos.size})
            </button>
            <button
              onClick={() => handleBulkExport('srt')}
              disabled={selectedVideos.size === 0}
              className="btn-secondary"
            >
              Export SRT ({selectedVideos.size})
            </button>
            <button
              onClick={() => handleBulkExport('vtt')}
              disabled={selectedVideos.size === 0}
              className="btn-secondary"
            >
              Export VTT ({selectedVideos.size})
            </button>
          </div>
        </div>

        {/* Results List */}
        <div>
          <h3 className="text-lg font-semibold text-emerald-400 mb-4">Completed Transcripts</h3>
          <div className="space-y-3">
            {results.results.map((result, index) => (
              <div key={result.job_id} className="border border-gray-700 rounded-lg overflow-hidden">
                <div className="p-4 bg-gray-800/50">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedVideos.has(result.job_id)}
                      onChange={() => handleSelectVideo(result.job_id)}
                      className="form-checkbox"
                    />
                    
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-200 truncate">{result.video_title}</h4>
                      <div className="text-sm text-gray-400">
                        Duration: {Math.floor(result.transcript.metadata.duration / 60)}:{String(result.transcript.metadata.duration % 60).padStart(2, '0')} | 
                        Speakers: {result.transcript.metadata.num_speakers}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => setExpandedVideo(expandedVideo === result.job_id ? null : result.job_id)}
                        className="text-sm text-emerald-400 hover:text-emerald-300 underline"
                      >
                        {expandedVideo === result.job_id ? 'Hide' : 'View'} Transcript
                      </button>
                      
                      <button
                        onClick={() => exportTranscript(result.job_id, 'txt')}
                        className="text-sm text-blue-400 hover:text-blue-300 underline"
                      >
                        Export
                      </button>
                    </div>
                  </div>
                </div>

                {expandedVideo === result.job_id && (
                  <div className="p-4 bg-gray-700/30 border-t border-gray-700">
                    <div className="transcript-container max-h-64">
                      {result.transcript.segments.map((segment, segIndex) => (
                        <div key={segIndex} className="transcript-segment">
                          <div className="segment-time">
                            [{segment.start.toFixed(1)}s - {segment.end.toFixed(1)}s]
                          </div>
                          <div className="segment-speaker">{segment.speaker}:</div>
                          <div className="segment-text">{segment.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BatchResultsSection;