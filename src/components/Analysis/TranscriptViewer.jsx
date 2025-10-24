import React, { useState } from 'react';
import MarkdownRenderer from '../Common/MarkdownRenderer';

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
    timestamp
  } = transcription;

  const hasSummary = summary && summary.trim().length > 0;

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
    <div className="h-full flex flex-col bg-surface-tertiary">
      {/* Header with File Info */}
      <div className="flex-shrink-0 bg-surface border-b border-border px-4 py-3">
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
                    <button
                      onClick={() => handleExport('pdf')}
                      className="w-full px-3 py-2 text-left text-foreground hover:bg-surface-tertiary transition-colors flex items-center gap-2 text-xs border-t border-border"
                    >
                      <svg className="w-3.5 h-3.5 text-foreground-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="font-medium">PDF</span>
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

      {/* Transcript Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-4">
          <div className="bg-surface rounded-xl border border-border p-6 shadow-sm animate-fade-in">
            {activeView === 'summary' ? (
              // Render summary as markdown (GPT generates formatted summaries)
              <div className="prose prose-sm max-w-none">
                <MarkdownRenderer content={summary} />
              </div>
            ) : (
              // Keep raw transcript as plain text (just speech-to-text output)
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm text-text-dark leading-relaxed">
                  {rawTranscript}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TranscriptViewer;
