import React from 'react';

function FileInfo({ file, onRemove, disabled }) {
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
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8 shadow-xl min-h-[400px] flex items-center justify-center animate-fade-in">
      <div className="flex flex-col items-center gap-6 w-full max-w-lg">
        {/* Success Icon */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg animate-scale-in">
            <svg
              className="w-10 h-10 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          {/* Pulse ring */}
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
        </div>

        {/* File Info */}
        <div className="text-center space-y-3 w-full">
          <h3 className="text-2xl font-bold text-text-dark">
            File Ready!
          </h3>

          {/* File name */}
          <div className="px-4 py-3 bg-surface rounded-xl border border-border shadow-sm">
            <p className="text-sm font-semibold text-text-dark truncate mb-1">{file.name}</p>
            <div className="flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                  <polyline points="13 2 13 9 20 9" />
                </svg>
                <span className="font-semibold text-text-dark">{formatFileSize(file.size)}</span>
              </div>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${getFormatColor(extension)}`}>
                {extension}
              </span>
            </div>
          </div>

          {/* Status badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-primary">Ready to transcribe</span>
          </div>
        </div>

        {/* Change File Button */}
        <button
          onClick={onRemove}
          disabled={disabled}
          className={`px-8 py-3 rounded-xl border border-strong text-foreground font-semibold text-sm transition-all duration-200 hover:bg-surface-tertiary hover:border-strong hover:shadow-md ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          Change File
        </button>
      </div>
    </div>
  );
}

export default FileInfo;
