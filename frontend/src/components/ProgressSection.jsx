import React, { useEffect, useRef } from 'react';
import { getJobStatus, fetchTranscript } from '../utils/api';

const ProgressSection = ({ jobId, onProcessComplete, progress, setProgress }) => {
  const pollIntervalRef = useRef(null);
  
  useEffect(() => {
    // Start polling for status
    if (jobId) {
      startPolling();
    }
    
    return () => {
      // Clean up interval on component unmount
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [jobId]);
  
  const startPolling = () => {
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    // Poll for status every second
    pollIntervalRef.current = setInterval(async () => {
      try {
        const status = await getJobStatus(jobId);
        
        // Update progress
        const progressPercent = Math.round(status.progress * 100);
        setProgress({
          percent: progressPercent,
          message: status.message
        });
        
        // Check if job is complete
        if (status.status === 'completed') {
          clearInterval(pollIntervalRef.current);
          const transcript = await fetchTranscript(jobId);
          onProcessComplete(transcript);
        } else if (status.status === 'failed') {
          clearInterval(pollIntervalRef.current);
          setProgress(prev => ({
            ...prev,
            message: `Error: ${status.message}`
          }));
        }
      } catch (error) {
        console.error('Error polling status:', error);
        setProgress(prev => ({
          ...prev,
          message: `Error: ${error.message || 'Unknown error'}`
        }));
        clearInterval(pollIntervalRef.current);
      }
    }, 1000);
  };
  
  return (
    <section>
      <h2 className="text-2xl mb-4 text-emerald-400">Processing</h2>
      <div className="card">
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress.percent}%` }}
            ></div>
          </div>
          <div className="progress-status">{progress.message}</div>
        </div>
      </div>
    </section>
  );
};

export default ProgressSection;