/**
 * Migration Script: Convert to Compressed Storage
 *
 * Migrates existing transcripts from the old format (storing huge VTT in electron-store)
 * to the new format (compressed VTT files on disk, metadata only in electron-store).
 *
 * Expected Savings: 90%+ reduction in electron-store size
 *
 * Run this ONCE to migrate your existing transcripts.
 */

const { app } = require('electron');
const StorageService = require('./backend/services/StorageService');
const transcriptStorage = require('./backend/utils/transcriptStorage');
const { vttToPlainText } = require('./backend/utils/transcriptCompression');
const { estimateTokens } = require('./backend/utils/tokenCounter');

async function migrate() {
  console.log('\n🔄 Starting Migration: Compress Transcript Storage\n');
  console.log('='='.repeat(60));

  const storage = new StorageService();
  const transcripts = storage.getTranscripts();

  if (transcripts.length === 0) {
    console.log('\n✓ No transcripts to migrate\n');
    return { migrated: 0, skipped: 0, failed: 0 };
  }

  console.log(`\n📊 Found ${transcripts.length} transcripts to migrate\n`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  let totalSizeBefore = 0;
  let totalSizeAfter = 0;

  const migratedTranscripts = [];

  for (let i = 0; i < transcripts.length; i++) {
    const transcript = transcripts[i];
    const num = i + 1;

    console.log(`\n[${num}/${transcripts.length}] Processing: ${transcript.fileName}`);
    console.log(`   ID: ${transcript.id}`);

    try {
      // Check if already migrated
      if (transcript.hasVTTFile) {
        console.log(`   ⏭️  Already migrated (hasVTTFile=true)`);
        migratedTranscripts.push(transcript);
        skipped++;
        continue;
      }

      // Get VTT content (prefer vttTranscript, fall back to rawTranscript)
      const vttContent = transcript.vttTranscript || transcript.rawTranscript;

      if (!vttContent) {
        console.log(`   ⚠️  No content to migrate`);
        migratedTranscripts.push(transcript);
        skipped++;
        continue;
      }

      const sizeBefore = Buffer.byteLength(JSON.stringify(transcript), 'utf8');
      totalSizeBefore += sizeBefore;

      console.log(`   Original size: ${(sizeBefore / 1024 / 1024).toFixed(2)} MB`);

      // Save VTT to compressed file
      const saveResult = await transcriptStorage.saveVTT(transcript.id, vttContent);
      console.log(`   ✓ Saved compressed: ${saveResult.savings} savings`);

      totalSizeAfter += saveResult.compressedSize;

      // Extract plain text for token estimation
      const plainText = vttToPlainText(vttContent);

      // Create new metadata-only transcript
      const newTranscript = {
        ...transcript,
        // Remove the huge content fields
        rawTranscript: undefined,
        vttTranscript: undefined,
        // Add new fields
        hasVTTFile: true,
        tokens: estimateTokens(plainText),
        updatedAt: Date.now()
      };

      // Remove undefined fields
      delete newTranscript.rawTranscript;
      delete newTranscript.vttTranscript;

      const sizeAfter = Buffer.byteLength(JSON.stringify(newTranscript), 'utf8');
      console.log(`   Metadata size: ${(sizeAfter / 1024).toFixed(2)} KB`);
      console.log(`   ✓ Migrated successfully`);

      migratedTranscripts.push(newTranscript);
      migrated++;

    } catch (error) {
      console.error(`   ❌ Migration failed:`, error.message);
      // Keep original transcript if migration fails
      migratedTranscripts.push(transcript);
      failed++;
    }
  }

  // Save migrated transcripts
  console.log('\n' + '='.repeat(60));
  console.log('\n💾 Saving migrated transcripts...\n');

  try {
    await storage.saveTranscripts(migratedTranscripts);
    console.log('✓ Saved successfully\n');
  } catch (error) {
    console.error('❌ Failed to save:', error.message);
    throw error;
  }

  // Print summary
  console.log('='.repeat(60));
  console.log('\n📈 Migration Summary:\n');
  console.log(`   Total transcripts: ${transcripts.length}`);
  console.log(`   ✓ Migrated: ${migrated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`\n   Storage Before: ${(totalSizeBefore / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Storage After: ${(totalSizeAfter / 1024 / 1024).toFixed(2)} MB`);

  if (totalSizeBefore > 0) {
    const savingsPercent = ((1 - totalSizeAfter / totalSizeBefore) * 100).toFixed(1);
    console.log(`   💾 Total Savings: ${savingsPercent}%`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Migration complete!\n');

  // Get final stats
  const stats = await transcriptStorage.getStats();
  console.log(`📂 Transcript files location: ${stats.directory}`);
  console.log(`📁 Total compressed files: ${stats.transcriptCount}`);
  console.log(`💾 Total disk usage: ${stats.totalSizeMB} MB\n`);

  return { migrated, skipped, failed };
}

// Only run if this is the main module
if (require.main === module) {
  // This script needs to be run from within the Electron app
  console.error('\n⚠️  This script must be run from within the Electron app');
  console.error('   Add a menu item or IPC handler to trigger migration\n');
  process.exit(1);
}

module.exports = { migrate };
