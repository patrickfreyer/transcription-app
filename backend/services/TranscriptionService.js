/**
 * TranscriptionService
 * Handles audio transcription with optimizations:
 * - Parallel chunk processing
 * - Dynamic rate limiting
 * - Audio speed optimization
 * - Opus compression
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const OpenAI = require('openai');
const { createLogger } = require('../utils/logger');
const { validateFilePath } = require('../utils/pathValidator');

const logger = createLogger('TranscriptionService');

class TranscriptionService {
  constructor(ffmpeg, ffmpegAvailable) {
    this.ffmpeg = ffmpeg;
    this.ffmpegAvailable = ffmpegAvailable;

    // Rate limiting configuration
    this.MAX_REQUESTS_PER_MINUTE = 80; // Conservative limit (API allows 100)
    this.requestTimestamps = [];

    // Concurrency configuration
    this.MAX_CONCURRENT_CHUNKS = 5; // Process 5 chunks in parallel

    // Retry configuration
    this.MAX_RETRIES = 3;
    this.INITIAL_BACKOFF_MS = 1000; // Start with 1s backoff
  }

  /**
   * Get audio duration using ffprobe
   */
  async getAudioDuration(filePath) {
    // Validate file path for security
    filePath = validateFilePath(filePath);

    return new Promise((resolve, reject) => {
      this.ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata.format.duration);
        }
      });
    });
  }

  /**
   * Optimize audio by speeding it up
   * @param {string} filePath - Input file path
   * @param {number} speedMultiplier - Speed multiplier (1.0-3.0)
   * @returns {Promise<string>} - Path to optimized file
   */
  async optimizeAudioSpeed(filePath, speedMultiplier = 1.0) {
    // Validate file path for security
    filePath = validateFilePath(filePath);

    if (speedMultiplier <= 1.0 || speedMultiplier > 3.0) {
      return filePath; // No optimization needed
    }

    return new Promise((resolve, reject) => {
      const tempDir = os.tmpdir();
      const outputPath = path.join(tempDir, `optimized-${Date.now()}.mp3`);

      logger.info(`Optimizing audio speed: ${speedMultiplier}x`);

      this.ffmpeg(filePath)
        .audioFilters(`atempo=${speedMultiplier}`)
        .output(outputPath)
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .on('end', () => {
          logger.success(`Audio optimized to ${speedMultiplier}x speed`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          logger.error('Audio speed optimization failed:', err.message);
          reject(new Error(`Audio speed optimization failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Compress audio using Opus codec
   * @param {string} filePath - Input file path
   * @returns {Promise<string>} - Path to compressed file
   */
  async compressAudio(filePath) {
    // Validate file path for security
    filePath = validateFilePath(filePath);

    return new Promise((resolve, reject) => {
      const tempDir = os.tmpdir();
      const outputPath = path.join(tempDir, `compressed-${Date.now()}.ogg`);

      logger.info('Compressing audio with Opus codec...');

      this.ffmpeg(filePath)
        .audioChannels(1) // Mono
        .audioCodec('libopus')
        .audioBitrate('16k') // 16kbps for speech
        .outputOptions(['-application voip'])
        .output(outputPath)
        .on('end', () => {
          const originalSize = fs.statSync(filePath).size;
          const compressedSize = fs.statSync(outputPath).size;
          const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);
          logger.success(`Audio compressed: ${reduction}% size reduction`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          logger.error('Audio compression failed:', err.message);
          reject(new Error(`Audio compression failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Extract voice sample from audio file for speaker reference
   * @param {string} filePath - Input audio file path
   * @param {number} startTime - Start time in seconds
   * @param {number} duration - Duration of sample in seconds (2-10s recommended)
   * @returns {Promise<string>} - Path to extracted audio sample
   */
  async extractVoiceSample(filePath, startTime, duration) {
    // Validate file path for security
    filePath = validateFilePath(filePath);

    // Ensure duration is within recommended range (2-10 seconds)
    duration = Math.min(Math.max(duration, 2), 10);

    return new Promise((resolve, reject) => {
      const tempDir = os.tmpdir();
      const outputPath = path.join(tempDir, `voice-sample-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.mp3`);

      logger.debug(`Extracting voice sample: ${startTime}s for ${duration}s`);

      this.ffmpeg(filePath)
        .setStartTime(startTime)
        .setDuration(duration)
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .output(outputPath)
        .on('end', () => {
          logger.debug(`Voice sample extracted: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          logger.error('Voice sample extraction failed:', err.message);
          reject(new Error(`Voice sample extraction failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Convert audio to MP3 format
   */
  async convertToMP3(filePath) {
    // Validate file path for security
    filePath = validateFilePath(filePath);

    return new Promise((resolve, reject) => {
      const tempDir = os.tmpdir();
      const outputPath = path.join(tempDir, `converted-${Date.now()}.mp3`);

      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        return reject(new Error(`Input file is empty (0 bytes): ${filePath}`));
      }

      logger.info(`Converting ${path.extname(filePath)} to MP3...`);

      this.ffmpeg(filePath)
        .output(outputPath)
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .audioFrequency(44100)
        .on('end', () => {
          logger.success('Conversion complete');
          resolve(outputPath);
        })
        .on('error', (err, stdout, stderr) => {
          logger.error('FFmpeg conversion error:', err.message);
          reject(new Error(`Audio conversion failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Split audio into chunks
   */
  async splitAudioIntoChunks(filePath, chunkSizeInMB = 20) {
    // Validate file path for security
    filePath = validateFilePath(filePath);

    try {
      const stats = fs.statSync(filePath);
      const fileSizeInMB = stats.size / (1024 * 1024);

      if (fileSizeInMB <= 25) {
        return [filePath];
      }

      const duration = await this.getAudioDuration(filePath);
      const tempDir = os.tmpdir();
      const chunksDir = path.join(tempDir, `chunks-${Date.now()}`);
      fs.mkdirSync(chunksDir, { recursive: true });

      const MAX_CHUNK_DURATION = 1200; // 20 minutes
      const chunkDurationBySize = Math.floor((duration * chunkSizeInMB) / fileSizeInMB);
      const chunkDuration = Math.min(chunkDurationBySize, MAX_CHUNK_DURATION);
      const numChunks = Math.ceil(duration / chunkDuration);

      logger.info(`Splitting ${Math.floor(duration / 60)}min audio into ${numChunks} chunks`);

      const chunkPaths = [];

      for (let i = 0; i < numChunks; i++) {
        const startTime = i * chunkDuration;
        const chunkPath = path.join(chunksDir, `chunk-${i}.mp3`);

        await new Promise((resolve, reject) => {
          this.ffmpeg(filePath)
            .setStartTime(startTime)
            .setDuration(chunkDuration)
            .output(chunkPath)
            .audioCodec('libmp3lame')
            .audioBitrate('128k')
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run();
        });

        chunkPaths.push(chunkPath);
      }

      return chunkPaths;
    } catch (error) {
      throw new Error(`Failed to split audio: ${error.message}`);
    }
  }

  /**
   * Check if we can make a request without hitting rate limits
   */
  canMakeRequest() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove timestamps older than 1 minute
    this.requestTimestamps = this.requestTimestamps.filter(t => t > oneMinuteAgo);

    // Check if we're under the limit
    return this.requestTimestamps.length < this.MAX_REQUESTS_PER_MINUTE;
  }

  /**
   * Wait until we can make a request (dynamic rate limiting)
   */
  async waitForRateLimit() {
    const MAX_WAIT_ITERATIONS = 10; // Safety limit to prevent infinite loops
    let iterations = 0;

    while (!this.canMakeRequest()) {
      iterations++;

      // Safety check: prevent infinite loops
      if (iterations > MAX_WAIT_ITERATIONS) {
        logger.error(`Rate limit wait exceeded ${MAX_WAIT_ITERATIONS} iterations, resetting timestamps`);
        this.requestTimestamps = [];
        break;
      }

      const oldestRequest = this.requestTimestamps[0];
      const waitTime = oldestRequest + 60000 - Date.now();

      if (waitTime > 0) {
        logger.info(`Rate limit reached, waiting ${Math.ceil(waitTime / 1000)}s... (iteration ${iterations}/${MAX_WAIT_ITERATIONS})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        // If waitTime is negative, remove the stale timestamp and continue
        logger.warn(`Stale timestamp detected, removing: ${oldestRequest}`);
        this.requestTimestamps.shift();
      }
    }

    // Record this request
    this.requestTimestamps.push(Date.now());
  }

  /**
   * Transcribe a single chunk with retry logic
   */
  async transcribeChunkWithRetry(openai, chunkPath, chunkIndex, totalChunks, options, onProgress) {
    const { model, prompt, speakers } = options;
    let lastError = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        // Dynamic rate limiting
        await this.waitForRateLimit();

        // Send progress update
        if (onProgress) {
          onProgress({
            status: 'transcribing',
            message: attempt === 1
              ? `Transcribing chunk ${chunkIndex + 1} of ${totalChunks}...`
              : `Retrying chunk ${chunkIndex + 1} (attempt ${attempt}/${this.MAX_RETRIES})...`,
            current: chunkIndex + 1,
            total: totalChunks,
            attempt: attempt,
          });
        }

        const transcriptionParams = {
          file: fs.createReadStream(chunkPath),
          model: model,
        };

        // Configure parameters based on model
        if (model === 'whisper-1') {
          transcriptionParams.response_format = 'vtt';
          if (prompt) {
            transcriptionParams.prompt = prompt;
          }
        } else if (model === 'gpt-4o-transcribe') {
          transcriptionParams.response_format = 'json';
          if (prompt) {
            transcriptionParams.prompt = prompt;
          }
        } else if (model === 'gpt-4o-transcribe-diarize') {
          transcriptionParams.response_format = 'diarized_json';
          transcriptionParams.chunking_strategy = 'auto';

          // Add speaker references for first chunk only
          if (speakers && speakers.length > 0 && chunkIndex === 0) {
            const speakerNames = [];
            const speakerReferences = [];

            for (const speaker of speakers) {
              speakerNames.push(speaker.name);
              const dataURL = this.fileToDataURL(speaker.path);
              speakerReferences.push(dataURL);
            }

            transcriptionParams.known_speaker_names = speakerNames;
            transcriptionParams.known_speaker_references = speakerReferences;
          }
        }

        const transcription = await openai.audio.transcriptions.create(transcriptionParams);

        // Validate response
        let hasContent = false;
        if (model === 'whisper-1') {
          hasContent = transcription && transcription.trim().length > 0;
        } else if (model === 'gpt-4o-transcribe') {
          hasContent = transcription && transcription.text && transcription.text.trim().length > 0;
        } else if (model === 'gpt-4o-transcribe-diarize') {
          hasContent = transcription && transcription.segments && transcription.segments.length > 0;
        }

        if (!hasContent) {
          throw new Error('Received empty transcription from API');
        }

        logger.success(`Chunk ${chunkIndex + 1} transcribed${attempt > 1 ? ` (after ${attempt} attempts)` : ''}`);
        return { success: true, transcription, chunkIndex };

      } catch (error) {
        lastError = error;
        logger.error(`Chunk ${chunkIndex + 1} attempt ${attempt} failed:`, error.message);

        if (attempt < this.MAX_RETRIES) {
          const backoffDelay = this.INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
          logger.info(`Waiting ${backoffDelay / 1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
    }

    // All retries failed
    return { success: false, error: lastError.message, chunkIndex };
  }

  /**
   * Transcribe chunks sequentially for diarization (maintains speaker identity)
   */
  async transcribeChunksSequential(openai, chunkPaths, chunkDurations, options, onProgress) {
    const { model, prompt, speakers } = options;
    const results = new Array(chunkPaths.length);
    const failedChunks = [];
    const voiceSampleFiles = []; // Track files for cleanup

    // Build speaker reference map (speaker name → voice sample path)
    let speakerReferences = new Map();

    // Initialize with user-provided speaker references (if any)
    if (speakers && speakers.length > 0) {
      for (const speaker of speakers) {
        speakerReferences.set(speaker.name, speaker.path);
      }
    }

    // Process chunks one at a time
    for (let chunkIndex = 0; chunkIndex < chunkPaths.length; chunkIndex++) {
      const chunkPath = chunkPaths[chunkIndex];

      // Update options with current speaker references
      const chunkOptions = {
        ...options,
        speakers: Array.from(speakerReferences.entries()).map(([name, path]) => ({ name, path }))
      };

      // Transcribe chunk
      const result = await this.transcribeChunkWithRetry(
        openai,
        chunkPath,
        chunkIndex,
        chunkPaths.length,
        chunkOptions,
        onProgress
      );

      // Store result
      if (result.success) {
        results[chunkIndex] = result;

        // Extract voice samples from this chunk for next chunk (if not last chunk)
        if (chunkIndex < chunkPaths.length - 1 && result.transcription.segments) {
          try {
            const newSamples = await this.extractSpeakerSamples(
              chunkPath,
              result.transcription.segments,
              speakerReferences
            );

            // Add new voice samples to cleanup list
            voiceSampleFiles.push(...newSamples.map(s => s.path));

            // Update speaker references for next chunk
            for (const sample of newSamples) {
              speakerReferences.set(sample.name, sample.path);
            }

            logger.info(`Extracted ${newSamples.length} speaker samples from chunk ${chunkIndex + 1}`);
          } catch (error) {
            logger.warn(`Failed to extract speaker samples from chunk ${chunkIndex + 1}:`, error.message);
            // Continue without voice samples
          }
        }
      } else {
        failedChunks.push({
          index: chunkIndex + 1,
          error: result.error,
          duration: chunkDurations[chunkIndex] || 0
        });
        // Store empty transcription for failed chunks
        results[chunkIndex] = {
          success: false,
          transcription: { segments: [] }
        };
      }

      logger.info(`Completed chunk ${chunkIndex + 1} of ${chunkPaths.length} (sequential diarization)`);
    }

    // Store voice sample files for cleanup
    results.voiceSampleFiles = voiceSampleFiles;

    return { results, failedChunks };
  }

  /**
   * Extract voice samples from transcription segments
   * Returns samples for speakers not already in the reference map
   */
  async extractSpeakerSamples(chunkPath, segments, existingSpeakers) {
    const samples = [];
    const speakerSegments = new Map(); // speaker → segments

    // Group segments by speaker
    for (const segment of segments) {
      if (!segment.speaker) continue;

      if (!speakerSegments.has(segment.speaker)) {
        speakerSegments.set(segment.speaker, []);
      }
      speakerSegments.get(segment.speaker).push(segment);
    }

    // Extract sample for each speaker (if not already have a reference)
    for (const [speaker, segs] of speakerSegments.entries()) {
      // Skip if we already have a reference for this speaker
      if (existingSpeakers.has(speaker)) {
        continue;
      }

      // Find longest contiguous segment (best quality sample)
      let longestSegment = segs[0];
      for (const seg of segs) {
        const duration = seg.end - seg.start;
        const longestDuration = longestSegment.end - longestSegment.start;
        if (duration > longestDuration) {
          longestSegment = seg;
        }
      }

      // Extract voice sample (aim for 5 seconds, max 10)
      const segDuration = longestSegment.end - longestSegment.start;
      const sampleDuration = Math.min(segDuration, 5);

      try {
        const samplePath = await this.extractVoiceSample(
          chunkPath,
          longestSegment.start,
          sampleDuration
        );

        samples.push({
          name: speaker,
          path: samplePath
        });
      } catch (error) {
        logger.warn(`Failed to extract sample for speaker ${speaker}:`, error.message);
      }
    }

    return samples;
  }

  /**
   * Transcribe chunks in parallel with controlled concurrency
   * For diarization models, processes sequentially to maintain speaker identity
   */
  async transcribeChunksParallel(openai, chunkPaths, chunkDurations, options, onProgress) {
    const { model, prompt } = options;
    const results = new Array(chunkPaths.length);
    const failedChunks = [];

    // For diarization, use sequential processing with speaker references
    if (model === 'gpt-4o-transcribe-diarize') {
      logger.info('Using sequential processing for diarization to maintain speaker identity');
      return this.transcribeChunksSequential(openai, chunkPaths, chunkDurations, options, onProgress);
    }

    // Process chunks in batches to control concurrency (for non-diarization models)
    for (let i = 0; i < chunkPaths.length; i += this.MAX_CONCURRENT_CHUNKS) {
      const batch = chunkPaths.slice(i, i + this.MAX_CONCURRENT_CHUNKS);
      const batchPromises = batch.map((chunkPath, batchIndex) => {
        const chunkIndex = i + batchIndex;

        // Build prompt with context from previous chunk
        let chunkPrompt = null;
        if (chunkIndex === 0 && prompt) {
          chunkPrompt = prompt;
        } else if (chunkIndex > 0 && results[chunkIndex - 1]?.transcription) {
          const prevTranscript = results[chunkIndex - 1].transcription;
          let plainText = this.extractPlainText(prevTranscript, model);
          const contextText = plainText.slice(-200);
          chunkPrompt = prompt ? `${prompt}\n\nPrevious context: ${contextText}` : contextText;
        }

        return this.transcribeChunkWithRetry(
          openai,
          chunkPath,
          chunkIndex,
          chunkPaths.length,
          { ...options, prompt: chunkPrompt },
          onProgress
        );
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);

      // Store results
      batchResults.forEach(result => {
        if (result.success) {
          results[result.chunkIndex] = result;
        } else {
          failedChunks.push({
            index: result.chunkIndex + 1,
            error: result.error,
            duration: chunkDurations[result.chunkIndex] || 0
          });
          // Store empty transcription for failed chunks
          results[result.chunkIndex] = {
            success: false,
            transcription: model === 'whisper-1' ? '' : { text: '' }
          };
        }
      });

      logger.info(`Completed batch ${Math.floor(i / this.MAX_CONCURRENT_CHUNKS) + 1} of ${Math.ceil(chunkPaths.length / this.MAX_CONCURRENT_CHUNKS)}`);
    }

    return { results, failedChunks };
  }

  /**
   * Extract plain text from transcription based on model format
   */
  extractPlainText(transcription, model) {
    if (model === 'whisper-1') {
      return transcription
        .split('\n')
        .filter(line => !line.includes('-->') && !line.startsWith('WEBVTT') && line.trim() !== '' && !/^\d+$/.test(line.trim()))
        .join(' ')
        .trim();
    } else if (model === 'gpt-4o-transcribe') {
      return transcription.text || '';
    } else if (model === 'gpt-4o-transcribe-diarize') {
      return transcription.segments
        ? transcription.segments.map(seg => seg.text || '').join(' ')
        : '';
    }
    return '';
  }

  /**
   * Convert file to base64 data URL
   */
  fileToDataURL(filePath) {
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    const ext = path.extname(filePath).toLowerCase();

    const mimeTypes = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',
      '.webm': 'audio/webm',
      '.mp4': 'audio/mp4',
    };

    const mimeType = mimeTypes[ext] || 'audio/mpeg';
    return `data:${mimeType};base64,${base64}`;
  }

  /**
   * Parse VTT timestamp
   */
  parseVTTTimestamp(timestamp) {
    const parts = timestamp.split(':');
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const secondsParts = parts[2].split('.');
    const seconds = parseInt(secondsParts[0]);
    const milliseconds = parseInt(secondsParts[1]);
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  }

  /**
   * Format VTT timestamp
   */
  formatVTTTimestamp(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.floor((totalSeconds % 1) * 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  }

  /**
   * Combine VTT transcripts
   */
  combineVTTTranscripts(vttTranscripts, chunkDurations) {
    let combinedVTT = 'WEBVTT\n\n';
    let cueNumber = 1;
    let timeOffset = 0;

    for (let i = 0; i < vttTranscripts.length; i++) {
      const vtt = vttTranscripts[i];
      if (!vtt) continue;

      const lines = vtt.split('\n');
      let skipHeader = true;
      let currentCue = [];

      for (let j = 0; j < lines.length; j++) {
        const line = lines[j];

        if (skipHeader) {
          if (line.trim() === '' || line.startsWith('WEBVTT')) {
            continue;
          }
          skipHeader = false;
        }

        if (line.includes('-->')) {
          const [start, end] = line.split('-->').map(s => s.trim());
          const startSeconds = this.parseVTTTimestamp(start) + timeOffset;
          const endSeconds = this.parseVTTTimestamp(end) + timeOffset;

          currentCue.push(`${cueNumber}`);
          currentCue.push(`${this.formatVTTTimestamp(startSeconds)} --> ${this.formatVTTTimestamp(endSeconds)}`);
          cueNumber++;
        } else if (line.trim() === '') {
          if (currentCue.length > 0) {
            combinedVTT += currentCue.join('\n') + '\n\n';
            currentCue = [];
          }
        } else if (!line.match(/^\d+$/)) {
          currentCue.push(line);
        }
      }

      if (currentCue.length > 0) {
        combinedVTT += currentCue.join('\n') + '\n\n';
      }

      if (i < chunkDurations.length) {
        timeOffset += chunkDurations[i];
      }
    }

    return combinedVTT;
  }

  /**
   * Convert JSON transcript to VTT format
   */
  jsonToVTT(jsonTranscript) {
    if (!jsonTranscript || !jsonTranscript.text) {
      return 'WEBVTT\n\n' + (jsonTranscript?.text || '');
    }
    return 'WEBVTT\n\n' + jsonTranscript.text;
  }

  /**
   * Convert diarized JSON to VTT format
   */
  diarizedJsonToVTT(diarizedTranscript) {
    if (!diarizedTranscript || !diarizedTranscript.segments) {
      return 'WEBVTT\n\n';
    }

    let vtt = 'WEBVTT\n\n';
    let cueNumber = 1;

    for (const segment of diarizedTranscript.segments) {
      const start = this.formatVTTTimestamp(segment.start);
      const end = this.formatVTTTimestamp(segment.end);
      const speaker = segment.speaker || 'Unknown';
      const text = segment.text || '';

      vtt += `${cueNumber}\n`;
      vtt += `${start} --> ${end}\n`;
      vtt += `[${speaker}] ${text}\n\n`;
      cueNumber++;
    }

    return vtt;
  }

  /**
   * Convert VTT to plain text
   */
  vttToPlainText(vtt) {
    if (!vtt) return '';

    const lines = vtt
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed !== '' &&
               !trimmed.startsWith('WEBVTT') &&
               !trimmed.includes('-->') &&
               !/^\d+$/.test(trimmed);
      });

    const hasSpeakerLabels = lines.some(line => /^\[.+?\]/.test(line.trim()));

    if (hasSpeakerLabels) {
      let result = '';
      let currentSpeaker = null;
      let currentText = [];

      for (const line of lines) {
        const speakerMatch = line.match(/^\[([^\]]+)\]\s*(.*)$/);

        if (speakerMatch) {
          const [, speaker, text] = speakerMatch;

          if (currentSpeaker && currentSpeaker !== speaker) {
            result += `${currentSpeaker}:\n${currentText.join(' ').trim()}\n\n`;
            currentText = [];
          }

          currentSpeaker = speaker;
          if (text.trim()) {
            currentText.push(text.trim());
          }
        }
      }

      if (currentSpeaker && currentText.length > 0) {
        result += `${currentSpeaker}:\n${currentText.join(' ').trim()}\n\n`;
      }

      return result.trim();
    } else {
      return lines.join('\n').trim();
    }
  }

  /**
   * Clean up chunk files
   */
  cleanupChunks(chunkPaths) {
    try {
      if (chunkPaths.length > 0) {
        const chunksDir = path.dirname(chunkPaths[0]);
        chunkPaths.forEach(chunkPath => {
          if (fs.existsSync(chunkPath)) {
            fs.unlinkSync(chunkPath);
          }
        });
        if (fs.existsSync(chunksDir)) {
          fs.rmdirSync(chunksDir);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up chunks:', error);
    }
  }

  /**
   * Clean up voice sample files
   */
  cleanupVoiceSamples(voiceSamplePaths) {
    try {
      if (voiceSamplePaths && Array.isArray(voiceSamplePaths)) {
        voiceSamplePaths.forEach(samplePath => {
          if (fs.existsSync(samplePath)) {
            fs.unlinkSync(samplePath);
          }
        });
        logger.debug(`Cleaned up ${voiceSamplePaths.length} voice sample files`);
      }
    } catch (error) {
      logger.error('Error cleaning up voice samples:', error);
    }
  }

  /**
   * Clean up temporary file
   */
  cleanupTempFile(filePath) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      logger.error('Error cleaning up temp file:', error);
    }
  }
}

module.exports = TranscriptionService;
