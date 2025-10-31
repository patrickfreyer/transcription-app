import React from 'react';

function TranscribeButton({ onClick, disabled, isProcessing }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isProcessing}
      className={`w-full py-4 rounded-lg font-medium text-sm transition-colors duration-150 ${
        disabled || isProcessing
          ? 'bg-surface-secondary text-foreground-secondary cursor-not-allowed border border-border'
          : 'bg-info text-white hover:bg-info-hover border border-transparent'
      }`}
    >
      {isProcessing ? (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Transcribing...</span>
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
          <span>Transcribe Audio</span>
        </span>
      )}
    </button>
  );
}

export default TranscribeButton;
