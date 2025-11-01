const fs = require('fs');
const path = require('path');
const os = require('os');
const { createLogger } = require('./logger');

const logger = createLogger('AtomicWrite');

/**
 * Atomically write data to a file using write-to-temp-then-rename pattern
 * This ensures data integrity even if the process crashes during write
 * 
 * @param {string} targetPath - The final destination file path
 * @param {string} data - The data to write (typically JSON string)
 * @returns {Promise<void>}
 */
async function atomicWrite(targetPath, data) {
  const tempPath = path.join(
    os.tmpdir(),
    `atomic-write-${Date.now()}-${Math.random().toString(36).substring(7)}.tmp`
  );

  try {
    logger.debug(`Starting atomic write to: ${targetPath}`);

    // Step 1: Write to temporary file
    fs.writeFileSync(tempPath, data, 'utf8');
    logger.debug(`Wrote to temp file: ${tempPath}`);

    // Step 2: Verify temp file is valid (e.g., parse JSON)
    if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
      try {
        JSON.parse(data);
        logger.debug('Verified JSON validity');
      } catch (parseError) {
        throw new Error(`Invalid JSON data: ${parseError.message}`);
      }
    }

    // Step 3: Atomic rename (overwrites target file)
    fs.renameSync(tempPath, targetPath);
    logger.debug(`✓ Atomic write complete: ${targetPath}`);

  } catch (error) {
    // Clean up temp file if it still exists
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
        logger.debug(`Cleaned up temp file: ${tempPath}`);
      } catch (cleanupError) {
        logger.warn(`Failed to cleanup temp file: ${cleanupError.message}`);
      }
    }
    
    logger.error(`Atomic write failed: ${error.message}`);
    throw error;
  }
}

/**
 * Atomically update a specific key in electron-store
 * 
 * @param {object} store - electron-store instance
 * @param {string} key - The key to update
 * @param {any} value - The value to set
 * @returns {Promise<void>}
 */
async function atomicStoreUpdate(store, key, value) {
  try {
    logger.debug(`Atomic update of key: ${key}`);

    // Step 1: Read entire store
    const allData = store.store || {};

    // Step 2: Update specific key
    const updatedData = { ...allData, [key]: value };

    // Step 3: Serialize to JSON
    const jsonString = JSON.stringify(updatedData, null, 2);

    // Step 4: Atomic write to store file
    await atomicWrite(store.path, jsonString);

    logger.debug(`✓ Store key updated: ${key}`);
  } catch (error) {
    logger.error(`Failed to update store key ${key}: ${error.message}`);
    throw error;
  }
}

module.exports = {
  atomicWrite,
  atomicStoreUpdate
};
