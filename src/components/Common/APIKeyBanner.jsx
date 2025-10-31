import React from 'react';
import { useApp } from '../../context/AppContext';

function APIKeyBanner() {
  const { apiKeyStatus, openAPIKeyModal } = useApp();

  // Only show when API key is missing
  if (apiKeyStatus === 'valid') {
    return null;
  }

  return (
    <div className="bg-warning/10 border-b border-warning/20 backdrop-blur-sm animate-slide-down">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg
            className="w-5 h-5 text-warning"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
          </svg>
          <p className="text-sm text-white/80 font-medium">
            Add your OpenAI API key to start transcribing audio
          </p>
        </div>
        <button
          onClick={openAPIKeyModal}
          className="px-4 py-1.5 bg-gradient-accent text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all duration-200 hover:scale-105"
        >
          Add API Key
        </button>
      </div>
    </div>
  );
}

export default APIKeyBanner;
