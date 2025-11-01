/**
 * StorageService - Wrapper for electron-store with encryption
 * Provides centralized access to persistent storage with OS-level encryption
 *
 * Security:
 * - Transcripts are encrypted using OS keychain (safeStorage)
 * - Chat history is encrypted
 * - Automatic migration from unencrypted to encrypted data
 * - Summary templates remain unencrypted (not sensitive)
 */

const Store = require('electron-store');
const encryptionService = require('./EncryptionService');
const backupService = require('./BackupService');
const { atomicStoreUpdate } = require('../utils/atomicWrite');
const { createLogger } = require('../utils/logger');

const logger = createLogger('StorageService');

class StorageService {
  constructor() {
    this.store = new Store({
      defaults: {
        transcripts: [],
        chatHistory: {},
        'summary-templates': [],
        'encryption-version': 0 // Track encryption migration
      }
    });

    logger.info('StorageService initialized');
    this.migrateToEncryption();
  }

  /**
   * Migrate existing unencrypted data to encrypted format (one-time)
   */
  migrateToEncryption() {
    const currentVersion = this.store.get('encryption-version', 0);

    if (currentVersion === 0 && encryptionService.isAvailable) {
      logger.info('Starting encryption migration...');

      try {
        // Migrate transcripts
        const transcripts = this.store.get('transcripts', []);
        if (transcripts.length > 0) {
          logger.info(`Migrating ${transcripts.length} transcripts to encrypted storage...`);

          const encryptedTranscripts = transcripts.map((transcript, index) => {
            try {
              // Check if already encrypted
              if (typeof transcript === 'string' && encryptionService.isEncrypted(transcript)) {
                logger.debug(`Transcript ${index} already encrypted`);
                return transcript;
              }

              // Encrypt the transcript object
              const encrypted = encryptionService.encryptObject(transcript);
              logger.debug(`Encrypted transcript ${index}: ${transcript.id || 'unknown'}`);
              return encrypted;
            } catch (error) {
              logger.error(`Failed to encrypt transcript ${index}:`, error);
              // Keep original if encryption fails
              return JSON.stringify(transcript);
            }
          });

          this.store.set('transcripts', encryptedTranscripts);
          logger.info(`✓ Migrated ${encryptedTranscripts.length} transcripts to encrypted storage`);
        }

        // Migrate chat history
        const chatHistory = this.store.get('chatHistory', {});
        const chatKeys = Object.keys(chatHistory);

        if (chatKeys.length > 0) {
          logger.info(`Migrating ${chatKeys.length} chat histories to encrypted storage...`);

          const encryptedChatHistory = {};
          chatKeys.forEach((transcriptId) => {
            try {
              const chat = chatHistory[transcriptId];

              // Check if already encrypted
              if (typeof chat === 'string' && encryptionService.isEncrypted(chat)) {
                logger.debug(`Chat history for ${transcriptId} already encrypted`);
                encryptedChatHistory[transcriptId] = chat;
                return;
              }

              // Encrypt the chat history object
              encryptedChatHistory[transcriptId] = encryptionService.encryptObject(chat);
              logger.debug(`Encrypted chat history for transcript: ${transcriptId}`);
            } catch (error) {
              logger.error(`Failed to encrypt chat history for ${transcriptId}:`, error);
              // Keep original if encryption fails
              encryptedChatHistory[transcriptId] = JSON.stringify(chatHistory[transcriptId]);
            }
          });

          this.store.set('chatHistory', encryptedChatHistory);
          logger.info(`✓ Migrated ${chatKeys.length} chat histories to encrypted storage`);
        }

        // Mark migration complete
        this.store.set('encryption-version', 1);
        logger.info('✓ Encryption migration completed successfully');

      } catch (error) {
        logger.error('Encryption migration failed:', error);
        logger.warn('Data will remain unencrypted');
      }
    } else if (currentVersion === 1) {
      logger.info('Storage already using encryption v1');
    } else if (!encryptionService.isAvailable) {
      logger.warn('Encryption not available - data stored unencrypted');
    }
  }

  /**
   * Get all transcripts (decrypts automatically)
   * @returns {Array} Array of transcript objects
   */
  getTranscripts() {
    try {
      const encrypted = this.store.get('transcripts', []);

      if (!Array.isArray(encrypted) || encrypted.length === 0) {
        return [];
      }

      // Decrypt each transcript
      const decrypted = encrypted.map((item, index) => {
        try {
          // If it's a string, it's encrypted
          if (typeof item === 'string') {
            return encryptionService.decryptObject(item);
          }
          // If it's already an object, it's legacy unencrypted data
          return item;
        } catch (error) {
          logger.error(`Failed to decrypt transcript ${index}:`, error);
          return null;
        }
      }).filter(t => t !== null);

      logger.debug(`Retrieved ${decrypted.length} transcripts`);
      return decrypted;

    } catch (error) {
      logger.error('Failed to get transcripts:', error);
      return [];
    }
  }

