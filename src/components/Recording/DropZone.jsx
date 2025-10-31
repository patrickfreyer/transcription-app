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
      className={`relative rounded-lg border-2 border-dashed p-8 transition-colors duration-150 min-h-[300px] flex items-center justify-center ${
        isDragging
          ? 'border-info bg-info/5'
          : 'border-border bg-surface-secondary'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-info/50'}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,audio/wav,audio/mp4,audio/webm,audio/x-m4a,audio/ogg,audio/flac,.mp3,.wav,.m4a,.webm,.mp4,.mpeg,.mpga,.ogg,.flac,.aac"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-4 max-w-md">
        {/* Upload Icon */}
        <svg
          className={`w-12 h-12 transition-colors duration-150 ${
            isDragging ? 'text-info' : 'text-foreground-tertiary'
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>

        {/* Text */}
        <div className="text-center space-y-2">
          <h3 className="text-base font-semibold text-foreground">
            {isDragging ? 'Drop your file' : 'Upload Audio File'}
          </h3>
          <p className="text-sm text-foreground-secondary">
            Drag & drop or click to browse
          </p>

          {/* Supported formats */}
          <p className="text-xs text-foreground-tertiary pt-2">
            Supports MP3, WAV, M4A, WEBM • Max 25MB
          </p>
        </div>
      </div>
    </div>
  );
}

export default DropZone;
