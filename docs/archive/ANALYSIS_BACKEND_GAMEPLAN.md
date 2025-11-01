# Analysis Tab Backend & OpenAI Agents SDK Implementation Game Plan

## Executive Summary

This document outlines a comprehensive plan to:
1. **Auto-save transcripts** from Recording tab to Analysis tab storage
2. **Migrate chat system** from basic OpenAI Chat Completions to **OpenAI Agents SDK**
3. **Organize backend code** into a dedicated modular structure
4. **Enable multi-transcript context** with intelligent agent-based analysis

---

## Part 1: Current State Review

### What's Already Built

#### Frontend (Analysis Tab)
✅ **Complete UI Implementation:**
- 3-column resizable layout (Sidebar | Viewer | Chat)
- Transcript list with search, filtering (All/Starred/Recent), and metadata cards
- TranscriptViewer for displaying raw transcript and summaries
- ChatPanel with context selection, suggested questions, and message history
- All 19 components fully functional

#### State Management (AppContext.jsx)
✅ **Complete State System:**
- `transcripts` array with full CRUD operations
- `chatHistory` object keyed by transcript ID
- `selectedContextIds` for multi-transcript chat
- Functions: `loadTranscripts()`, `saveTranscript()`, `deleteTranscript()`, `toggleStarTranscript()`
- Functions: `sendChatMessage()`, `clearChatHistory()`, `buildSystemPrompt()`

#### Backend (main.js)
✅ **Basic IPC Handlers:**
- `save-transcripts` / `get-transcripts` - electron-store persistence
- `save-chat-history` / `get-chat-history` - chat state persistence
- `chat-with-ai` - **Simple Chat Completions API** (current implementation)

#### Data Storage
✅ **electron-store Configuration:**
- Location: `~/Library/Application Support/transcription-app-2.0.0/config.json` (macOS)
- Schema:
  ```json
  {
    "transcripts": [],
    "chatHistory": {},
    "summary-templates": []
  }
  ```

### What's Missing

❌ **Auto-save Integration:**
- No connection between Recording tab and Analysis tab
- Transcripts created in Recording tab are NOT saved to Analysis storage
- Need to hook into transcription completion flow

❌ **Basic Chat Implementation:**
- Current `chat-with-ai` uses simple Chat Completions API
- No agentic capabilities (no tool use, no streaming, no handoffs)
- Context passed as giant system prompt (inefficient for large transcripts)
- No guardrails or validation

❌ **Backend Organization:**
- All logic crammed into `main.js` (1000+ lines)
- No separation of concerns
- Hard to test and maintain

---

## Part 2: OpenAI Agents SDK - Deep Dive

### Why Agents SDK?

**OpenAI's Strategic Direction:**
- Assistants API being phased out by **mid-2026**
- Agents SDK is the future: lightweight, flexible, production-ready
- Works with Responses API and Chat Completions API
- Supports multi-model providers (not just OpenAI)

### Key Capabilities

#### 1. **Agents**
LLM instances configured with:
- **Instructions**: Behavior guidelines
- **Tools**: Functions the agent can call
- **Guardrails**: Input/output validation
- **Handoffs**: Delegation to other agents

```javascript
const agent = new Agent({
  name: 'Transcript Analyst',
  instructions: 'You analyze audio transcripts and answer questions accurately.',
  tools: [searchTranscriptTool, summarizeTool],
  model: 'gpt-4o'
});
```

#### 2. **Tools** (Function Calling)
Define custom functions with Zod schemas:

```javascript
import { z } from 'zod';
import { tool } from '@openai/agents';

const searchTranscriptTool = tool({
  name: 'search_transcript',
  description: 'Search for specific content within transcripts',
  parameters: z.object({
    query: z.string(),
    transcriptId: z.string().optional()
  }),
  execute: async (input) => {
    // Search logic
    return { results: [...] };
  }
});
```

**Benefits for our use case:**
- **Chunked context loading**: Instead of dumping entire transcripts in system prompt, agent can call tools to fetch specific sections
- **Better token efficiency**: Only load relevant parts on-demand
- **Structured outputs**: Agent returns validated responses

#### 3. **Handoffs** (Multi-Agent Workflows)
Agents can delegate tasks:

```javascript
const summaryAgent = new Agent({
  name: 'Summary Agent',
  instructions: 'Generate concise summaries',
  handoffDescription: 'Handles summarization requests'
});

const mainAgent = new Agent({
  name: 'Main Agent',
  instructions: 'Route user requests appropriately',
  handoffs: [summaryAgent]
});
```

