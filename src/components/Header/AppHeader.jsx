import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

function AppHeader() {
  const { currentTab, switchTab, apiKeyStatus, openAPIKeyModal, openSettingsModal, shouldPulseAPIButton } = useApp();
  const [theme, setTheme] = useState('light');

  // Load theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Determine button styling based on API key status
  const getAPIKeyButtonClass = () => {
    const baseClass = "relative flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm transition-all duration-200";

    if (apiKeyStatus === 'valid') {
      return `${baseClass} bg-success/10 text-success hover:bg-success/20 border border-success/30`;
    } else if (apiKeyStatus === 'loading') {
      return `${baseClass} bg-warning/10 text-warning hover:bg-warning/20 border border-warning/30`;
    } else {
      return `${baseClass} bg-error/10 text-error hover:bg-error/20 border border-error/30 ${shouldPulseAPIButton ? 'animate-pulse' : ''}`;
    }
  };

  const getAPIKeyIcon = () => {
    if (apiKeyStatus === 'loading') {
      return (
        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      );
    }
    return (
      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
      </svg>
    );
  };

  const getAPIKeyLabel = () => {
    if (apiKeyStatus === 'valid') return 'API Key';
    if (apiKeyStatus === 'loading') return 'Checking...';
    return 'Add API Key';
  };

  return (
    <header className="bg-surface border-b border-strong px-4 sm:px-8 lg:px-16 py-3 sm:py-4 lg:py-5">
      <div className="flex items-center justify-between">
        {/* Brand Section - Left */}
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary">TranscriptAI</h1>
          <p className="text-xs sm:text-sm text-foreground-secondary mt-0.5">Record, transcribe, and analyze</p>
        </div>

        {/* Navigation Toggle - Center */}
        <div className="flex-shrink-0">
          <div className="inline-flex items-center bg-surface-secondary rounded-lg sm:rounded-xl p-1">
            <button
              onClick={() => switchTab('recording')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 rounded-md sm:rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 ${
                currentTab === 'recording'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-foreground-secondary hover:text-foreground'
              }`}
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
              <span className="hidden xs:inline sm:inline">Recording</span>
            </button>

            <button
              onClick={() => switchTab('analysis')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 rounded-md sm:rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 ${
                currentTab === 'analysis'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-foreground-secondary hover:text-foreground'
              }`}
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
              </svg>
              <span className="hidden xs:inline sm:inline">Analysis</span>
            </button>
          </div>
        </div>

        {/* Right Section: Theme Toggle + Settings + API Key */}
        <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="relative p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all duration-300 bg-surface-secondary hover:bg-surface-tertiary border border-strong group"
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            aria-label="Toggle theme"
          >
            {/* Sun icon (visible in dark mode) */}
            <svg
              className={`w-4 h-4 sm:w-5 sm:h-5 absolute inset-0 m-auto transition-all duration-300 ${
                theme === 'dark' ? 'rotate-0 opacity-100' : 'rotate-90 opacity-0'
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
            </svg>

            {/* Moon icon (visible in light mode) */}
            <svg
              className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 ${
                theme === 'light' ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>

          {/* Settings Button */}
          <button
            onClick={openSettingsModal}
            className="relative flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 bg-surface-secondary text-foreground hover:bg-surface-tertiary border border-strong"
            title="Settings"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
            </svg>
            <span className="hidden sm:inline">Settings</span>
          </button>

          {/* API Key Button */}
          <button
            onClick={openAPIKeyModal}
            className={getAPIKeyButtonClass()}
            title={apiKeyStatus === 'valid' ? 'API Key configured' : 'Configure API Key'}
          >
            {getAPIKeyIcon()}
            <span className="hidden sm:inline">{getAPIKeyLabel()}</span>

            {/* Status indicator dot (visible on mobile when text is hidden) */}
            {apiKeyStatus === 'valid' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-success rounded-full border border-surface-secondary sm:hidden"></span>
            )}
            {apiKeyStatus === 'missing' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-error rounded-full border border-surface-secondary sm:hidden"></span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
