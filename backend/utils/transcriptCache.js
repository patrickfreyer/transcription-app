/**
 * Transcript Cache
 *
 * LRU (Least Recently Used) cache for decompressed transcript content
 * Keeps frequently accessed transcripts in memory to avoid disk I/O and decompression
 */

const { LRUCache } = require('lru-cache');
const { createLogger } = require('./logger');

const logger = createLogger('TranscriptCache');

class TranscriptCache {
  constructor() {
    // Configure LRU cache with size and TTL limits
    this.cache = new LRUCache({
      max: 50, // Maximum 50 transcripts
      maxSize: 100 * 1024 * 1024, // 100MB total cache size

      // Calculate size of each cached item (VTT content)
      sizeCalculation: (value) => {
        if (typeof value === 'string') {
          return Buffer.byteLength(value, 'utf8');
        }
        return 0;
      },

      ttl: 30 * 60 * 1000, // 30 minutes Time-To-Live
      updateAgeOnGet: true, // Reset TTL on cache hit (keeps frequently used items)
      updateAgeOnHas: false,

      // Log evictions for monitoring
      dispose: (value, key, reason) => {
        const sizeMB = (Buffer.byteLength(value, 'utf8') / 1024 / 1024).toFixed(2);
        logger.debug(`Cache eviction: ${key} (${sizeMB} MB) - Reason: ${reason}`);
      }
    });

    // Statistics tracking
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };

    logger.info('TranscriptCache initialized (max: 50 transcripts, 100MB, 30min TTL)');
  }

  /**
   * Get transcript content from cache
   * @param {string} transcriptId - Transcript ID
   * @returns {string|undefined} VTT content or undefined if not cached
   */
  get(transcriptId) {
    const value = this.cache.get(transcriptId);

    if (value !== undefined) {
      this.stats.hits++;
      logger.debug(`Cache HIT: ${transcriptId} (hit rate: ${this.getHitRate().toFixed(1)}%)`);
    } else {
      this.stats.misses++;
      logger.debug(`Cache MISS: ${transcriptId} (hit rate: ${this.getHitRate().toFixed(1)}%)`);
    }

    return value;
  }

  /**
   * Store transcript content in cache
   * @param {string} transcriptId - Transcript ID
   * @param {string} vttContent - VTT content to cache
   */
  set(transcriptId, vttContent) {
    if (!transcriptId || !vttContent) {
      logger.warn('Attempted to cache invalid data');
      return;
    }

    const sizeMB = (Buffer.byteLength(vttContent, 'utf8') / 1024 / 1024).toFixed(2);
    this.cache.set(transcriptId, vttContent);
    logger.debug(`Cached: ${transcriptId} (${sizeMB} MB)`);
  }

  /**
   * Check if transcript is cached (without updating TTL)
   * @param {string} transcriptId - Transcript ID
   * @returns {boolean}
   */
  has(transcriptId) {
    return this.cache.has(transcriptId);
  }

  /**
   * Remove transcript from cache (e.g., when deleted or updated)
   * @param {string} transcriptId - Transcript ID
   */
  invalidate(transcriptId) {
    const deleted = this.cache.delete(transcriptId);
    if (deleted) {
      logger.debug(`Invalidated cache: ${transcriptId}`);
    }
    return deleted;
  }

  /**
   * Clear all cached transcripts
   */
  clear() {
    const previousSize = this.cache.size;
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
    logger.info(`Cache cleared (removed ${previousSize} transcripts)`);
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const calculatedSize = this.cache.calculatedSize || 0;
    const sizeMB = (calculatedSize / 1024 / 1024).toFixed(2);

    return {
      size: this.cache.size, // Number of cached transcripts
      sizeMB: parseFloat(sizeMB), // Total memory usage in MB
      maxSize: 50,
      maxSizeMB: 100,
      hits: this.stats.hits,
      misses: this.stats.misses,
      totalRequests: this.stats.hits + this.stats.misses,
      hitRate: this.getHitRate(),
      ttlMs: 30 * 60 * 1000
    };
  }

  /**
   * Calculate cache hit rate percentage
   * @returns {number} Hit rate (0-100)
   */
  getHitRate() {
    const total = this.stats.hits + this.stats.misses;
    if (total === 0) return 0;
    return (this.stats.hits / total) * 100;
  }

  /**
   * Log current cache status (for debugging)
   */
  logStatus() {
    const stats = this.getStats();
    logger.info('Cache Status:', {
      transcripts: `${stats.size}/${stats.maxSize}`,
      memory: `${stats.sizeMB}MB/${stats.maxSizeMB}MB`,
      hitRate: `${stats.hitRate.toFixed(1)}%`,
      requests: `${stats.totalRequests} (${stats.hits} hits, ${stats.misses} misses)`
    });
  }
}

// Singleton instance
const transcriptCache = new TranscriptCache();

module.exports = transcriptCache;
