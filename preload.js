const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Platform detection
  platform: process.platform,

  // API Key management (secure)
  validateApiKey: (apiKey) => ipcRenderer.invoke('validate-api-key', apiKey),
  saveApiKeySecure: (apiKey) => ipcRenderer.invoke('save-api-key-secure', apiKey),
  getApiKeySecure: () => ipcRenderer.invoke('get-api-key-secure'),
  deleteApiKeySecure: () => ipcRenderer.invoke('delete-api-key-secure'),

  // Legacy API key management (for backward compatibility)
  saveApiKey: (apiKey) => ipcRenderer.invoke('save-api-key', apiKey),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),

  // Window controls (for Windows custom title bar)
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // Navigation
  navigate: (page) => ipcRenderer.invoke('navigate', page),

  // Recording
  saveRecording: (arrayBuffer) => ipcRenderer.invoke('save-recording', arrayBuffer),

  // Transcription
  transcribeAudio: (filePath, apiKey, prompt) =>
    ipcRenderer.invoke('transcribe-audio', filePath, apiKey, prompt),
  saveTranscript: (content, format, fileName) =>
    ipcRenderer.invoke('save-transcript', content, format, fileName),
  onTranscriptionProgress: (callback) => {
    ipcRenderer.on('transcription-progress', (event, data) => callback(data));
  },

  // API key status updates
  onApiKeyStatus: (callback) => {
    ipcRenderer.on('api-key-status', (event, status) => callback(status));
  },

  // Clipboard
  copyToClipboard: (text) => {
    navigator.clipboard.writeText(text);
  },
});
