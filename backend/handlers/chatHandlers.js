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

  // Chat with AI using new Agent SDK system
  ipcMain.handle('chat-with-ai', async (event, messages, systemPrompt, contextIds) => {
    try {
      // Get API key
      const apiKey = await getApiKey();

      // Extract user message (last message in array)
      const userMessage = messages[messages.length - 1]?.content || '';

      // Extract transcript ID (first context ID or from messages)
      const transcriptId = contextIds && contextIds.length > 0 ? contextIds[0] : null;

      if (!transcriptId) {
        return {
          success: false,
          error: 'No transcript selected'
        };
      }

      // Message history (exclude the current message)
      const messageHistory = messages.slice(0, -1);

      logger.info(`Chat request: ${userMessage.substring(0, 50)}...`);

      // Call ChatService
      const result = await chatService.sendMessage({
        apiKey,
        transcriptId,
        userMessage,
        messageHistory,
        contextIds: contextIds || [transcriptId]
      });

      if (result.success) {
        logger.success(`Chat response generated (${result.metadata?.iterations || 1} iterations, ${result.metadata?.toolCalls?.length || 0} tool calls)`);
      }

      return result;

    } catch (error) {
      logger.error('Chat error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get response from AI'
      };
    }
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
