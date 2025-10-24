/**
 * StorageService - Wrapper for electron-store
 * Provides centralized access to persistent storage
 */

const Store = require('electron-store');
const { createLogger } = require('../utils/logger');

const logger = createLogger('StorageService');

class StorageService {
  constructor() {
    this.store = new Store({
      defaults: {
        transcripts: [],
        chatHistory: {},
        'summary-templates': []
      }
    });

    logger.info('StorageService initialized');
  }

  /**
   * Get all transcripts
   * @returns {Array} Array of transcript objects
   */
  getTranscripts() {
    return this.store.get('transcripts', []);
  }

  /**
   * Save transcripts array
   * @param {Array} transcripts - Transcript array to save
   */
  saveTranscripts(transcripts) {
    this.store.set('transcripts', transcripts);
    logger.debug(`Saved ${transcripts.length} transcripts`);
  }

  /**
   * Get chat history object
   * @returns {Object} Chat history keyed by transcript ID
   */
  getChatHistory() {
    return this.store.get('chatHistory', {});
  }

  /**
   * Save chat history
   * @param {Object} chatHistory - Chat history object
   */
  saveChatHistory(chatHistory) {
    this.store.set('chatHistory', chatHistory);
    const chatCount = Object.keys(chatHistory).length;
    logger.debug(`Saved chat history for ${chatCount} transcript(s)`);
  }

  /**
   * Get summary templates
   * @returns {Array} Array of summary template objects
   */
  getSummaryTemplates() {
    return this.store.get('summary-templates', []);
  }

  /**
   * Save summary templates
   * @param {Array} templates - Template array
   */
  saveSummaryTemplates(templates) {
    this.store.set('summary-templates', templates);
    logger.debug(`Saved ${templates.length} summary templates`);
  }

  /**
   * Clear all storage (for testing/reset)
   */
  clearAll() {
    this.store.clear();
    logger.warn('All storage cleared');
  }

  /**
   * Get storage file path
   * @returns {string} Path to storage file
   */
  getStoragePath() {
    return this.store.path;
  }
}

module.exports = StorageService;
