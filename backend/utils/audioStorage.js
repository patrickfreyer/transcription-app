/**
 * Audio File Storage Manager
 *
 * Manages audio file storage on disk alongside transcripts.
 * Supports optional compression via FFmpeg (WebM/Opus format).
 */

const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');
const { createLogger } = require('./logger');

const logger = createLogger('AudioStorage');

class AudioStorageManager {
  constructor() {
    // Store audio files in userData/transcripts/audio/
    this.audioDir = path.join(app.getPath('userData'), 'transcripts', 'audio');
    this.ensureDirectory();
  }

  /**
   * Ensure audio directory exists
   */
  async ensureDirectory() {
    try {
      await fs.mkdir(this.audioDir, { recursive: true });
      logger.debug(`Audio directory: ${this.audioDir}`);
    } catch (error) {
      logger.error('Failed to create audio directory:', error);
      throw error;
    }
  }

  /**
   * Get file path for an audio file
   * @param {string} transcriptId - Transcript ID
   * @param {string} extension - File extension (e.g., 'webm', 'mp3')
   * @returns {string} File path
   */
  getAudioFilePath(transcriptId, extension) {
    return path.join(this.audioDir, `${transcriptId}.audio.${extension}`);
  }

  /**
   * Save audio file to storage (compressed or original)
   * @param {string} transcriptId - Transcript ID
   * @param {string} sourcePath - Source audio file path
   * @param {string} storageMode - 'compressed' | 'original'
   * @param {Object} ffmpeg - FFmpeg instance (required for compression)
   * @returns {Promise<Object>} Save result with path and size
   */
  async saveAudio(transcriptId, sourcePath, storageMode = 'compressed', ffmpeg = null) {
    if (!transcriptId || !sourcePath) {
      throw new Error('Missing transcriptId or sourcePath');
    }

    await this.ensureDirectory();

    // Check if source file exists
    try {
      await fs.access(sourcePath);
    } catch {
      throw new Error(`Source audio file not found: ${sourcePath}`);
    }

    if (storageMode === 'compressed' && ffmpeg) {
      return await this.saveCompressed(transcriptId, sourcePath, ffmpeg);
    } else {
      return await this.saveOriginal(transcriptId, sourcePath);
    }
  }

  /**
   * Save audio with compression (WebM/Opus @ 64kbps)
   * @param {string} transcriptId - Transcript ID
   * @param {string} sourcePath - Source audio file path
   * @param {Object} ffmpeg - FFmpeg instance
   * @returns {Promise<Object>} Save result
   */
  async saveCompressed(transcriptId, sourcePath, ffmpeg) {
    const outputPath = this.getAudioFilePath(transcriptId, 'webm');

    return new Promise((resolve, reject) => {
      const sourceStats = require('fs').statSync(sourcePath);
      const originalSize = sourceStats.size;

      ffmpeg(sourcePath)
        .audioCodec('libopus')
        .audioBitrate('64k')
        .audioChannels(1) // Mono for speech
        .format('webm')
        .on('start', (cmd) => {
          logger.debug(`Compressing audio: ${cmd}`);
        })
        .on('error', (err) => {
          logger.error(`Audio compression failed for ${transcriptId}:`, err);
          // Fall back to original if compression fails
          this.saveOriginal(transcriptId, sourcePath)
            .then(resolve)
            .catch(reject);
        })
        .on('end', async () => {
          try {
            const stats = await fs.stat(outputPath);
            const compressedSize = stats.size;
            const savings = ((1 - compressedSize / originalSize) * 100).toFixed(1);

            logger.info(`Saved compressed audio: ${transcriptId}`);
            logger.info(`  Size: ${(originalSize / 1024 / 1024).toFixed(2)} MB -> ${(compressedSize / 1024 / 1024).toFixed(2)} MB (${savings}% savings)`);

            resolve({
              success: true,
              relativePath: `audio/${transcriptId}.audio.webm`,
              absolutePath: outputPath,
              format: 'webm',
              originalSize,
              size: compressedSize,
              savings: `${savings}%`,
              storageMode: 'compressed'
            });
          } catch (error) {
            reject(error);
          }
        })
        .save(outputPath);
    });
  }

