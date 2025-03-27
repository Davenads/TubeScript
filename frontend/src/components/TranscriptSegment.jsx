import React from 'react';

const TranscriptSegment = ({ segment, formatTimestamp, displayName }) => {
  return (
    <div className="transcript-segment">
      <div className="segment-time">
        [{formatTimestamp(segment.start)} {'->'} {formatTimestamp(segment.end)}]
      </div>
      <div className="segment-speaker" data-speaker={segment.speaker}>
        {displayName}:
      </div>
      <div className="segment-text">{segment.text}</div>
    </div>
  );
};

export default TranscriptSegment;