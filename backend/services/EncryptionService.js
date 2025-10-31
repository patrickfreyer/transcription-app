/**
 * EncryptionService - Handles encryption/decryption using Electron's safeStorage API
 *
 * Uses OS-level encryption:
 * - macOS: Keychain Services
 * - Windows: Data Protection API (DPAPI)
 * - Linux: Secret Service API / libsecret
 *
 * Security:
 * - Encryption keys managed by OS
 * - Hardware-backed when available
 * - Per-user encryption (User A cannot decrypt User B's data)
 * - No keys stored in application code
 */

const { safeStorage } = require('electron');
const { createLogger } = require('../utils/logger');

const logger = createLogger('EncryptionService');

class EncryptionService {
  constructor() {
    this.isAvailable = false;
    this.checkAvailability();
  }

  /**
   * Check if encryption is available on this platform
   */
  checkAvailability() {
    try {
      this.isAvailable = safeStorage.isEncryptionAvailable();

      if (this.isAvailable) {
        logger.info('Encryption available - using OS-level encryption');
      } else {
        logger.warn('Encryption not available - data will be stored unencrypted');
      }
    } catch (error) {
      logger.error('Error checking encryption availability:', error);
      this.isAvailable = false;
    }
  }

  /**
   * Encrypt a string
   * @param {string} plaintext - Data to encrypt
   * @returns {string} Base64-encoded encrypted data, or original if encryption unavailable
   */
  encrypt(plaintext) {
    if (!this.isAvailable) {
      logger.warn('Encryption not available - storing data unencrypted');
      return plaintext;
    }

    if (!plaintext || typeof plaintext !== 'string') {
      logger.error('Invalid plaintext provided to encrypt()');
      return plaintext;
    }

    try {
      const buffer = safeStorage.encryptString(plaintext);
      const encrypted = buffer.toString('base64');
      logger.debug(`Encrypted ${plaintext.length} chars → ${encrypted.length} chars (base64)`);
      return encrypted;
    } catch (error) {
      logger.error('Encryption failed:', error);
      // Fallback: return unencrypted (better than losing data)
      logger.warn('Falling back to unencrypted storage');
      return plaintext;
    }
  }

  /**
   * Decrypt a string
   * @param {string} encrypted - Base64-encoded encrypted data
   * @returns {string} Decrypted plaintext, or original if not encrypted
   */
  decrypt(encrypted) {
    if (!this.isAvailable) {
      // Data was never encrypted
      return encrypted;
    }

    if (!encrypted || typeof encrypted !== 'string') {
      logger.error('Invalid encrypted data provided to decrypt()');
      return encrypted;
    }

    // Check if data is already plaintext (legacy data or fallback)
    if (!this.isEncrypted(encrypted)) {
      logger.debug('Data appears to be plaintext (not encrypted)');
      return encrypted;
    }

    try {
      const buffer = Buffer.from(encrypted, 'base64');
      const decrypted = safeStorage.decryptString(buffer);
      logger.debug(`Decrypted ${encrypted.length} chars (base64) → ${decrypted.length} chars`);
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      // If decryption fails, data might be corrupted or plaintext
      logger.warn('Returning data as-is (decryption failed)');
      return encrypted;
    }
  }

  /**
   * Encrypt an object (converts to JSON first)
   * @param {Object} obj - Object to encrypt
   * @returns {string} Encrypted JSON string
   */
  encryptObject(obj) {
    if (!obj) return null;

    try {
      const json = JSON.stringify(obj);
      return this.encrypt(json);
    } catch (error) {
      logger.error('Failed to encrypt object:', error);
      return JSON.stringify(obj); // Fallback
    }
  }

  /**
   * Decrypt an object (parses JSON after decryption)
   * @param {string} encrypted - Encrypted JSON string
   * @returns {Object} Decrypted object
   */
  decryptObject(encrypted) {
    if (!encrypted) return null;

    try {
      const json = this.decrypt(encrypted);
      return JSON.parse(json);
    } catch (error) {
      logger.error('Failed to decrypt object:', error);
      // Try parsing as-is (might be legacy unencrypted data)
      try {
        return JSON.parse(encrypted);
      } catch (parseError) {
        logger.error('Failed to parse as JSON:', parseError);
        return null;
      }
    }
  }

  /**
   * Encrypt an array of objects
   * @param {Array} array - Array of objects to encrypt
   * @returns {Array} Array of encrypted strings
   */
  encryptArray(array) {
    if (!Array.isArray(array)) return [];

    return array.map((item, index) => {
      try {
        return this.encryptObject(item);
      } catch (error) {
        logger.error(`Failed to encrypt array item ${index}:`, error);
        return JSON.stringify(item); // Fallback
      }
    });
  }

  /**
   * Decrypt an array of encrypted objects
   * @param {Array} encryptedArray - Array of encrypted strings
   * @returns {Array} Array of decrypted objects
   */
  decryptArray(encryptedArray) {
    if (!Array.isArray(encryptedArray)) return [];

    return encryptedArray.map((encrypted, index) => {
      try {
        return this.decryptObject(encrypted);
      } catch (error) {
        logger.error(`Failed to decrypt array item ${index}:`, error);
        return null;
      }
    }).filter(item => item !== null);
  }

  /**
   * Check if data appears to be encrypted (base64 check)
   * This is a heuristic - not 100% accurate but good enough
   * @param {string} data - Data to check
   * @returns {boolean} True if data appears encrypted
   */
  isEncrypted(data) {
    if (!data || typeof data !== 'string') return false;

    // Encrypted data is base64-encoded, which has a specific character set
    // and is usually much longer than plaintext JSON
    const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;

    // Check if it matches base64 pattern and is reasonably long
    if (base64Pattern.test(data) && data.length > 100) {
      return true;
    }

    // If it starts with '{' or '[', it's likely JSON (unencrypted)
    if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
      return false;
    }

    return false;
  }

  /**
   * Get encryption status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      available: this.isAvailable,
      platform: process.platform,
      method: this.isAvailable ? this.getEncryptionMethod() : 'none'
    };
  }

  /**
   * Get encryption method based on platform
   * @returns {string} Encryption method description
   */
  getEncryptionMethod() {
    switch (process.platform) {
      case 'darwin':
        return 'macOS Keychain Services (AES-256)';
      case 'win32':
        return 'Windows DPAPI (AES-256)';
      case 'linux':
        return 'libsecret / GNOME Keyring';
      default:
        return 'Unknown';
    }
  }
}

// Export singleton instance
module.exports = new EncryptionService();
