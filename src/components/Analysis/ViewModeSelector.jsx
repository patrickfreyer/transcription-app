import React from 'react';
import { useApp } from '../../context/AppContext';

/**
 * ViewModeSelector - Tab switcher for Transcript | Summary | Chat views
 */
function ViewModeSelector() {
  const {
    rightPanelView,
    setRightPanelView,
    selectedTranscriptId,
    currentChatMessages,
    clearChatHistory
  } = useApp();

  const handleNewChat = () => {
    if (currentChatMessages.length > 0) {
      if (window.confirm('Start a new chat? This will clear the current conversation.')) {
        const chatKey = selectedTranscriptId || '__multi_transcript_chat__';
        clearChatHistory(chatKey);
      }
    }
  };

  const modes = [
    { id: 'transcript', label: 'Transcript', icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    )},
    { id: 'summary', label: 'Summary', icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 12h6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 16h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )},
    { id: 'chat', label: 'Chat', icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  ];

  return (
    <div className="flex-shrink-0 h-10 px-4 flex items-center justify-between border-b border-border bg-surface">
      <div className="flex items-center gap-1">
        {modes.map(mode => (
          <button
            key={mode.id}
            onClick={() => setRightPanelView(mode.id)}
            className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-md font-medium text-xs transition-colors duration-150 ${
              rightPanelView === mode.id
                ? 'bg-info text-white'
                : 'text-foreground-secondary hover:text-foreground hover:bg-surface-secondary'
            }`}
          >
            {mode.icon}
            <span>{mode.label}</span>
          </button>
        ))}
      </div>

      {/* New Chat button (only visible in chat mode) */}
      {rightPanelView === 'chat' && (
        <button
          onClick={handleNewChat}
          className="p-1.5 rounded hover:bg-surface-secondary transition-colors"
          title="New chat"
          aria-label="Start new chat"
        >
          <svg className="w-3.5 h-3.5 text-foreground-tertiary hover:text-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default ViewModeSelector;
