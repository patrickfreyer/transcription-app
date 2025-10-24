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
      <div className="p-8 text-center text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p className="text-sm font-semibold mb-1">No transcripts found</p>
        {searchQuery && (
          <>
            <p className="text-xs text-gray-400 mb-2">
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
          <p className="text-xs text-gray-400">
            Star transcripts to see them here
          </p>
        )}
        {!searchQuery && filterMode === 'recent' && (
          <p className="text-xs text-gray-400">
            No transcripts from the last 7 days
          </p>
        )}
        {!searchQuery && filterMode === 'all' && transcripts.length === 0 && (
          <p className="text-xs text-gray-400">
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
        <div className="sticky top-0 z-10 bg-white border-b-2 border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary transition-colors"
          >
            <div className="w-5 h-5 rounded border-2 border-gray-300 hover:border-primary transition-colors flex items-center justify-center">
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
                className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear
              </button>
            </div>
          )}
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
