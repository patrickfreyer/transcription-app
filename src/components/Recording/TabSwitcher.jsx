import React from 'react';

function TabSwitcher({ activeMode, onModeChange, disabled }) {
  const buttonClass = (mode) => {
    const isActive = activeMode === mode;
    return `flex-1 px-5 py-3 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
      isActive
        ? 'bg-surface text-primary dark:text-primary-hover shadow-md scale-105'
        : 'text-text-gray hover:text-text-dark hover:bg-surface/50'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`;
  };

  return (
    <div className="flex items-center gap-2 bg-surface-tertiary rounded-xl p-1.5 border border-border">
      <button
        className={buttonClass('upload')}
        onClick={() => !disabled && onModeChange('upload')}
        disabled={disabled}
      >
        <svg
          className="w-4 h-4"
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
        Upload Audio
      </button>
      <button
        className={buttonClass('record')}
        onClick={() => !disabled && onModeChange('record')}
        disabled={disabled}
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
        Record Audio
      </button>
    </div>
  );
}

export default TabSwitcher;
