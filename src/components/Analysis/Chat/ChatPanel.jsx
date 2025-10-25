import React from 'react';
import { useApp } from '../../../context/AppContext';
import ChatHeader from './ChatHeader';
import ContextChips from './ContextChips';
import MessageList from './MessageList';
import SuggestedQuestions from './SuggestedQuestions';
import ChatInput from './ChatInput';

/**
 * ChatPanel - Main AI chat interface
 * Right panel containing chat header, context chips, message list, and input
 */
const ChatPanel = () => {
  const {
    selectedContextIds,
    currentChatMessages
  } = useApp();

  return (
    <div className="h-full flex flex-col">
      <ChatHeader />

      {/* Row 2: Context Toolbar (always visible for alignment) */}
      <div className="flex-shrink-0 min-h-[60px] px-4 py-2 flex items-center border-b border-border bg-surface-secondary">
        {selectedContextIds.length > 0 ? (
          <ContextChips />
        ) : (
          <div className="text-xs text-foreground-tertiary">
            No transcripts selected for context
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {currentChatMessages.length === 0 ? (
          <SuggestedQuestions />
        ) : (
          <MessageList />
        )}
      </div>

      {/* Footer: Chat Input */}
      <div className="flex-shrink-0 border-t border-border bg-surface">
        <ChatInput />
      </div>
    </div>
  );
};

export default ChatPanel;
