import React, { useState, useEffect } from 'react';
import MicrophoneSelector from './MicrophoneSelector';
import CompactDropdown from '../Common/CompactDropdown';
import CollapsibleSection from './CollapsibleSection';

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
  disabled,
  selectedMicrophoneId,
  onMicrophoneChange,
  // Configuration props
  models,
  selectedModel,
  onModelChange,
  summaryTemplates,
  selectedSummaryTemplate,
  onSummaryTemplateChange,
  prompt,
  onPromptChange,
  promptOpen,
  onPromptToggle,
  onTranscribe,
  canTranscribe,
  isProcessing
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

  // Show recording complete state with inline configuration
  if (hasRecording && !isRecording) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-surface-elevated shadow-xl animate-fade-in overflow-hidden">
        {/* Compact Header */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20 px-6 py-4">
          <div className="flex items-center gap-4">
            {/* Success Icon - Smaller */}
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

            {/* Recording Info - Horizontal */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-text-dark mb-1">
                Recording Complete!
              </h3>
              <div className="flex items-center gap-3 text-xs text-foreground-secondary">
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className="font-semibold">{formatTime(recordingDuration || 0)}</span>
                </div>
                <span className="text-foreground-tertiary">•</span>
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  </svg>
                  <span className="font-semibold">Microphone</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Section */}
        <div className="p-6 space-y-4">
          {/* Model Selection */}
          <CompactDropdown
            label="Transcription Model"
            options={models}
            value={selectedModel}
            onChange={onModelChange}
            disabled={disabled}
          />

          {/* Summary Type Selection */}
          <CompactDropdown
            label="Summary Type"
            options={summaryTemplates.map(template => ({
              id: template.id,
              name: template.name,
              description: template.description,
              badge: template.id === 'default' ? null : undefined
            }))}
            value={selectedSummaryTemplate}
            onChange={onSummaryTemplateChange}
            disabled={disabled}
          />

          {/* Advanced Options - Collapsible */}
          <CollapsibleSection
            title="Advanced Options"
            isOpen={promptOpen}
            onToggle={onPromptToggle}
            disabled={disabled}
          >
            <textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              disabled={disabled}
              placeholder="Provide context or specific terms to improve accuracy..."
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none transition-all"
              rows={3}
            />
            <p className="mt-2 text-xs text-foreground-tertiary leading-relaxed">
              Help the model understand industry-specific terms or context
            </p>
          </CollapsibleSection>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {/* Primary: Transcribe */}
            <button
              onClick={onTranscribe}
              disabled={!canTranscribe || isProcessing}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-200 shadow-lg flex items-center justify-center gap-2 ${
                !canTranscribe || isProcessing
                  ? 'bg-surface-secondary text-foreground-tertiary cursor-not-allowed'
                  : 'bg-primary hover:bg-primary-hover text-white hover:shadow-xl hover:scale-[1.02]'
              }`}
            >
              {isProcessing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Transcribing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 3v18l15-9z" />
                  </svg>
                  Transcribe
                </>
              )}
            </button>

            {/* Secondary: Record Again */}
            <button
              onClick={onRecordAgain}
              disabled={disabled || isProcessing}
              className="px-6 py-3 rounded-xl border border-border text-foreground font-semibold text-sm transition-all duration-200 hover:bg-surface-tertiary hover:border-strong"
            >
              Record Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show recording in progress (or paused)
  if (isRecording) {
    const recordingColor = isPaused ? 'warning' : 'error';
    const bgClass = isPaused
      ? 'border-warning/30 bg-surface-elevated'
      : 'border-error/30 bg-surface-elevated';

    return (
      <div className={`rounded-2xl border ${bgClass} p-8 shadow-xl min-h-[400px] flex items-center justify-center animate-fade-in`}>
        <div className="flex flex-col items-center gap-6">
          {/* Animated recording/paused indicator */}
          <div className="relative">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg ${
              isPaused
                ? 'bg-warning'
                : 'bg-error'
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
                <div className="absolute inset-0 rounded-full bg-error/30 animate-ping"></div>
                <div className="absolute inset-0 rounded-full bg-error/20 animate-pulse" style={{ animationDuration: '2s' }}></div>
              </>
            )}
          </div>

          {/* Timer */}
          <div className="flex flex-col items-center gap-3">
            <div className={`flex items-center gap-3 px-8 py-4 bg-surface rounded-2xl border shadow-lg ${
              isPaused ? 'border-warning/30' : 'border-error/30'
            }`}>
              {!isPaused && (
                <div className="w-3 h-3 rounded-full bg-error shadow-lg shadow-error/50 animate-pulse"></div>
              )}
              <span className={`text-3xl font-mono font-bold tabular-nums ${
                isPaused ? 'text-warning' : 'text-error'
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
                className="w-36 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-sm transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Resume
              </button>
            ) : (
              <button
                onClick={onPauseRecording}
                className="w-36 py-3.5 rounded-xl bg-warning hover:bg-warning-hover text-white font-bold text-sm transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
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
              className="w-36 py-3.5 rounded-xl bg-error hover:bg-error-hover text-white font-bold text-sm transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
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
    <div className="rounded-2xl border border-border bg-surface p-8 shadow-lg min-h-[400px] flex items-center justify-center animate-fade-in">
      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        {/* Large Recording Icon */}
        <div className="w-20 h-20 rounded-full bg-surface-secondary flex items-center justify-center shadow-lg">
          <svg className="w-10 h-10 text-foreground-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-text-dark text-center">
          Record Audio
        </h3>

        {/* Microphone Selector */}
        <div className="w-full">
          <MicrophoneSelector
            value={selectedMicrophoneId}
            onChange={onMicrophoneChange}
            disabled={disabled}
          />
        </div>

        {/* Start Recording Button - Fixed width */}
        <button
          onClick={onStartRecording}
          disabled={disabled}
          className={`w-56 py-4 rounded-xl font-bold text-base transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 ${
            disabled
              ? 'bg-surface-secondary text-foreground-tertiary cursor-not-allowed'
              : 'bg-primary hover:bg-primary-hover text-white hover:scale-105'
          }`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" />
          </svg>
          Start Recording
        </button>
      </div>
    </div>
  );
}

export default RecordingInterface;
