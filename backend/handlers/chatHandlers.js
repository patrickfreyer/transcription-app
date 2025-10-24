/**
 * Chat IPC Handlers
 * Handle all chat-related IPC communication
 */

const { ipcMain } = require('electron');
const keytar = require('keytar');
const ChatService = require('../services/ChatService');
const { createLogger } = require('../utils/logger');

const logger = createLogger('ChatHandlers');
const chatService = new ChatService();

// Keytar constants (MUST match main.js exactly!)
const SERVICE_NAME = 'Audio Transcription App';
const ACCOUNT_NAME = 'openai-api-key';

/**
 * Get API key from keytar
 */
async function getApiKey() {
  const apiKey = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
  if (!apiKey) {
    throw new Error('API key not found. Please set your OpenAI API key in settings.');
  }
  return apiKey;
}

/**
 * Register all chat-related IPC handlers
 */
function registerChatHandlers() {
  logger.info('Registering chat IPC handlers');

  // Chat with AI using Agents SDK with streaming
  ipcMain.on('chat-with-ai-stream', async (event, messages, systemPrompt, contextIds) => {
    logger.info('=== CHAT STREAM REQUEST RECEIVED ===');

    try {
      // Get API key
      logger.info('Getting API key...');
      const apiKey = await getApiKey();
      logger.info('API key retrieved');

      // Extract user message (last message in array)
      const userMessage = messages[messages.length - 1]?.content || '';

      // Extract transcript ID (first context ID or from messages)
      const transcriptId = contextIds && contextIds.length > 0 ? contextIds[0] : null;

      logger.info(`Transcript ID: ${transcriptId}`);
      logger.info(`Context IDs: ${JSON.stringify(contextIds)}`);
      logger.info(`User message: ${userMessage.substring(0, 100)}...`);

      if (!transcriptId) {
        logger.error('No transcript selected');
        event.sender.send('chat-stream-error', {
          error: 'No transcript selected'
        });
        return;
      }

      // Message history (exclude the current message)
      const messageHistory = messages.slice(0, -1);
      logger.info(`Message history length: ${messageHistory.length}`);

      logger.info('Calling ChatService.sendMessage with streaming...');

      let tokensSent = 0;

      // Call ChatService with streaming callback
      const result = await chatService.sendMessage({
        apiKey,
        transcriptId,
        userMessage,
        messageHistory,
        contextIds: contextIds || [transcriptId],
        onToken: (token) => {
          tokensSent++;
          logger.info(`Sending token #${tokensSent} to renderer: "${token.substring(0, 20)}..."`);
          // Send each token to the renderer
          event.sender.send('chat-stream-token', { token });
        }
      });

      logger.info(`ChatService.sendMessage completed. Success: ${result.success}, Tokens sent: ${tokensSent}`);

      if (result.success) {
        logger.success(`Chat response completed. Total tokens sent: ${tokensSent}`);
        event.sender.send('chat-stream-complete', {
          message: result.message,
          metadata: result.metadata
        });
      } else {
        logger.error(`Chat error: ${result.error}`);
        event.sender.send('chat-stream-error', {
          error: result.error
        });
      }

    } catch (error) {
      logger.error('Chat stream exception:', error);
      logger.error('Stack trace:', error.stack);
      event.sender.send('chat-stream-error', {
        error: error.message || 'Failed to get response from AI'
      });
    }

    logger.info('=== CHAT STREAM REQUEST COMPLETED ===');
  });

  // Get chat history
  ipcMain.handle('get-chat-history', async () => {
    try {
      const chatHistory = chatService.getAllChatHistory();
      const chatCount = Object.keys(chatHistory).length;
      logger.info(`✓ Loaded chat history for ${chatCount} transcript(s)`);
      return { success: true, chatHistory };
    } catch (error) {
      logger.error('Error loading chat history:', error);
      return { success: false, error: error.message, chatHistory: {} };
    }
  });

  // Save chat history
  ipcMain.handle('save-chat-history', async (event, chatHistory) => {
    try {
      chatService.storage.saveChatHistory(chatHistory);
      const chatCount = Object.keys(chatHistory).length;
      logger.success(`Saved chat history for ${chatCount} transcript(s)`);
      return { success: true };
    } catch (error) {
      logger.error('Error saving chat history:', error);
      return { success: false, error: error.message };
    }
  });

  // Clear chat history for a transcript
  ipcMain.handle('clear-chat-history', async (event, transcriptId) => {
    try {
      chatService.clearChatHistory(transcriptId);
      logger.info(`Cleared chat history: ${transcriptId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error clearing chat history:', error);
      return { success: false, error: error.message };
    }
  });

  logger.success('Chat IPC handlers registered');
}

module.exports = {
  registerChatHandlers
};
