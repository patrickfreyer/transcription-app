import React, { useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import TranscriptCard from './TranscriptCard';

function TranscriptList() {
  const {
    transcripts,
    searchQuery,
    filterMode,
    setSearchQuery,
    selectedContextIds,
    searchAllTranscripts,
    selectAllVisibleTranscripts,
    clearAllSelections
  } = useApp();

  const filteredTranscripts = useMemo(() => {
    let filtered = transcripts;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.fileName.toLowerCase().includes(query) ||
        t.rawTranscript.toLowerCase().includes(query) ||
        (t.summary && t.summary.toLowerCase().includes(query))
      );
    }

    if (filterMode === 'starred') {
      filtered = filtered.filter(t => t.starred);
    } else if (filterMode === 'recent') {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(t => t.timestamp > sevenDaysAgo);
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [transcripts, searchQuery, filterMode]);

  if (filteredTranscripts.length === 0) {
    return (
      <div className="p-8 text-center text-foreground-secondary">
        <svg className="w-12 h-12 mx-auto mb-3 text-foreground-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p className="text-sm font-semibold mb-1">No transcripts found</p>
        {searchQuery && (
          <>
            <p className="text-xs text-foreground-tertiary mb-2">
              No results for "{searchQuery}"
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-primary hover:underline"
            >
              Clear search
            </button>
          </>
        )}
        {!searchQuery && filterMode === 'starred' && (
          <p className="text-xs text-foreground-tertiary">
            Star transcripts to see them here
          </p>
        )}
        {!searchQuery && filterMode === 'recent' && (
          <p className="text-xs text-foreground-tertiary">
            No transcripts from the last 7 days
          </p>
        )}
        {!searchQuery && filterMode === 'all' && transcripts.length === 0 && (
          <p className="text-xs text-foreground-tertiary">
            Create your first transcription to get started
          </p>
        )}
      </div>
    );
  }

  const visibleTranscriptIds = filteredTranscripts.map(t => t.id);
  const selectedCount = selectedContextIds.length;
  const allVisibleSelected = visibleTranscriptIds.length > 0 &&
    visibleTranscriptIds.every(id => selectedContextIds.includes(id));

  const handleSelectAll = () => {
    if (allVisibleSelected) {
      clearAllSelections();
    } else {
      selectAllVisibleTranscripts(visibleTranscriptIds);
    }
  };

  return (
    <div>
      {/* Select All Header */}
      {filteredTranscripts.length > 0 && (
        <div className="sticky top-0 z-10 bg-surface border-b border-border px-4 py-3">
          {/* Help text */}
          <div className="flex items-start gap-1.5 mb-2.5">
            <svg className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-foreground-secondary leading-relaxed">
              Check transcripts to include them in <span className="font-semibold text-foreground">AI chat context</span>.
              Click to view transcript.
            </p>
          </div>

          {/* Select All button + selected count */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              <div className="w-5 h-5 rounded border border-border hover:border-primary transition-colors flex items-center justify-center">
                {allVisibleSelected && (
                  <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span>
                Select All {filteredTranscripts.length > 0 && `(${filteredTranscripts.length})`}
              </span>
            </button>

            {selectedCount > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-primary flex items-center gap-1.5">
                  <span>{selectedCount} selected</span>
                  {searchAllTranscripts && (
                    <span className="px-1.5 py-0.5 bg-primary text-white text-[10px] rounded uppercase font-bold">
                      All
                    </span>
                  )}
                </span>
                <button
                  onClick={clearAllSelections}
                  className="text-xs font-medium text-foreground-secondary hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transcript List */}
      <div className="space-y-2">
        {filteredTranscripts.map(transcript => (
          <TranscriptCard key={transcript.id} transcript={transcript} />
        ))}
      </div>
    </div>
  );
}

export default TranscriptList;