**For our app:**
- Main chat agent for questions
- Specialized agent for summaries
- Specialized agent for action item extraction
- Specialized agent for speaker identification

#### 4. **Guardrails**
Validate inputs/outputs:

```javascript
import { InputGuardrail } from '@openai/agents';

const profanityGuardrail = new InputGuardrail({
  name: 'Profanity Filter',
  validate: (input) => {
    if (containsProfanity(input)) {
      return { valid: false, message: 'Inappropriate content detected' };
    }
    return { valid: true };
  }
});

const agent = new Agent({
  name: 'Safe Agent',
  inputGuardrails: [profanityGuardrail]
});
```

**For our app:**
- Token limit validation (prevent overloading context)
- Question relevance check (ensure questions are about transcripts)
- PII detection (warn if user shares sensitive info)

#### 5. **Tracing & Observability**
Built-in debugging:

```javascript
import { run, trace } from '@openai/agents';

const result = await run(agent, userInput);

// Access trace data
console.log(trace.spans); // All agent operations
console.log(trace.toolCalls); // Which tools were invoked
console.log(trace.tokenUsage); // Token consumption
```

**For our app:**
- Debug chat failures
- Optimize token usage
- Monitor agent performance
- Track which transcripts are accessed most

#### 6. **Streaming Responses**
Real-time output:

```javascript
const stream = await agent.stream('Your question here');

for await (const chunk of stream) {
  console.log(chunk.content);
}
```

**For our app:**
- Show typing indicator
- Stream responses as they generate
- Better UX for long answers

---

## Part 3: Proposed Architecture

### Backend Folder Structure

```
transcription-app-2.0.0/
├── main.js (keep lightweight - only Electron setup)
├── preload.js
├── backend/
│   ├── agents/
│   │   ├── TranscriptAnalystAgent.js      # Main chat agent
│   │   ├── SummaryAgent.js                # Specialized for summaries
│   │   ├── ActionItemAgent.js             # Extract action items
│   │   ├── SpeakerAnalysisAgent.js        # Speaker insights
│   │   └── index.js                       # Export all agents
│   ├── tools/
│   │   ├── searchTranscript.tool.js       # Search within transcript
│   │   ├── getTranscriptChunk.tool.js     # Fetch specific sections
│   │   ├── compareTranscripts.tool.js     # Compare multiple transcripts
│   │   ├── extractSpeakers.tool.js        # Get speaker list
│   │   └── index.js                       # Export all tools
│   ├── guardrails/
│   │   ├── tokenLimit.guardrail.js        # Prevent token overflow
│   │   ├── relevance.guardrail.js         # Ensure on-topic questions
│   │   └── index.js
│   ├── services/
│   │   ├── TranscriptService.js           # Transcript CRUD operations
│   │   ├── ChatService.js                 # Chat logic with Agents SDK
│   │   ├── StorageService.js              # electron-store wrapper
│   │   └── index.js
│   ├── handlers/
│   │   ├── transcriptHandlers.js          # IPC handlers for transcripts
│   │   ├── chatHandlers.js                # IPC handlers for chat
│   │   ├── recordingHandlers.js           # IPC handlers for recordings
│   │   └── index.js
│   └── utils/
│       ├── tokenCounter.js                # Estimate token usage
│       ├── transcriptChunker.js           # Split transcripts into chunks
│       └── logger.js                      # Enhanced logging
├── src/ (frontend - unchanged)
└── package.json
```

### Service Layer Design

#### 1. **TranscriptService.js**

Handles all transcript operations:

