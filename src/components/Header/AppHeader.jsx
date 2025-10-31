import React from 'react';
import { useApp } from '../../context/AppContext';

function AppHeader() {
  const { currentTab, switchTab, apiKeyStatus, openAPIKeyModal, openSettingsModal } = useApp();

  const getAPIKeyIcon = () => {
    if (apiKeyStatus === 'loading') {
      return (
        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      );
    }
    return (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
      </svg>
    );
  };

  return (
    <header className="bg-surface border-b border-border px-6 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Navigation Toggle - Left */}
        <div className="flex-shrink-0">
          <div className="inline-flex items-center bg-surface-secondary rounded-lg p-0.5">
            <button
              onClick={() => switchTab('recording')}
              className={`flex items-center justify-center gap-2 px-4 py-1.5 rounded-md font-medium text-xs transition-colors duration-150 ${
                currentTab === 'recording'
                  ? 'bg-info text-white'
                  : 'text-foreground-secondary hover:text-foreground'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
              <span>Recording</span>
            </button>

            <button
              onClick={() => switchTab('analysis')}
              className={`flex items-center justify-center gap-2 px-4 py-1.5 rounded-md font-medium text-xs transition-colors duration-150 ${
                currentTab === 'analysis'
                  ? 'bg-info text-white'
                  : 'text-foreground-secondary hover:text-foreground'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
              </svg>
              <span>Transcripts</span>
            </button>
          </div>
        </div>

        {/* Right Section: Settings + API Key */}
        <div className="flex-shrink-0 flex items-center justify-end gap-2">
          {/* Settings Button */}
          <button
            onClick={openSettingsModal}
            className="p-1.5 rounded-md text-foreground-secondary hover:text-foreground hover:bg-surface-secondary transition-colors duration-150"
            title="Settings"
            aria-label="Settings"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
            </svg>
          </button>

          {/* API Key Button */}
          <button
            onClick={openAPIKeyModal}
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-foreground-secondary hover:text-foreground hover:bg-surface-secondary transition-colors duration-150"
            title={apiKeyStatus === 'valid' ? 'API Key configured' : 'Configure API Key'}
          >
            {getAPIKeyIcon()}
            <span>API Key</span>

            {/* Status indicator dot */}
            {apiKeyStatus === 'valid' && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success rounded-full border border-surface"></span>
            )}
            {apiKeyStatus === 'missing' && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-error rounded-full border border-surface"></span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
