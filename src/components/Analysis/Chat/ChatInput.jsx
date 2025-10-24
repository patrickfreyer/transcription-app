import React, { useState, useRef } from 'react';
import { useApp } from '../../../context/AppContext';

/**
 * ChatInput - Text input with auto-resize and send button
 */
const ChatInput = () => {
  const {
    selectedTranscriptId,
    selectedContextIds,
    sendChatMessage,
    isChatStreaming
  } = useApp();

  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef(null);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !selectedTranscriptId || isChatStreaming) return;

    sendChatMessage(trimmed);
    setInputValue('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e) => {
    setInputValue(e.target.value);

    // Auto-resize textarea with better constraints
    e.target.style.height = 'auto';
    const newHeight = Math.min(e.target.scrollHeight, 200); // Max 200px
    e.target.style.height = newHeight + 'px';
  };

  return (
    <div className="p-4 border-t-2 border-gray-200">
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={!selectedTranscriptId || isChatStreaming}
          placeholder={
            !selectedTranscriptId
              ? 'Select a transcript to start chatting...'
              : selectedContextIds.length > 1
              ? `Ask me anything about these ${selectedContextIds.length} transcripts...`
              : 'Ask me anything about this transcript...'
          }
          rows={1}
          className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 transition-all duration-200 min-h-[44px]"
          style={{ maxHeight: '200px' }}
        />

        <button
          onClick={handleSend}
          disabled={!inputValue.trim() || !selectedTranscriptId || isChatStreaming}
          className="px-4 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0 h-[44px]"
        >
          {isChatStreaming ? (
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-text-gray mt-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
};

export default ChatInput;
