import React, { useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import TranscriptCard from './TranscriptCard';

function TranscriptList() {
  const {
    transcripts,
    searchQuery,
    setSearchQuery,
    selectedContextIds,
    selectAllVisibleTranscripts,
    clearAllSelections,
    switchTab
  } = useApp();

  const filteredTranscripts = useMemo(() => {
    let filtered = transcripts;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.fileName.toLowerCase().includes(query) ||
        (t.summary && t.summary.toLowerCase().includes(query)) ||
        (t.rawTranscript && t.rawTranscript.toLowerCase().includes(query)) // Legacy transcripts only
      );
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [transcripts, searchQuery]);

  if (filteredTranscripts.length === 0) {
    return (
      <div className="p-8 text-center text-foreground-secondary">
        <div className="max-w-xs mx-auto">
          <svg className="w-16 h-16 mx-auto mb-4 text-foreground-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="13" x2="15" y2="13" />
            <line x1="9" y1="17" x2="15" y2="17" />
          </svg>
          <h3 className="text-base font-semibold mb-2 text-foreground">No transcripts found</h3>
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
        {!searchQuery && transcripts.length === 0 && (
          <div className="mt-4">
            <p className="text-xs text-foreground-tertiary mb-4">
              Get started by creating your first transcript
            </p>
            <button
              onClick={() => switchTab('recording')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-info text-white rounded-lg text-sm font-medium hover:bg-info-hover transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
              <span>Go to Recording</span>
            </button>
          </div>
        )}
        </div>
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
                <span className="text-xs font-medium text-primary">
                  {selectedCount} selected
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
