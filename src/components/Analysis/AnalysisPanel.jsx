import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import LeftPanel from './LeftPanel';
import ViewModeSelector from './ViewModeSelector';
import TranscriptView from './TranscriptView';
import SummaryView from './SummaryView';
import ChatPanel from './Chat/ChatPanel';

function AnalysisPanel({ isActive }) {
  const { loadTranscripts, loadChatHistory, rightPanelView } = useApp();

  // Panel sizes with localStorage persistence (2-column layout: left panel + chat)
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    const saved = localStorage.getItem('analysis-left-panel-width');
    return saved ? parseInt(saved, 10) : 400; // Default to 33% of ~1200px screen
  });

  const isDragging = useRef(false);

  useEffect(() => {
    // Load transcripts and chat history when component mounts
    loadTranscripts();
    loadChatHistory();
  }, []);

  // Save size to localStorage
  useEffect(() => {
    localStorage.setItem('analysis-left-panel-width', leftPanelWidth.toString());
  }, [leftPanelWidth]);

  // Handle resize
  const handleMouseDown = (e) => {
    isDragging.current = true;
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging.current) {
        // Allow left panel to be 300px to 600px wide
        const newWidth = Math.max(300, Math.min(600, e.clientX));
        setLeftPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
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
      aria-labelledby="tab-transcripts"
    >
      <div className="absolute inset-0 flex">
        {/* Left Panel - Resizable (List or Detail View) */}
        <div
          className="flex-shrink-0 border-r border-border bg-surface min-w-0"
          style={{ width: `${leftPanelWidth}px` }}
        >
          <LeftPanel />
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={handleMouseDown}
          className="w-px flex-shrink-0 cursor-col-resize bg-success hover:bg-success hover:opacity-80 transition-all relative group"
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>

        {/* Right Panel - Flexible (takes remaining space) */}
        <div className="flex-1 min-w-0 bg-surface-tertiary flex flex-col">
          {/* View Mode Selector */}
          <ViewModeSelector />

          {/* Content based on selected view */}
          <div className="flex-1 min-h-0">
            {rightPanelView === 'transcript' && <TranscriptView />}
            {rightPanelView === 'summary' && <SummaryView />}
            {rightPanelView === 'chat' && <ChatPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalysisPanel;
