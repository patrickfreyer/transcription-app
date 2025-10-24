/**
 * TranscriptService - Handles all transcript CRUD operations
 */

const StorageService = require('./StorageService');
const { estimateTokens } = require('../utils/tokenCounter');
const { createLogger } = require('../utils/logger');

const logger = createLogger('TranscriptService');

class TranscriptService {
  constructor() {
    this.storage = new StorageService();
    logger.info('TranscriptService initialized');
  }

  /**
   * Save a new transcript from recording
   * @param {Object} transcriptData - Transcript data from recording
   * @returns {Object} Saved transcript with ID
   */
  async saveFromRecording(transcriptData) {
    const transcript = {
      id: `transcript-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fileName: transcriptData.fileName || 'Untitled',
      rawTranscript: transcriptData.rawTranscript || '',
      vttTranscript: transcriptData.vttTranscript || '',
      summary: transcriptData.summary || null,
      summaryTemplate: transcriptData.summaryTemplate || null,
      model: transcriptData.model || 'unknown',
      duration: transcriptData.duration || 0,
      timestamp: transcriptData.timestamp || Date.now(),
      isDiarized: transcriptData.isDiarized || false,
      fileSize: transcriptData.fileSize || null,
      starred: false,
      tags: [],
      tokens: estimateTokens(transcriptData.rawTranscript || ''),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const transcripts = this.storage.getTranscripts();
    transcripts.unshift(transcript); // Add to beginning
    this.storage.saveTranscripts(transcripts);

    logger.success(`Saved transcript: ${transcript.fileName} (${transcript.tokens} tokens)`);
    return transcript;
  }

  /**
   * Get all transcripts
   * @returns {Array} All transcripts
   */
  getAll() {
    return this.storage.getTranscripts();
  }

  /**
   * Get transcript by ID
   * @param {string} transcriptId - Transcript ID
   * @returns {Object|null} Transcript object or null
   */
  getById(transcriptId) {
    const transcripts = this.storage.getTranscripts();
    return transcripts.find(t => t.id === transcriptId) || null;
  }

  /**
   * Get multiple transcripts by IDs (for multi-context chat)
   * @param {string[]} transcriptIds - Array of transcript IDs
   * @returns {Array} Array of transcript objects
   */
  getByIds(transcriptIds) {
    if (!Array.isArray(transcriptIds) || transcriptIds.length === 0) {
      return [];
    }

    const transcripts = this.storage.getTranscripts();
    return transcripts.filter(t => transcriptIds.includes(t.id));
  }

  /**
   * Update transcript
   * @param {string} transcriptId - Transcript ID
   * @param {Object} updates - Fields to update
   * @returns {Object|null} Updated transcript or null
   */
  update(transcriptId, updates) {
    const transcripts = this.storage.getTranscripts();
    const index = transcripts.findIndex(t => t.id === transcriptId);

    if (index === -1) {
      logger.error(`Transcript not found: ${transcriptId}`);
      return null;
    }

    transcripts[index] = {
      ...transcripts[index],
      ...updates,
      updatedAt: Date.now()
    };

    this.storage.saveTranscripts(transcripts);
    logger.info(`Updated transcript: ${transcriptId}`);
    return transcripts[index];
  }

  /**
   * Delete transcript
   * @param {string} transcriptId - Transcript ID
   * @returns {boolean} True if deleted
   */
  delete(transcriptId) {
    const transcripts = this.storage.getTranscripts();
    const filtered = transcripts.filter(t => t.id !== transcriptId);

    if (filtered.length === transcripts.length) {
      logger.warn(`Transcript not found for deletion: ${transcriptId}`);
      return false;
    }

    this.storage.saveTranscripts(filtered);

    // Also delete associated chat history
    const chatHistory = this.storage.getChatHistory();
    if (chatHistory[transcriptId]) {
      delete chatHistory[transcriptId];
      this.storage.saveChatHistory(chatHistory);
    }

    logger.success(`Deleted transcript: ${transcriptId}`);
    return true;
  }

  /**
   * Toggle star status
   * @param {string} transcriptId - Transcript ID
   * @returns {Object|null} Updated transcript or null
   */
  toggleStar(transcriptId) {
    const transcripts = this.storage.getTranscripts();
    const index = transcripts.findIndex(t => t.id === transcriptId);

    if (index === -1) {
      logger.warn(`Transcript not found: ${transcriptId}`);
      return null;
    }

    transcripts[index].starred = !transcripts[index].starred;
    transcripts[index].updatedAt = Date.now();
    this.storage.saveTranscripts(transcripts);

    logger.info(`Toggled star for transcript: ${transcriptId} -> ${transcripts[index].starred}`);
    return transcripts[index];
  }

  /**
   * Get transcript count
   * @returns {number} Total transcript count
   */
  getCount() {
    return this.storage.getTranscripts().length;
  }

  /**
   * Search transcripts
   * @param {string} query - Search query
   * @returns {Array} Matching transcripts
   */
  search(query) {
    if (!query || query.trim() === '') {
      return this.getAll();
    }

    const transcripts = this.storage.getTranscripts();
    const lowerQuery = query.toLowerCase();

    return transcripts.filter(t =>
      t.fileName.toLowerCase().includes(lowerQuery) ||
      t.rawTranscript.toLowerCase().includes(lowerQuery) ||
      (t.summary && t.summary.toLowerCase().includes(lowerQuery))
    );
  }
}

module.exports = TranscriptService;
