const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Settings management (replaces API key management)
  validateApiKey: (apiKey) => ipcRenderer.invoke('validate-api-key', apiKey),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getSettings: () => ipcRenderer.invoke('get-settings'),

  // Legacy API key methods (for backward compatibility)
  getApiKey: () => ipcRenderer.invoke('get-api-key'),

  // Navigation
  navigate: (page) => ipcRenderer.invoke('navigate', page),

  // Recording
  saveRecording: (arrayBuffer) => ipcRenderer.invoke('save-recording', arrayBuffer),

  // Transcription (updated to pass mode instead of apiKey)
  transcribeAudio: (filePath, mode) =>
    ipcRenderer.invoke('transcribe-audio', filePath, mode),
  saveTranscript: (content, format, fileName) =>
    ipcRenderer.invoke('save-transcript', content, format, fileName),

  // Clipboard
  copyToClipboard: (text) => {
    navigator.clipboard.writeText(text);
  },
});
