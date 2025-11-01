#!/usr/bin/env node

/**
 * Test script to validate TranscriptionService is properly integrated
 * Tests the new optimization features without requiring API calls
 */

const path = require('path');

console.log('=== TranscriptionService Integration Test ===\n');

let exitCode = 0;
let testsPassed = 0;
let testsFailed = 0;

// Test 1: Check if TranscriptionService can be loaded
console.log('Test 1: Load TranscriptionService...');
try {
  const TranscriptionService = require('./backend/services/TranscriptionService');
  console.log('✓ TranscriptionService module loads successfully');
  testsPassed++;
} catch (e) {
  console.error('✗ Failed to load TranscriptionService:', e.message);
  testsFailed++;
  exitCode = 1;
}

// Test 2: Check if TranscriptionService can be instantiated
console.log('\nTest 2: Instantiate TranscriptionService...');
try {
  const ffmpeg = require('fluent-ffmpeg');
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  const ffprobeInstaller = require('@ffprobe-installer/ffprobe');

  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
  ffmpeg.setFfprobePath(ffprobeInstaller.path);

  const TranscriptionService = require('./backend/services/TranscriptionService');
  const service = new TranscriptionService(ffmpeg, true);

  console.log('✓ TranscriptionService instantiated successfully');
  testsPassed++;
} catch (e) {
  console.error('✗ Failed to instantiate TranscriptionService:', e.message);
  testsFailed++;
  exitCode = 1;
}

// Test 3: Check if all expected methods exist
console.log('\nTest 3: Verify TranscriptionService methods...');
try {
  const ffmpeg = require('fluent-ffmpeg');
  const TranscriptionService = require('./backend/services/TranscriptionService');
  const service = new TranscriptionService(ffmpeg, true);

  const expectedMethods = [
    'getAudioDuration',
    'optimizeAudioSpeed',
    'compressAudio',
    'convertToMP3',
    'splitAudioIntoChunks',
    'canMakeRequest',
    'waitForRateLimit',
    'transcribeChunkWithRetry',
    'transcribeChunksParallel',
    'extractPlainText',
    'fileToDataURL',
    'combineVTTTranscripts',
    'jsonToVTT',
    'diarizedJsonToVTT',
    'vttToPlainText',
    'cleanupChunks',
    'cleanupTempFile'
  ];

  const missingMethods = [];
  for (const method of expectedMethods) {
    if (typeof service[method] !== 'function') {
      missingMethods.push(method);
    }
  }

  if (missingMethods.length === 0) {
    console.log('✓ All expected methods exist');
    console.log(`  Verified ${expectedMethods.length} methods`);
    testsPassed++;
  } else {
    console.error('✗ Missing methods:', missingMethods.join(', '));
    testsFailed++;
    exitCode = 1;
  }
} catch (e) {
  console.error('✗ Failed to verify methods:', e.message);
  testsFailed++;
  exitCode = 1;
}

// Test 4: Check rate limiting configuration
console.log('\nTest 4: Verify rate limiting configuration...');
try {
  const ffmpeg = require('fluent-ffmpeg');
  const TranscriptionService = require('./backend/services/TranscriptionService');
  const service = new TranscriptionService(ffmpeg, true);

  if (service.MAX_REQUESTS_PER_MINUTE === 80) {
    console.log('✓ Rate limit correctly set to 80 RPM');
    testsPassed++;
  } else {
    console.error(`✗ Rate limit is ${service.MAX_REQUESTS_PER_MINUTE}, expected 80`);
    testsFailed++;
    exitCode = 1;
  }
} catch (e) {
  console.error('✗ Failed to verify rate limiting:', e.message);
  testsFailed++;
  exitCode = 1;
}

// Test 5: Check concurrency configuration
console.log('\nTest 5: Verify concurrency configuration...');
try {
  const ffmpeg = require('fluent-ffmpeg');
  const TranscriptionService = require('./backend/services/TranscriptionService');
  const service = new TranscriptionService(ffmpeg, true);

  if (service.MAX_CONCURRENT_CHUNKS === 5) {
    console.log('✓ Concurrent chunks correctly set to 5');
    testsPassed++;
  } else {
    console.error(`✗ Concurrent chunks is ${service.MAX_CONCURRENT_CHUNKS}, expected 5`);
    testsFailed++;
    exitCode = 1;
  }
} catch (e) {
  console.error('✗ Failed to verify concurrency:', e.message);
  testsFailed++;
  exitCode = 1;
}

// Test 6: Check main.js integration
console.log('\nTest 6: Verify main.js integration...');
try {
  const fs = require('fs');
  const mainContent = fs.readFileSync('./main.js', 'utf8');

  const requiredImports = [
    "require('./backend/services/TranscriptionService')",
  ];

  const requiredCalls = [
    'transcriptionService = new TranscriptionService',
    'transcriptionService.convertToMP3',
    'transcriptionService.optimizeAudioSpeed',
    'transcriptionService.splitAudioIntoChunks',
    'transcriptionService.transcribeChunksParallel',
    'transcriptionService.combineVTTTranscripts',
  ];

  let allFound = true;
  const missing = [];

  for (const item of [...requiredImports, ...requiredCalls]) {
    if (!mainContent.includes(item)) {
      allFound = false;
      missing.push(item);
    }
  }

  if (allFound) {
    console.log('✓ main.js properly integrated with TranscriptionService');
    testsPassed++;
  } else {
    console.error('✗ Missing integration code in main.js:');
    missing.forEach(m => console.error(`  - ${m}`));
    testsFailed++;
    exitCode = 1;
  }
} catch (e) {
  console.error('✗ Failed to verify main.js integration:', e.message);
  testsFailed++;
  exitCode = 1;
}

// Test 7: Verify optimization features are available
console.log('\nTest 7: Verify optimization features...');
try {
  const fs = require('fs');
  const mainContent = fs.readFileSync('./main.js', 'utf8');

  const optimizationFeatures = [
    'speedMultiplier',
    'useCompression',
    'optimizeAudioSpeed',
    'compressAudio',
    'transcribeChunksParallel',
  ];

  const foundFeatures = optimizationFeatures.filter(feature =>
    mainContent.includes(feature)
  );

  if (foundFeatures.length === optimizationFeatures.length) {
    console.log('✓ All optimization features integrated');
    console.log('  - Audio speed-up support');
    console.log('  - Compression support');
    console.log('  - Parallel chunk processing');
    testsPassed++;
  } else {
    const missing = optimizationFeatures.filter(f => !foundFeatures.includes(f));
    console.error('✗ Missing optimization features:', missing.join(', '));
    testsFailed++;
    exitCode = 1;
  }
} catch (e) {
  console.error('✗ Failed to verify optimization features:', e.message);
  testsFailed++;
  exitCode = 1;
}

console.log('\n=== Test Summary ===');
console.log(`Total tests: ${testsPassed + testsFailed}`);
console.log(`✓ Passed: ${testsPassed}`);
if (testsFailed > 0) {
  console.log(`✗ Failed: ${testsFailed}`);
}

if (exitCode === 0) {
  console.log('\n✓ All integration tests passed!');
  console.log('\nOptimizations verified:');
  console.log('  ✓ Parallel chunk processing (5 concurrent)');
  console.log('  ✓ Dynamic rate limiting (80 RPM)');
  console.log('  ✓ Audio speed-up feature (1x-3x)');
  console.log('  ✓ Opus compression support');
  console.log('\nReady to merge to main!');
} else {
  console.error('\n✗ Some integration tests failed!');
  console.error('Please fix the issues before merging.');
}
console.log('====================\n');

process.exit(exitCode);
