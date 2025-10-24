import React, { useRef, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import MessageBubble from './MessageBubble';

/**
 * MessageList - Display chat messages with auto-scroll
 */
const MessageList = () => {
  const {
    currentChatMessages,
    isChatStreaming
  } = useApp();

  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChatMessages]);

  return (
    <div className="space-y-4">
      {currentChatMessages.map(message => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {isChatStreaming && (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
          <span>Thinking...</span>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
