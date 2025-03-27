import React from 'react';

const SpeakerLabel = ({ speaker, value, onChange }) => {
  return (
    <div className="speaker-input">
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
      />
    </div>
  );
};

export default SpeakerLabel;