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

  // Disclaimer management
  getDisclaimerStatus: () => ipcRenderer.invoke('get-disclaimer-status'),
  setDisclaimerAccepted: () => ipcRenderer.invoke('set-disclaimer-accepted'),

  // Legacy API key management (for backward compatibility)
  saveApiKey: (apiKey) => ipcRenderer.invoke('save-api-key', apiKey),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),

  // Summary Template management
  getTemplates: () => ipcRenderer.invoke('get-templates'),
  saveTemplates: (templates) => ipcRenderer.invoke('save-templates', templates),

  // Window controls (for Windows custom title bar)
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // Navigation
  navigate: (page) => ipcRenderer.invoke('navigate', page),

  // Recording
  saveRecording: (arrayBuffer) => ipcRenderer.invoke('save-recording', arrayBuffer),

  // File handling
  saveFileToTemp: (arrayBuffer, fileName) => ipcRenderer.invoke('save-file-to-temp', arrayBuffer, fileName),

  // Transcription
  transcribeAudio: (filePath, apiKey, options) =>
    ipcRenderer.invoke('transcribe-audio', filePath, apiKey, options),
  generateSummary: (transcript, templatePrompt, apiKey) =>
    ipcRenderer.invoke('generate-summary', transcript, templatePrompt, apiKey),
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

  // External links (for markdown links)
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Transcript management
  getTranscripts: () => ipcRenderer.invoke('get-transcripts'),
  saveTranscripts: (transcripts) => ipcRenderer.invoke('save-transcripts', transcripts),
  saveTranscriptToAnalysis: (transcriptData) => ipcRenderer.invoke('save-transcript-to-analysis', transcriptData),
  updateTranscript: (transcriptId, updates) => ipcRenderer.invoke('update-transcript', transcriptId, updates),
  deleteTranscript: (transcriptId) => ipcRenderer.invoke('delete-transcript', transcriptId),
  toggleStarTranscript: (transcriptId) => ipcRenderer.invoke('toggle-star-transcript', transcriptId),
  generateTranscriptName: (transcriptText, apiKey) => ipcRenderer.invoke('generate-transcript-name', transcriptText, apiKey),

  // Chat management
  getChatHistory: () => ipcRenderer.invoke('get-chat-history'),
  saveChatHistory: (chatHistory) => ipcRenderer.invoke('save-chat-history', chatHistory),

  // Streaming chat with Agents SDK
  chatWithAIStream: (messages, systemPrompt, contextIds, searchAllTranscripts = false) => {
    ipcRenderer.send('chat-with-ai-stream', messages, systemPrompt, contextIds, searchAllTranscripts);
  },
  onChatStreamToken: (callback) => {
    ipcRenderer.on('chat-stream-token', (event, data) => callback(data));
  },
  onChatStreamComplete: (callback) => {
    ipcRenderer.on('chat-stream-complete', (event, data) => callback(data));
  },
  onChatStreamError: (callback) => {
    ipcRenderer.on('chat-stream-error', (event, data) => callback(data));
  },
  removeChatStreamListeners: () => {
    ipcRenderer.removeAllListeners('chat-stream-token');
    ipcRenderer.removeAllListeners('chat-stream-complete');
    ipcRenderer.removeAllListeners('chat-stream-error');
  },

  // Vector store bulk upload
  bulkUploadTranscripts: (options) => ipcRenderer.invoke('bulk-upload-transcripts', options),
  retryFailedUploads: () => ipcRenderer.invoke('retry-failed-uploads'),
  getUploadStatus: () => ipcRenderer.invoke('get-upload-status'),
});
