import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

/**
 * Parse VTT transcript into segments with timestamps
 */
function parseVTT(vttText) {
  if (!vttText) return null;

  const segments = [];
  const lines = vttText.split('\n');

  let currentSegment = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip WEBVTT header and empty lines
    if (!line || line.startsWith('WEBVTT')) continue;

    // Check if this is a timestamp line (contains -->)
    if (line.includes('-->')) {
      const [start, end] = line.split('-->').map(t => t.trim());
      currentSegment = { start, end, text: '' };
      continue;
    }

    // If we have a current segment, this is text content
    if (currentSegment) {
      if (currentSegment.text) {
        currentSegment.text += ' ';
      }
      currentSegment.text += line;

      // Check if next line is empty or another timestamp - segment is complete
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
      if (!nextLine || nextLine.includes('-->')) {
        segments.push(currentSegment);
        currentSegment = null;
      }
    }
  }

  return segments.length > 0 ? segments : null;
}

/**
 * TranscriptView - Displays raw transcript text with timestamps
 */
function TranscriptView() {
  const { selectedTranscript, selectedContextIds, transcripts } = useApp();
  const [loadedContent, setLoadedContent] = useState({});
  const [loading, setLoading] = useState(false);

  // Get transcripts to display based on selection
  const displayTranscripts = selectedContextIds.length > 0
    ? transcripts.filter(t => selectedContextIds.includes(t.id))
    : selectedTranscript
    ? [selectedTranscript]
    : [];

  // Load compressed content on-demand for new transcripts
  useEffect(() => {
    const loadContent = async () => {
      const needsLoading = displayTranscripts.filter(t =>
        t.hasVTTFile && !loadedContent[t.id]
      );

      if (needsLoading.length === 0) return;

      setLoading(true);
      const newContent = { ...loadedContent };

      for (const transcript of needsLoading) {
        try {
          const result = await window.electron.getTranscriptWithContent(transcript.id);
          if (result.success) {
            newContent[transcript.id] = {
              rawTranscript: result.transcript.rawTranscript,
              vttTranscript: result.transcript.vttTranscript
            };
          }
        } catch (error) {
          console.error(`Failed to load content for ${transcript.id}:`, error);
        }
      }

      setLoadedContent(newContent);
      setLoading(false);
    };

    loadContent();
  }, [displayTranscripts.map(t => t.id).join(',')]);

  // Merge metadata with loaded content
  const displayTranscriptsWithContent = displayTranscripts.map(t => {
    if (t.hasVTTFile && loadedContent[t.id]) {
      return { ...t, ...loadedContent[t.id] };
    }
    return t; // Legacy transcripts already have content
  });

  // Parse VTT segments for all transcripts (must be at top level, not in .map())
  const parsedSegments = useMemo(() => {
    return displayTranscriptsWithContent.reduce((acc, transcript) => {
      acc[transcript.id] = parseVTT(transcript.vttTranscript);
      return acc;
    }, {});
  }, [displayTranscriptsWithContent.map(t => t.id + t.vttTranscript).join(',')]);

  if (displayTranscriptsWithContent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="max-w-xs">
          <svg className="w-16 h-16 mx-auto mb-4 text-foreground-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
          <h4 className="text-base font-semibold text-foreground mb-2">
            No transcript selected
          </h4>
          <p className="text-sm text-foreground-secondary">
            Select a transcript from the sidebar to view its content.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      {loading && (
        <div className="text-center text-sm text-foreground-secondary py-2">
          Loading transcript content...
        </div>
      )}
      <div className="max-w-4xl mx-auto space-y-8">
        {displayTranscriptsWithContent.map((transcript, index) => {
          // Get pre-parsed VTT segments for this transcript
          const vttSegments = parsedSegments[transcript.id];

          return (
            <div key={transcript.id} className="space-y-4">
              {displayTranscripts.length > 1 && (
                <div className="pb-3 border-b border-border">
                  <h3 className="text-base font-semibold text-foreground">
                    {transcript.fileName || 'Untitled Transcript'}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-foreground-secondary mt-1">
                    <span>{Math.floor(transcript.duration / 60)}:{(transcript.duration % 60).toString().padStart(2, '0')}</span>
                    <span>•</span>
                    <span>{new Date(transcript.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {vttSegments ? (
                  // Render with timestamps
                  vttSegments.map((segment, segIdx) => (
                    <div key={segIdx} className="flex gap-4 group hover:bg-surface-secondary px-3 py-2 rounded transition-colors">
                      <div className="flex-shrink-0 w-20 text-xs font-mono text-foreground-tertiary pt-0.5">
                        {segment.start}
                      </div>
                      <div className="flex-1 text-sm text-foreground leading-relaxed">
                        {segment.text}
                      </div>
                    </div>
                  ))
                ) : (
                  // Fallback to plain text
                  <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {transcript.rawTranscript || 'No transcript content available.'}
                  </div>
                )}
              </div>

              {index < displayTranscriptsWithContent.length - 1 && (
                <div className="border-t border-border my-8"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TranscriptView;
