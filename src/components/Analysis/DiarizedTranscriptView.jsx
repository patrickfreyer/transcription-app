import React from 'react';

/**
 * Convert VTT timestamp to seconds
 */
function vttTimestampToSeconds(timestamp) {
  if (!timestamp) return 0;
  const parts = timestamp.split(':');
  if (parts.length === 3) {
    const [hours, minutes, secondsWithMs] = parts;
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(secondsWithMs);
  } else if (parts.length === 2) {
    const [minutes, secondsWithMs] = parts;
    return parseInt(minutes) * 60 + parseFloat(secondsWithMs);
  }
  return 0;
}

/**
 * DiarizedTranscriptView - Enhanced view for speaker-diarized transcripts
 * Groups consecutive speaker turns and provides visual differentiation
 * @param {string} vttTranscript - VTT transcript content
 * @param {function} onTimestampClick - Called when a timestamp is clicked (passes seconds)
 * @param {number} currentPlaybackTime - Current audio playback time in seconds
 * @param {boolean} hasAudio - Whether audio is available
 */
function DiarizedTranscriptView({ vttTranscript, onTimestampClick, currentPlaybackTime = 0, hasAudio = false }) {
  // Parse VTT format to extract speaker segments with timestamps
  const parseVTTSegments = (vtt) => {
    if (!vtt) return [];

    const lines = vtt.split('\n');
    const segments = [];
    let currentTimestamp = null;
    let currentEndTimestamp = null;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      // Check for timestamp line
      if (trimmed.includes('-->')) {
        const [start, end] = trimmed.split('-->').map(t => t.trim());
        currentTimestamp = start;
        currentEndTimestamp = end;
        continue;
      }

      // Match speaker labels like "[Speaker A] text" or "[A] text"
      const speakerMatch = trimmed.match(/^\[([^\]]+)\]\s*(.*)$/);

      if (speakerMatch) {
        const [, speaker, text] = speakerMatch;

        if (text.trim()) {
          segments.push({
            speaker: speaker.trim(),
            text: text.trim(),
            timestamp: currentTimestamp,
            endTimestamp: currentEndTimestamp,
          });
        }
      }
    }

    return segments;
  };

  // Group consecutive segments by same speaker (preserving timestamps)
  const groupBySpeaker = (segments) => {
    if (!segments || segments.length === 0) return [];

    const grouped = [];
    let currentTurn = null;

    for (const segment of segments) {
      if (currentTurn && currentTurn.speaker === segment.speaker) {
        // Same speaker continues - append text
        currentTurn.text += ' ' + segment.text;
        // Update end timestamp
        currentTurn.endTimestamp = segment.endTimestamp;
      } else {
        // New speaker - create new turn
        currentTurn = {
          speaker: segment.speaker,
          text: segment.text,
          timestamp: segment.timestamp,
          endTimestamp: segment.endTimestamp,
        };
        grouped.push(currentTurn);
      }
    }

    return grouped;
  };

  // Get unique speakers for color assignment
  const getUniqueSpeakers = (turns) => {
    const speakers = new Set(turns.map(t => t.speaker));
    return Array.from(speakers);
  };

  // Assign colors to speakers
  const getSpeakerColor = (speaker, allSpeakers) => {
    const colors = [
      'text-blue-600 dark:text-blue-400',
      'text-purple-600 dark:text-purple-400',
      'text-green-600 dark:text-green-400',
      'text-orange-600 dark:text-orange-400',
      'text-pink-600 dark:text-pink-400',
      'text-cyan-600 dark:text-cyan-400',
    ];

    const index = allSpeakers.indexOf(speaker);
    return colors[index % colors.length];
  };

  const segments = parseVTTSegments(vttTranscript);
  const turns = groupBySpeaker(segments);
  const uniqueSpeakers = getUniqueSpeakers(turns);

  if (turns.length === 0) {
    return (
      <div className="text-foreground-secondary text-sm italic">
        No speaker segments found in transcript.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Speaker count indicator */}
      <div className="flex items-center gap-2 text-xs text-foreground-tertiary pb-2 border-b border-border">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span>{uniqueSpeakers.length} {uniqueSpeakers.length === 1 ? 'speaker' : 'speakers'} identified</span>
      </div>

      {/* Conversation turns */}
      <div className="space-y-4">
        {turns.map((turn, i) => {
          const speakerColor = getSpeakerColor(turn.speaker, uniqueSpeakers);
          const startSeconds = vttTimestampToSeconds(turn.timestamp);
          const endSeconds = vttTimestampToSeconds(turn.endTimestamp);
          const isCurrentTurn = hasAudio &&
            currentPlaybackTime >= startSeconds &&
            currentPlaybackTime < endSeconds;

          return (
            <div
              key={i}
              className={`flex gap-4 px-3 py-2 rounded transition-colors ${
                isCurrentTurn
                  ? 'bg-primary/10 border-l-2 border-primary'
                  : 'hover:bg-surface-secondary'
              }`}
            >
              {/* Timestamp column */}
              {turn.timestamp && (
                <div
                  className={`flex-shrink-0 w-16 text-xs font-mono pt-0.5 ${
                    hasAudio
                      ? 'text-primary cursor-pointer hover:underline'
                      : 'text-foreground-tertiary'
                  }`}
                  onClick={hasAudio ? () => onTimestampClick?.(startSeconds) : undefined}
                  title={hasAudio ? 'Click to play from this point' : undefined}
                >
                  {turn.timestamp}
                </div>
              )}

              {/* Speaker label column */}
              <div className="flex-shrink-0 w-20 pt-0.5">
                <div className={`font-semibold text-sm ${speakerColor}`}>
                  {turn.speaker}:
                </div>
              </div>

              {/* Text content column */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {turn.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DiarizedTranscriptView;
