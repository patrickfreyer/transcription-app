const audioProcessing = require('../src/services/audioProcessing');
const path = require('path');
const fs = require('fs');

/**
 * Integration tests for audioProcessing module
 * These tests require actual FFmpeg binaries and real audio files
 */

describe('audioProcessing Integration Tests', () => {
  beforeAll(() => {
    // Initialize FFmpeg with actual paths
    try {
      const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
      const ffprobeInstaller = require('@ffprobe-installer/ffprobe');

      audioProcessing.initializeFFmpeg({
        ffmpegPath: ffmpegInstaller.path,
        ffprobePath: ffprobeInstaller.path
      });
    } catch (error) {
      console.error('Failed to initialize FFmpeg for tests:', error);
    }
  });

  describe('with test_audio.mp3', () => {
    const testAudioPath = path.join(__dirname, '..', 'test_audio.mp3');

    test('should check if test audio file exists', () => {
      expect(fs.existsSync(testAudioPath)).toBe(true);
    });

    test('should get audio duration', async () => {
      if (!fs.existsSync(testAudioPath)) {
        console.log('Skipping: test_audio.mp3 not found');
        return;
      }

      const duration = await audioProcessing.getAudioDuration(testAudioPath);
      expect(duration).toBeGreaterThan(0);
      console.log(`Audio duration: ${duration.toFixed(2)}s`);
    }, 30000); // 30 second timeout

    test('should handle large file (>25MB) and return chunking info', async () => {
      if (!fs.existsSync(testAudioPath)) {
        console.log('Skipping: test_audio.mp3 not found');
        return;
      }

      const stats = fs.statSync(testAudioPath);
      const fileSizeInMB = stats.size / (1024 * 1024);
      console.log(`Test file size: ${fileSizeInMB.toFixed(2)}MB`);

      if (fileSizeInMB > 25) {
        // File is large enough to test chunking
        const chunks = await audioProcessing.splitAudioIntoChunks(testAudioPath, 20);

        expect(Array.isArray(chunks)).toBe(true);
        expect(chunks.length).toBeGreaterThan(0);

        console.log(`Created ${chunks.length} chunks`);

        // Verify chunks exist
        for (const chunkPath of chunks) {
          expect(fs.existsSync(chunkPath)).toBe(true);
        }

        // Clean up
        audioProcessing.cleanupChunks(chunks);

        // Verify cleanup
        for (const chunkPath of chunks) {
          expect(fs.existsSync(chunkPath)).toBe(false);
        }
      } else {
        // File is small enough, should return original
        const chunks = await audioProcessing.splitAudioIntoChunks(testAudioPath, 20);
        expect(chunks).toEqual([testAudioPath]);
      }
    }, 120000); // 2 minute timeout for large files
  });
});
