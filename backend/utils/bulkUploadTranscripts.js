/**
 * Bulk Upload Utility
 * Upload all existing transcripts to OpenAI Vector Store
 * Run this once after implementing vector store to index existing transcripts
 */

const TranscriptService = require('../services/TranscriptService');
const VectorStoreService = require('../services/VectorStoreService');
const { createLogger } = require('./logger');

const logger = createLogger('BulkUpload');

/**
 * Bulk upload all transcripts missing vector store entries
 * @param {string} apiKey - OpenAI API key
 * @param {Object} options - Upload options
 * @returns {Object} Upload statistics
 */
async function bulkUploadTranscripts(apiKey, options = {}) {
  const {
    delayMs = 1000,           // Delay between uploads (rate limiting)
    skipExisting = true,      // Skip transcripts already uploaded
    maxConcurrent = 1         // Max concurrent uploads
  } = options;

  const transcriptService = new TranscriptService();
  const vectorStoreService = new VectorStoreService();

  const stats = {
    total: 0,
    uploaded: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  try {
    // Initialize vector store
    logger.info('Initializing vector store...');
    await vectorStoreService.initialize(apiKey);
    const vectorStoreId = vectorStoreService.getVectorStoreId();
    logger.success(`Vector store ready: ${vectorStoreId}`);

    // Get all transcripts
    const transcripts = transcriptService.getAll();
    stats.total = transcripts.length;

    logger.info(`Found ${transcripts.length} transcript(s) to process`);

    if (transcripts.length === 0) {
      logger.info('No transcripts to upload');
      return stats;
    }

    // Filter transcripts that need uploading
    const transcriptsToUpload = skipExisting
      ? transcripts.filter(t => !t.vectorStoreFileId || t.vectorStoreStatus === 'failed')
      : transcripts;

    logger.info(`Uploading ${transcriptsToUpload.length} transcript(s) (${stats.total - transcriptsToUpload.length} already uploaded)`);
    stats.skipped = stats.total - transcriptsToUpload.length;

    // Upload transcripts sequentially with rate limiting
    for (let i = 0; i < transcriptsToUpload.length; i++) {
      const transcript = transcriptsToUpload[i];
      const progress = `[${i + 1}/${transcriptsToUpload.length}]`;

      try {
        logger.info(`${progress} Uploading: ${transcript.fileName}`);

        // Upload to vector store
        const result = await vectorStoreService.uploadTranscript(transcript);

        // Update transcript with vector store file ID
        transcriptService.update(transcript.id, {
          vectorStoreFileId: result.fileId,
          vectorStoreStatus: result.status
        });

        stats.uploaded++;
        logger.success(`${progress} ✓ Uploaded: ${transcript.fileName} (${result.fileId})`);

        // Rate limiting delay (except for last item)
        if (i < transcriptsToUpload.length - 1 && delayMs > 0) {
          logger.debug(`Waiting ${delayMs}ms before next upload...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

      } catch (error) {
        stats.failed++;
        stats.errors.push({
          transcriptId: transcript.id,
          fileName: transcript.fileName,
          error: error.message
        });

        logger.error(`${progress} ✗ Failed: ${transcript.fileName}`, error);

        // Mark as failed
        transcriptService.update(transcript.id, {
          vectorStoreStatus: 'failed'
        });
      }
    }

    // Summary
    logger.info('');
    logger.info('=== BULK UPLOAD COMPLETE ===');
    logger.info(`Total transcripts: ${stats.total}`);
    logger.success(`Uploaded: ${stats.uploaded}`);
    logger.info(`Skipped (already uploaded): ${stats.skipped}`);
    if (stats.failed > 0) {
      logger.error(`Failed: ${stats.failed}`);
      stats.errors.forEach(err => {
        logger.error(`  - ${err.fileName}: ${err.error}`);
      });
    }
    logger.info('===========================');

    return stats;

  } catch (error) {
    logger.error('Bulk upload failed:', error);
    throw error;
  }
}

/**
 * Re-upload failed transcripts
 * @param {string} apiKey - OpenAI API key
 * @returns {Object} Upload statistics
 */
async function retryFailedTranscripts(apiKey) {
  const transcriptService = new TranscriptService();
  const transcripts = transcriptService.getAll();
  const failedTranscripts = transcripts.filter(t => t.vectorStoreStatus === 'failed');

  logger.info(`Found ${failedTranscripts.length} failed transcript(s) to retry`);

  if (failedTranscripts.length === 0) {
    return { total: 0, uploaded: 0, failed: 0 };
  }

  // Retry with same bulk upload logic
  return await bulkUploadTranscripts(apiKey, {
    skipExisting: false,  // Don't skip, retry all
    delayMs: 1500        // Slightly longer delay for retries
  });
}

/**
 * Get upload status summary
 * @returns {Object} Status summary
 */
function getUploadStatus() {
  const transcriptService = new TranscriptService();
  const transcripts = transcriptService.getAll();

  const status = {
    total: transcripts.length,
    uploaded: transcripts.filter(t => t.vectorStoreFileId && t.vectorStoreStatus === 'completed').length,
    pending: transcripts.filter(t => !t.vectorStoreFileId || t.vectorStoreStatus === 'pending').length,
    failed: transcripts.filter(t => t.vectorStoreStatus === 'failed').length
  };

  status.percentComplete = status.total > 0
    ? Math.round((status.uploaded / status.total) * 100)
    : 0;

  return status;
}

module.exports = {
  bulkUploadTranscripts,
  retryFailedTranscripts,
  getUploadStatus
};
