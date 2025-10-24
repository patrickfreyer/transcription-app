import React from 'react';

function RecentRecordingsSection({ recordings = [] }) {
  return (
    <div>
      {/* Section Header */}
      <h2 className="text-xs font-semibold text-text-gray uppercase tracking-wide mb-3">
        Recent Recordings
      </h2>

      {/* Empty State */}
      {recordings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 px-4">
          <svg
            className="w-10 h-10 text-bg-gray-300 mb-2"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <p className="text-sm text-text-gray font-medium mb-0.5">
            No recordings yet
          </p>
          <p className="text-xs text-text-gray">
            Your recent recordings will appear here
          </p>
        </div>
      ) : (
        /* Recording Cards Grid - For Future */
        <div className="grid grid-cols-2 gap-4">
          {recordings.map((recording) => (
            <div
              key={recording.id}
              className="bg-white rounded-xl p-6 border border-bg-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-base font-semibold text-text-dark">{recording.title}</h3>
                <span className="text-sm text-text-gray font-mono">{recording.duration}</span>
              </div>
              <p className="text-sm text-text-gray">{recording.timestamp}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecentRecordingsSection;
