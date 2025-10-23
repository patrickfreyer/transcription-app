const fs = require('fs');
const path = require('path');
const https = require('https');
const OpenAI = require('openai');

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
        // Follow redirect
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
            console.log(''); // New line after progress
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
          console.log(''); // New line after progress
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// Extract plain text from VTT format
function extractPlainText(vttContent) {
  return vttContent
    .split('\n')
    .filter(line =>
      !line.includes('-->') &&
      !line.startsWith('WEBVTT') &&
      line.trim() !== '' &&
      !/^\d+$/.test(line.trim())
    )
    .join(' ')
    .trim();
}

// Test transcription
async function testTranscription(apiKey, testFile) {
  info('Starting transcription test...');

  try {
    const openai = new OpenAI({ apiKey });

    // Test 1: Basic transcription with gpt-4o-transcribe
    info('Test 1: Basic transcription with gpt-4o-transcribe');
    const transcription1 = await openai.audio.transcriptions.create({
      file: fs.createReadStream(testFile),
      model: 'gpt-4o-transcribe',
      response_format: 'json',
    });

    if (!transcription1 || !transcription1.text) {
      throw new Error('Transcription returned empty result');
    }

    const wordCount = transcription1.text.split(/\s+/).length;
    success(`  Transcribed ${wordCount} words`);
    info(`  Sample text: "${transcription1.text.substring(0, 100)}..."`);

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
        { role: 'user', content: `Summarize this transcript:\n\n${transcription1.text.substring(0, 2000)}` }
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

    // Test 3: Validate summary contains markdown formatting
    const hasHeaders = summary.includes('#');
    const hasBullets = summary.includes('-') || summary.includes('*');

    if (hasHeaders && hasBullets) {
      success('  Summary has proper markdown formatting');
    } else {
      warn('  Summary may be missing some markdown formatting');
    }

    return { transcription: transcription1, summary };
  } catch (err) {
    error(`Transcription test failed: ${err.message}`);
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
    process.exit(1);
  }

  success('OpenAI API key found');

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