```javascript
// backend/services/TranscriptService.js
import StorageService from './StorageService.js';
import { estimateTokens } from '../utils/tokenCounter.js';

class TranscriptService {
  constructor() {
    this.storage = new StorageService();
  }

  /**
   * Save a new transcript from recording
   */
  async saveFromRecording(transcriptData) {
    const transcript = {
      id: `transcript-${Date.now()}`,
      fileName: transcriptData.fileName,
      rawTranscript: transcriptData.rawTranscript,
      vttTranscript: transcriptData.vttTranscript,
      summary: transcriptData.summary,
      summaryTemplate: transcriptData.summaryTemplate,
      model: transcriptData.model,
      duration: transcriptData.duration,
      timestamp: transcriptData.timestamp,
      isDiarized: transcriptData.isDiarized || false,
      fileSize: transcriptData.fileSize,
      starred: false,
      tags: [],
      tokens: estimateTokens(transcriptData.rawTranscript),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const transcripts = await this.storage.getTranscripts();
    transcripts.unshift(transcript); // Add to beginning
    await this.storage.saveTranscripts(transcripts);

    console.log(`✓ Saved transcript: ${transcript.fileName} (${transcript.tokens} tokens)`);
    return transcript;
  }

  /**
   * Get all transcripts
   */
  async getAll() {
    return await this.storage.getTranscripts();
  }

  /**
   * Get transcript by ID
   */
  async getById(transcriptId) {
    const transcripts = await this.storage.getTranscripts();
    return transcripts.find(t => t.id === transcriptId);
  }

  /**
   * Get multiple transcripts by IDs (for multi-context chat)
   */
  async getByIds(transcriptIds) {
    const transcripts = await this.storage.getTranscripts();
    return transcripts.filter(t => transcriptIds.includes(t.id));
  }

  /**
   * Update transcript
   */
  async update(transcriptId, updates) {
    const transcripts = await this.storage.getTranscripts();
    const index = transcripts.findIndex(t => t.id === transcriptId);

    if (index === -1) {
      throw new Error(`Transcript not found: ${transcriptId}`);
    }

    transcripts[index] = {
      ...transcripts[index],
      ...updates,
      updatedAt: Date.now()
    };

    await this.storage.saveTranscripts(transcripts);
    return transcripts[index];
  }

  /**
   * Delete transcript
   */
  async delete(transcriptId) {
    const transcripts = await this.storage.getTranscripts();
    const filtered = transcripts.filter(t => t.id !== transcriptId);
    await this.storage.saveTranscripts(filtered);

    // Also delete associated chat history
    const chatHistory = await this.storage.getChatHistory();
    delete chatHistory[transcriptId];
    await this.storage.saveChatHistory(chatHistory);

    console.log(`✓ Deleted transcript: ${transcriptId}`);
  }

  /**
   * Toggle star status
   */
  async toggleStar(transcriptId) {
    const transcripts = await this.storage.getTranscripts();
    const index = transcripts.findIndex(t => t.id === transcriptId);

    if (index !== -1) {
      transcripts[index].starred = !transcripts[index].starred;
      transcripts[index].updatedAt = Date.now();
      await this.storage.saveTranscripts(transcripts);
      return transcripts[index];
    }
  }
}

export default TranscriptService;
```

#### 2. **ChatService.js** (WITH AGENTS SDK)

The heart of the new implementation:

```javascript
// backend/services/ChatService.js
import { Agent, run } from '@openai/agents';
import { z } from 'zod';
import TranscriptService from './TranscriptService.js';
import StorageService from './StorageService.js';
import * as tools from '../tools/index.js';
import * as guardrails from '../guardrails/index.js';

class ChatService {
  constructor() {
    this.transcriptService = new TranscriptService();
    this.storage = new StorageService();

    // Initialize main agent
    this.mainAgent = this.createMainAgent();
  }

  /**
   * Create the main transcript analyst agent
   */
  createMainAgent() {
    return new Agent({
      name: 'Transcript Analyst',
      instructions: `You are an expert AI assistant specialized in analyzing audio transcripts.

Your capabilities:
- Answer questions accurately based on transcript content
- Identify key themes, decisions, and action items
- Summarize discussions and meetings
- Compare multiple transcripts when provided
- Extract speaker insights from diarized transcripts

