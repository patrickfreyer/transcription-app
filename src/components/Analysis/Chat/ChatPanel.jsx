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

      {selectedContextIds.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 border-b-2 border-gray-200 bg-white">
          <ContextChips />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {currentChatMessages.length === 0 ? (
          <SuggestedQuestions />
        ) : (
          <MessageList />
        )}
      </div>

      <div className="flex-shrink-0 border-t-2 border-gray-200 bg-white">
        <ChatInput />
      </div>
    </div>
  );
};

export default ChatPanel;
