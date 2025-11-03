/**
 * Test script for path validation
 * Run with: node test-path-validation.js
 */

const { validateFilePath } = require('./backend/utils/pathValidator');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('=== Path Validation Test Suite ===\n');

let passed = 0;
let failed = 0;

function createTestFile(filename) {
  const tempDir = os.tmpdir();
  const filePath = path.join(tempDir, filename);
  fs.writeFileSync(filePath, 'test audio data');
  return filePath;
}

console.log('Test 1: Valid MP3 file');
try {
  const validFile = createTestFile('test-audio.mp3');
  const result = validateFilePath(validFile);
  console.log(`✓ PASS - Validated: ${result}\n`);
  fs.unlinkSync(validFile);
  passed++;
} catch (error) {
  console.log(`✗ FAIL - ${error.message}\n`);
  failed++;
}

console.log('Test 2: Valid WAV file');
try {
  const validFile = createTestFile('recording.wav');
  const result = validateFilePath(validFile);
  console.log(`✓ PASS - Validated: ${result}\n`);
  fs.unlinkSync(validFile);
  passed++;
} catch (error) {
  console.log(`✗ FAIL - ${error.message}\n`);
  failed++;
}

console.log('Test 3: Reject dangerous characters');
try {
  validateFilePath('/tmp/audio;rm.mp3');
  console.log('✗ FAIL - Should have rejected\n');
  failed++;
} catch (error) {
  console.log(`✓ PASS - Rejected: ${error.message}\n`);
  passed++;
}

console.log('Test 4: Reject non-existent file');
try {
  validateFilePath('/tmp/does-not-exist-12345.mp3');
  console.log('✗ FAIL - Should have rejected\n');
  failed++;
} catch (error) {
  console.log(`✓ PASS - Rejected: ${error.message}\n`);
  passed++;
}

console.log('Test 5: Valid WEBM file');
try {
  const validFile = createTestFile('recording.webm');
  const result = validateFilePath(validFile);
  console.log(`✓ PASS - Validated: ${result}\n`);
  fs.unlinkSync(validFile);
  passed++;
} catch (error) {
  console.log(`✗ FAIL - ${error.message}\n`);
  failed++;
}

console.log('=== Results ===');
console.log(`✓ Passed: ${passed}`);
console.log(`✗ Failed: ${failed}`);

if (failed === 0) {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failed} test(s) failed.`);
  process.exit(1);
}
