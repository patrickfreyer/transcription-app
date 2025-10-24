import React, { useState } from 'react';
import MarkdownRenderer from '../../Common/MarkdownRenderer';

/**
 * MessageBubble - Individual message bubble with copy functionality
 * Now supports markdown rendering for AI responses
 */
const MessageBubble = ({ message }) => {
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setShowCopyFeedback(true);
    setTimeout(() => setShowCopyFeedback(false), 2000);
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[85%] min-w-0 ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
        {/* Message bubble */}
        <div className={`p-3 rounded-2xl transition-all duration-200 ${
          message.role === 'user'
            ? 'bg-primary text-white dark:bg-primary dark:text-white'
            : 'bg-surface-elevated border border-border text-foreground dark:bg-surface-elevated dark:text-foreground dark:border-border shadow-sm'
        }`}>
          {message.role === 'assistant' ? (
            <MarkdownRenderer
              content={message.content}
              className="text-sm markdown-compact"
              enableCodeHighlighting={true}
              enableGFM={true}
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">
              {message.content}
            </p>
          )}
        </div>

        {/* Metadata row */}
        <div className={`flex items-center gap-2 mt-1 text-xs text-foreground-secondary ${
          message.role === 'user' ? 'justify-end' : 'justify-start'
        }`}>
          <span className="flex-shrink-0">{formatMessageTime(message.timestamp)}</span>

          {message.role === 'assistant' && message.contextUsed && message.contextUsed.length > 1 && (
            <>
              <span className="flex-shrink-0">•</span>
              <span className="flex-shrink-0">{message.contextUsed.length} transcripts</span>
            </>
          )}

          <button
            onClick={handleCopy}
            className="p-1 hover:bg-surface-secondary rounded transition-all duration-200 flex-shrink-0"
            title="Copy message"
          >
            {showCopyFeedback ? (
              <svg className="w-3 h-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3 text-foreground-secondary hover:text-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
