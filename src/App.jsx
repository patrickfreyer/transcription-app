import React from 'react';
import { AppProvider } from './context/AppContext';
import AppHeader from './components/Header/AppHeader';
import RecordingPanel from './components/Recording/RecordingPanel';
import AnalysisPanel from './components/Analysis/AnalysisPanel';
import APIKeyModal from './components/Modals/APIKeyModal';
import SettingsModal from './components/Modals/SettingsModal';
import { useApp } from './context/AppContext';

function AppContent() {
  const { currentTab, platform, showSettingsModal, closeSettingsModal } = useApp();

  return (
    <div className="flex flex-col h-screen bg-surface-tertiary overflow-hidden">
      {/* Custom Title Bar (macOS - draggable region) */}
      {platform === 'darwin' && (
        <div className="draggable h-14 flex-shrink-0 hidden" id="mac-title-bar"></div>
      )}

      {/* Custom Title Bar (Windows Only) */}
      {platform === 'win32' && (
        <div className="non-draggable flex items-center justify-between px-4 h-12 bg-black/20 border-b border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 opacity-80">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-13h2v6h-2V7zm0 8h2v2h-2v-2z"/>
              </svg>
            </div>
            <span className="text-sm font-medium opacity-80">Audio Transcription</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="non-draggable w-11 h-8 flex items-center justify-center hover:bg-white/10 transition-colors rounded"
              onClick={() => window.electron.minimizeWindow()}
              aria-label="Minimize"
            >
              <svg className="w-3 h-3" viewBox="0 0 10 1" fill="none">
                <rect width="10" height="1" fill="currentColor"/>
              </svg>
            </button>
            <button
              className="non-draggable w-11 h-8 flex items-center justify-center hover:bg-white/10 transition-colors rounded"
              onClick={() => window.electron.maximizeWindow()}
              aria-label="Maximize"
            >
              <svg className="w-3 h-3" viewBox="0 0 10 10" fill="none">
                <rect x="0" y="0" width="10" height="10" stroke="currentColor" strokeWidth="1" fill="none"/>
              </svg>
            </button>
            <button
              className="non-draggable w-11 h-8 flex items-center justify-center hover:bg-error/80 transition-colors rounded"
              onClick={() => window.electron.closeWindow()}
              aria-label="Close"
            >
              <svg className="w-3 h-3" viewBox="0 0 10 10" fill="none">
                <path d="M0 0 L10 10 M10 0 L0 10" stroke="currentColor" strokeWidth="1"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* App Header */}
      <AppHeader />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <RecordingPanel isActive={currentTab === 'recording'} />
        <AnalysisPanel isActive={currentTab === 'analysis'} />
      </main>

      {/* API Key Modal */}
      <APIKeyModal />

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettingsModal} onClose={closeSettingsModal} />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