Guidelines:
- Only answer based on the provided transcript content
- If information isn't in the transcripts, state that clearly
- Cite specific speakers or timestamps when available
- Be concise but thorough
- Use tools to search and fetch transcript data efficiently`,

      model: 'gpt-4o',

      tools: [
        tools.getTranscriptChunk,
        tools.searchTranscript,
        tools.compareTranscripts,
        tools.extractSpeakers
      ],

      inputGuardrails: [
        guardrails.tokenLimit,
        guardrails.relevance
      ],

      temperature: 0.7,
      maxTokens: 2000
    });
  }

  /**
   * Send a chat message using Agents SDK
   */
  async sendMessage({
    transcriptId,
    userMessage,
    messageHistory = [],
    contextIds = []
  }) {
    try {
      // Get context transcripts
      const transcripts = contextIds.length > 0
        ? await this.transcriptService.getByIds(contextIds)
        : [await this.transcriptService.getById(transcriptId)];

      if (!transcripts || transcripts.length === 0) {
        throw new Error('No transcripts found for context');
      }

      // Build agent context (lightweight - actual transcripts fetched via tools)
      const contextSummary = this.buildContextSummary(transcripts);

      // Prepare messages with context
      const fullMessage = `${contextSummary}\n\nUser Question: ${userMessage}`;

      // Run agent with message history
      const result = await run(this.mainAgent, fullMessage, {
        messageHistory: messageHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),

        // Inject transcript data for tool access
        context: {
          transcripts: transcripts,
          transcriptMap: Object.fromEntries(
            transcripts.map(t => [t.id, t])
          )
        }
      });

      console.log('✓ Agent response generated');
      console.log('📊 Tools used:', result.toolCalls?.length || 0);
      console.log('🪙 Tokens used:', result.usage?.totalTokens || 'N/A');

      return {
        success: true,
        message: result.finalOutput,
        metadata: {
          toolCalls: result.toolCalls || [],
          tokenUsage: result.usage,
          contextUsed: contextIds
        }
      };

    } catch (error) {
      console.error('❌ Chat error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate response'
      };
    }
  }

  /**
   * Build a lightweight context summary (not full transcripts)
   */
  buildContextSummary(transcripts) {
    const summaries = transcripts.map(t => {
      return `- ${t.fileName} (${Math.floor(t.duration / 60)}min, ${t.tokens} tokens)`;
    });

    return `You have access to ${transcripts.length} transcript(s):\n${summaries.join('\n')}\n\nUse tools to fetch specific content as needed.`;
  }

  /**
   * Stream a chat response (real-time)
   */
  async *streamMessage({ transcriptId, userMessage, messageHistory = [], contextIds = [] }) {
    const transcripts = contextIds.length > 0
      ? await this.transcriptService.getByIds(contextIds)
      : [await this.transcriptService.getById(transcriptId)];

    const contextSummary = this.buildContextSummary(transcripts);
    const fullMessage = `${contextSummary}\n\nUser Question: ${userMessage}`;

    const stream = await this.mainAgent.stream(fullMessage, {
      messageHistory: messageHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      context: {
        transcripts: transcripts,
        transcriptMap: Object.fromEntries(transcripts.map(t => [t.id, t]))
      }
    });

    for await (const chunk of stream) {
      yield chunk;
    }
  }

  /**
   * Save chat history
   */
  async saveChatHistory(transcriptId, messages) {
    const chatHistory = await this.storage.getChatHistory();

    chatHistory[transcriptId] = {
      transcriptId,
      messages,
      createdAt: chatHistory[transcriptId]?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    await this.storage.saveChatHistory(chatHistory);
  }

  /**
   * Get chat history
   */
  async getChatHistory(transcriptId) {
    const chatHistory = await this.storage.getChatHistory();
    return chatHistory[transcriptId] || null;
  }

  /**
   * Clear chat history
   */
  async clearChatHistory(transcriptId) {
    const chatHistory = await this.storage.getChatHistory();
    delete chatHistory[transcriptId];
    await this.storage.saveChatHistory(chatHistory);
  }
}

export default ChatService;
```

#### 3. **StorageService.js**

Wrapper for electron-store:

```javascript
// backend/services/StorageService.js
import Store from 'electron-store';

class StorageService {
  constructor() {
    this.store = new Store({
      defaults: {
        transcripts: [],
        chatHistory: {},
        'summary-templates': []
      }
    });
  }

  async getTranscripts() {
    return this.store.get('transcripts', []);
  }

  async saveTranscripts(transcripts) {
    this.store.set('transcripts', transcripts);
  }

  async getChatHistory() {
    return this.store.get('chatHistory', {});
  }

  async saveChatHistory(chatHistory) {
    this.store.set('chatHistory', chatHistory);
  }

  async getSummaryTemplates() {
    return this.store.get('summary-templates', []);
  }

  async saveSummaryTemplates(templates) {
    this.store.set('summary-templates', templates);
  }
}

export default StorageService;
```

---

## Part 4: Tool Definitions

### Example: getTranscriptChunk.tool.js

