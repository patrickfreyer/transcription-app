/**
 * TranscriptAnalystAgent
 * Main agent for analyzing transcripts and answering questions
 */

const { Agent } = require('@openai/agents');
const tools = require('../tools');
const guardrails = require('../guardrails');
const { createLogger } = require('../utils/logger');

const logger = createLogger('TranscriptAnalystAgent');

/**
 * Create the main Transcript Analyst agent
 * @param {string} apiKey - OpenAI API key
 * @returns {Agent} Configured agent
 */
function createTranscriptAnalystAgent(apiKey) {
  logger.info('Creating Transcript Analyst Agent');

  const agent = new Agent({
    name: 'Transcript Analyst',

    instructions: `You are an expert AI assistant specialized in analyzing audio transcripts.

Your capabilities:
- Answer questions accurately based on transcript content
- Identify key themes, decisions, and action items
- Summarize discussions and meetings
- Compare multiple transcripts when provided
- Extract speaker insights from diarized transcripts
- Search for specific information within transcripts

Guidelines:
- ONLY answer based on the provided transcript content
- If information isn't in the transcripts, state that clearly - do not make up information
- Cite specific speakers or timestamps when available (e.g., "Speaker 1 mentioned..." or "Around line 45...")
- Be concise but thorough in your responses
- Use tools to search and fetch transcript data efficiently instead of relying on memory
- When asked about multiple transcripts, use the compare_transcripts tool
- For diarized transcripts, use extract_speakers to get speaker information
- Always provide evidence from the transcripts to support your answers

Important:
- You have access to powerful tools - USE THEM! Don't try to remember entire transcripts.
- If a user asks about specific content, use search_transcript to find it.
- If a user asks for a section, use get_transcript_chunk to retrieve it.
- Your responses should be helpful, accurate, and based on real transcript data.`,

    model: 'gpt-4o',

    tools: [
      {
        type: 'function',
        function: {
          name: tools.getTranscriptChunk.name,
          description: tools.getTranscriptChunk.description,
          parameters: tools.getTranscriptChunk.parameters
        }
      },
      {
        type: 'function',
        function: {
          name: tools.searchTranscript.name,
          description: tools.searchTranscript.description,
          parameters: tools.searchTranscript.parameters
        }
      },
      {
        type: 'function',
        function: {
          name: tools.extractSpeakers.name,
          description: tools.extractSpeakers.description,
          parameters: tools.extractSpeakers.parameters
        }
      },
      {
        type: 'function',
        function: {
          name: tools.compareTranscripts.name,
          description: tools.compareTranscripts.description,
          parameters: tools.compareTranscripts.parameters
        }
      }
    ],

    temperature: 0.7,
    max_tokens: 2000
  });

  logger.success('Transcript Analyst Agent created successfully');
  return agent;
}

module.exports = {
  createTranscriptAnalystAgent
};
