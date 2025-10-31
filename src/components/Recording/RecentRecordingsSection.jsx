import React from 'react';

// Helper function to format timestamp
const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Unknown time';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Helper function to format duration
const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

function RecentRecordingsSection({ transcripts = [], onTranscriptClick }) {
  return (
    <div>
      {/* Section Header */}
      <h2 className="text-xs font-semibold text-foreground-secondary uppercase tracking-wide mb-3">
        Recent Recordings
      </h2>

      {/* Empty State */}
      {transcripts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 px-4">
          <svg
            className="w-10 h-10 text-foreground-tertiary mb-2"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
          <p className="text-sm text-foreground-secondary font-medium mb-0.5">
            No recordings yet
          </p>
          <p className="text-xs text-foreground-secondary">
            Your recent recordings will appear here
          </p>
        </div>
      ) : (
        /* Recording Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {transcripts.map((transcript, index) => (
            <div
              key={transcript.id}
              onClick={() => onTranscriptClick(transcript.id)}
              className="group bg-surface rounded-xl p-4 border hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Header Row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <svg
                    className="w-4 h-4 text-foreground-tertiary flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                  <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {transcript.fileName || 'Untitled Transcript'}
                  </h3>
                </div>
                <span className="text-xs text-foreground-secondary flex-shrink-0 ml-2 font-mono">
                  {formatDuration(transcript.duration)}
                </span>
              </div>

              {/* Meta Row */}
              <div className="flex items-center justify-between text-xs text-foreground-secondary">
                <div className="flex items-center gap-2">
                  <span>{formatTimestamp(transcript.timestamp)}</span>
                  {transcript.summary && (
                    <>
                      <span>•</span>
                      <span className="text-success dark:text-success-light font-medium">Summary</span>
                    </>
                  )}
                </div>
                {transcript.starred && (
                  <svg
                    className="w-3.5 h-3.5 text-yellow-500"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecentRecordingsSection;
