import React from 'react';
import { useApp } from '../../../context/AppContext';

/**
 * SuggestedQuestions - Display suggested questions when chat is empty
 */
const SuggestedQuestions = () => {
  const {
    selectedTranscriptId,
    sendChatMessage,
    isChatStreaming
  } = useApp();

  const SUGGESTED_QUESTIONS = [
    {
      icon: (
        <svg className="w-5 h-5 text-foreground-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          <path d="M9 12h6m-6 4h6" />
        </svg>
      ),
      text: 'What were the main topics discussed?'
    },
    {
      icon: (
        <svg className="w-5 h-5 text-foreground-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      text: 'Summarize the key decisions made'
    },
    {
      icon: (
        <svg className="w-5 h-5 text-foreground-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      text: 'What action items were mentioned?'
    },
    {
      icon: (
        <svg className="w-5 h-5 text-foreground-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      text: 'Who were the main participants?'
    },
    {
      icon: (
        <svg className="w-5 h-5 text-foreground-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      text: 'What questions were raised?'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="text-base font-semibold text-foreground mb-1">
          Ask about this transcript
        </h4>
        <p className="text-sm text-foreground-secondary">
          Select a question or type your own
        </p>
      </div>

      <div className="space-y-2">
        {SUGGESTED_QUESTIONS.map((q, index) => (
          <button
            key={index}
            onClick={() => sendChatMessage(q.text)}
            disabled={!selectedTranscriptId || isChatStreaming}
            className="w-full text-left p-3 rounded-lg bg-surface-secondary border border-border hover:bg-surface-tertiary transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
          >
            <div className="flex-shrink-0">{q.icon}</div>
            <span className="text-sm text-foreground">{q.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuggestedQuestions;
