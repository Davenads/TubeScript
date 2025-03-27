import React, { useState } from 'react';
import { renameSpeakers, exportTranscript, fetchTranscript } from '../utils/api';
import TranscriptSegment from './TranscriptSegment';
import SpeakerLabel from './SpeakerLabel';

const ResultSection = ({ transcript, jobId, onTranscriptUpdate }) => {
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [speakerNames, setSpeakerNames] = useState(() => {
    // Initialize with current speakers
    const speakerMap = {};
    const speakers = new Set();
    
    transcript.segments.forEach(segment => {
      speakers.add(segment.speaker);
    });
    
    speakers.forEach(speaker => {
      speakerMap[speaker] = speaker;
    });
    
    return speakerMap;
  });
  
  const handleNameChange = (originalName, newName) => {
    setSpeakerNames(prev => ({
      ...prev,
      [originalName]: newName
    }));
  };
  
  const handleApplyNames = async () => {
    const speakerMapping = {};
    
    // Get only changed names
    Object.entries(speakerNames).forEach(([originalName, newName]) => {
      if (originalName !== newName) {
        speakerMapping[originalName] = newName;
      }
    });
    
    if (Object.keys(speakerMapping).length === 0) {
      return; // No changes
    }
    
    try {
      setError('');
      setSuccess('');
      
      // Apply rename on the server
      await renameSpeakers(jobId, speakerMapping);
      
      // Fetch the updated transcript
      const updatedTranscript = await fetchTranscript(jobId);
      onTranscriptUpdate(updatedTranscript);
      
      // Show success message
      setSuccess('Speaker names updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error renaming speakers:', err);
      setError(err.message || 'Failed to rename speakers');
    }
  };
  
  const handleExport = async (format) => {
    try {
      setError('');
      await exportTranscript(jobId, format);
    } catch (err) {
      console.error(`Error exporting ${format}:`, err);
      setError(err.message || `Failed to export as ${format}`);
    }
  };
  
  // Format timestamp for display
  const formatTimestamp = (seconds) => {
    const date = new Date(seconds * 1000);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const secs = date.getUTCSeconds().toString().padStart(2, '0');
    const ms = date.getUTCMilliseconds().toString().padStart(3, '0');
    
    return `${hours}:${minutes}:${secs}.${ms}`;
  };
  
  // Get unique speakers
  const uniqueSpeakers = [...new Set(transcript.segments.map(segment => segment.speaker))];
  
  return (
    <section>
      <h2 className="text-2xl mb-4 text-emerald-400">Transcript</h2>
      <div className="card">
        <div className="metadata">
          <div>Title: {transcript.metadata.title}</div>
          <div>Duration: {transcript.metadata.duration}</div>
          <div>Speakers: {transcript.metadata.num_speakers}</div>
        </div>
        
        <div className="speaker-controls">
          <h3>Speaker Names</h3>
          
          <div className="speaker-labels">
            {uniqueSpeakers.map(speaker => (
              <SpeakerLabel
                key={speaker}
                speaker={speaker}
                value={speakerNames[speaker]}
                onChange={handleNameChange}
              />
            ))}
          </div>
          
          {success && (
            <div className="success-message">{success}</div>
          )}
          
          {error && (
            <div className="error-message text-red-500 mb-4">{error}</div>
          )}
          
          <button 
            className="btn-secondary"
            onClick={handleApplyNames}
          >
            Apply Names
          </button>
        </div>
        
        <div className="transcript-container">
          {transcript.segments.map((segment, index) => (
            <TranscriptSegment
              key={index}
              segment={segment}
              formatTimestamp={formatTimestamp}
              displayName={speakerNames[segment.speaker]}
            />
          ))}
        </div>
        
        <div className="export-options">
          <h3>Export Options</h3>
          <div className="btn-group">
            <button 
              className="btn-secondary"
              onClick={() => handleExport('txt')}
            >
              TXT
            </button>
            <button 
              className="btn-secondary"
              onClick={() => handleExport('srt')}
            >
              SRT
            </button>
            <button 
              className="btn-secondary"
              onClick={() => handleExport('vtt')}
            >
              VTT
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResultSection;