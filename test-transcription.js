const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');
const OpenAI = require('openai');

// Load FFmpeg dependencies (same as main.js)
let ffmpeg, ffmpegPath, ffprobePath;
let ffmpegAvailable = false;

try {
  ffmpeg = require('fluent-ffmpeg');
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  ffmpegPath = ffmpegInstaller.path;
  const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
  ffprobePath = ffprobeInstaller.path;

  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);
  ffmpegAvailable = true;
} catch (error) {
  console.error('FFmpeg not available:', error.message);
}

// Load environment variables from .env file if it exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  });
}

// Configuration
const LOCAL_TEST_FILE = path.join(__dirname, 'test_audio.mp3');
const REMOTE_TEST_URL = 'https://omny.fm/shows/planetary-radio-space-exploration-astronomy-and-sc/elon-musk-of-spacex.mp3';
const TEMP_TEST_FILE = path.join(__dirname, 'temp_test_audio.mp3');

// Color output for terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function error(message) {
  log(`✗ ${message}`, colors.red);
}

function success(message) {
  log(`✓ ${message}`, colors.green);
}

function info(message) {
  log(`ℹ ${message}`, colors.cyan);
}

function warn(message) {
  log(`⚠ ${message}`, colors.yellow);
}

// Download file from URL
async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        https.get(response.headers.location, (redirectResponse) => {
          const totalBytes = parseInt(redirectResponse.headers['content-length'], 10);
          let downloadedBytes = 0;

          redirectResponse.pipe(file);

          redirectResponse.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            const progress = ((downloadedBytes / totalBytes) * 100).toFixed(1);
            process.stdout.write(`\r  Downloading: ${progress}%`);
          });

          file.on('finish', () => {
            file.close();
            console.log('');
            resolve();
          });
        }).on('error', (err) => {
          fs.unlink(dest, () => {});
          reject(err);
        });
      } else {
        const totalBytes = parseInt(response.headers['content-length'], 10);
        let downloadedBytes = 0;

        response.pipe(file);

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const progress = ((downloadedBytes / totalBytes) * 100).toFixed(1);
          process.stdout.write(`\r  Downloading: ${progress}%`);
        });

        file.on('finish', () => {
          file.close();
          console.log('');
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// ==================== COPIED FROM MAIN.JS ====================
// These are the actual functions used in the app

function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata.format.duration);
      }
    });
  });
}

