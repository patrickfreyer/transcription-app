/**
 * Handlers Index
 * Register all IPC handlers
 */

const { registerTranscriptHandlers } = require('./transcriptHandlers');
const { registerChatHandlers } = require('./chatHandlers');
const { createLogger } = require('../utils/logger');

const logger = createLogger('Handlers');

/**
 * Register all IPC handlers
 */
function registerAllHandlers() {
  logger.info('Registering all IPC handlers');

  try {
    registerTranscriptHandlers();
    registerChatHandlers();

    logger.success('All IPC handlers registered successfully');
  } catch (error) {
    logger.error('Error registering handlers:', error);
    throw error;
  }
}

module.exports = {
  registerAllHandlers,
  registerTranscriptHandlers,
  registerChatHandlers
};
