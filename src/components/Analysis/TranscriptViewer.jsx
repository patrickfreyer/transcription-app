import React, { useState } from 'react';
import MarkdownRenderer from '../Common/MarkdownRenderer';
import DiarizedTranscriptView from './DiarizedTranscriptView';

function TranscriptViewer({ transcription, onTranscribeAnother, showTranscribeAnotherButton = false }) {
  const [activeView, setActiveView] = useState('raw'); // 'raw' or 'summary'
  const [showExportMenu, setShowExportMenu] = useState(false);

  const {
    rawTranscript,
    summary,
    summaryTemplate,
    model,
    fileName,
    duration,
    timestamp,
    isDiarized,
    vttTranscript,
    warning,
    failedChunks
  } = transcription;

  const hasSummary = summary && summary.trim().length > 0;

  // Check if this is a diarized transcript (either flag or detect from content)
  const isDiarizedTranscript = isDiarized || (rawTranscript && /^\w+:\n/m.test(rawTranscript));

  // Debug logging
  console.log('TranscriptViewer - Transcription data:', {
    hasSummary,
    summaryLength: summary?.length || 0,
    summaryTemplate,
    rawTranscriptLength: rawTranscript?.length || 0
  });

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCopy = () => {
    const textToCopy = activeView === 'summary' ? summary : rawTranscript;
    navigator.clipboard.writeText(textToCopy);
    // TODO: Show toast notification
    console.log('Copied to clipboard');
  };

  const handleExport = async (format) => {
    const content = activeView === 'summary' ? summary : rawTranscript;
    const suggestedFileName = `${fileName || 'transcript'}-${Date.now()}`;

    try {
      const result = await window.electron.saveTranscript(content, format, suggestedFileName);

      if (result.success) {
        console.log('Exported to:', result.filePath);
        // TODO: Show toast notification
      } else if (!result.cancelled) {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error.message}`);
    }

    setShowExportMenu(false);
  };

  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm">
      {/* Header with File Info */}
      <div className="bg-surface border-b border-border px-4 py-3">
        {/* File Info */}
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <svg className="w-5 h-5 text-foreground-tertiary flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-text-dark truncate">
                  {fileName || 'Transcription'}
                </h2>
                <div className="flex items-center gap-2 text-xs text-foreground-secondary mt-0.5">
                  {duration && (
                    <>
                      <span>{formatDuration(duration)}</span>
                      <span>•</span>
                    </>
                  )}
                  <span>{formatDate(timestamp)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
              {showTranscribeAnotherButton && onTranscribeAnother && (
                <button
                  onClick={onTranscribeAnother}
                  className="px-3 py-1.5 rounded-lg bg-surface-secondary border border-border text-foreground font-medium text-xs hover:bg-surface-tertiary transition-all flex items-center gap-1.5"
                  title="Transcribe another recording"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                  New
                </button>
              )}
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg border border-transparent hover:border-border hover:bg-surface-secondary text-foreground-secondary hover:text-foreground transition-all"
                title="Copy to clipboard"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="p-2 rounded-lg border border-transparent hover:border-border hover:bg-surface-secondary text-foreground-secondary hover:text-foreground transition-all"
                  title="Export transcript"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-surface border border-border rounded-lg shadow-dark-md z-50 overflow-hidden">
                    <button
                      onClick={() => handleExport('txt')}
                      className="w-full px-3 py-2 text-left text-foreground hover:bg-surface-tertiary transition-colors flex items-center gap-2 text-xs"
                    >
                      <svg className="w-3.5 h-3.5 text-foreground-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="font-medium">TXT</span>
                    </button>
                    <button
                      onClick={() => handleExport('vtt')}
                      className="w-full px-3 py-2 text-left text-foreground hover:bg-surface-tertiary transition-colors flex items-center gap-2 text-xs"
                    >
                      <svg className="w-3.5 h-3.5 text-foreground-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="font-medium">VTT</span>
                    </button>
                    <button
                      onClick={() => handleExport('md')}
                      className="w-full px-3 py-2 text-left text-foreground hover:bg-surface-tertiary transition-colors flex items-center gap-2 text-xs"
                    >
                      <svg className="w-3.5 h-3.5 text-foreground-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="font-medium">Markdown</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary Toggle - Only show if summary exists */}
          {hasSummary && (
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center bg-surface-secondary rounded-lg p-0.5 gap-0.5">
                <button
                  onClick={() => setActiveView('raw')}
                  className={`px-3 py-1 rounded-md font-medium text-xs transition-all duration-150 ${
                    activeView === 'raw'
                      ? 'bg-surface text-foreground shadow-sm'
                      : 'text-foreground-secondary hover:text-foreground'
                  }`}
                >
                  Transcript
                </button>
                <button
                  onClick={() => setActiveView('summary')}
                  className={`px-3 py-1 rounded-md font-medium text-xs transition-all duration-150 ${
                    activeView === 'summary'
                      ? 'bg-surface text-foreground shadow-sm'
                      : 'text-foreground-secondary hover:text-foreground'
                  }`}
                >
                  Summary
                </button>
              </div>
            </div>
          )}
      </div>

      {/* Warning Banner - Show if chunks failed */}
      {warning && (
        <div className="mx-4 mt-4 p-4 bg-warning-orange/10 border border-warning-orange/30 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-warning-orange flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-warning-orange text-sm mb-2">Partial Transcription</h3>
              <p className="text-xs text-foreground-secondary whitespace-pre-line">{warning}</p>
              {failedChunks && failedChunks.length > 0 && (
                <div className="mt-2 text-xs text-foreground-tertiary">
                  <span className="font-medium">Failed chunk details:</span>
                  <ul className="list-disc list-inside mt-1">
                    {failedChunks.map((chunk, i) => (
                      <li key={i}>Chunk #{chunk.index}: {chunk.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transcript Content */}
      <div className="p-6 bg-surface-tertiary">
        {activeView === 'summary' ? (
          <MarkdownRenderer
            content={summary}
            className="prose prose-sm max-w-none"
            enableGFM={true}
          />
        ) : isDiarizedTranscript && vttTranscript ? (
          /* Diarized transcript with enhanced speaker view */
          <DiarizedTranscriptView vttTranscript={vttTranscript} />
        ) : (
          /* Regular transcript */
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed">
              {rawTranscript}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default TranscriptViewer;
