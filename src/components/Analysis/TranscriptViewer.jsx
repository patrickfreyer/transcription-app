import React, { useState } from 'react';

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
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with File Info */}
      <div className="flex-shrink-0 bg-white border-b-2 border-gray-200 p-4">
        {/* File Info */}
        <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-text-dark mb-2">
                {fileName || 'Transcription'}
              </h2>
              <div className="flex items-center gap-4 text-sm text-text-gray">
                {duration && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>{formatDuration(duration)}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>{formatDate(timestamp)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M2 12h20" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  <span>{model}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {showTranscribeAnotherButton && onTranscribeAnother && (
                <button
                  onClick={onTranscribeAnother}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-all flex items-center gap-2"
                  title="Transcribe another recording"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                  Transcribe Another
                </button>
              )}
              <button
                onClick={handleCopy}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-all flex items-center gap-2"
                title="Copy to clipboard"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-4 py-2 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary-hover transition-all flex items-center gap-2"
                  title="Export transcript"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    <button
                      onClick={() => handleExport('txt')}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-sm"
                    >
                      <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="font-medium">Export as TXT</span>
                    </button>
                    <button
                      onClick={() => handleExport('vtt')}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-sm"
                    >
                      <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="font-medium">Export as VTT</span>
                    </button>
                    <button
                      onClick={() => handleExport('md')}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-sm"
                    >
                      <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="font-medium">Export as Markdown</span>
                    </button>
                    <button
                      onClick={() => handleExport('pdf')}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-sm border-t border-gray-100"
                    >
                      <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="font-medium">Export as PDF</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary Status */}
          <div className="flex items-center gap-2">
            {/* Show toggle if summary exists */}
            {hasSummary ? (
              <>
                <div className="inline-flex items-center bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setActiveView('raw')}
                    className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                      activeView === 'raw'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Raw Transcript
                  </button>
                  <button
                    onClick={() => setActiveView('summary')}
                    className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                      activeView === 'summary'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Summary
                  </button>
                </div>
                {summaryTemplate && activeView === 'summary' && (
                  <span className="text-xs text-text-gray bg-gray-100 px-3 py-1.5 rounded-full">
                    {summaryTemplate}
                  </span>
                )}
              </>
            ) : (
              /* Show message when no summary was generated */
              <div className="inline-flex items-center bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-sm">
                <svg className="w-4 h-4 text-blue-500 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span className="text-blue-700">
                  No summary generated. Select "Detailed Summary" or "Concise Notes" before transcribing to see a summary.
                </span>
              </div>
            )}
          </div>
      </div>

      {/* Transcript Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6">
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 shadow-lg animate-fade-in">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-base text-text-dark leading-relaxed">
                {activeView === 'summary' ? summary : rawTranscript}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TranscriptViewer;
