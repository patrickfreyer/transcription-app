import React, { useState, useEffect } from 'react';

function RecordingInterface({
  isRecording,
  isPaused,
  hasRecording,
  recordingDuration,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  onRecordAgain,
  disabled
}) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let interval;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else if (!isRecording) {
      setElapsedTime(0);
    }
    // If paused, keep the current time and don't reset
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Show recording complete state
  if (hasRecording && !isRecording) {
    return (
      <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-white to-primary/5 p-8 shadow-xl min-h-[400px] flex items-center justify-center animate-fade-in">
        <div className="flex flex-col items-center gap-6">
          {/* Success Icon with animation */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg animate-scale-in">
              <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
          </div>

          {/* Recording Info */}
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold text-text-dark">
              Recording Complete!
            </h3>
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200">
                <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="font-semibold text-text-dark">{formatTime(recordingDuration || 0)}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200">
                <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
                <span className="font-semibold text-text-dark">Microphone</span>
              </div>
            </div>
          </div>

          {/* Record Again Button - Fixed width */}
          <button
            onClick={onRecordAgain}
            disabled={disabled}
            className="w-40 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold text-sm transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 hover:shadow-md"
          >
            Record Again
          </button>
        </div>
      </div>
    );
  }

  // Show recording in progress (or paused)
  if (isRecording) {
    const recordingColor = isPaused ? 'warning' : 'ios-red';
    const bgClass = isPaused
      ? 'border-warning/30 bg-gradient-to-br from-warning/5 via-white to-warning/5'
      : 'border-ios-red/30 bg-gradient-to-br from-ios-red/5 via-white to-ios-red/5';

    return (
      <div className={`rounded-2xl border-2 ${bgClass} p-8 shadow-xl min-h-[400px] flex items-center justify-center animate-fade-in`}>
        <div className="flex flex-col items-center gap-6">
          {/* Animated recording/paused indicator */}
          <div className="relative">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg ${
              isPaused
                ? 'bg-gradient-to-br from-warning to-warning-hover'
                : 'bg-gradient-to-br from-ios-red to-error-hover'
            }`}>
              {isPaused ? (
                // Pause icon (two bars)
                <div className="flex gap-2">
                  <div className="w-2 h-8 bg-white rounded-full"></div>
                  <div className="w-2 h-8 bg-white rounded-full"></div>
                </div>
              ) : (
                // Recording dot
                <div className="w-6 h-6 rounded-full bg-white animate-pulse"></div>
              )}
            </div>
            {/* Pulse rings (only when actively recording) */}
            {!isPaused && (
              <>
                <div className="absolute inset-0 rounded-full bg-ios-red/30 animate-ping"></div>
                <div className="absolute inset-0 rounded-full bg-ios-red/20 animate-pulse" style={{ animationDuration: '2s' }}></div>
              </>
            )}
          </div>

          {/* Timer */}
          <div className="flex flex-col items-center gap-3">
            <div className={`flex items-center gap-3 px-8 py-4 bg-white rounded-2xl border-2 shadow-lg ${
              isPaused ? 'border-warning/30' : 'border-ios-red/30'
            }`}>
              {!isPaused && (
                <div className="w-3 h-3 rounded-full bg-ios-red shadow-lg shadow-ios-red/50 animate-pulse"></div>
              )}
              <span className={`text-3xl font-mono font-bold tabular-nums ${
                isPaused ? 'text-warning' : 'text-ios-red'
              }`}>
                {formatTime(elapsedTime)}
              </span>
            </div>

            {/* Status Text with icon */}
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-text-gray" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              </svg>
              <span className={isPaused ? 'text-warning font-semibold' : 'text-text-gray'}>
                {isPaused ? 'Paused' : 'Recording from microphone'}
              </span>
            </div>
          </div>

          {/* Control Buttons - Fixed widths */}
          <div className="flex items-center gap-3">
            {/* Pause/Resume Button - Fixed width */}
            {isPaused ? (
              <button
                onClick={onResumeRecording}
                className="w-36 py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-hover text-white font-bold text-sm transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Resume
              </button>
            ) : (
              <button
                onClick={onPauseRecording}
                className="w-36 py-3.5 rounded-xl bg-gradient-to-r from-warning to-warning-hover text-white font-bold text-sm transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1"/>
                  <rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
                Pause
              </button>
            )}

            {/* Stop Button - Fixed width */}
            <button
              onClick={onStopRecording}
              className="w-36 py-3.5 rounded-xl bg-gradient-to-r from-ios-red to-error-hover text-white font-bold text-sm transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
              Stop
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show initial state - audio source selection
  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 via-white to-gray-50 p-8 shadow-lg min-h-[400px] flex items-center justify-center animate-fade-in">
      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        {/* Large Recording Icon */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center shadow-lg">
          <svg className="w-10 h-10 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-text-dark text-center">
          Record Audio
        </h3>

        {/* Start Recording Button - Fixed width */}
        <button
          onClick={onStartRecording}
          disabled={disabled}
          className={`w-56 py-4 rounded-xl font-bold text-base transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 ${
            disabled
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-primary to-primary-hover text-white hover:scale-105'
          }`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" />
          </svg>
          Start Recording
        </button>

        {/* Info text */}
        <p className="text-sm text-text-gray text-center">
          Recording will use your microphone
        </p>
      </div>
    </div>
  );
}

export default RecordingInterface;
