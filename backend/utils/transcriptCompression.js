/**
 * Transcript Compression Utility
 *
 * Compresses VTT transcript files using Brotli for maximum compression
 * Expected savings: 70-90% for text data
 *
 * Research findings:
 * - Brotli: Best compression (1.7MB on 6.3MB text)
 * - VTT files compress very well due to repetitive structure
 * - electron-store not designed for large data (per docs)
 *
 * Solution: Store compressed VTT files separately on disk
 */

const zlib = require('zlib');
const { promisify } = require('util');
const { createLogger } = require('./logger');

const brotliCompress = promisify(zlib.brotliCompress);
const brotliDecompress = promisify(zlib.brotliDecompress);

const logger = createLogger('TranscriptCompression');

// Brotli quality level 11 (max) for best compression
const BROTLI_OPTIONS = {
  params: {
    [zlib.constants.BROTLI_PARAM_QUALITY]: 11, // Max compression (0-11)
    [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT, // Optimized for text
  }
};

/**
 * Compress VTT content using Brotli
 * @param {string} vttContent - VTT content to compress
 * @returns {Promise<Buffer>} Compressed data
 */
async function compressVTT(vttContent) {
  if (!vttContent || typeof vttContent !== 'string') {
    throw new Error('Invalid VTT content: must be a non-empty string');
  }

  const startTime = Date.now();
  const originalSize = Buffer.byteLength(vttContent, 'utf8');

  try {
    const compressed = await brotliCompress(Buffer.from(vttContent, 'utf8'), BROTLI_OPTIONS);
    const compressedSize = compressed.length;
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    const timeTaken = Date.now() - startTime;

    logger.info(`Compressed VTT: ${(originalSize / 1024 / 1024).toFixed(2)} MB → ${(compressedSize / 1024 / 1024).toFixed(2)} MB (${ratio}% savings) in ${timeTaken}ms`);

    return compressed;
  } catch (error) {
    logger.error('Failed to compress VTT:', error);
    throw new Error(`Compression failed: ${error.message}`);
  }
}

/**
 * Decompress VTT content from Brotli
 * @param {Buffer} compressedData - Compressed data
 * @returns {Promise<string>} Decompressed VTT content
 */
async function decompressVTT(compressedData) {
  if (!Buffer.isBuffer(compressedData)) {
    throw new Error('Invalid compressed data: must be a Buffer');
  }

  const startTime = Date.now();

  try {
    const decompressed = await brotliDecompress(compressedData);
    const vttContent = decompressed.toString('utf8');
    const timeTaken = Date.now() - startTime;

    logger.debug(`Decompressed VTT: ${(compressedData.length / 1024).toFixed(2)} KB → ${(Buffer.byteLength(vttContent) / 1024).toFixed(2)} KB in ${timeTaken}ms`);

    return vttContent;
  } catch (error) {
    logger.error('Failed to decompress VTT:', error);
    throw new Error(`Decompression failed: ${error.message}`);
  }
}

/**
 * Extract plain text from VTT format
 * @param {string} vttContent - VTT format string
 * @returns {string} Plain text without timestamps
 */
function vttToPlainText(vttContent) {
  if (!vttContent || typeof vttContent !== 'string') {
    return '';
  }

  const lines = vttContent.split('\n');
  const textLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (line === '') continue;

    // Skip WEBVTT header
    if (line.startsWith('WEBVTT')) continue;

    // Skip cue numbers (standalone digits)
    if (/^\d+$/.test(line)) continue;

    // Skip timestamp lines (contains -->)
    if (line.includes('-->')) continue;

    // Skip cue settings
    if (line.startsWith('NOTE') || line.startsWith('STYLE')) continue;

    // This is actual text content
    textLines.push(line);
  }

  return textLines.join(' ');
}

/**
 * Estimate compression ratio for VTT content
 * @param {string} vttContent - VTT content
 * @returns {Object} Size estimates
 */
function estimateCompression(vttContent) {
  const originalSize = Buffer.byteLength(vttContent, 'utf8');
  // Conservative estimate: 75% compression for VTT
  const estimatedCompressed = Math.round(originalSize * 0.25);

  return {
    originalSize,
    originalMB: (originalSize / 1024 / 1024).toFixed(2),
    estimatedCompressed,
    estimatedMB: (estimatedCompressed / 1024 / 1024).toFixed(2),
    estimatedSavings: '75%'
  };
}

module.exports = {
  compressVTT,
  decompressVTT,
  vttToPlainText,
  estimateCompression,
  BROTLI_OPTIONS
};