```javascript
// backend/tools/getTranscriptChunk.tool.js
import { tool } from '@openai/agents';
import { z } from 'zod';

export const getTranscriptChunk = tool({
  name: 'get_transcript_chunk',
  description: 'Fetch a specific portion of a transcript by time range or line numbers. Use this to load transcript content on-demand instead of loading everything at once.',

  parameters: z.object({
    transcriptId: z.string().describe('ID of the transcript to fetch from'),
    startTime: z.number().optional().describe('Start time in seconds (for VTT transcripts)'),
    endTime: z.number().optional().describe('End time in seconds (for VTT transcripts)'),
    startLine: z.number().optional().describe('Start line number (for raw transcripts)'),
    endLine: z.number().optional().describe('End line number (for raw transcripts)')
  }),

  execute: async (input, context) => {
    const { transcriptId, startTime, endTime, startLine, endLine } = input;
    const transcript = context.transcriptMap[transcriptId];

    if (!transcript) {
      return { error: 'Transcript not found' };
    }

    // If time-based (VTT)
    if (startTime !== undefined && endTime !== undefined) {
      const vttLines = transcript.vttTranscript.split('\n');
      const filtered = vttLines.filter(line => {
        const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2})/);
        if (timeMatch) {
          const lineTime = parseInt(timeMatch[1]) * 3600 +
                          parseInt(timeMatch[2]) * 60 +
                          parseInt(timeMatch[3]);
          return lineTime >= startTime && lineTime <= endTime;
        }
        return false;
      });
      return {
        chunk: filtered.join('\n'),
        source: `${transcript.fileName} (${startTime}s - ${endTime}s)`
      };
    }

    // If line-based (raw)
    if (startLine !== undefined && endLine !== undefined) {
      const lines = transcript.rawTranscript.split('\n');
      const chunk = lines.slice(startLine - 1, endLine).join('\n');
      return {
        chunk,
        source: `${transcript.fileName} (lines ${startLine}-${endLine})`
      };
    }

    // Default: return first 100 lines
    const lines = transcript.rawTranscript.split('\n');
    return {
      chunk: lines.slice(0, 100).join('\n'),
      source: `${transcript.fileName} (preview)`
    };
  }
});
```

### Example: searchTranscript.tool.js

```javascript
// backend/tools/searchTranscript.tool.js
import { tool } from '@openai/agents';
import { z } from 'zod';

export const searchTranscript = tool({
  name: 'search_transcript',
  description: 'Search for specific keywords or phrases within one or more transcripts. Returns matching excerpts with context.',

  parameters: z.object({
    query: z.string().describe('Search query (keywords or phrase)'),
    transcriptIds: z.array(z.string()).optional().describe('Specific transcript IDs to search (if empty, searches all context transcripts)'),
    contextLines: z.number().optional().describe('Number of surrounding lines to include (default 2)')
  }),

  execute: async (input, context) => {
    const { query, transcriptIds, contextLines = 2 } = input;
    const transcriptsToSearch = transcriptIds
      ? transcriptIds.map(id => context.transcriptMap[id]).filter(Boolean)
      : context.transcripts;

    const results = [];

    for (const transcript of transcriptsToSearch) {
      const lines = transcript.rawTranscript.split('\n');
      const matches = [];

      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(query.toLowerCase())) {
          const start = Math.max(0, index - contextLines);
          const end = Math.min(lines.length, index + contextLines + 1);
          const excerpt = lines.slice(start, end).join('\n');

          matches.push({
            lineNumber: index + 1,
            excerpt,
            transcriptName: transcript.fileName
          });
        }
      });

      if (matches.length > 0) {
        results.push({
          transcriptId: transcript.id,
          transcriptName: transcript.fileName,
          matches
        });
      }
    }

    return {
      query,
      totalMatches: results.reduce((sum, r) => sum + r.matches.length, 0),
      results
    };
  }
});
```

---

## Part 5: Guardrails

### Example: tokenLimit.guardrail.js

```javascript
// backend/guardrails/tokenLimit.guardrail.js
import { InputGuardrail } from '@openai/agents';
import { estimateTokens } from '../utils/tokenCounter.js';

export const tokenLimit = new InputGuardrail({
  name: 'Token Limit Check',
  description: 'Prevents context overload by validating total token count',

  validate: (input, context) => {
    const totalTokens = context.transcripts.reduce(
      (sum, t) => sum + (t.tokens || 0),
      0
    );

    const inputTokens = estimateTokens(input);
    const total = totalTokens + inputTokens;

    const SAFE_LIMIT = 100000; // 100k tokens

    if (total > SAFE_LIMIT) {
      return {
        valid: false,
        message: `Token limit exceeded (${total} > ${SAFE_LIMIT}). Please reduce context or use fewer transcripts.`
      };
    }

    return { valid: true };
  }
});
```

---

## Part 6: Integration Flow

### Recording → Analysis Integration

**Current Flow:**
```
User records audio → Transcribe → Result displayed in Recording tab → ❌ NOT saved to Analysis
```

**New Flow:**
```
User records audio
  → Transcribe
  → Result displayed in Recording tab
  → ✅ Auto-save to Analysis via TranscriptService
  → Show toast notification "Transcript saved to Analysis"
  → Option to "View in Analysis" button
```

