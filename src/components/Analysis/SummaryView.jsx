import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { useApp } from '../../context/AppContext';

/**
 * SummaryView - Displays generated summaries
 */
function SummaryView() {
  const { selectedTranscript, selectedContextIds, transcripts } = useApp();

  // Get transcripts to display based on selection
  const displayTranscripts = selectedContextIds.length > 0
    ? transcripts.filter(t => selectedContextIds.includes(t.id))
    : selectedTranscript
    ? [selectedTranscript]
    : [];

  if (displayTranscripts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="max-w-xs">
          <svg className="w-16 h-16 mx-auto mb-4 text-foreground-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <path d="M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            <path d="M9 12h6" />
            <path d="M9 16h6" />
          </svg>
          <h4 className="text-base font-semibold text-foreground mb-2">
            No transcript selected
          </h4>
          <p className="text-sm text-foreground-secondary">
            Select a transcript from the sidebar to view its summary.
          </p>
        </div>
      </div>
    );
  }

  // Filter to only show transcripts with summaries
  const transcriptsWithSummary = displayTranscripts.filter(t => t.summary);

  if (transcriptsWithSummary.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="max-w-xs">
          <svg className="w-16 h-16 mx-auto mb-4 text-foreground-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <path d="M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h4 className="text-base font-semibold text-foreground mb-2">
            No summaries available
          </h4>
          <p className="text-sm text-foreground-secondary">
            {displayTranscripts.length === 1
              ? 'This transcript does not have a generated summary.'
              : 'None of the selected transcripts have generated summaries.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {transcriptsWithSummary.map((transcript, index) => (
          <div key={transcript.id} className="space-y-4">
            {/* Header */}
            <div className="pb-3 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">
                {transcript.fileName || 'Untitled Transcript'}
              </h3>
              <div className="flex items-center gap-2 text-xs text-foreground-secondary mt-1">
                <span>{Math.floor(transcript.duration / 60)}:{(transcript.duration % 60).toString().padStart(2, '0')}</span>
                <span>•</span>
                <span>{new Date(transcript.timestamp).toLocaleDateString()}</span>
                {transcript.summaryTemplate && (
                  <>
                    <span>•</span>
                    <span className="text-success">{transcript.summaryTemplate}</span>
                  </>
                )}
              </div>
            </div>

            {/* Summary Content */}
            <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-ul:text-foreground prose-ol:text-foreground">
              <div className="text-sm leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                >
                  {transcript.summary}
                </ReactMarkdown>
              </div>
            </div>

            {/* Divider between multiple transcripts */}
            {index < transcriptsWithSummary.length - 1 && (
              <div className="border-t border-border my-8"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SummaryView;