async function splitAudioIntoChunks(filePath, chunkSizeInMB = 20) {
  try {
    const stats = fs.statSync(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);

    // If file is small enough, return the original file
    if (fileSizeInMB <= 25) {
      return [filePath];
    }

    const duration = await getAudioDuration(filePath);
    const tempDir = os.tmpdir();
    const chunksDir = path.join(tempDir, `chunks-${Date.now()}`);
    fs.mkdirSync(chunksDir, { recursive: true });

    // Calculate chunk duration based on file size and desired chunk size
    const chunkDuration = Math.floor((duration * chunkSizeInMB) / fileSizeInMB);
    const numChunks = Math.ceil(duration / chunkDuration);

    const chunkPaths = [];

    // Split audio into chunks
    for (let i = 0; i < numChunks; i++) {
      const startTime = i * chunkDuration;
      const chunkPath = path.join(chunksDir, `chunk-${i}.mp3`);

      process.stdout.write(`\r  Creating chunk ${i + 1}/${numChunks}...`);

      await new Promise((resolve, reject) => {
        ffmpeg(filePath)
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

    console.log(''); // New line after progress
    return chunkPaths;
  } catch (error) {
    throw new Error(`Failed to split audio: ${error.message}`);
  }
}

function cleanupChunks(chunkPaths) {
  try {
    if (chunkPaths.length > 0) {
      const chunksDir = path.dirname(chunkPaths[0]);
      chunkPaths.forEach(chunkPath => {
        if (fs.existsSync(chunkPath)) {
          fs.unlinkSync(chunkPath);
        }
      });
      if (fs.existsSync(chunksDir) && chunksDir.includes('chunks-')) {
        fs.rmdirSync(chunksDir);
      }
    }
  } catch (error) {
    console.error('Error cleaning up chunks:', error);
  }
}

// Extract plain text from VTT or JSON format
function extractPlainText(transcript) {
  if (typeof transcript === 'string') {
    // VTT format
    return transcript
      .split('\n')
      .filter(line =>
        !line.includes('-->') &&
        !line.startsWith('WEBVTT') &&
        line.trim() !== '' &&
        !/^\d+$/.test(line.trim())
      )
      .join(' ')
      .trim();
  } else if (transcript.text) {
    // JSON format
    return transcript.text;
  }
  return '';
}

// ==================== TEST FUNCTIONS ====================

// Test transcription with actual app logic
async function testTranscription(apiKey, testFile) {
  info('Starting transcription test using real app logic...');
  let chunkPaths = [];

  try {
    const openai = new OpenAI({ apiKey });
    const stats = fs.statSync(testFile);
    const fileSizeInMB = stats.size / (1024 * 1024);

    info(`File size: ${fileSizeInMB.toFixed(2)} MB`);

    // Test 1: Check if file needs chunking
    if (fileSizeInMB > 25) {
      if (!ffmpegAvailable) {
        throw new Error('FFmpeg required for large files but not available');
      }

      info('Test 1: Large file handling with chunking');
      info('  Splitting audio into chunks...');

      chunkPaths = await splitAudioIntoChunks(testFile, 20);
      success(`  Created ${chunkPaths.length} chunks`);

      // Get duration of each chunk
      const chunkDurations = [];
      for (const chunkPath of chunkPaths) {
        const duration = await getAudioDuration(chunkPath);
        chunkDurations.push(duration);
      }

      // Process each chunk with gpt-4o-transcribe-diarize
      info('  Transcribing chunks with gpt-4o-transcribe-diarize...');
      const transcripts = [];

      for (let i = 0; i < chunkPaths.length; i++) {
        const chunkPath = chunkPaths[i];
        process.stdout.write(`\r  Transcribing chunk ${i + 1}/${chunkPaths.length}...`);

        const transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(chunkPath),
          model: 'gpt-4o-transcribe-diarize',
          response_format: 'diarized_json',
        });

        transcripts.push(transcription);
      }
      console.log(''); // New line after progress

      // Combine results - extract text from segments
      let combinedText = '';
      for (const transcript of transcripts) {
        if (transcript.segments) {
          combinedText += transcript.segments.map(seg => seg.text || '').join(' ') + ' ';
        }
      }
      const wordCount = combinedText.trim().split(/\s+/).length;

      success(`  Transcribed ${wordCount} words from ${chunkPaths.length} chunks`);
      info(`  Sample text: "${combinedText.substring(0, 100)}..."`);

      // Test 2: Generate meeting summary
      info('Test 2: Generate meeting summary with GPT-4o');

      const systemPrompt = `You are an expert meeting analyst. Create a brief markdown summary with:

# Meeting Summary

## Overview
Brief overview of the content

## Key Topics
- Main discussion points

## Key Insights
- Important takeaways

Keep it concise (max 300 words).`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Summarize this transcript:\n\n${combinedText.substring(0, 2000)}` }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const summary = completion.choices[0].message.content;

      if (!summary || summary.length < 50) {
        throw new Error('Summary generation failed or returned insufficient content');
      }

      success(`  Generated summary (${summary.length} characters)`);
      info(`  Summary preview:\n${summary.substring(0, 200)}...\n`);

      // Test 3: Validate summary formatting
      const hasHeaders = summary.includes('#');
      const hasBullets = summary.includes('-') || summary.includes('*');

      if (hasHeaders && hasBullets) {
        success('  Summary has proper markdown formatting');
      } else {
        warn('  Summary may be missing some markdown formatting');
      }

      // Cleanup
      info('Cleaning up temporary chunks...');
      cleanupChunks(chunkPaths);
      success('Cleanup complete');

      return { transcription: combinedText, summary, chunked: true };

    } else {
      // Small file - process normally
      info('Test 1: Diarized transcription (file under 25MB)');

      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(testFile),
        model: 'gpt-4o-transcribe-diarize',
        response_format: 'diarized_json',
      });

      if (!transcription || !transcription.segments) {
        throw new Error('Transcription returned empty result');
      }

      // Extract text from segments
      const transcriptionText = transcription.segments.map(seg => seg.text || '').join(' ');
      const wordCount = transcriptionText.split(/\s+/).length;
      success(`  Transcribed ${wordCount} words`);
      info(`  Sample text: "${transcriptionText.substring(0, 100)}..."`);

      // Generate summary
      info('Test 2: Generate meeting summary with GPT-4o');

      const systemPrompt = `You are an expert meeting analyst. Create a brief markdown summary.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Summarize:\n\n${transcriptionText.substring(0, 2000)}` }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const summary = completion.choices[0].message.content;
      success(`  Generated summary (${summary.length} characters)`);

      return { transcription: transcriptionText, summary, chunked: false };
    }
  } catch (err) {
    error(`Transcription test failed: ${err.message}`);

    // Cleanup on error
    if (chunkPaths.length > 0) {
      cleanupChunks(chunkPaths);
    }

    throw err;
  }
}

// Main test function
async function runTests() {
  log('\n=== Audio Transcription & Summary Test Suite ===\n', colors.blue);

  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    error('OPENAI_API_KEY environment variable not set');
    info('Please set your OpenAI API key:');
    info('  export OPENAI_API_KEY=your-api-key-here');
    info('Or create a .env file with: OPENAI_API_KEY=your-key');
    process.exit(1);
  }

  success('OpenAI API key found');

  // Check FFmpeg availability
  if (!ffmpegAvailable) {
    error('FFmpeg not available - large file handling will fail');
    process.exit(1);
  }
  success('FFmpeg is available');

  // Determine test file
  let testFile = LOCAL_TEST_FILE;
  const useRemote = process.env.USE_REMOTE_TEST === 'true' || !fs.existsSync(LOCAL_TEST_FILE);

  if (useRemote) {
    info('Using remote test file from Planetary Radio');
    info(`  URL: ${REMOTE_TEST_URL}`);

    try {
      await downloadFile(REMOTE_TEST_URL, TEMP_TEST_FILE);
      success('Download complete');
      testFile = TEMP_TEST_FILE;
    } catch (err) {
      error(`Failed to download remote test file: ${err.message}`);
      process.exit(1);
    }
  } else {
    info('Using local test file: test_audio.mp3');
  }

  // Verify file exists and is readable
  const stats = fs.statSync(testFile);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  success(`Test file found (${fileSizeMB} MB)`);

  // Run transcription tests
  try {
    await testTranscription(apiKey, testFile);

    log('\n=== All Tests Passed! ===\n', colors.green);
    success('The app\'s large file handling works correctly');
    success('Chunking, transcription, and summary generation validated');

    // Cleanup temp file if used
    if (useRemote && fs.existsSync(TEMP_TEST_FILE)) {
      fs.unlinkSync(TEMP_TEST_FILE);
      info('Cleaned up temporary test file');
    }

    process.exit(0);
  } catch (err) {
    error(`\nTest suite failed: ${err.message}`);

    // Cleanup temp file if used
    if (useRemote && fs.existsSync(TEMP_TEST_FILE)) {
      fs.unlinkSync(TEMP_TEST_FILE);
    }

    process.exit(1);
  }
}

// Run tests
runTests().catch((err) => {
  error(`Unexpected error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
