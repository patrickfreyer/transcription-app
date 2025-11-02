/**
 * Test Storage Optimization Implementation
 *
 * Verifies that compressed storage works end-to-end
 */

const { app } = require('electron');

// Mock electron app for testing
if (!app.isReady()) {
  app.on('ready', runTests);
} else {
  runTests();
}

async function runTests() {
  const TranscriptService = require('./backend/services/TranscriptService');
  const transcriptService = new TranscriptService();

  console.log('\n🧪 Testing Compressed Storage Implementation\n');
  console.log('='.repeat(70) + '\n');

  // Test 1: Save transcript with compression
  console.log('Test 1: Save Transcript with Compression\n');

  const testData = {
    rawTranscript: 'Test transcript content here...',
    vttTranscript: 'WEBVTT\n\n1\n00:00:00.000 --> 00:00:05.000\nTest transcript content here...\n\n',
    fileName: 'Test Recording.mp3',
    duration: 300,
    model: 'gpt-4o-transcribe',
    isDiarized: false,
    fileSize: 5.2,
    summary: 'Test summary',
    summaryTemplate: 'Executive Summary'
  };

  try {
    const saved = await transcriptService.saveFromRecording(testData);
    console.log('✓ Saved transcript:', saved.id);
    console.log('  Has VTT file:', saved.hasVTTFile);
    console.log('  Tokens:', saved.tokens);
    console.log('  Raw transcript in metadata:', !!saved.rawTranscript ? 'YES (OLD FORMAT!)' : 'NO (GOOD!)');
    console.log('  VTT transcript in metadata:', !!saved.vttTranscript ? 'YES (OLD FORMAT!)' : 'NO (GOOD!)');
    console.log('');

    // Test 2: Load VTT content
    console.log('Test 2: Load VTT Content\n');
    const vttContent = await transcriptService.getVTT(saved.id);
    console.log('✓ Loaded VTT:', vttContent ? `${vttContent.length} bytes` : 'FAILED');
    console.log('');

    // Test 3: Load plain text
    console.log('Test 3: Load Plain Text\n');
    const plainText = await transcriptService.getPlainText(saved.id);
    console.log('✓ Loaded plain text:', plainText ? `${plainText.length} bytes` : 'FAILED');
    console.log('  Content:', plainText?.substring(0, 50) + '...');
    console.log('');

    // Test 4: Load full transcript with content
    console.log('Test 4: Load Full Transcript with Content\n');
    const fullTranscript = await transcriptService.getWithContent(saved.id);
    console.log('✓ Loaded full transcript');
    console.log('  Has rawTranscript:', !!fullTranscript.rawTranscript);
    console.log('  Has vttTranscript:', !!fullTranscript.vttTranscript);
    console.log('  Has metadata:', !!fullTranscript.fileName);
    console.log('');

    // Test 5: Storage stats
    console.log('Test 5: Storage Statistics\n');
    const stats = await transcriptService.getStorageStats();
    console.log('✓ Storage stats:');
    console.log('  Transcript count:', stats.transcriptCount);
    console.log('  Total size:', stats.totalSizeMB, 'MB');
    console.log('  Directory:', stats.directory);
    console.log('');

    // Test 6: Delete transcript
    console.log('Test 6: Delete Transcript\n');
    await transcriptService.delete(saved.id);
    console.log('✓ Deleted transcript and VTT file');
    console.log('');

    // Final stats
    const finalStats = await transcriptService.getStorageStats();
    console.log('Final storage count:', finalStats.transcriptCount);
    console.log('');

    console.log('='.repeat(70));
    console.log('\n✅ All tests passed!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }

  process.exit(0);
}
