import React from 'react';
import { useApp } from '../../../context/AppContext';

/**
 * ChatHeader - Header with title, clear chat, and collapse buttons
 */
const ChatHeader = () => {
  const {
    selectedTranscriptId,
    currentChatMessages,
    clearChatHistory,
    setIsChatPanelOpen
  } = useApp();

  return (
    <>
      {/* Row 1: Title Bar (48px fixed height) */}
      <div className="flex-shrink-0 h-12 px-4 flex items-center justify-between border-b border-border bg-surface">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          AI Assistant
        </h3>

        <div className="flex items-center gap-1">
          {/* Clear chat button */}
          {currentChatMessages.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Clear this chat history?')) {
                  clearChatHistory(selectedTranscriptId);
                }
              }}
              className="p-1.5 rounded-lg hover:bg-surface-secondary transition-all group"
              title="Clear chat history"
            >
              <svg className="w-4 h-4 text-foreground-secondary group-hover:text-error transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}

          {/* Collapse panel button */}
          <button
            onClick={() => setIsChatPanelOpen(false)}
            className="p-1.5 rounded-lg hover:bg-surface-secondary transition-all group"
            title="Hide chat panel"
          >
            <svg className="w-4 h-4 text-foreground-secondary group-hover:text-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatHeader;
