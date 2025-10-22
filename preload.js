const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // API Key management
  validateApiKey: (apiKey) => ipcRenderer.invoke('validate-api-key', apiKey),
  saveApiKey: (apiKey) => ipcRenderer.invoke('save-api-key', apiKey),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),

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

  // Clipboard
  copyToClipboard: (text) => {
    navigator.clipboard.writeText(text);
  },
});
