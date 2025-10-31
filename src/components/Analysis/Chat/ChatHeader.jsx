import React from 'react';
import { useApp } from '../../../context/AppContext';

/**
 * ChatHeader - Header with title, clear chat, and collapse buttons
 */
const ChatHeader = () => {
  const {
    selectedTranscriptId,
    selectedContextIds,
    currentChatMessages,
    clearChatHistory,
    setIsChatPanelOpen
  } = useApp();

  const handleNewChat = () => {
    if (currentChatMessages.length > 0) {
      if (window.confirm('Start a new chat? This will clear the current conversation.')) {
        // Determine the correct chat key (same logic as in AppContext)
        const chatKey = selectedTranscriptId || '__multi_transcript_chat__';
        clearChatHistory(chatKey);
      }
    }
  };

  return (
    <>
      {/* Row 1: Title Bar */}
      <div className="flex-shrink-0 h-10 px-4 flex items-center justify-between border-b border-border bg-surface">
        <h3 className="text-sm font-medium text-foreground">AI Chat</h3>

        <div className="flex items-center gap-1">
          {/* New Chat button */}
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
        </div>
      </div>
    </>
  );
};

export default ChatHeader;
