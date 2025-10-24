import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import TranscriptSidebar from './Sidebar/TranscriptSidebar';
import TranscriptViewer from './TranscriptViewer';
import ChatPanel from './Chat/ChatPanel';

function AnalysisPanel({ isActive }) {
  const { loadTranscripts, loadChatHistory, selectedTranscript, isChatPanelOpen, switchTab } = useApp();

  // Panel sizes with localStorage persistence
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('analysis-sidebar-width');
    return saved ? parseInt(saved, 10) : 240;
  });

  const [chatWidth, setChatWidth] = useState(() => {
    const saved = localStorage.getItem('analysis-chat-width');
    return saved ? parseInt(saved, 10) : 480;
  });

  const isDraggingSidebar = useRef(false);
  const isDraggingChat = useRef(false);

  useEffect(() => {
    // Load transcripts and chat history when component mounts
    loadTranscripts();
    loadChatHistory();
  }, []);

  // Save sizes to localStorage
  useEffect(() => {
    localStorage.setItem('analysis-sidebar-width', sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    localStorage.setItem('analysis-chat-width', chatWidth.toString());
  }, [chatWidth]);

  // Handle sidebar resize
  const handleSidebarMouseDown = (e) => {
    isDraggingSidebar.current = true;
    e.preventDefault();
  };

  // Handle chat resize
  const handleChatMouseDown = (e) => {
    isDraggingChat.current = true;
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingSidebar.current) {
        const newWidth = Math.max(240, Math.min(400, e.clientX));
        setSidebarWidth(newWidth);
      }

      if (isDraggingChat.current) {
        // Calculate available space: total width - sidebar - minimum center viewer width (400px)
        const minCenterWidth = 400;
        const availableForChat = window.innerWidth - sidebarWidth - minCenterWidth;
        const maxChatWidth = Math.max(400, availableForChat);

        const newWidth = Math.max(400, Math.min(maxChatWidth, window.innerWidth - e.clientX));
        setChatWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isDraggingSidebar.current = false;
      isDraggingChat.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-300 ${
        isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      role="tabpanel"
      aria-labelledby="tab-analysis"
    >
      <div className="absolute inset-0 flex">
        {/* Left Sidebar - Resizable */}
        <div
          className="flex-shrink-0 border-r-2 border-gray-200 bg-white min-w-0"
          style={{ width: `${sidebarWidth}px` }}
        >
          <TranscriptSidebar />
        </div>

        {/* Resize handle for sidebar */}
        <div
          onMouseDown={handleSidebarMouseDown}
          className="w-1 flex-shrink-0 cursor-col-resize hover:bg-primary hover:bg-opacity-20 transition-colors relative group"
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>

        {/* Center Viewer - Flexible */}
        <div className="flex-1 min-w-0">
          {selectedTranscript ? (
            <TranscriptViewer transcription={selectedTranscript} />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50">
              <div className="text-center space-y-6 max-w-md px-4">
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center shadow-lg">
                  <svg
                    className="w-12 h-12 text-gray-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <line x1="10" y1="9" x2="8" y2="9" />
                  </svg>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-text-dark">
                    Select a Transcript
                  </h3>
                  <p className="text-sm text-text-gray">
                    Choose a transcript from the list to view its content and chat with AI about it
                  </p>
                </div>

                <button
                  onClick={() => switchTab('recording')}
                  className="px-6 py-3 rounded-xl bg-gradient-bcg text-white font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:scale-105 inline-flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                  Create New Transcription
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Chat Panel - Resizable, collapsible */}
        {isChatPanelOpen && (
          <>
            {/* Resize handle for chat */}
            <div
              onMouseDown={handleChatMouseDown}
              className="w-1 flex-shrink-0 cursor-col-resize hover:bg-primary hover:bg-opacity-20 transition-colors relative group"
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
            </div>

            <div
              className="flex-shrink-0 border-l-2 border-gray-200 bg-gray-50 min-w-0"
              style={{ width: `${chatWidth}px` }}
            >
              <ChatPanel />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AnalysisPanel;