**Implementation Location:**
`src/components/Recording/RecordingPanel.jsx` - Line 360 in `handleTranscribe()`

```javascript
// After successful transcription (around line 360)
const result = {
  rawTranscript,
  summary,
  summaryTemplate: summaryTemplateName,
  model: selectedModel,
  fileName: selectedFile?.name || 'Recording',
  duration: recordingDuration || 0,
  timestamp: Date.now(),
  vttTranscript: transcriptionResult.transcript, // ADD THIS
  isDiarized: transcriptionResult.isDiarized || false,
  fileSize: selectedFile ? selectedFile.size / (1024 * 1024) : null
};

// Store in global context for Analysis tab (existing)
setTranscription(result);

// ✅ NEW: Also save to Analysis tab storage
try {
  const transcriptId = await window.electron.saveTranscriptToAnalysis(result);
  console.log('✓ Transcript auto-saved to Analysis:', transcriptId);

  // Show success notification (optional)
  // toast.success('Transcript saved to Analysis tab!');
} catch (error) {
  console.error('Failed to auto-save transcript:', error);
  // Show error but don't block - user can still view in Recording tab
}
```

**New IPC Handler:**
```javascript
// backend/handlers/transcriptHandlers.js
ipcMain.handle('save-transcript-to-analysis', async (event, transcriptData) => {
  try {
    const transcriptService = new TranscriptService();
    const savedTranscript = await transcriptService.saveFromRecording(transcriptData);
    return { success: true, transcriptId: savedTranscript.id };
  } catch (error) {
    console.error('Error auto-saving transcript:', error);
    return { success: false, error: error.message };
  }
});
```

---

## Part 7: Step-by-Step Implementation Roadmap

### Phase 1: Backend Setup (2-3 hours)

**Task 1.1: Install Dependencies**
```bash
npm install @openai/agents zod@3
```

**Task 1.2: Create Folder Structure**
```bash
mkdir -p backend/{agents,tools,guardrails,services,handlers,utils}
touch backend/agents/index.js
touch backend/tools/index.js
touch backend/guardrails/index.js
touch backend/services/{TranscriptService.js,ChatService.js,StorageService.js,index.js}
touch backend/handlers/{transcriptHandlers.js,chatHandlers.js,index.js}
touch backend/utils/{tokenCounter.js,transcriptChunker.js,logger.js}
```

**Task 1.3: Implement Core Services**
- Create `StorageService.js` (electron-store wrapper)
- Create `TranscriptService.js` (transcript CRUD)
- Create utility functions (`tokenCounter.js`, `logger.js`)

**Task 1.4: Update main.js**
- Import and register IPC handlers from `backend/handlers/`
- Keep main.js lightweight (just Electron initialization)

---

### Phase 2: Tools Implementation (2-3 hours)

**Task 2.1: Implement Basic Tools**
- `getTranscriptChunk.tool.js` - Fetch transcript sections
- `searchTranscript.tool.js` - Keyword search
- `extractSpeakers.tool.js` - Get speaker list (for diarized)

**Task 2.2: Implement Advanced Tools**
- `compareTranscripts.tool.js` - Compare multiple transcripts
- Export all tools in `tools/index.js`

**Task 2.3: Test Tools Independently**
- Create test script to verify tool execution
- Mock transcript data for testing

---

### Phase 3: Agent Setup (1-2 hours)

**Task 3.1: Create Main Agent**
- Implement `TranscriptAnalystAgent.js`
- Configure with tools and instructions

**Task 3.2: Implement Guardrails**
- `tokenLimit.guardrail.js` - Prevent context overload
- `relevance.guardrail.js` - Ensure on-topic questions

**Task 3.3: Create ChatService**
- Implement `ChatService.js` with Agent SDK integration
- Add `sendMessage()` method
- Add `streamMessage()` method (optional, for Phase 4)

---

### Phase 4: Integration (2-3 hours)

**Task 4.1: Update IPC Handlers**
- Modify `chat-with-ai` handler to use `ChatService`
- Keep backward compatibility during migration

**Task 4.2: Auto-Save Integration**
- Add `save-transcript-to-analysis` IPC handler
- Modify `RecordingPanel.jsx` to call auto-save
- Add preload.js exposure: `saveTranscriptToAnalysis()`

**Task 4.3: Update Frontend AppContext**
- Modify `sendChatMessage()` to pass contextIds correctly
- Ensure UI displays agent tool calls (optional)

