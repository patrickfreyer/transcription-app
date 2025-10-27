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
      {/* Row 1: Title Bar (48px fixed height) */}
      <div className="flex-shrink-0 h-12 px-4 flex items-center justify-between border-b border-border bg-surface">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          AI Assistant
        </h3>

        <div className="flex items-center gap-1">
          {/* New Chat button */}
          <button
            onClick={handleNewChat}
            className="p-1.5 rounded-lg hover:bg-surface-secondary transition-all group"
            title="Start a new chat"
          >
            <svg className="w-4 h-4 text-foreground-secondary group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatHeader;
