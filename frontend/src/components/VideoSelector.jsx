import React, { useState, useEffect } from 'react';
import { getVideoList } from '../utils/api';

const VideoSelector = ({ url, onSelectionChange, initialSelected = [] }) => {
  const [videos, setVideos] = useState([]);
  const [selectedVideos, setSelectedVideos] = useState(new Set(initialSelected));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalVideos, setTotalVideos] = useState(0);
  const [sourceInfo, setSourceInfo] = useState(null);
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, title, duration
  
  const VIDEOS_PER_PAGE = 20;

  useEffect(() => {
    if (url) {
      loadVideos(true); // Reset on URL change
    }
  }, [url]);

  useEffect(() => {
    onSelectionChange(Array.from(selectedVideos));
  }, [selectedVideos, onSelectionChange]);

  const loadVideos = async (reset = false) => {
    try {
      setLoading(true);
      setError('');
      
      const currentOffset = reset ? 0 : offset;
      const response = await getVideoList(url, currentOffset, VIDEOS_PER_PAGE);
      
      if (reset) {
        setVideos(response.videos);
        setSourceInfo({ 
          title: response.title, 
          type: response.type,
          uploader: response.uploader 
        });
        setTotalVideos(response.total_videos);
        setOffset(VIDEOS_PER_PAGE);
      } else {
        setVideos(prev => [...prev, ...response.videos]);
        setOffset(prev => prev + VIDEOS_PER_PAGE);
      }
      
      setHasMore(response.has_more);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoToggle = (videoId) => {
    setSelectedVideos(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(videoId)) {
        newSelected.delete(videoId);
      } else {
        newSelected.add(videoId);
      }
      return newSelected;
    });
  };

  const handleSelectAll = () => {
    const filteredVideoIds = getFilteredVideos().map(v => v.id);
    setSelectedVideos(new Set(filteredVideoIds));
  };

  const handleSelectNone = () => {
    setSelectedVideos(new Set());
  };

  const handleSelectVisible = () => {
    const visibleVideoIds = getFilteredVideos().slice(0, Math.min(videos.length, 20)).map(v => v.id);
    setSelectedVideos(prev => new Set([...prev, ...visibleVideoIds]));
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      const year = dateString.slice(0, 4);
      const month = dateString.slice(4, 6);
      const day = dateString.slice(6, 8);
      return new Date(`${year}-${month}-${day}`).toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  const getFilteredVideos = () => {
    let filtered = videos.filter(video =>
      video.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort videos
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return (a.upload_date || '').localeCompare(b.upload_date || '');
        case 'newest':
          return (b.upload_date || '').localeCompare(a.upload_date || '');
        case 'title':
          return a.title.localeCompare(b.title);
        case 'duration':
          return (b.duration || 0) - (a.duration || 0);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredVideos = getFilteredVideos();

  if (!url) {
    return (
      <div className="p-4 text-center text-gray-500">
        Enter a YouTube channel or playlist URL to select videos
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {sourceInfo && (
        <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
          <h3 className="text-lg font-semibold text-emerald-400 mb-2">
            {sourceInfo.type === 'playlist' ? 'Playlist' : 'Channel'}: {sourceInfo.title}
          </h3>
          <div className="text-sm text-gray-400">
            <span>Total videos: {totalVideos}</span>
            <span className="ml-4">Selected: {selectedVideos.size}</span>
            {sourceInfo.uploader && <span className="ml-4">By: {sourceInfo.uploader}</span>}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="flex-1 min-w-64">
          <input
            type="text"
            placeholder="Search videos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
          />
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="form-input w-40"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A-Z</option>
          <option value="duration">Longest first</option>
        </select>

        {/* Selection controls */}
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            className="btn-secondary text-xs px-3 py-1"
            disabled={loading}
          >
            Select All
          </button>
          <button
            onClick={handleSelectVisible}
            className="btn-secondary text-xs px-3 py-1"
            disabled={loading}
          >
            Select Visible
          </button>
          <button
            onClick={handleSelectNone}
            className="btn-secondary text-xs px-3 py-1"
            disabled={loading}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-red-500 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
          {error}
        </div>
      )}

      {/* Video List */}
      <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-600 rounded-lg">
        {filteredVideos.map((video, index) => (
          <div
            key={video.id}
            className={`flex items-center gap-3 p-3 hover:bg-gray-700/50 cursor-pointer border-b border-gray-700/50 last:border-b-0 ${
              selectedVideos.has(video.id) ? 'bg-emerald-500/10 border-emerald-500/30' : ''
            }`}
            onClick={() => handleVideoToggle(video.id)}
          >
            <input
              type="checkbox"
              checked={selectedVideos.has(video.id)}
              onChange={() => handleVideoToggle(video.id)}
              className="form-checkbox"
            />
            
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-200 truncate" title={video.title}>
                {video.title}
              </div>
              <div className="text-xs text-gray-400 flex gap-4 mt-1">
                <span>Duration: {formatDuration(video.duration)}</span>
                <span>Uploaded: {formatDate(video.upload_date)}</span>
                {video.view_count > 0 && <span>Views: {video.view_count.toLocaleString()}</span>}
              </div>
            </div>

            <div className="text-xs text-gray-500 w-8 text-right">
              #{index + 1}
            </div>
          </div>
        ))}

        {/* Load more button */}
        {hasMore && !loading && (
          <div className="p-4 text-center">
            <button
              onClick={() => loadVideos(false)}
              className="btn-secondary"
              disabled={loading}
            >
              Load More Videos
            </button>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="p-4 text-center text-gray-500">
            Loading videos...
          </div>
        )}

        {/* No results */}
        {!loading && filteredVideos.length === 0 && videos.length > 0 && (
          <div className="p-4 text-center text-gray-500">
            No videos match your search
          </div>
        )}
      </div>

      {/* Summary */}
      {filteredVideos.length > 0 && (
        <div className="text-sm text-gray-400 text-center">
          Showing {filteredVideos.length} of {totalVideos} videos
          {searchTerm && ` (filtered by "${searchTerm}")`}
        </div>
      )}
    </div>
  );
};

export default VideoSelector;