**Task 4.4: Testing**
- Test chat with single transcript
- Test chat with multiple transcripts (context selection)
- Test auto-save from Recording tab
- Test transcript list displays correctly

---

### Phase 5: Advanced Features (Optional, 2-3 hours)

**Task 5.1: Streaming Responses**
- Implement streaming in ChatService
- Add streaming IPC handler
- Update frontend to show streaming responses

**Task 5.2: Multi-Agent Handoffs**
- Create `SummaryAgent.js`
- Create `ActionItemAgent.js`
- Configure handoffs in main agent

**Task 5.3: Enhanced Tracing**
- Add tracing UI in chat panel
- Show which tools were called
- Display token usage per message

---

## Part 8: Testing Strategy

### Unit Tests

**Services:**
```javascript
// Test TranscriptService
describe('TranscriptService', () => {
  it('should save transcript from recording', async () => {
    const service = new TranscriptService();
    const data = { fileName: 'Test', rawTranscript: 'Hello world' };
    const result = await service.saveFromRecording(data);
    expect(result.id).toBeDefined();
    expect(result.tokens).toBeGreaterThan(0);
  });
});
```

**Tools:**
```javascript
// Test searchTranscript tool
describe('searchTranscript', () => {
  it('should find matches in transcript', async () => {
    const context = {
      transcripts: [{
        id: '1',
        rawTranscript: 'The meeting discussed budget planning.'
      }]
    };
    const result = await searchTranscript.execute(
      { query: 'budget' },
      context
    );
    expect(result.totalMatches).toBeGreaterThan(0);
  });
});
```

### Integration Tests

**End-to-End Chat Flow:**
1. Create test transcripts
2. Send chat message via IPC
3. Verify agent response
4. Check tool calls in trace
5. Verify token usage

### Manual Testing Checklist

- [ ] Record audio → Transcribe → Auto-saved to Analysis ✅
- [ ] View saved transcript in Analysis tab ✅
- [ ] Ask question about single transcript ✅
- [ ] Ask question about multiple transcripts (context selection) ✅
- [ ] Search within transcript (agent uses search tool) ✅
- [ ] Extract speakers from diarized transcript ✅
- [ ] Compare two transcripts ✅
- [ ] Token limit validation triggers correctly ✅
- [ ] Chat history persists across app restarts ✅
- [ ] Delete transcript removes chat history ✅

---

## Part 9: Migration Strategy

### Backward Compatibility

During migration, support BOTH implementations:

```javascript
// backend/handlers/chatHandlers.js
ipcMain.handle('chat-with-ai', async (event, messages, systemPrompt, contextIds) => {
  const USE_AGENTS_SDK = process.env.USE_AGENTS_SDK === 'true'; // Feature flag

  if (USE_AGENTS_SDK) {
    // New implementation
    const chatService = new ChatService();
    return await chatService.sendMessage({
      transcriptId: contextIds[0],
      userMessage: messages[messages.length - 1].content,
      messageHistory: messages.slice(0, -1),
      contextIds
    });
  } else {
    // Old implementation (existing code)
    const openai = new OpenAI({ apiKey: await getApiKey() });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }, ...messages]
    });
    return { success: true, message: response.choices[0].message.content };
  }
});
```

**Rollout Plan:**
1. Week 1: Implement backend (Phase 1-3)
2. Week 2: Integration & testing (Phase 4)
3. Week 3: Beta testing with feature flag
4. Week 4: Enable by default, monitor for issues
5. Week 5: Remove old implementation

---

## Part 10: Performance Considerations

### Token Optimization

**Problem:** Loading full transcripts into system prompt is inefficient.

**Solution:** Agent tools fetch only relevant sections:
- User asks: "What did John say about budget?"
- Agent calls `searchTranscript({ query: 'budget John' })`
- Tool returns only matching excerpts (5-10 lines)
- Agent responds based on excerpts (saves 95% tokens)

### Caching Strategy

**Transcript Chunking:**
```javascript
// backend/utils/transcriptChunker.js
export function chunkTranscript(transcript, chunkSize = 1000) {
  const lines = transcript.split('\n');
  const chunks = [];

  for (let i = 0; i < lines.length; i += chunkSize) {
    chunks.push({
      id: `${i}-${i + chunkSize}`,
      content: lines.slice(i, i + chunkSize).join('\n'),
      startLine: i + 1,
      endLine: Math.min(i + chunkSize, lines.length)
    });
  }

  return chunks;
}
```

**Agent fetches chunks on-demand:**
- Store chunks in memory or DB
- Agent requests specific chunks via tools
- Reduces latency and token usage

