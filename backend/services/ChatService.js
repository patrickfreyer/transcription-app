/**
 * ChatService - Handles chat operations using OpenAI Agents SDK
 */

const { Agent, run, setDefaultOpenAIKey } = require('@openai/agents');
const TranscriptService = require('./TranscriptService');
const StorageService = require('./StorageService');
const guardrails = require('../guardrails');
const { createLogger } = require('../utils/logger');

const logger = createLogger('ChatService');

class ChatService {
  constructor() {
    this.transcriptService = new TranscriptService();
    this.storage = new StorageService();
    this.agent = null;
    this.apiKey = null;

    logger.info('ChatService initialized');
  }

  /**
   * Initialize agent with API key
   * @param {string} apiKey - OpenAI API key
   */
  initializeAgent(apiKey) {
    if (!this.agent || this.apiKey !== apiKey) {
      this.apiKey = apiKey;

      // Set the API key globally for the Agents SDK
      logger.info('Setting default OpenAI API key for Agents SDK...');
      setDefaultOpenAIKey(apiKey);
      logger.info('API key set successfully');

      this.agent = new Agent({
        name: 'Transcript Analyst',
        instructions: `You are an expert AI assistant specialized in analyzing audio transcripts.

Your capabilities:
- Answer questions accurately based on transcript content
- Identify key themes, decisions, and action items
- Summarize discussions and meetings
- Compare multiple transcripts when provided
- Extract speaker insights from diarized transcripts

Guidelines:
- ONLY answer based on the provided transcript content
- If information isn't in the transcripts, state that clearly - do not make up information
- Cite specific speakers or timestamps when available
- Be concise but thorough in your responses
- Always provide evidence from the transcripts to support your answers`,
        model: 'gpt-4o',
        tools: [], // No tools for now - will add incrementally
        temperature: 0.7
      });
      logger.info('Agent initialized with GPT-4o model');
    }
  }

  /**
   * Build full transcript content for context
   * @param {Array} transcripts - Array of transcript objects
   * @returns {string} Full transcript content
   */
  buildTranscriptContext(transcripts) {
    if (!transcripts || transcripts.length === 0) {
      return 'No transcripts are currently available.';
    }

    const transcriptTexts = transcripts.map((t, index) => {
      const mins = Math.floor(t.duration / 60);
      const secs = t.duration % 60;
      return `\n=== TRANSCRIPT ${index + 1}: "${t.fileName}" (${mins}:${secs.toString().padStart(2, '0')}) ===\n\n${t.rawTranscript || 'No content available'}\n\n=== END OF TRANSCRIPT ${index + 1} ===\n`;
    });

    return transcriptTexts.join('\n');
  }

  /**
   * Send a chat message with streaming using Agents SDK
   * @param {Object} params - Message parameters
   * @param {Function} onToken - Callback for streaming tokens
   * @returns {Object} Response object
   */
  async sendMessage({ apiKey, transcriptId, userMessage, messageHistory = [], contextIds = [], onToken }) {
    try {
      // Initialize Agent
      this.initializeAgent(apiKey);

      // Get context transcripts
      const transcripts = contextIds.length > 0
        ? this.transcriptService.getByIds(contextIds)
        : [this.transcriptService.getById(transcriptId)].filter(Boolean);

      if (!transcripts || transcripts.length === 0) {
        throw new Error('No transcripts found for context');
      }

      // Run guardrails
      const context = {
        transcripts,
        transcriptMap: Object.fromEntries(transcripts.map(t => [t.id, t]))
      };

      // Check token limit
      const tokenCheck = guardrails.tokenLimit.validate(userMessage, context);
      if (!tokenCheck.valid) {
        return {
          success: false,
          error: tokenCheck.message
        };
      }

      // Check relevance
      const relevanceCheck = guardrails.relevance.validate(userMessage, context);
      if (!relevanceCheck.valid) {
        return {
          success: false,
          error: relevanceCheck.message
        };
      }

      logger.info(`Processing message with ${transcripts.length} transcript(s) in context`);

      // Build full context message with transcript content
      const transcriptContent = this.buildTranscriptContext(transcripts);

      // Build conversation history
      let conversationHistory = '';
      if (messageHistory.length > 0) {
        conversationHistory = '\n\nPrevious conversation:\n';
        messageHistory.forEach(msg => {
          conversationHistory += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
        });
      }

      // Combine context + history + current message
      const fullMessage = `${transcriptContent}${conversationHistory}

Current question: ${userMessage}`;

      logger.info('Starting streaming agent run...');

      // Run agent with streaming (API key already set globally)
      const stream = await run(this.agent, fullMessage, {
        stream: true
      });

      logger.info('Stream created, processing events...');

      let fullResponse = '';
      let eventCount = 0;
      let tokenCount = 0;

      // Process stream events
      for await (const event of stream) {
        eventCount++;

        // Log all event types for debugging
        logger.info(`Event #${eventCount}: type=${event.type}`);

        if (event.type === 'raw_model_stream_event') {
          logger.info(`Raw model event data type: ${event.data?.type}`);
          logger.info(`Event data: ${JSON.stringify(event.data).substring(0, 200)}`);

          // Extract text delta from the event
          if (event.data?.type === 'response.output_text.delta' && event.data?.delta) {
            const token = event.data.delta;
            fullResponse += token;
            tokenCount++;

            logger.info(`Token #${tokenCount}: "${token}"`);

            // Call onToken callback if provided
            if (onToken) {
              onToken(token);
            }
          }
        } else if (event.type === 'run_item_stream_event') {
          logger.info(`Run item event: ${event.name}, item type: ${event.item?.type}`);
        } else if (event.type === 'agent_updated_stream_event') {
          logger.info(`Agent updated: ${event.agent?.name}`);
        } else {
          logger.info(`Unknown event type: ${event.type}`);
        }
      }

      logger.info(`Stream loop ended. Total events: ${eventCount}, tokens: ${tokenCount}`);

      // Wait for completion
      await stream.completed;

      logger.success(`Response generated successfully with streaming. Final response length: ${fullResponse.length}`);

      return {
        success: true,
        message: fullResponse,
        metadata: {
          contextUsed: contextIds.length > 0 ? contextIds : [transcriptId]
        }
      };

    } catch (error) {
      logger.error('Chat error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate response'
      };
    }
  }

  /**
   * Save chat history for a transcript
   * @param {string} transcriptId - Transcript ID
   * @param {Array} messages - Message array
   */
  async saveChatHistory(transcriptId, messages) {
    const chatHistory = this.storage.getChatHistory();

    chatHistory[transcriptId] = {
      transcriptId,
      messages,
      createdAt: chatHistory[transcriptId]?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    this.storage.saveChatHistory(chatHistory);
    logger.info(`Saved chat history for transcript: ${transcriptId} (${messages.length} messages)`);
  }

  /**
   * Get chat history for a transcript
   * @param {string} transcriptId - Transcript ID
   * @returns {Object|null} Chat history or null
   */
  getChatHistory(transcriptId) {
    const chatHistory = this.storage.getChatHistory();
    return chatHistory[transcriptId] || null;
  }

  /**
   * Clear chat history for a transcript
   * @param {string} transcriptId - Transcript ID
   */
  clearChatHistory(transcriptId) {
    const chatHistory = this.storage.getChatHistory();
    delete chatHistory[transcriptId];
    this.storage.saveChatHistory(chatHistory);
    logger.info(`Cleared chat history for transcript: ${transcriptId}`);
  }

  /**
   * Get all chat history
   * @returns {Object} All chat history
   */
  getAllChatHistory() {
    return this.storage.getChatHistory();
  }
}

module.exports = ChatService;
