import React, { useState, useEffect } from 'react';
import SummaryTemplatesTab from './SummaryTemplatesTab';

function SettingsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('templates');
  const [theme, setTheme] = useState('light');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'templates', name: 'Summary Templates', icon: 'file-text' },
    { id: 'appearance', name: 'Appearance', icon: 'palette' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary shadow-sm">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-surface-secondary transition-all"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-semibold text-sm transition-all relative ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-foreground-secondary hover:text-foreground'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'templates' && <SummaryTemplatesTab />}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Theme</h3>
                <div className="space-y-3">
                  {/* Light Mode Option */}
                  <button
                    onClick={() => {
                      if (theme !== 'light') toggleTheme();
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      theme === 'light'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-strong bg-surface'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      theme === 'light' ? 'bg-primary/10' : 'bg-surface-secondary'
                    }`}>
                      <svg className={`w-6 h-6 ${theme === 'light' ? 'text-primary' : 'text-foreground-secondary'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="5" />
                        <line x1="12" y1="1" x2="12" y2="3" />
                        <line x1="12" y1="21" x2="12" y2="23" />
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                        <line x1="1" y1="12" x2="3" y2="12" />
                        <line x1="21" y1="12" x2="23" y2="12" />
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                      </svg>
                    </div>
                    <div className="flex-1 text-left">
                      <div className={`font-semibold ${theme === 'light' ? 'text-primary' : 'text-foreground'}`}>
                        Light Mode
                      </div>
                      <div className="text-sm text-foreground-secondary">
                        Clean and bright interface
                      </div>
                    </div>
                    {theme === 'light' && (
                      <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>

                  {/* Dark Mode Option */}
                  <button
                    onClick={() => {
                      if (theme !== 'dark') toggleTheme();
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      theme === 'dark'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-strong bg-surface'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      theme === 'dark' ? 'bg-primary/10' : 'bg-surface-secondary'
                    }`}>
                      <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-primary' : 'text-foreground-secondary'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                      </svg>
                    </div>
                    <div className="flex-1 text-left">
                      <div className={`font-semibold ${theme === 'dark' ? 'text-primary' : 'text-foreground'}`}>
                        Dark Mode
                      </div>
                      <div className="text-sm text-foreground-secondary">
                        Easy on the eyes in low light
                      </div>
                    </div>
                    {theme === 'dark' && (
                      <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
