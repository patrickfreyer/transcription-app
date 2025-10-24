import React from 'react';
import { useApp } from '../../../context/AppContext';

// Helper function to format timestamp
const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Unknown time';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Helper function to format duration
const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Helper function to get model display name
const getModelDisplayName = (modelId) => {
  const modelMap = {
    'whisper-1': 'Whisper',
    'gpt-4o-transcribe': 'GPT-4o Transcribe',
    'gpt-4o-transcribe-diarize': 'GPT-4o (Diarized)',
    'gpt-4': 'GPT-4',
    'gpt-4-turbo': 'GPT-4 Turbo',
    'gpt-3.5-turbo': 'GPT-3.5',
    'claude-3-opus': 'Claude 3 Opus',
    'claude-3-sonnet': 'Claude 3 Sonnet',
    'claude-3-haiku': 'Claude 3 Haiku',
  };
  return modelMap[modelId] || modelId || 'Unknown Model';
};

function TranscriptCard({ transcript, isActive }) {
  const {
    setSelectedTranscriptId,
    toggleStarTranscript,
    deleteTranscript,
    toggleTranscriptSelection,
    isTranscriptSelected
  } = useApp();

  const isSelected = isTranscriptSelected(transcript.id);

  const handleClick = () => {
    setSelectedTranscriptId(transcript.id);
    // Also add to selection if not already selected
    if (!isSelected) {
      toggleTranscriptSelection(transcript.id);
    }
  };

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    toggleTranscriptSelection(transcript.id);
  };

  const handleStarClick = (e) => {
    e.stopPropagation();
    toggleStarTranscript(transcript.id);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this transcript?')) {
      deleteTranscript(transcript.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`p-4 border-b border-gray-200 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
        isActive ? 'bg-blue-50 border-l-4 border-l-primary' : ''
      } ${
        isSelected ? 'ring-2 ring-primary ring-inset' : ''
      }`}
    >
      <div className="flex items-start gap-3 mb-2 min-w-0">
        {/* Checkbox */}
        <button
          onClick={handleCheckboxClick}
          className="flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 border-gray-300 hover:border-primary transition-colors duration-200 flex items-center justify-center"
          aria-label={isSelected ? 'Deselect transcript' : 'Select transcript'}
        >
          {isSelected && (
            <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>

        {/* Title */}
        <h3
          className="font-semibold text-gray-900 text-sm line-clamp-2 flex-1 min-w-0 break-words"
          title={transcript.fileName || 'Untitled Transcript'}
        >
          {transcript.fileName || 'Untitled Transcript'}
        </h3>

        {/* Action buttons */}
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <button
            onClick={handleStarClick}
            className="p-1 hover:bg-gray-200 rounded transition-all duration-200"
            aria-label={transcript.starred ? 'Unstar' : 'Star'}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill={transcript.starred ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-1 hover:bg-red-100 text-red-600 rounded transition-all duration-200"
            aria-label="Delete"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500 min-w-0">
        <span className="flex items-center gap-1 flex-shrink-0">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {formatDuration(transcript.duration)}
        </span>
        <span className="truncate">{formatTimestamp(transcript.timestamp)}</span>
      </div>

      {transcript.model && (
        <div className="mt-2">
          <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded truncate max-w-full">
            {getModelDisplayName(transcript.model)}
          </span>
        </div>
      )}
    </div>
  );
}

export default TranscriptCard;
