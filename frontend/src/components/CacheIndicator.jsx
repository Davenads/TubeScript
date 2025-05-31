import React from 'react';

const CacheIndicator = ({ isCached, timestamp, className = '' }) => {
  if (!isCached) return null;

  const formatCacheTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 bg-blue-900/30 border border-blue-700 rounded text-xs text-blue-300 ${className}`}>
      <span>💾</span>
      <span>Cached {timestamp ? formatCacheTime(timestamp) : ''}</span>
    </div>
  );
};

export default CacheIndicator;