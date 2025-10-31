import React from 'react';
import CompactDropdown from '../Common/CompactDropdown';
import CollapsibleSection from './CollapsibleSection';

function FileInfo({
  file,
  onRemove,
  disabled,
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
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileExtension = (filename) => {
    return filename.split('.').pop().toUpperCase();
  };

  const getFormatColor = (ext) => {
    const colors = {
      'MP3': 'bg-primary/10 text-primary',
      'WAV': 'bg-bcg-green/10 text-bcg-green',
      'M4A': 'bg-primary/10 text-primary',
      'WEBM': 'bg-ios-orange/10 text-ios-orange',
    };
    return colors[ext] || 'bg-surface-secondary text-foreground-secondary';
  };

  const extension = getFileExtension(file.name);

  return (
    <div className="rounded-2xl border border-primary/30 bg-surface-elevated shadow-xl animate-fade-in overflow-hidden">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20 px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Success Icon - Smaller */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
          </div>

          {/* File Info - Horizontal */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-text-dark mb-1">
              File Ready!
            </h3>
            <div className="flex items-center gap-3 text-xs text-foreground-secondary">
              <p className="font-semibold truncate">{file.name}</p>
              <span className="text-foreground-tertiary">•</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">{formatFileSize(file.size)}</span>
              </div>
              <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${getFormatColor(extension)} flex-shrink-0`}>
                {extension}
              </span>
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

          {/* Secondary: Change File */}
          <button
            onClick={onRemove}
            disabled={disabled || isProcessing}
            className="px-6 py-3 rounded-xl border border-border text-foreground font-semibold text-sm transition-all duration-200 hover:bg-surface-tertiary hover:border-strong"
          >
            Change File
          </button>
        </div>
      </div>
    </div>
  );
}

export default FileInfo;
