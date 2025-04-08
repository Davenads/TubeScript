import React, { useState, useEffect } from 'react';
import { renameSpeakers, exportTranscript, fetchTranscript, mergeSpeakers } from '../utils/api';
import TranscriptSegment from './TranscriptSegment';
import SpeakerLabel from './SpeakerLabel';

const ResultSection = ({ transcript, jobId, onTranscriptUpdate }) => {
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [speakerNames, setSpeakerNames] = useState({});
  const [selectedSpeakers, setSelectedSpeakers] = useState([]);
  const [mergedName, setMergedName] = useState('');
  
  // Initialize speaker names whenever transcript changes
  useEffect(() => {
    // Initialize with current speakers while preserving existing mappings
    const speakerMap = { ...speakerNames }; // Keep existing mappings
    const speakers = new Set();
    
    transcript.segments.forEach(segment => {
      speakers.add(segment.speaker);
    });
    
    // Add any new speakers that don't exist in current mappings
    speakers.forEach(speaker => {
      if (!speakerMap[speaker]) {
        speakerMap[speaker] = speaker;
      }
    });
    
    setSpeakerNames(speakerMap);
  }, [transcript]);
  
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
      // Even if no names changed, we should still update the UI with current names
      // This helps resolve the issue where names don't appear on first click
      const updatedNames = {};
      uniqueSpeakers.forEach(speaker => {
        updatedNames[speaker] = speakerNames[speaker] || speaker;
      });
      setSpeakerNames(updatedNames);
      return;
    }
    
    try {
      setError('');
      setSuccess('');
      
      // Apply rename on the server
      await renameSpeakers(jobId, speakerMapping);
      
      // Fetch the updated transcript
      const updatedTranscript = await fetchTranscript(jobId);
      
      // Simplified approach: create a fresh mapping for the updated transcript
      const updatedSpeakerMap = {};
      
      // Extract all new speakers from the updated transcript
      updatedTranscript.segments.forEach(segment => {
        const speaker = segment.speaker;
        // If we already have a mapping for this speaker, use it
        // Otherwise use the speaker ID itself as the display name
        updatedSpeakerMap[speaker] = speakerMapping[speaker] || speaker;
      });
      
      // Update speaker names with the new mappings
      console.log("Updated speaker map:", updatedSpeakerMap);
      setSpeakerNames(updatedSpeakerMap);
      
      // Update the transcript in parent component
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
  
  const handleToggleSpeakerSelection = (speaker) => {
    setSelectedSpeakers(prev => {
      // If already selected, remove it
      if (prev.includes(speaker)) {
        return prev.filter(s => s !== speaker);
      } 
      // Otherwise add it
      return [...prev, speaker];
    });
  };
  
  const handleMergeSpeakers = async () => {
    // Validate we have at least 2 speakers and a name
    if (selectedSpeakers.length < 2) {
      setError('Please select at least two speakers to merge');
      return;
    }
    
    if (!mergedName.trim()) {
      setError('Please provide a name for the merged speaker');
      return;
    }
    
    try {
      setError('');
      setSuccess('');
      
      // Make the API call to merge speakers
      await mergeSpeakers(jobId, selectedSpeakers, mergedName);
      
      // Fetch the updated transcript
      const updatedTranscript = await fetchTranscript(jobId);
      
      // Reset selection state
      setSelectedSpeakers([]);
      setMergedName('');
      
      // Update the transcript in parent component
      onTranscriptUpdate(updatedTranscript);
      
      // Show success message
      setSuccess('Speakers merged successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error merging speakers:', err);
      setError(err.message || 'Failed to merge speakers');
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
  
  // For debugging
  console.log("Speaker names state:", speakerNames);
  console.log("Unique speakers:", uniqueSpeakers);
  
  // Show merge UI if we have 2 or more speakers (can merge 2 speakers into 1)
  const showMergeUI = uniqueSpeakers.length >= 3;
  
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
                value={speakerNames[speaker] || speaker}
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
          
          {showMergeUI && (
            <div className="merge-controls mt-8">
              <h3>Merge Speakers</h3>
              
              <div className="speaker-merge-selection">
                <p className="text-sm text-gray-400 mb-2">Select speakers to merge:</p>
                
                <div className="checkbox-group mb-4">
                  {uniqueSpeakers.map(speaker => (
                    <div key={`merge-${speaker}`} className="checkbox-item">
                      <input
                        type="checkbox"
                        id={`merge-${speaker}`}
                        checked={selectedSpeakers.includes(speaker)}
                        onChange={() => handleToggleSpeakerSelection(speaker)}
                        className="mr-2"
                      />
                      <label htmlFor={`merge-${speaker}`} className="text-sm">
                        {speakerNames[speaker] || speaker}
                      </label>
                    </div>
                  ))}
                </div>
                
                <div className="merged-name-input mb-4">
                  <label htmlFor="merged-name" className="form-label block mb-1">
                    New merged speaker name:
                  </label>
                  <input
                    type="text"
                    id="merged-name"
                    className="form-input w-full"
                    value={mergedName}
                    onChange={(e) => setMergedName(e.target.value)}
                    placeholder="e.g., John Smith"
                  />
                </div>
                
                <button 
                  className="btn-secondary"
                  onClick={handleMergeSpeakers}
                  disabled={selectedSpeakers.length < 2 || !mergedName.trim()}
                >
                  Merge Selected Speakers
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="transcript-container">
          {transcript.segments.map((segment, index) => (
            <TranscriptSegment
              key={index}
              segment={segment}
              formatTimestamp={formatTimestamp}
              displayName={speakerNames[segment.speaker] || segment.speaker}
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