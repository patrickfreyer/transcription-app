import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import ContextSelector from './ContextSelector';

/**
 * ChatHeader - Header with title, context selector button, clear chat, and collapse buttons
 */
const ChatHeader = () => {
  const {
    selectedTranscriptId,
    currentChatMessages,
    clearChatHistory,
    setIsChatPanelOpen
  } = useApp();

  const [showContextSelector, setShowContextSelector] = useState(false);

  return (
    <>
      <div className="flex-shrink-0 p-4 border-b-2 border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-text-dark flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            AI Assistant
          </h3>

          <div className="flex items-center gap-2">
            {/* Add context button */}
            <button
              onClick={() => setShowContextSelector(true)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-all"
              title="Select transcripts for context"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>

            {/* Clear chat button */}
            {currentChatMessages.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Clear this chat history?')) {
                    clearChatHistory(selectedTranscriptId);
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-all"
                title="Clear chat history"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}

            {/* Collapse panel button */}
            <button
              onClick={() => setIsChatPanelOpen(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-all"
              title="Hide chat panel"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {!selectedTranscriptId && (
          <p className="text-xs text-text-gray">
            Select a transcript to start chatting
          </p>
        )}
      </div>

      {showContextSelector && (
        <ContextSelector onClose={() => setShowContextSelector(false)} />
      )}
    </>
  );
};

export default ChatHeader;
