const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { createLogger } = require('../utils/logger');

const logger = createLogger('BackupService');

class BackupService {
  constructor() {
    // Store backups in userData/backups directory
    this.backupDir = path.join(app.getPath('userData'), 'backups');
    this.maxBackups = 10; // Keep last 10 backups
    this.ensureBackupDir();
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      logger.info(`Created backup directory: ${this.backupDir}`);
    }
  }

  /**
   * Create backup of a file before modifying it
   * @param {string} sourceFilePath - Path to file to backup
   * @returns {string|null} - Path to backup file, or null if failed
   */
  createBackup(sourceFilePath) {
    try {
      // Check if source file exists
      if (!fs.existsSync(sourceFilePath)) {
        logger.warn(`Source file does not exist, skipping backup: ${sourceFilePath}`);
        return null;
      }

      // Generate backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
      const basename = path.basename(sourceFilePath, path.extname(sourceFilePath));
      const ext = path.extname(sourceFilePath);
      const backupFilename = `${basename}-${timestamp}${ext}`;
      const backupPath = path.join(this.backupDir, backupFilename);

      // Copy file to backup location
      fs.copyFileSync(sourceFilePath, backupPath);
      
      logger.info(`✓ Created backup: ${backupFilename}`);

      // Prune old backups to keep only last N
      this.pruneOldBackups();

      return backupPath;
    } catch (error) {
      logger.error(`Failed to create backup: ${error.message}`);
      return null;
    }
  }

  /**
   * Delete old backups, keeping only the most recent N backups
   */
  pruneOldBackups() {
    try {
      const backups = fs.readdirSync(this.backupDir)
        .filter(f => f.startsWith('config-') && f.endsWith('.json'))
        .map(f => ({
          name: f,
          path: path.join(this.backupDir, f),
          time: fs.statSync(path.join(this.backupDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time); // Sort by newest first

      // Delete all backups beyond maxBackups
      const toDelete = backups.slice(this.maxBackups);
      
      toDelete.forEach(backup => {
        fs.unlinkSync(backup.path);
        logger.debug(`Pruned old backup: ${backup.name}`);
      });

      if (toDelete.length > 0) {
        logger.info(`Pruned ${toDelete.length} old backup(s)`);
      }
    } catch (error) {
      logger.error(`Failed to prune backups: ${error.message}`);
    }
  }

  /**
   * Restore from most recent backup
   * @param {string} targetPath - Path where to restore the backup
   * @returns {boolean} - True if successful, false otherwise
   */
  restoreLatest(targetPath) {
    try {
      const backups = fs.readdirSync(this.backupDir)
        .filter(f => f.startsWith('config-') && f.endsWith('.json'))
        .map(f => ({
          path: path.join(this.backupDir, f),
          time: fs.statSync(path.join(this.backupDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time); // Sort by newest first

      if (backups.length === 0) {
        logger.error('No backups available to restore');
        return false;
      }

      const latestBackup = backups[0].path;
      fs.copyFileSync(latestBackup, targetPath);
      
      logger.info(`✓ Restored from backup: ${path.basename(latestBackup)}`);
      return true;
    } catch (error) {
      logger.error(`Failed to restore backup: ${error.message}`);
      return false;
    }
  }

  /**
   * Get list of available backups
   * @returns {Array} - Array of backup info objects
   */
  listBackups() {
    try {
      const backups = fs.readdirSync(this.backupDir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const filePath = path.join(this.backupDir, f);
          const stats = fs.statSync(filePath);
          return {
            name: f,
            path: filePath,
            size: stats.size,
            created: stats.mtime,
            sizeInKB: (stats.size / 1024).toFixed(2)
          };
        })
        .sort((a, b) => b.created.getTime() - a.created.getTime());

      return backups;
    } catch (error) {
      logger.error(`Failed to list backups: ${error.message}`);
      return [];
    }
  }
}

// Export singleton instance
module.exports = new BackupService();
