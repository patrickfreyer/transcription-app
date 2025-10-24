import React from 'react';

function ModeSwitcher({ activeMode, onModeChange, disabled }) {
  const modes = [
    {
      id: 'record',
      label: 'Record Audio',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
      ),
    },
    {
      id: 'upload',
      label: 'Upload File',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-2 bg-surface-secondary rounded-2xl p-1.5 border border-border shadow-sm">
        {modes.map((mode) => {
          const isActive = activeMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => !disabled && onModeChange(mode.id)}
              disabled={disabled}
              className={`group relative flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
                isActive
                  ? 'bg-primary hover:bg-primary-hover text-white shadow-lg scale-105'
                  : 'text-foreground-secondary hover:text-foreground hover:bg-surface/50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                {mode.icon}
              </div>
              <span className="whitespace-nowrap">{mode.label}</span>

              {/* Active indicator */}
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-md"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ModeSwitcher;
