import React from 'react';

// Helper to get model display name
const getModelDisplayName = (modelId) => {
  const modelMap = {
    'whisper-1': 'Fast Mode',
    'gpt-4o-transcribe': 'Standard Quality',
    'gpt-4o-transcribe-diarize': 'Speaker Identification',
  };
  return modelMap[modelId] || modelId || 'Unknown Model';
};

// Helper to format duration
const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

function SuccessBanner({ fileName, duration, model, onStartNew, onGoToAnalysis }) {
  return (
    <div className="bg-success/10 dark:bg-success/5 border border-success/30 rounded-xl p-4 sm:p-5 mb-6 animate-fade-in">
      <div className="flex items-start gap-3 mb-4">
        {/* Success Icon */}
        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-success/20 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        {/* Success Message */}
        <div className="flex-1 min-w-0">
          <h3 className="text-success font-semibold text-lg sm:text-xl mb-1">
            Transcription Complete!
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 text-sm text-foreground-secondary">
            <span className="font-medium text-foreground truncate max-w-[200px] sm:max-w-none">
              {fileName || 'Recording'}
            </span>
            {duration > 0 && (
              <>
                <span>•</span>
                <span>{formatDuration(duration)}</span>
              </>
            )}
            <span>•</span>
            <span>{getModelDisplayName(model)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
        <button
          onClick={onStartNew}
          className="flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
          <span>Start New Transcription</span>
        </button>

        <button
          onClick={onGoToAnalysis}
          className="flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-surface-secondary text-foreground rounded-xl font-medium text-sm hover:bg-surface-tertiary transition-all border border-border"
        >
          <span>Go to Analysis</span>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default SuccessBanner;
