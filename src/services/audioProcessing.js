const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Audio Processing Service
 *
 * This module handles all FFmpeg-related audio processing operations including:
 * - Getting audio duration
 * - Converting audio formats
 * - Splitting audio into chunks
 * - Cleaning up temporary files
 */

let ffmpegAvailable = false;
let ffmpegPath = null;
let ffprobePath = null;

/**
 * Initialize FFmpeg with the correct paths
 * @param {Object} config - Configuration object with ffmpegPath and ffprobePath
 * @returns {boolean} - Whether FFmpeg was successfully initialized
 */
function initializeFFmpeg(config) {
  try {
    if (!config || !config.ffmpegPath || !config.ffprobePath) {
      console.error('[AudioProcessing] Invalid FFmpeg configuration');
      return false;
    }

    ffmpegPath = config.ffmpegPath;
    ffprobePath = config.ffprobePath;

    // Set ffmpeg and ffprobe paths
    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobePath);

    ffmpegAvailable = true;
    console.log('[AudioProcessing] FFmpeg initialized successfully');
    return true;
  } catch (error) {
    console.error('[AudioProcessing] Failed to initialize FFmpeg:', error);
    return false;
  }
}

/**
 * Check if FFmpeg is available
 * @returns {boolean}
 */
function isFFmpegAvailable() {
  return ffmpegAvailable;
}

/**
 * Get the duration of an audio file
 * @param {string} filePath - Path to the audio file
 * @returns {Promise<number>} - Duration in seconds
 */
function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    if (!ffmpegAvailable) {
      reject(new Error('FFmpeg is not available'));
      return;
    }

    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata.format.duration);
      }
    });
  });
}

/**
 * Convert audio file to MP3 format
 * @param {string} filePath - Path to the source audio file
 * @returns {Promise<string>} - Path to the converted MP3 file
 */
async function convertToMP3(filePath) {
  return new Promise((resolve, reject) => {
    if (!ffmpegAvailable) {
      reject(new Error('FFmpeg is not available'));
      return;
    }

    const tempDir = os.tmpdir();
    const outputPath = path.join(tempDir, `converted-${Date.now()}.mp3`);

    ffmpeg(filePath)
      .output(outputPath)
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .audioFrequency(44100)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(new Error(`Audio conversion failed: ${err.message}`)))
      .run();
  });
}

/**
 * Split audio file into chunks
 * @param {string} filePath - Path to the audio file
 * @param {number} chunkSizeInMB - Target size for each chunk in MB (default: 20)
 * @returns {Promise<string[]>} - Array of paths to chunk files
 */
async function splitAudioIntoChunks(filePath, chunkSizeInMB = 20) {
  try {
    if (!ffmpegAvailable) {
      throw new Error('FFmpeg is not available');
    }

    console.log('[Chunking] Starting audio split process...');
    const stats = fs.statSync(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    console.log(`[Chunking] File size: ${fileSizeInMB.toFixed(2)}MB`);

    // If file is small enough, return the original file
    if (fileSizeInMB <= 25) {
      console.log('[Chunking] File is small enough, no splitting needed');
      return [filePath];
    }

    console.log('[Chunking] Getting audio duration...');
    const duration = await getAudioDuration(filePath);
    console.log(`[Chunking] Audio duration: ${duration.toFixed(2)}s`);

    const tempDir = os.tmpdir();
    const chunksDir = path.join(tempDir, `chunks-${Date.now()}`);
    fs.mkdirSync(chunksDir, { recursive: true });
    console.log(`[Chunking] Created chunks directory: ${chunksDir}`);

    // Calculate chunk duration based on file size and desired chunk size
    const chunkDuration = Math.floor((duration * chunkSizeInMB) / fileSizeInMB);
    const numChunks = Math.ceil(duration / chunkDuration);
    console.log(`[Chunking] Will create ${numChunks} chunks of ~${chunkDuration}s each`);

    const chunkPaths = [];

    // Split audio into chunks
    for (let i = 0; i < numChunks; i++) {
      const startTime = i * chunkDuration;
      const chunkPath = path.join(chunksDir, `chunk-${i}.mp3`);
      console.log(`[Chunking] Creating chunk ${i + 1}/${numChunks} starting at ${startTime}s...`);

      await new Promise((resolve, reject) => {
        ffmpeg(filePath)
          .setStartTime(startTime)
          .setDuration(chunkDuration)
          .output(chunkPath)
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .on('end', () => {
            const chunkStats = fs.statSync(chunkPath);
            console.log(`[Chunking] Chunk ${i + 1} created: ${(chunkStats.size / (1024 * 1024)).toFixed(2)}MB`);
            resolve();
          })
          .on('error', (err) => {
            console.error(`[Chunking] Error creating chunk ${i + 1}:`, err);
            reject(err);
          })
          .run();
      });

      chunkPaths.push(chunkPath);
    }

    console.log(`[Chunking] Successfully created ${chunkPaths.length} chunks`);
    return chunkPaths;
  } catch (error) {
    console.error('[Chunking] Failed to split audio:', error);
    throw new Error(`Failed to split audio: ${error.message}`);
  }
}

/**
 * Clean up chunk files and their directory
 * @param {string[]} chunkPaths - Array of paths to chunk files
 */
function cleanupChunks(chunkPaths) {
  try {
    if (chunkPaths.length > 0) {
      const chunksDir = path.dirname(chunkPaths[0]);
      // Delete all chunk files
      chunkPaths.forEach(chunkPath => {
        if (fs.existsSync(chunkPath)) {
          fs.unlinkSync(chunkPath);
        }
      });
      // Delete chunks directory
      if (fs.existsSync(chunksDir)) {
        fs.rmdirSync(chunksDir);
      }
    }
  } catch (error) {
    console.error('Error cleaning up chunks:', error);
  }
}

module.exports = {
  initializeFFmpeg,
  isFFmpegAvailable,
  getAudioDuration,
  convertToMP3,
  splitAudioIntoChunks,
  cleanupChunks,
};
