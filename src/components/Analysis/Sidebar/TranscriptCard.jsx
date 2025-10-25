import React, { useState, useRef, useEffect } from 'react';
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
    isTranscriptSelected,
    renameTranscript,
    openTranscriptDetail
  } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(transcript.fileName || 'Untitled Transcript');
  const inputRef = useRef(null);

  const isSelected = isTranscriptSelected(transcript.id);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    if (!isEditing) {
      setSelectedTranscriptId(transcript.id);
      // Also add to selection if not already selected
      if (!isSelected) {
        toggleTranscriptSelection(transcript.id);
      }
    }
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (!isEditing) {
      // Open detail view on double-click
      openTranscriptDetail(transcript.id);
    }
  };

  const handleRenameClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditName(transcript.fileName || 'Untitled Transcript');
  };

  const handleRename = async () => {
    if (editName.trim() && editName.trim() !== transcript.fileName) {
      console.log(`💾 Saving new name: "${editName.trim()}"`);
      await renameTranscript(transcript.id, editName.trim());
      console.log('✅ Rename saved');
    } else {
      console.log('❌ Rename cancelled - no changes or empty name');
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRename();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(transcript.fileName || 'Untitled Transcript');
    }
  };

  const handleBlur = () => {
    handleRename();
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
      onDoubleClick={handleDoubleClick}
      className={`group p-3 border-b border-border cursor-pointer transition-all duration-200 hover:bg-surface-tertiary ${
        isActive ? 'bg-blue-50 border-l-4 border-l-primary' : ''
      } ${
        isSelected ? 'border-l-2 border-l-primary bg-primary bg-opacity-5' : ''
      }`}
      title="Double-click to view details"
    >
      <div className="flex items-start gap-2.5 mb-1.5 min-w-0">
        {/* Checkbox */}
        <button
          onClick={handleCheckboxClick}
          className="flex-shrink-0 mt-0.5 w-4 h-4 rounded border border-border hover:border-primary transition-colors duration-200 flex items-center justify-center"
          aria-label={isSelected ? 'Deselect transcript' : 'Select transcript'}
        >
          {isSelected && (
            <svg className="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>

        {/* Title - Editable on double-click */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 px-2 py-0.5 text-sm font-medium text-foreground bg-surface border border-primary rounded focus:outline-none focus:ring-1 focus:ring-primary"
            maxLength={100}
          />
        ) : (
          <h3
            className="font-medium text-foreground text-sm truncate flex-1 min-w-0"
            title={transcript.fileName || 'Untitled Transcript'}
          >
            {transcript.fileName || 'Untitled Transcript'}
          </h3>
        )}

        {/* Action buttons - Show on hover */}
        <div className="flex items-center gap-0.5 ml-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={handleRenameClick}
            className="p-1 hover:bg-surface-tertiary rounded transition-all duration-200"
            aria-label="Rename"
            title="Rename transcript"
          >
            <svg className="w-3.5 h-3.5 text-foreground-secondary hover:text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={handleStarClick}
            className="p-1 hover:bg-surface-tertiary rounded transition-all duration-200"
            aria-label={transcript.starred ? 'Unstar' : 'Star'}
          >
            <svg
              className={`w-3.5 h-3.5 transition-colors ${transcript.starred ? 'text-yellow-500' : 'text-foreground-secondary hover:text-yellow-500'}`}
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
            className="p-1 hover:bg-error/10 dark:hover:bg-error/20 text-foreground-secondary hover:text-error rounded transition-all duration-200"
            aria-label="Delete"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>

        {/* Star indicator - Always visible if starred */}
        {transcript.starred && (
          <div className="flex-shrink-0 opacity-100 group-hover:opacity-0 transition-opacity duration-200">
            <svg
              className="w-3.5 h-3.5 text-yellow-500"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-foreground-secondary min-w-0 ml-6.5">
        <span className="flex-shrink-0">{formatDuration(transcript.duration)}</span>
        <span>•</span>
        <span className="truncate">{formatTimestamp(transcript.timestamp)}</span>
      </div>
    </div>
  );
}

export default TranscriptCard;
