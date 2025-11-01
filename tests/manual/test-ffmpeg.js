#!/usr/bin/env node

/**
 * Test script to validate ffmpeg/ffprobe are properly installed and functional
 * This runs in development mode to test the installers work correctly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== FFmpeg/FFprobe Installation Test ===');
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('');

let exitCode = 0;

// Test 1: Check if packages are installed
console.log('Test 1: Check package installation...');
try {
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  console.log('✓ @ffmpeg-installer/ffmpeg is installed');
  console.log('  FFmpeg path:', ffmpegInstaller.path);

  if (!fs.existsSync(ffmpegInstaller.path)) {
    console.error('✗ FFmpeg binary not found at path!');
    exitCode = 1;
  } else {
    const stat = fs.statSync(ffmpegInstaller.path);
    if (!stat.isFile()) {
      console.error('✗ FFmpeg path points to directory, not file!');
      exitCode = 1;
    } else {
      console.log('✓ FFmpeg binary exists and is a file');
    }
  }
} catch (e) {
  console.error('✗ Failed to load @ffmpeg-installer/ffmpeg:', e.message);
  exitCode = 1;
}

try {
  const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
  console.log('✓ @ffprobe-installer/ffprobe is installed');
  console.log('  FFprobe path:', ffprobeInstaller.path);

  if (!fs.existsSync(ffprobeInstaller.path)) {
    console.error('✗ FFprobe binary not found at path!');
    exitCode = 1;
  } else {
    const stat = fs.statSync(ffprobeInstaller.path);
    if (!stat.isFile()) {
      console.error('✗ FFprobe path points to directory, not file!');
      exitCode = 1;
    } else {
      console.log('✓ FFprobe binary exists and is a file');
    }
  }
} catch (e) {
  console.error('✗ Failed to load @ffprobe-installer/ffprobe:', e.message);
  exitCode = 1;
}

console.log('');

// Test 2: Test fluent-ffmpeg can be loaded
console.log('Test 2: Check fluent-ffmpeg...');
try {
  const ffmpeg = require('fluent-ffmpeg');
  console.log('✓ fluent-ffmpeg is installed');

  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  const ffprobeInstaller = require('@ffprobe-installer/ffprobe');

  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
  ffmpeg.setFfprobePath(ffprobeInstaller.path);
  console.log('✓ FFmpeg paths set successfully');
} catch (e) {
  console.error('✗ Failed to configure fluent-ffmpeg:', e.message);
  exitCode = 1;
}

console.log('');

// Test 3: Test ffmpeg is executable
console.log('Test 3: Test ffmpeg execution...');
try {
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  const version = execSync(`"${ffmpegInstaller.path}" -version`, { encoding: 'utf8' });
  console.log('✓ FFmpeg is executable');
  const versionLine = version.split('\n')[0];
  console.log('  Version:', versionLine);
} catch (e) {
  console.error('✗ Failed to execute ffmpeg:', e.message);
  exitCode = 1;
}

console.log('');

// Test 4: Test ffprobe is executable
console.log('Test 4: Test ffprobe execution...');
try {
  const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
  const version = execSync(`"${ffprobeInstaller.path}" -version`, { encoding: 'utf8' });
  console.log('✓ FFprobe is executable');
  const versionLine = version.split('\n')[0];
  console.log('  Version:', versionLine);
} catch (e) {
  console.error('✗ Failed to execute ffprobe:', e.message);
  exitCode = 1;
}

console.log('');
console.log('=== Test Summary ===');
if (exitCode === 0) {
  console.log('✓ All tests passed!');
} else {
  console.error('✗ Some tests failed!');
}
console.log('====================');

process.exit(exitCode);
