import React from 'react';

const SpeakerLabel = ({ speaker, value, onChange }) => {
  // Extract speaker number to help users identify speakers in complex cases
  const speakerNumber = speaker.match(/\d+$/)?.[0] || '';
  
  return (
    <div className="speaker-input mb-2">
      <label htmlFor={`speaker-${speaker}`} className="form-label">
        {speaker}:
      </label>
      <input
        type="text"
        id={`speaker-${speaker}`}
        className="form-input"
        value={value}
        data-original={speaker}
        onChange={(e) => onChange(speaker, e.target.value)}
        placeholder={`Speaker ${speakerNumber}`}
      />
    </div>
  );
};

export default SpeakerLabel;