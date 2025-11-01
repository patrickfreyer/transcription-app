const path = require('path');
const fs = require('fs');

// Safe logger that works even if logger module fails
const safeLog = {
  warn: (msg) => { try { console.warn(`[pathValidator] ${msg}`); } catch (e) {} },
  debug: (msg) => { try { console.log(`[pathValidator] ${msg}`); } catch (e) {} }
};

/**
 * Validate file path for security
 * Prevents command injection, path traversal, and null byte attacks
 * @param {string} filePath - File path to validate
 * @returns {string} - Validated absolute path
 * @throws {Error} - If validation fails
 */
function validateFilePath(filePath) {
  // Check for null/undefined
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path: path must be a non-empty string');
  }

  // Check for null bytes (null byte injection attack)
  if (filePath.includes('\0')) {
    throw new Error('Invalid file path: contains null bytes');
  }

  // Resolve to absolute path (prevents relative path attacks)
  const absolutePath = path.resolve(filePath);

  // Check for dangerous characters (shell metacharacters)
  // Note: We allow some special chars that are valid in paths (-, _, spaces, etc.)
  const dangerousChars = /[;&|`$(){}[\]<>!]/;
  if (dangerousChars.test(absolutePath)) {
    safeLog.warn(`Rejected path with dangerous characters: ${absolutePath}`);
    throw new Error('Invalid file path: contains dangerous characters');
  }

  // Validate file extension against whitelist
  const ext = path.extname(absolutePath).toLowerCase();
  const allowedExtensions = [
    '.mp3', '.wav', '.m4a', '.webm', '.mp4',
    '.mpeg', '.mpga', '.ogg', '.flac', '.aac'
  ];

  if (!allowedExtensions.includes(ext)) {
    safeLog.warn(`Rejected path with invalid extension: ${ext}`);
    throw new Error(`Invalid file extension: ${ext}. Allowed: ${allowedExtensions.join(', ')}`);
  }

  // Check if file exists
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File does not exist: ${absolutePath}`);
  }

  // Check if it's actually a file (not a directory, socket, etc.)
  const stats = fs.lstatSync(absolutePath); // Use lstat to detect symlinks

  if (stats.isSymbolicLink()) {
    safeLog.warn(`Rejected symlink: ${absolutePath}`);
    throw new Error('Path is a symbolic link (not allowed for security)');
  }

  if (!stats.isFile()) {
    throw new Error('Path does not point to a regular file');
  }

  safeLog.debug(`✓ Path validated: ${absolutePath}`);
  return absolutePath;
}

module.exports = { validateFilePath };
