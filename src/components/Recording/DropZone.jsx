import React, { useState, useRef } from 'react';

function DropZone({ onFileSelect, disabled }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find((file) =>
      ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm', 'audio/x-m4a'].includes(file.type)
    );

    if (audioFile) {
      try {
        // Convert file to ArrayBuffer and save to temp
        const arrayBuffer = await audioFile.arrayBuffer();
        const result = await window.electron.saveFileToTemp(arrayBuffer, audioFile.name);

        if (result.success) {
          // Create file object with path property
          onFileSelect({
            name: audioFile.name,
            size: audioFile.size,
            type: audioFile.type,
            path: result.filePath
          });
        } else {
          console.error('Failed to save file:', result.error);
          alert(`Failed to process file: ${result.error}`);
        }
      } catch (error) {
        console.error('Error handling dropped file:', error);
        alert(`Error processing file: ${error.message}`);
      }
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Convert file to ArrayBuffer and save to temp
        const arrayBuffer = await file.arrayBuffer();
        const result = await window.electron.saveFileToTemp(arrayBuffer, file.name);

        if (result.success) {
          // Create file object with path property
          onFileSelect({
            name: file.name,
            size: file.size,
            type: file.type,
            path: result.filePath // Now has a real file system path!
          });
        } else {
          console.error('Failed to save file:', result.error);
          alert(`Failed to process file: ${result.error}`);
        }
      } catch (error) {
        console.error('Error handling file:', error);
        alert(`Error processing file: ${error.message}`);
      }
    }
  };

  return (
    <div
      className={`relative rounded-2xl border border-dashed p-8 transition-all duration-300 min-h-[400px] flex items-center justify-center animate-fade-in ${
        isDragging
          ? 'border-primary bg-primary/5 shadow-xl scale-[1.02]'
          : 'border bg-surface-tertiary shadow-lg'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50 hover:shadow-xl hover:scale-[1.01]'}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,audio/wav,audio/mp4,audio/webm,audio/x-m4a,.mp3,.wav,.m4a,.webm"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-6">
        {/* Upload Icon */}
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
            isDragging
              ? 'bg-primary scale-110'
              : 'bg-surface-secondary'
          }`}
        >
          <svg
            className={`w-10 h-10 transition-all duration-300 ${
              isDragging ? 'text-white scale-110' : 'text-foreground-secondary'
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        {/* Text */}
        <div className="text-center space-y-4 max-w-md">
          <h3 className="text-xl font-bold text-text-dark">
            {isDragging ? 'Drop your audio file here' : 'Upload Audio File'}
          </h3>
          <p className="text-sm text-text-gray leading-relaxed">
            Drag & drop your audio file here, or click to browse
          </p>

          {/* Supported formats */}
          <div className="pt-2">
            <p className="text-xs text-foreground-secondary mb-2 font-medium">Supported formats:</p>
            <div className="flex items-center justify-center flex-wrap gap-2">
              {['MP3', 'WAV', 'M4A', 'WEBM'].map((format) => (
                <div
                  key={format}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-full"
                >
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-xs font-semibold text-foreground">{format}</span>
                </div>
              ))}
            </div>
          </div>

          {/* File size limit */}
          <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-xl border border-primary/20 mt-4">
            <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <p className="text-xs text-foreground leading-relaxed text-left">
              Maximum file size is 25MB. Larger files will be automatically split for processing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DropZone;