  /**
   * Save audio without compression (copy original)
   * @param {string} transcriptId - Transcript ID
   * @param {string} sourcePath - Source audio file path
   * @returns {Promise<Object>} Save result
   */
  async saveOriginal(transcriptId, sourcePath) {
    const ext = path.extname(sourcePath).slice(1).toLowerCase() || 'audio';
    const outputPath = this.getAudioFilePath(transcriptId, ext);

    try {
      // Copy file to audio storage
      await fs.copyFile(sourcePath, outputPath);

      const stats = await fs.stat(outputPath);

      logger.info(`Saved original audio: ${transcriptId} (${ext})`);
      logger.info(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      return {
        success: true,
        relativePath: `audio/${transcriptId}.audio.${ext}`,
        absolutePath: outputPath,
        format: ext,
        originalSize: stats.size,
        size: stats.size,
        savings: '0%',
        storageMode: 'original'
      };
    } catch (error) {
      logger.error(`Failed to save original audio for ${transcriptId}:`, error);
      throw error;
    }
  }

  /**
   * Get absolute path to audio file
   * @param {string} transcriptId - Transcript ID
   * @returns {Promise<string|null>} Absolute path or null if not found
   */
  async getAudioPath(transcriptId) {
    if (!transcriptId) return null;

    try {
      await this.ensureDirectory();
      const files = await fs.readdir(this.audioDir);
      const audioFile = files.find(f => f.startsWith(`${transcriptId}.audio.`));

      if (audioFile) {
        return path.join(this.audioDir, audioFile);
      }
      return null;
    } catch (error) {
      logger.error(`Failed to get audio path for ${transcriptId}:`, error);
      return null;
    }
  }

  /**
   * Check if audio file exists for transcript
   * @param {string} transcriptId - Transcript ID
   * @returns {Promise<boolean>} True if audio exists
   */
  async hasAudio(transcriptId) {
    const audioPath = await this.getAudioPath(transcriptId);
    return audioPath !== null;
  }

  /**
   * Delete audio file for transcript
   * @param {string} transcriptId - Transcript ID
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteAudio(transcriptId) {
    if (!transcriptId) {
      throw new Error('Missing transcriptId');
    }

    try {
      const audioPath = await this.getAudioPath(transcriptId);

      if (!audioPath) {
        logger.debug(`No audio file found for ${transcriptId}, nothing to delete`);
        return true;
      }

      await fs.unlink(audioPath);
      logger.info(`Deleted audio file for ${transcriptId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete audio for ${transcriptId}:`, error);
      throw error;
    }
  }

  /**
   * Get audio file info
   * @param {string} transcriptId - Transcript ID
   * @returns {Promise<Object|null>} Audio file info or null
   */
  async getAudioInfo(transcriptId) {
    try {
      const audioPath = await this.getAudioPath(transcriptId);
      if (!audioPath) return null;

      const stats = await fs.stat(audioPath);
      const ext = path.extname(audioPath).slice(1);

      return {
        path: audioPath,
        format: ext,
        size: stats.size,
        sizeMB: (stats.size / 1024 / 1024).toFixed(2)
      };
    } catch (error) {
      logger.error(`Failed to get audio info for ${transcriptId}:`, error);
      return null;
    }
  }

  /**
   * Get storage statistics for audio files
   * @returns {Promise<Object>} Storage stats
   */
  async getStats() {
    try {
      await this.ensureDirectory();
      const files = await fs.readdir(this.audioDir);
      const audioFiles = files.filter(f => f.includes('.audio.'));

      let totalSize = 0;
      for (const file of audioFiles) {
        const filePath = path.join(this.audioDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      }

      return {
        audioCount: audioFiles.length,
        totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        directory: this.audioDir
      };
    } catch (error) {
      logger.error('Failed to get audio storage stats:', error);
      return {
        audioCount: 0,
        totalSize: 0,
        totalSizeMB: '0.00',
        directory: this.audioDir,
        error: error.message
      };
    }
  }
}

// Export singleton instance
module.exports = new AudioStorageManager();
