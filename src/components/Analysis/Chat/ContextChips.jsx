import React from 'react';
import { useApp } from '../../../context/AppContext';

/**
 * ContextChips - Display selected context transcripts as removable chips with count
 */
const ContextChips = () => {
  const {
    transcripts,
    selectedContextIds,
    setSelectedContextIds,
    selectedTranscript
  } = useApp();

  // Determine actual context being used
  const actualContextCount = selectedContextIds.length > 0
    ? selectedContextIds.length
    : (selectedTranscript ? 1 : 0);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Context count */}
      <span className="text-xs font-medium text-foreground-secondary">
        {actualContextCount} transcript{actualContextCount !== 1 ? 's' : ''}
      </span>

      {/* Chips container */}
      <div className="flex flex-wrap gap-2">
      {/* Show summary chip when >10 selected, otherwise show individual chips */}
      {selectedContextIds.length > 10 ? (
        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-surface-secondary text-foreground text-xs font-medium rounded-md border border-border">
          <span>{selectedContextIds.length} selected</span>
        </div>
      ) : (
        /* Show individual chips when ≤10 selected */
        selectedContextIds.map(id => {
          const transcript = transcripts.find(t => t.id === id);
          if (!transcript) return null;

          return (
            <div
              key={id}
              className="inline-flex items-center gap-2 px-2.5 py-1 bg-surface-secondary text-foreground text-xs font-medium rounded-md border border-border"
            >
              <span className="truncate max-w-[150px]">{transcript.fileName}</span>
              <button
                onClick={() => setSelectedContextIds(selectedContextIds.filter(cid => cid !== id))}
                className="hover:bg-surface-tertiary rounded p-0.5 transition-colors duration-150"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })
      )}

      {/* Show current transcript if no context selected */}
      {selectedContextIds.length === 0 && selectedTranscript && (
        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-surface-secondary text-foreground-secondary text-xs font-medium rounded-md border border-border">
          <span className="truncate max-w-[150px]">{selectedTranscript.fileName}</span>
          <span className="text-foreground-tertiary text-[10px]">(viewing)</span>
        </div>
      )}

      {/* Empty state message */}
      {selectedContextIds.length === 0 && !selectedTranscript && (
        <span className="text-xs text-foreground-tertiary">
          Select transcripts to enable chat
        </span>
      )}
      </div>
    </div>
  );
};

export default ContextChips;
