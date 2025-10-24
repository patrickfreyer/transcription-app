import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';

/**
 * ContextSelector - Modal for selecting multiple transcripts as context
 */
const ContextSelector = ({ onClose }) => {
  const {
    transcripts,
    selectedContextIds,
    setSelectedContextIds
  } = useApp();

  const [localSelectedIds, setLocalSelectedIds] = useState([...selectedContextIds]);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter transcripts by search
  const filteredTranscripts = transcripts.filter(t =>
    t.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Estimate token count (rough: 4 chars = 1 token)
  const estimatedTokens = localSelectedIds.reduce((sum, id) => {
    const transcript = transcripts.find(t => t.id === id);
    return sum + (transcript ? Math.ceil(transcript.rawTranscript.length / 4) : 0);
  }, 0);

  const isOverLimit = estimatedTokens > 100000; // 100k tokens (safe limit for gpt-4o)

  // Helper functions
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-foreground">
              Select Context Transcripts
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-secondary rounded-lg text-foreground-secondary hover:text-foreground transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcripts..."
            className="w-full px-4 py-2 bg-surface border border rounded-xl text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredTranscripts.map(transcript => (
            <label
              key={transcript.id}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-tertiary cursor-pointer"
            >
              <input
                type="checkbox"
                checked={localSelectedIds.includes(transcript.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setLocalSelectedIds([...localSelectedIds, transcript.id]);
                  } else {
                    setLocalSelectedIds(localSelectedIds.filter(id => id !== transcript.id));
                  }
                }}
                className="w-4 h-4 text-primary rounded"
              />
              <div className="flex-1">
                <div className="font-semibold text-sm text-foreground">
                  {transcript.fileName}
                </div>
                <div className="text-xs text-foreground-secondary">
                  {formatTimestamp(transcript.timestamp)} • {formatDuration(transcript.duration)}
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm">
              <span className="text-foreground-secondary">Selected: </span>
              <span className="font-semibold text-foreground">{localSelectedIds.length}</span>
              <span className="text-foreground-secondary"> transcript(s)</span>
            </div>
            <div className={`text-xs ${isOverLimit ? 'text-error font-semibold' : 'text-foreground-secondary'}`}>
              ~{(estimatedTokens / 1000).toFixed(1)}k tokens
              {isOverLimit && ' (exceeds safe limit)'}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border font-semibold text-sm hover:bg-surface-tertiary transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setSelectedContextIds(localSelectedIds);
                onClose();
              }}
              disabled={isOverLimit}
              className={`flex-1 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                isOverLimit
                  ? 'bg-surface-secondary text-foreground-secondary cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary-hover'
              }`}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContextSelector;
