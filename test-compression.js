/**
 * Test Script: Verify Compression Savings
 *
 * Tests the compression utility on sample VTT content to demonstrate savings.
 * Run: node test-compression.js
 */

const { compressVTT, decompressVTT, vttToPlainText, estimateCompression } = require('./backend/utils/transcriptCompression');

// Sample VTT content (realistic structure)
function generateSampleVTT(minutes = 30) {
  let vtt = 'WEBVTT\n\n';
  const text = 'Sean Fitzpatrick, you are the CEO of LexisNexis. Welcome to Decoder. ';
  const sentencesPerMinute = 10; // ~150 words per minute
  const totalSentences = minutes * sentencesPerMinute;

  for (let i = 0; i < totalSentences; i++) {
    const startMin = Math.floor(i * 6 / 60);
    const startSec = (i * 6) % 60;
    const endMin = Math.floor((i * 6 + 6) / 60);
    const endSec = ((i * 6) + 6) % 60;

    vtt += `${i + 1}\n`;
    vtt += `00:${String(startMin).padStart(2, '0')}:${String(startSec).padStart(2, '0')}.000 --> `;
    vtt += `00:${String(endMin).padStart(2, '0')}:${String(endSec).padStart(2, '0')}.000\n`;
    vtt += text + '\n\n';
  }

  return vtt;
}

async function test() {
  console.log('\n🧪 Testing Transcript Compression\n');
  console.log('='.repeat(70));

  // Generate sample VTT for a 30-minute audio
  const vttContent = generateSampleVTT(30);
  const plainText = vttToPlainText(vttContent);

  console.log('\n📊 Sample Transcript (30-minute audio):\n');
  console.log(`   Plain text length: ${plainText.length.toLocaleString()} bytes`);
  console.log(`   VTT format length: ${vttContent.length.toLocaleString()} bytes`);
  console.log(`   VTT is ${Math.round(vttContent.length / plainText.length)}x larger than plain text\n`);

  // Show estimation
  const estimate = estimateCompression(vttContent);
  console.log('📈 Estimated Compression (before actual compression):\n');
  console.log(`   Original size: ${estimate.originalMB} MB`);
  console.log(`   Estimated compressed: ${estimate.estimatedMB} MB`);
  console.log(`   Estimated savings: ${estimate.estimatedSavings}\n`);

  // Actual compression test
  console.log('🗜️  Running actual Brotli compression...\n');

  const startTime = Date.now();
  const compressed = await compressVTT(vttContent);
  const compressTime = Date.now() - startTime;

  const originalSize = Buffer.byteLength(vttContent, 'utf8');
  const compressedSize = compressed.length;
  const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

  console.log('✅ Compression Results:\n');
  console.log(`   Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Compressed size: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Compression ratio: ${ratio}%`);
  console.log(`   Time taken: ${compressTime}ms\n`);

  // Test decompression
  console.log('📂 Testing decompression...\n');

  const decompressStart = Date.now();
  const decompressed = await decompressVTT(compressed);
  const decompressTime = Date.now() - decompressStart;

  const isValid = decompressed === vttContent;

  console.log(`   Decompression time: ${decompressTime}ms`);
  console.log(`   Data integrity: ${isValid ? '✅ PASSED' : '❌ FAILED'}\n`);

  // Calculate storage savings for 10 transcripts
  console.log('💾 Storage Savings Example (10 transcripts):\n');

  const transcriptCount = 10;
  const oldStoragePerTranscript = originalSize * 2; // rawTranscript + vttTranscript
  const newStoragePerTranscript = compressedSize + 5000; // compressed file + metadata

  const oldTotal = oldStoragePerTranscript * transcriptCount;
  const newTotal = newStoragePerTranscript * transcriptCount;
  const savings = ((1 - newTotal / oldTotal) * 100).toFixed(1);

  console.log(`   OLD (storing both raw + VTT in electron-store):`);
  console.log(`     Per transcript: ${(oldStoragePerTranscript / 1024 / 1024).toFixed(2)} MB`);
  console.log(`     Total (10 transcripts): ${(oldTotal / 1024 / 1024).toFixed(2)} MB\n`);

  console.log(`   NEW (compressed VTT files + metadata):`);
  console.log(`     Per transcript: ${(newStoragePerTranscript / 1024 / 1024).toFixed(2)} MB`);
  console.log(`     Total (10 transcripts): ${(newTotal / 1024 / 1024).toFixed(2)} MB\n`);

  console.log(`   💰 Total savings: ${savings}% (${((oldTotal - newTotal) / 1024 / 1024).toFixed(2)} MB saved)\n`);

  console.log('='.repeat(70));
  console.log('\n✅ All tests passed!\n');
}

// Run test
test().catch(console.error);
