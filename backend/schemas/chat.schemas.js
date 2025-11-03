/**
 * Chat Handler Validation Schemas
 *
 * Zod schemas for all chat-related IPC handlers.
 */

const { z } = require('zod');
const {
  uuidSchema,
  transcriptIdSchema,
  chatMessageSchema
} = require('./index');

/**
 * chat-with-ai-stream Handler Schema
 * Input: Messages array, system prompt, context IDs, search flag
 */
const chatWithAiStreamSchema = z.object({
  messages: z.array(chatMessageSchema)
    .min(1, 'At least one message required')
    .refine(messages => {
      // Last message must be from user
      if (messages.length === 0) return false;
      const lastMessage = messages[messages.length - 1];
      return lastMessage.role === 'user';
    }, 'Last message must be from user'),

  systemPrompt: z.string()
    .optional()
    .nullable(),

  contextIds: z.array(transcriptIdSchema)
    .optional(),

  searchAllTranscripts: z.boolean()
    .default(false)
});

/**
 * save-chat-history Handler Schema
 * Input: Chat history object (keyed by transcript ID)
 */
const saveChatHistorySchema = z.object({
  chatHistory: z.record(
    z.string(), // Accept any string key (transcript IDs)
    z.object({
      messages: z.array(chatMessageSchema)
    })
  )
});

/**
 * clear-chat-history Handler Schema
 * Input: Transcript ID
 */
const clearChatHistorySchema = z.object({
  transcriptId: transcriptIdSchema
});

module.exports = {
  chatWithAiStreamSchema,
  saveChatHistorySchema,
  clearChatHistorySchema
};
