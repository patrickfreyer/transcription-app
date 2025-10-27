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
      {/* Context count and info */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-foreground">
          AI Context: {actualContextCount} transcript{actualContextCount !== 1 ? 's' : ''}
        </span>
        <div className="group relative">
          <svg className="w-3.5 h-3.5 text-foreground-secondary cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-surface-secondary text-foreground text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-border max-w-xs">
            Use checkboxes in sidebar to select transcripts for AI context
          </div>
        </div>
      </div>

      {/* Chips container */}
      <div className="flex flex-wrap gap-2">
      {/* Show summary chip when >10 selected, otherwise show individual chips */}
      {selectedContextIds.length > 10 ? (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary bg-opacity-10 text-primary text-xs font-semibold rounded-full">
          <span>{selectedContextIds.length} transcripts selected</span>
        </div>
      ) : (
        /* Show individual chips when ≤10 selected */
        selectedContextIds.map(id => {
          const transcript = transcripts.find(t => t.id === id);
          if (!transcript) return null;

          return (
            <div
              key={id}
              className="inline-flex items-center gap-2 px-3 py-1 bg-primary bg-opacity-10 text-primary text-xs font-semibold rounded-full"
            >
              <span className="truncate max-w-[150px]">{transcript.fileName}</span>
              <button
                onClick={() => setSelectedContextIds(selectedContextIds.filter(cid => cid !== id))}
                className="hover:bg-primary hover:bg-opacity-20 rounded-full p-0.5 transition-all"
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
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-secondary text-foreground text-xs font-medium rounded-full border border-border">
          <svg className="w-3 h-3 text-foreground-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="truncate max-w-[150px]">{selectedTranscript.fileName}</span>
          <span className="text-foreground-tertiary text-[10px]">(viewing)</span>
        </div>
      )}

      {/* Empty state message */}
      {selectedContextIds.length === 0 && !selectedTranscript && (
        <span className="text-xs text-foreground-tertiary italic">
          Select transcripts using checkboxes to enable AI chat
        </span>
      )}
      </div>
    </div>
  );
};

export default ContextChips;
