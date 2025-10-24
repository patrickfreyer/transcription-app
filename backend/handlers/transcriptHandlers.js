/**
 * Transcript IPC Handlers
 * Handle all transcript-related IPC communication
 */

const { ipcMain } = require('electron');
const TranscriptService = require('../services/TranscriptService');
const { createLogger } = require('../utils/logger');

const logger = createLogger('TranscriptHandlers');
const transcriptService = new TranscriptService();

/**
 * Register all transcript-related IPC handlers
 */
function registerTranscriptHandlers() {
  logger.info('Registering transcript IPC handlers');

  // Get all transcripts
  ipcMain.handle('get-transcripts', async () => {
    try {
      const transcripts = transcriptService.getAll();
      logger.info(`✓ Loaded ${transcripts.length} transcripts`);
      return { success: true, transcripts };
    } catch (error) {
      logger.error('Error loading transcripts:', error);
      return { success: false, error: error.message, transcripts: [] };
    }
  });

  // Save transcripts array (bulk update)
  ipcMain.handle('save-transcripts', async (event, transcripts) => {
    try {
      transcriptService.storage.saveTranscripts(transcripts);
      logger.success(`Saved ${transcripts.length} transcripts`);
      return { success: true };
    } catch (error) {
      logger.error('Error saving transcripts:', error);
      return { success: false, error: error.message };
    }
  });

  // Save a new transcript from recording (auto-save)
  ipcMain.handle('save-transcript-to-analysis', async (event, transcriptData) => {
    try {
      const savedTranscript = await transcriptService.saveFromRecording(transcriptData);
      logger.success(`Auto-saved transcript: ${savedTranscript.fileName}`);
      return {
        success: true,
        transcriptId: savedTranscript.id,
        transcript: savedTranscript
      };
    } catch (error) {
      logger.error('Error auto-saving transcript:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete a transcript
  ipcMain.handle('delete-transcript', async (event, transcriptId) => {
    try {
      const deleted = transcriptService.delete(transcriptId);
      if (deleted) {
        logger.success(`Deleted transcript: ${transcriptId}`);
        return { success: true };
      } else {
        return { success: false, error: 'Transcript not found' };
      }
    } catch (error) {
      logger.error('Error deleting transcript:', error);
      return { success: false, error: error.message };
    }
  });

  // Toggle star status
  ipcMain.handle('toggle-star-transcript', async (event, transcriptId) => {
    try {
      const updated = transcriptService.toggleStar(transcriptId);
      if (updated) {
        logger.info(`Toggled star: ${transcriptId}`);
        return { success: true, transcript: updated };
      } else {
        return { success: false, error: 'Transcript not found' };
      }
    } catch (error) {
      logger.error('Error toggling star:', error);
      return { success: false, error: error.message };
    }
  });

  // Update transcript
  ipcMain.handle('update-transcript', async (event, transcriptId, updates) => {
    try {
      const updated = transcriptService.update(transcriptId, updates);
      if (updated) {
        logger.info(`Updated transcript: ${transcriptId}`);
        return { success: true, transcript: updated };
      } else {
        return { success: false, error: 'Transcript not found' };
      }
    } catch (error) {
      logger.error('Error updating transcript:', error);
      return { success: false, error: error.message };
    }
  });

  logger.success('Transcript IPC handlers registered');
}

module.exports = {
  registerTranscriptHandlers
};
