import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import TranscriptViewer from './TranscriptViewer';

/**
 * DetailView - Shows detailed transcript viewer in left panel
 * Replaces the list view when user double-clicks a transcript
 */
function DetailView() {
  const { detailViewTranscript, closeTranscriptDetail } = useApp();

  // Handle ESC key to close detail view
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeTranscriptDetail();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeTranscriptDetail]);

  if (!detailViewTranscript) {
    return (
      <div className="h-full flex items-center justify-center bg-surface p-4">
        <div className="text-center text-foreground-secondary">
          <p className="text-sm">Transcript not found</p>
          <button
            onClick={closeTranscriptDetail}
            className="mt-3 text-xs text-primary hover:underline"
          >
            ← Back to list
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface animate-fade-slide-in">
      {/* Row 1: Title Bar with back navigation (48px fixed height) */}
      <div className="flex-shrink-0 h-12 px-4 flex items-center border-b border-border bg-surface">
        <button
          onClick={closeTranscriptDetail}
          className="flex items-center gap-2 text-base font-semibold text-foreground hover:text-primary transition-colors group"
          title="Go back to list (ESC)"
        >
          <svg
            className="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Back</span>
        </button>
      </div>

      {/* Row 2: Breadcrumb Toolbar */}
      <div className="flex-shrink-0 min-h-[60px] px-4 py-2 flex items-center border-b border-border bg-surface-secondary">
        <div className="flex items-center gap-2 text-xs text-foreground-tertiary">
          <span>Transcripts</span>
          <span>/</span>
          <span className="truncate font-medium text-foreground-secondary" title={detailViewTranscript.fileName}>
            {detailViewTranscript.fileName || 'Untitled'}
          </span>
        </div>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <TranscriptViewer transcription={detailViewTranscript} />
      </div>
    </div>
  );
}

export default DetailView;