---

## Part 11: Error Handling

### Graceful Degradation

```javascript
// ChatService.js
async sendMessage({ transcriptId, userMessage, contextIds }) {
  try {
    // Try Agent SDK
    const result = await run(this.mainAgent, userMessage);
    return { success: true, message: result.finalOutput };
  } catch (agentError) {
    console.error('Agent error, falling back to basic chat:', agentError);

    // Fallback to basic Chat Completions
    try {
      const openai = new OpenAI({ apiKey: await getApiKey() });
      const transcript = await this.transcriptService.getById(transcriptId);

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: `Transcript: ${transcript.rawTranscript}` },
          { role: 'user', content: userMessage }
        ]
      });

      return {
        success: true,
        message: response.choices[0].message.content,
        fallback: true
      };
    } catch (fallbackError) {
      return {
        success: false,
        error: 'Both agent and fallback failed: ' + fallbackError.message
      };
    }
  }
}
```

---

## Part 12: Security & Privacy

### API Key Handling

**Current:** API key stored in keytar (secure OS keychain)

**New:** Agent SDK needs API key access

```javascript
// backend/services/ChatService.js
import keytar from 'keytar';

const SERVICE_NAME = 'transcription-app';
const ACCOUNT_NAME = 'openai-api-key';

async function getApiKey() {
  return await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
}

// Pass to Agent
const apiKey = await getApiKey();
const agent = new Agent({
  name: 'Analyst',
  apiKey: apiKey, // Secure runtime injection
  // ...
});
```

### Data Privacy

- Transcripts stored locally (electron-store)
- No cloud sync (user data stays on device)
- API calls to OpenAI only (no third-party analytics)

---

## Part 13: Success Metrics

### Key Performance Indicators (KPIs)

1. **Token Efficiency:**
   - Before: Avg 5000 tokens/message (full transcript in prompt)
   - After: Avg 500 tokens/message (tool-based fetching)
   - **Target:** 90% reduction

2. **Response Quality:**
   - Measure accuracy of answers (manual testing)
   - Check for hallucinations (agent should cite sources)
   - **Target:** 95%+ accuracy

3. **Latency:**
   - Before: 3-5 seconds per response
   - After: 2-4 seconds (with tool calls)
   - **Target:** <3 seconds average

4. **User Satisfaction:**
   - Monitor chat usage frequency
   - Track "thumbs up/down" feedback (if added)
   - **Target:** 80%+ positive

---

## Part 14: Future Enhancements

### Potential Features (Post-MVP)

1. **Voice Agent Integration:**
   - Use `RealtimeAgent` for voice chat
   - Talk to transcripts hands-free

2. **Specialized Agents:**
   - `SummaryAgent` - Generate summaries on demand
   - `ActionItemAgent` - Extract action items
   - `SpeakerAnalysisAgent` - Analyze individual speakers

3. **Multi-Document Analysis:**
   - Compare multiple meeting transcripts
   - Track recurring themes across sessions

4. **Export Enhancements:**
   - Export chat conversations
   - Generate PDF reports with chat insights

5. **Collaboration:**
   - Share transcripts & chats with team
   - Comments and annotations

---

## Conclusion

This game plan provides a comprehensive roadmap to:

1. ✅ **Auto-save transcripts** from Recording → Analysis
2. ✅ **Upgrade chat system** to OpenAI Agents SDK
3. ✅ **Organize backend** into modular, testable services
4. ✅ **Enable intelligent multi-transcript analysis** with tools and guardrails

**Estimated Timeline:** 10-15 hours total
- Phase 1-3 (Backend & Agents): 5-8 hours
- Phase 4 (Integration): 2-3 hours
- Phase 5 (Advanced Features): 2-3 hours
- Testing & Refinement: 1-2 hours

**Next Steps:**
1. Review this plan with team
2. Set up development branch
3. Begin Phase 1: Backend setup
4. Iterate based on testing feedback

---

## Appendix: Key Resources

- [OpenAI Agents SDK GitHub](https://github.com/openai/openai-agents-js)
- [OpenAI Agents SDK Docs](https://openai.github.io/openai-agents-js/)
- [OpenAI Cookbook: Building Agents](https://cookbook.openai.com/examples/how_to_build_an_agent_with_the_node_sdk)
- [Electron IPC Documentation](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [electron-store Documentation](https://github.com/sindresorhus/electron-store)
- [Zod Documentation](https://zod.dev/)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-23
**Author:** Claude (Sonnet 4.5)