  /**
   * Save transcripts array (encrypts automatically with atomic writes)
   * @param {Array} transcripts - Transcript array to save
   */
  async saveTranscripts(transcripts) {
    try {
      if (!Array.isArray(transcripts)) {
        logger.error('saveTranscripts: Invalid input (not an array)');
        return;
      }

      // Create backup before modifying
      backupService.createBackup(this.store.path);

      // Encrypt each transcript
      const encrypted = transcripts.map((transcript, index) => {
        try {
          return encryptionService.encryptObject(transcript);
        } catch (error) {
          logger.error(`Failed to encrypt transcript ${index}:`, error);
          // Fallback: store as JSON
          return JSON.stringify(transcript);
        }
      });

      // Use atomic write to prevent data corruption
      await atomicStoreUpdate(this.store, 'transcripts', encrypted);
      logger.debug(`✓ Saved ${transcripts.length} transcripts (encrypted, atomic)`);

    } catch (error) {
      logger.error('Failed to save transcripts:', error);
      logger.warn('Attempting to restore from backup...');

      // Attempt to restore from backup
      const restored = backupService.restoreLatest(this.store.path);
      if (restored) {
        logger.info('✓ Restored from backup after save failure');
      }

      throw error;
    }
  }

  /**
   * Get chat history object (decrypts automatically)
   * @returns {Object} Chat history keyed by transcript ID
   */
  getChatHistory() {
    try {
      const encrypted = this.store.get('chatHistory', {});

      if (!encrypted || typeof encrypted !== 'object') {
        return {};
      }

      const decrypted = {};
      Object.keys(encrypted).forEach((transcriptId) => {
        try {
          const item = encrypted[transcriptId];

          // If it's a string, it's encrypted
          if (typeof item === 'string') {
            decrypted[transcriptId] = encryptionService.decryptObject(item);
          } else {
            // Legacy unencrypted data
            decrypted[transcriptId] = item;
          }
        } catch (error) {
          logger.error(`Failed to decrypt chat history for ${transcriptId}:`, error);
        }
      });

      const chatCount = Object.keys(decrypted).length;
      logger.debug(`Retrieved chat history for ${chatCount} transcript(s)`);
      return decrypted;

    } catch (error) {
      logger.error('Failed to get chat history:', error);
      return {};
    }
  }

  /**
   * Save chat history (encrypts automatically with atomic writes)
   * @param {Object} chatHistory - Chat history object
   */
  async saveChatHistory(chatHistory) {
    try {
      if (!chatHistory || typeof chatHistory !== 'object') {
        logger.error('saveChatHistory: Invalid input');
        return;
      }

      // Create backup before modifying
      backupService.createBackup(this.store.path);

      const encrypted = {};
      Object.keys(chatHistory).forEach((transcriptId) => {
        try {
          encrypted[transcriptId] = encryptionService.encryptObject(chatHistory[transcriptId]);
        } catch (error) {
          logger.error(`Failed to encrypt chat history for ${transcriptId}:`, error);
          // Fallback: store as JSON
          encrypted[transcriptId] = JSON.stringify(chatHistory[transcriptId]);
        }
      });

      // Use atomic write to prevent data corruption
      await atomicStoreUpdate(this.store, 'chatHistory', encrypted);
      const chatCount = Object.keys(encrypted).length;
      logger.debug(`✓ Saved chat history for ${chatCount} transcript(s) (encrypted, atomic)`);

    } catch (error) {
      logger.error('Failed to save chat history:', error);
      logger.warn('Attempting to restore from backup...');

      // Attempt to restore from backup
      const restored = backupService.restoreLatest(this.store.path);
      if (restored) {
        logger.info('✓ Restored from backup after save failure');
      }

      throw error;
    }
  }

  /**
   * Get summary templates (not encrypted - not sensitive)
   * @returns {Array} Array of summary template objects
   */
  getSummaryTemplates() {
    return this.store.get('summary-templates', []);
  }

  /**
   * Save summary templates (not encrypted - not sensitive)
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

  /**
   * Get encryption status
   * @returns {Object} Encryption status information
   */
  getEncryptionStatus() {
    return {
      ...encryptionService.getStatus(),
      version: this.store.get('encryption-version', 0),
      storagePath: this.store.path
    };
  }

  /**
   * Get vector store ID
   * @returns {string|null} Vector store ID or null
   */
  getVectorStoreId() {
    return this.store.get('vector-store-id', null);
  }

  /**
   * Save vector store ID
   * @param {string} vectorStoreId - OpenAI vector store ID
   */
  saveVectorStoreId(vectorStoreId) {
    this.store.set('vector-store-id', vectorStoreId);
    this.store.set('vector-store-created-at', Date.now());
    logger.info(`Saved vector store ID: ${vectorStoreId}`);
  }

  /**
   * Get vector store creation timestamp
   * @returns {number|null} Timestamp or null
   */
  getVectorStoreCreatedAt() {
    return this.store.get('vector-store-created-at', null);
  }
}

module.exports = StorageService;
