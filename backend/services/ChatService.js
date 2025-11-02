/**
 * ChatService - Handles chat operations using OpenAI Agents SDK
 */

const { Agent, run, setDefaultOpenAIKey, fileSearchTool } = require('@openai/agents');
const TranscriptService = require('./TranscriptService');
const StorageService = require('./StorageService');
const VectorStoreService = require('./VectorStoreService');
const guardrails = require('../guardrails');
const { createLogger } = require('../utils/logger');

const logger = createLogger('ChatService');

class ChatService {
  constructor() {
    this.transcriptService = new TranscriptService();
    this.storage = new StorageService();
    this.vectorStoreService = new VectorStoreService();
    this.agentDirect = null;    // Agent without fileSearchTool (for 1-10 specific transcripts)
    this.agentRAG = null;        // Agent with fileSearchTool (for "All Transcripts" search)
    this.apiKey = null;

    logger.info('ChatService initialized');
  }

  /**
   * Initialize both agents (direct and RAG)
   * @param {string} apiKey - OpenAI API key
   */
  async initializeAgents(apiKey) {
    if (this.apiKey !== apiKey) {
      this.apiKey = apiKey;

      // Set the API key globally for the Agents SDK
      logger.info('Setting default OpenAI API key for Agents SDK...');
      setDefaultOpenAIKey(apiKey);
      logger.info('API key set successfully');
    }

    // Initialize Direct Mode Agent (no fileSearchTool)
    if (!this.agentDirect) {
      this.agentDirect = new Agent({
        name: 'Transcript Analyst',
        instructions: `You are an expert AI assistant specialized in analyzing audio transcripts.

Your capabilities:
- Answer questions accurately based on the specific transcripts provided in the context
- Identify key themes, decisions, and action items
- Summarize discussions and meetings
- Compare transcripts when multiple are provided
- Extract speaker insights from diarized transcripts

Guidelines:
- ONLY answer based on the transcripts provided in the context below
- Do not search for or reference transcripts not in the context
- If information isn't in the provided transcripts, state that clearly
- Cite specific transcript names, speakers, or timestamps when providing answers
- Be concise but thorough in your responses
- Always provide evidence from the transcripts to support your answers`,
        model: 'gpt-4.1-mini',
        tools: [],  // NO fileSearchTool - direct context only
        temperature: 0.2
      });
      logger.info('Direct mode agent initialized (no fileSearchTool)');
    }

    // RAG Mode disabled - comment out initialization
    // if (!this.agentRAG) {
    //   try {
    //     await this.vectorStoreService.initialize(apiKey);
    //     const vectorStoreId = this.vectorStoreService.getVectorStoreId();
    //
    //     if (vectorStoreId) {
    //       this.agentRAG = new Agent({
    //         name: 'Transcript Analyst',
    //         instructions: `You are an expert AI assistant specialized in analyzing audio transcripts...`,
    //         model: 'gpt-5',
    //         tools: [fileSearchTool(vectorStoreId, { max_num_results: 5 })],
    //         temperature: 0.2
    //       });
    //       logger.info(`RAG mode agent initialized with fileSearchTool (vector store: ${vectorStoreId})`);
    //     } else {
    //       logger.warn('Vector store not available, RAG mode agent not initialized');
    //     }
    //   } catch (error) {
    //     logger.error('Failed to initialize RAG mode agent:', error);
    //   }
    // }
    logger.info('RAG mode disabled - skipping agentRAG initialization');
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
   * Routes to either direct or RAG mode based on searchAllTranscripts flag
   * @param {Object} params - Message parameters
   * @param {Function} onToken - Callback for streaming tokens
   * @returns {Object} Response object
   */
  async sendMessage({ apiKey, transcriptId, userMessage, messageHistory = [], contextIds = [], searchAllTranscripts = false, onToken }) {
    try {
      // Initialize both agents
      await this.initializeAgents(apiKey);

      // Route to appropriate mode
      if (searchAllTranscripts) {
        logger.info('Routing to RAG mode (All Transcripts)');
        return await this.sendMessageRAG({ userMessage, messageHistory, onToken });
      } else {
        logger.info('Routing to Direct mode (Specific Transcripts)');
        return await this.sendMessageDirect({ transcriptId, userMessage, messageHistory, contextIds, onToken });
      }
    } catch (error) {
      logger.error('Chat error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate response'
      };
    }
  }

  /**
   * Direct Mode: Send message with full transcripts in context (1-10 transcripts)
   * @param {Object} params - Message parameters
   * @returns {Object} Response object
   */
  async sendMessageDirect({ transcriptId, userMessage, messageHistory = [], contextIds = [], onToken }) {
    try {
      if (!this.agentDirect) {
        throw new Error('Direct mode agent not initialized');
      }

      // Get context transcripts (metadata only)
      const transcriptMetadata = contextIds.length > 0
        ? this.transcriptService.getByIds(contextIds)
        : [this.transcriptService.getById(transcriptId)].filter(Boolean);

      if (!transcriptMetadata || transcriptMetadata.length === 0) {
        throw new Error('No transcripts found for context');
      }

      logger.info(`Processing ${transcriptMetadata.length} transcript(s) in direct mode`);

      // Load full content for transcripts (decompress if needed)
      logger.info('Loading transcript content from compressed storage...');
      const transcripts = await Promise.all(
        transcriptMetadata.map(async (meta) => {
          if (meta.hasVTTFile) {
            // New compressed format - load content on-demand
            return await this.transcriptService.getWithContent(meta.id);
          } else {
            // Legacy format - content already in metadata
            return meta;
          }
        })
      );
      logger.info(`✓ Loaded content for ${transcripts.length} transcript(s)`);

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

      logger.info(`Processing message in Direct mode with ${transcripts.length} transcript(s)`);

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

      logger.info('Starting streaming agent run (Direct mode)...');

      // Run agent with streaming (API key already set globally)
      const stream = await run(this.agentDirect, fullMessage, {
        stream: true
      });

      logger.info('Stream created, processing events...');

      let fullResponse = '';
      let eventCount = 0;
      let tokenCount = 0;

      // Process stream events
      for await (const event of stream) {
        eventCount++;

        if (event.type === 'raw_model_stream_event') {
          // Extract text delta from the event
          if (event.data?.type === 'output_text_delta' && event.data?.delta) {
            const token = event.data.delta;
            fullResponse += token;
            tokenCount++;

            // Call onToken callback if provided
            if (onToken) {
              onToken(token);
            }
          }
        }
      }

      logger.info(`Stream loop ended. Total events: ${eventCount}, tokens: ${tokenCount}`);

      // Wait for completion
      await stream.completed;

      logger.success(`Response generated successfully with streaming (Direct mode). Final response length: ${fullResponse.length}`);

      return {
        success: true,
        message: fullResponse,
        metadata: {
          contextUsed: contextIds.length > 0 ? contextIds : [transcriptId],
          mode: 'direct'
        }
      };

    } catch (error) {
      logger.error('Direct mode chat error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate response'
      };
    }
  }

  /**
   * RAG Mode: Send message using fileSearchTool (All Transcripts)
   * @param {Object} params - Message parameters
   * @returns {Object} Response object
   */
  async sendMessageRAG({ userMessage, messageHistory = [], onToken }) {
    try {
      if (!this.agentRAG) {
        return {
          success: false,
          error: 'RAG mode not available. Please ensure transcripts are uploaded to vector store.'
        };
      }

      logger.info('Processing message in RAG mode (All Transcripts)');

      // Build lightweight prompt (no transcript content - agent will use fileSearchTool)
      let conversationHistory = '';
      if (messageHistory.length > 0) {
        conversationHistory = 'Previous conversation:\n';
        messageHistory.forEach(msg => {
          conversationHistory += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
        });
        conversationHistory += '\n';
      }

      const fullMessage = `${conversationHistory}Current question: ${userMessage}`;

      logger.info('Starting streaming agent run (RAG mode)...');

      // Run agent with streaming (will automatically use fileSearchTool)
      const stream = await run(this.agentRAG, fullMessage, {
        stream: true
      });

      logger.info('Stream created, processing events...');

      let fullResponse = '';
      let eventCount = 0;
      let tokenCount = 0;

      // Process stream events
      for await (const event of stream) {
        eventCount++;

        if (event.type === 'raw_model_stream_event') {
          // Extract text delta from the event
          if (event.data?.type === 'output_text_delta' && event.data?.delta) {
            const token = event.data.delta;
            fullResponse += token;
            tokenCount++;

            // Call onToken callback if provided
            if (onToken) {
              onToken(token);
            }
          }
        }
      }

      logger.info(`Stream loop ended. Total events: ${eventCount}, tokens: ${tokenCount}`);

      // Wait for completion
      await stream.completed;

      logger.success(`Response generated successfully with streaming (RAG mode). Final response length: ${fullResponse.length}`);

      return {
        success: true,
        message: fullResponse,
        metadata: {
          mode: 'rag'
        }
      };

    } catch (error) {
      logger.error('RAG mode chat error:', error);
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
