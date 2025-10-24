import React from 'react';
import { useApp } from '../../context/AppContext';

function Header() {
  const { currentTab, switchTab, apiKeyStatus, openAPIKeyModal, shouldPulseAPIButton } = useApp();

  const tabClass = (tabName) => {
    const isActive = currentTab === tabName;
    return isActive
      ? 'px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 bg-white text-ios-blue shadow-sm'
      : 'px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 text-text-gray hover:text-text-dark hover:bg-white/50';
  };

  return (
    <header className="flex-shrink-0 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Mode Tabs */}
        <nav className="flex items-center gap-2 bg-bg-gray-50 rounded-xl p-1" role="tablist" aria-label="App modes">
          <button
            className={tabClass('recording')}
            onClick={() => switchTab('recording')}
            role="tab"
            aria-selected={currentTab === 'recording'}
            aria-controls="panel-recording"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
            </svg>
            <span>Recording</span>
          </button>

          <button
            className={tabClass('analysis')}
            onClick={() => switchTab('analysis')}
            role="tab"
            aria-selected={currentTab === 'analysis'}
            aria-controls="panel-analysis"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <line x1="10" y1="9" x2="8" y2="9"/>
            </svg>
            <span>Analysis</span>
          </button>
        </nav>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          {/* API Key Button */}
          <button
            className={`relative p-3 rounded-xl bg-bg-gray-50 hover:bg-bg-gray-200 border border-bg-gray-200 hover:border-bg-gray-300 transition-all duration-200 group ${
              shouldPulseAPIButton ? 'animate-pulse ring-4 ring-ios-blue/20' : ''
            }`}
            onClick={openAPIKeyModal}
            aria-label="OpenAI API Key"
            title="OpenAI API Key"
          >
            <svg
              className={`w-5 h-5 transition-transform group-hover:rotate-12 text-text-gray ${
                shouldPulseAPIButton ? '!text-ios-blue' : ''
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
            </svg>
            <span className={`status-indicator ${apiKeyStatus}`}></span>
          </button>

          {/* Settings Button */}
          <button
            className="p-3 rounded-xl bg-bg-gray-50 hover:bg-bg-gray-200 border border-bg-gray-200 hover:border-bg-gray-300 transition-all duration-200 group"
            onClick={() => console.log('Settings coming soon...')}
            aria-label="Settings"
            title="Settings"
          >
            <svg className="w-5 h-5 transition-transform group-hover:rotate-90 text-text-gray" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6M6 6l4.24 4.24m5.52 5.52L20 20M1 12h6m6 0h6M6 18l4.24-4.24m5.52-5.52L20 4"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
