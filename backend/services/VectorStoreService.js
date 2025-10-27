/**
 * VectorStoreService - Manages OpenAI Vector Store for transcript RAG
 * Handles upload, deletion, and maintenance of transcripts in OpenAI's vector store
 */

const OpenAI = require('openai');
const { toFile } = require('openai');
const StorageService = require('./StorageService');
const { createLogger } = require('../utils/logger');

const logger = createLogger('VectorStoreService');

class VectorStoreService {
  constructor() {
    this.storage = new StorageService();
    this.client = null;
    this.vectorStoreId = null;
    logger.info('VectorStoreService initialized');
  }

  /**
   * Initialize OpenAI client and vector store
   * @param {string} apiKey - OpenAI API key
   */
  async initialize(apiKey) {
    try {
      // Initialize OpenAI client if not already done
      if (!this.client) {
        this.client = new OpenAI({ apiKey });
        logger.info('OpenAI client initialized for vector store');
      }

      // Get or create vector store
      this.vectorStoreId = this.storage.getVectorStoreId();

      if (!this.vectorStoreId) {
        logger.info('No existing vector store found, creating new one...');
        await this.createVectorStore();
      } else {
        logger.info(`Using existing vector store: ${this.vectorStoreId}`);

        // Verify vector store still exists
        try {
          await this.client.beta.vectorStores.retrieve(this.vectorStoreId);
          logger.info('Vector store verified and accessible');
        } catch (error) {
          logger.warn('Vector store no longer exists, creating new one...');
          await this.createVectorStore();
        }
      }

      return true;
    } catch (error) {
      logger.error('Failed to initialize VectorStoreService:', error);
      throw error;
    }
  }

  /**
   * Create new vector store
   * @returns {Object} Created vector store object
   */
  async createVectorStore() {
    try {
      const vectorStore = await this.client.beta.vectorStores.create({
        name: 'Transcripts Vector Store',
        expires_after: null  // Never expire
      });

      this.vectorStoreId = vectorStore.id;
      this.storage.saveVectorStoreId(vectorStore.id);

      logger.success(`Created vector store: ${vectorStore.id}`);
      return vectorStore;
    } catch (error) {
      logger.error('Failed to create vector store:', error);
      throw error;
    }
  }

  /**
   * Upload transcript to vector store
   * @param {Object} transcript - Transcript object with rawTranscript, fileName, etc.
   * @returns {Object} Upload result with fileId and status
   */
  async uploadTranscript(transcript) {
    if (!this.client || !this.vectorStoreId) {
      throw new Error('VectorStoreService not initialized. Call initialize() first.');
    }

    try {
      // Format transcript as searchable text file
      const fileContent = this.formatTranscriptAsFile(transcript);

      // Convert to file object with proper extension
      const file = await toFile(
        Buffer.from(fileContent, 'utf-8'),
        `${transcript.id}.txt`,
        { type: 'text/plain' }
      );

      logger.info(`Uploading transcript to vector store: ${transcript.fileName}`);

      // Upload to vector store with polling (waits for completion)
      const vectorStoreFile = await this.client.beta.vectorStores.files.uploadAndPoll(
        this.vectorStoreId,
        { file }
      );

      logger.success(`Uploaded transcript: ${transcript.fileName} (file ID: ${vectorStoreFile.id}, status: ${vectorStoreFile.status})`);

      return {
        fileId: vectorStoreFile.id,
        status: vectorStoreFile.status
      };

    } catch (error) {
      logger.error(`Failed to upload transcript: ${transcript.fileName}`, error);
      throw error;
    }
  }

  /**
   * Format transcript as searchable text file with metadata
   * @param {Object} transcript - Transcript object
   * @returns {string} Formatted text content
   */
  formatTranscriptAsFile(transcript) {
    // Header with metadata
    const header = `TRANSCRIPT: ${transcript.fileName}
Date: ${new Date(transcript.timestamp).toLocaleString()}
Duration: ${Math.floor(transcript.duration / 60)}:${(transcript.duration % 60).toString().padStart(2, '0')}
Diarized: ${transcript.isDiarized ? 'Yes' : 'No'}
Model: ${transcript.model}
Transcript ID: ${transcript.id}

---

`;

    // Summary section (if available)
    const summary = transcript.summary
      ? `SUMMARY:\n${transcript.summary}\n\n---\n\n`
      : '';

    // Main transcript content
    const content = `TRANSCRIPT CONTENT:\n${transcript.rawTranscript}`;

    return header + summary + content;
  }

  /**
   * Delete transcript from vector store
   * @param {string} fileId - OpenAI file ID
   * @returns {boolean} True if successful
   */
  async deleteTranscript(fileId) {
    if (!this.client || !this.vectorStoreId) {
      logger.warn('Cannot delete - VectorStoreService not initialized');
      return false;
    }

    if (!fileId) {
      logger.warn('Cannot delete - no file ID provided');
      return false;
    }

    try {
      await this.client.beta.vectorStores.files.del(
        this.vectorStoreId,
        fileId
      );

      logger.success(`Deleted file from vector store: ${fileId}`);
      return true;
    } catch (error) {
      // Log error but don't throw (file might already be deleted)
      logger.error(`Failed to delete file: ${fileId}`, error);
      return false;
    }
  }

  /**
   * Get current vector store ID
   * @returns {string|null} Vector store ID or null
   */
  getVectorStoreId() {
    return this.vectorStoreId;
  }

  /**
   * Recreate vector store (maintenance operation)
   * Useful if vector store becomes corrupted or needs to be rebuilt
   * @returns {Object} New vector store object
   */
  async recreateVectorStore() {
    logger.warn('Recreating vector store...');

    try {
      // Create new vector store
      const newVectorStore = await this.createVectorStore();

      logger.success('Vector store recreated successfully');
      return newVectorStore;
    } catch (error) {
      logger.error('Failed to recreate vector store:', error);
      throw error;
    }
  }

  /**
   * Get vector store details
   * @returns {Object|null} Vector store information
   */
  async getVectorStoreInfo() {
    if (!this.client || !this.vectorStoreId) {
      return null;
    }

    try {
      const vectorStore = await this.client.beta.vectorStores.retrieve(this.vectorStoreId);
      return {
        id: vectorStore.id,
        name: vectorStore.name,
        fileCount: vectorStore.file_counts?.total || 0,
        status: vectorStore.status,
        createdAt: vectorStore.created_at
      };
    } catch (error) {
      logger.error('Failed to get vector store info:', error);
      return null;
    }
  }
}

module.exports = VectorStoreService;
