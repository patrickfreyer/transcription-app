/**
 * Transcript File Storage Manager
 *
 * Manages compressed transcript files on disk
 * Keeps electron-store lightweight with only metadata
 */

const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');
const { compressVTT, decompressVTT, vttToPlainText } = require('./transcriptCompression');
const transcriptCache = require('./transcriptCache');
const { createLogger } = require('./logger');

const logger = createLogger('TranscriptStorage');

class TranscriptStorageManager {
  constructor() {
    // Store transcripts in userData/transcripts/
    this.transcriptsDir = path.join(app.getPath('userData'), 'transcripts');
    this.ensureDirectory();
  }

  /**
   * Ensure transcripts directory exists
   */
  async ensureDirectory() {
    try {
      await fs.mkdir(this.transcriptsDir, { recursive: true });
      logger.debug(`Transcripts directory: ${this.transcriptsDir}`);
    } catch (error) {
      logger.error('Failed to create transcripts directory:', error);
      throw error;
    }
  }

  /**
   * Get file path for a transcript
   * @param {string} transcriptId - Transcript ID
   * @returns {string} File path
   */
  getTranscriptFilePath(transcriptId) {
    return path.join(this.transcriptsDir, `${transcriptId}.vtt.br`);
  }

  /**
   * Save compressed VTT file to disk
   * @param {string} transcriptId - Transcript ID
   * @param {string} vttContent - VTT content
   * @returns {Promise<Object>} Save result with size info
   */
  async saveVTT(transcriptId, vttContent) {
    if (!transcriptId || !vttContent) {
      throw new Error('Missing transcriptId or vttContent');
    }

    try {
      await this.ensureDirectory();

      const filePath = this.getTranscriptFilePath(transcriptId);
      const originalSize = Buffer.byteLength(vttContent, 'utf8');

      // Compress VTT content
      const compressed = await compressVTT(vttContent);

      // Write to disk
      await fs.writeFile(filePath, compressed);

      const compressedSize = compressed.length;
      const savings = ((1 - compressedSize / originalSize) * 100).toFixed(1);

      // Invalidate cache (content changed)
      transcriptCache.invalidate(transcriptId);

      logger.info(`Saved compressed VTT: ${transcriptId}`);
      logger.info(`  Size: ${(originalSize / 1024 / 1024).toFixed(2)} MB → ${(compressedSize / 1024 / 1024).toFixed(2)} MB (${savings}% savings)`);

      return {
        success: true,
        filePath,
        originalSize,
        compressedSize,
        savings: `${savings}%`
      };
    } catch (error) {
      logger.error(`Failed to save VTT for ${transcriptId}:`, error);
      throw error;
    }
  }

  /**
   * Load and decompress VTT file from disk (with caching)
   * @param {string} transcriptId - Transcript ID
   * @returns {Promise<string>} Decompressed VTT content
   */
  async loadVTT(transcriptId) {
    if (!transcriptId) {
      throw new Error('Missing transcriptId');
    }

    // Check cache first
    const cached = transcriptCache.get(transcriptId);
    if (cached !== undefined) {
      return cached;
    }

    // Cache miss - load from disk
    try {
      const filePath = this.getTranscriptFilePath(transcriptId);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        logger.warn(`VTT file not found for ${transcriptId}, may be legacy format`);
        return null;
      }

      // Read compressed file
      const compressed = await fs.readFile(filePath);

      // Decompress
      const vttContent = await decompressVTT(compressed);

      // Store in cache for next time
      transcriptCache.set(transcriptId, vttContent);

      logger.debug(`Loaded VTT for ${transcriptId}: ${(compressed.length / 1024).toFixed(2)} KB compressed`);

      return vttContent;
    } catch (error) {
      logger.error(`Failed to load VTT for ${transcriptId}:`, error);
      throw error;
    }
  }

  /**
   * Load VTT and extract plain text
   * @param {string} transcriptId - Transcript ID
   * @returns {Promise<string>} Plain text content
   */
  async loadPlainText(transcriptId) {
    try {
      const vttContent = await this.loadVTT(transcriptId);
      if (!vttContent) return null;

      return vttToPlainText(vttContent);
    } catch (error) {
      logger.error(`Failed to load plain text for ${transcriptId}:`, error);
      throw error;
    }
  }

  /**
   * Delete VTT file from disk
   * @param {string} transcriptId - Transcript ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteVTT(transcriptId) {
    if (!transcriptId) {
      throw new Error('Missing transcriptId');
    }

    try {
      const filePath = this.getTranscriptFilePath(transcriptId);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        logger.debug(`VTT file not found for ${transcriptId}, nothing to delete`);
        // Still invalidate cache in case it's there
        transcriptCache.invalidate(transcriptId);
        return true;
      }

      // Delete file
      await fs.unlink(filePath);

      // Invalidate cache
      transcriptCache.invalidate(transcriptId);

      logger.info(`Deleted VTT file for ${transcriptId}`);

      return true;
    } catch (error) {
      logger.error(`Failed to delete VTT for ${transcriptId}:`, error);
      throw error;
    }
  }

  /**
   * Check if VTT file exists
   * @param {string} transcriptId - Transcript ID
   * @returns {Promise<boolean>} True if file exists
   */
  async hasVTT(transcriptId) {
    try {
      const filePath = this.getTranscriptFilePath(transcriptId);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get storage statistics (including cache stats)
   * @returns {Promise<Object>} Storage stats
   */
  async getStats() {
    try {
      await this.ensureDirectory();
      const files = await fs.readdir(this.transcriptsDir);
      const vttFiles = files.filter(f => f.endsWith('.vtt.br'));

      let totalSize = 0;
      for (const file of vttFiles) {
        const filePath = path.join(this.transcriptsDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      }

      // Include cache statistics
      const cacheStats = transcriptCache.getStats();

      return {
        transcriptCount: vttFiles.length,
        totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        directory: this.transcriptsDir,
        cache: cacheStats
      };
    } catch (error) {
      logger.error('Failed to get storage stats:', error);
      return {
        transcriptCount: 0,
        totalSize: 0,
        totalSizeMB: '0.00',
        directory: this.transcriptsDir,
        error: error.message
      };
    }
  }

  /**
   * Get cache instance (for manual cache management if needed)
   * @returns {TranscriptCache} Cache instance
   */
  getCache() {
    return transcriptCache;
  }

  /**
   * Clear all cached transcripts
   */
  clearCache() {
    transcriptCache.clear();
    logger.info('Transcript cache cleared');
  }
}

// Export singleton instance
module.exports = new TranscriptStorageManager();
