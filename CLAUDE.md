# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An Electron-based desktop application for audio transcription and AI-powered analysis, built with React and OpenAI's Whisper API for transcription and Agents SDK for intelligent chat capabilities.

**Key Features:**
- Audio transcription using OpenAI Whisper (supports MP3, WAV, M4A, WEBM, MP4)
- Direct audio recording within the app
- Transcript library with search/filtering
- AI-powered chat interface for transcript analysis using OpenAI Agents SDK
- Secure API key storage via system keychain (macOS Keychain/Windows Credential Manager)
- Cross-platform support (macOS + Windows)

## Development Commands

```bash
# Install dependencies
npm install

# Development mode (hot reload)
npm run dev
# or
npm start

# Build for macOS
npm run build:mac

# Build for Windows
npm run build:win

# Build for both platforms
npm run build
```

## Project Architecture

### Two-Tab Interface

**Recording Tab (`src/components/Recording/`):**
- Audio upload/recording functionality
- Transcription with OpenAI Whisper
- Summary generation with customizable templates
- Auto-saves completed transcripts to Analysis tab storage

**Analysis Tab (`src/components/Analysis/`):**
- 3-column resizable layout: Sidebar | Viewer | Chat
- Transcript library with search, filtering (All/Starred/Recent)
- AI chat interface with multi-transcript context selection
- Powered by OpenAI Agents SDK with intelligent tool use

### Backend Architecture (Modular Agent-Based System)

```
backend/
├── agents/             # Agent definitions (TranscriptAnalystAgent)
├── tools/              # Function calling tools for agent
│   ├── getTranscriptChunk.tool.js      # Fetch transcript sections
│   ├── searchTranscript.tool.js        # Search within transcripts
│   ├── extractSpeakers.tool.js         # Get speaker list (diarized)
│   └── compareTranscripts.tool.js      # Compare multiple transcripts
├── guardrails/         # Input/output validation
│   ├── tokenLimit.guardrail.js         # Prevent context overload
│   └── relevance.guardrail.js          # Ensure on-topic questions
├── services/           # Core business logic
│   ├── StorageService.js               # electron-store wrapper
│   ├── TranscriptService.js            # Transcript CRUD operations
│   └── ChatService.js                  # Agent-based chat orchestration
├── handlers/           # IPC communication handlers
│   ├── transcriptHandlers.js           # Transcript operations
│   └── chatHandlers.js                 # Chat operations
└── utils/              # Helper functions
    ├── tokenCounter.js                 # Estimate token usage
    ├── transcriptChunker.js            # Split transcripts
    └── logger.js                       # Enhanced logging
```

**Key Architectural Principles:**
- **Modular backend**: Services separated from handlers, tools isolated
- **Agent-based chat**: Uses OpenAI function calling for intelligent tool use
- **Token-efficient**: Agent fetches only relevant sections (90%+ reduction vs full transcript in prompt)
- **Tool-first approach**: Agent has 4 tools to search, chunk, extract, and compare transcripts
- **Guardrails**: Token limits and relevance checks prevent misuse

### Frontend Architecture

**React Components:**
- `src/App.jsx` - Main application shell with tab navigation
- `src/context/AppContext.jsx` - Global state management (transcripts, chat history)
- `src/components/Header/` - App header with mode tabs and API key button
- `src/components/Recording/` - Recording tab components
- `src/components/Analysis/` - Analysis tab components (sidebar, viewer, chat)
- `src/components/Modals/` - Modal dialogs (API key, confirmations)
- `src/components/Common/` - Shared components

**State Management:**
- Centralized in `AppContext.jsx` using React Context
- Transcripts stored in `electron-store` (persistent)
- Chat history keyed by transcript ID

### Data Storage

**electron-store** (`~/Library/Application Support/transcription-app-2.0.0/config.json` on macOS):
```json
{
  "transcripts": [
    {
      "id": "transcript-1234567890",
      "fileName": "meeting.mp3",
      "rawTranscript": "...",
      "vttTranscript": "...",
      "summary": "...",
      "summaryTemplate": "Executive Summary",
      "model": "gpt-4o-transcribe",
      "duration": 900,
      "timestamp": 1234567890,
      "isDiarized": false,
      "fileSize": 12.5,
      "starred": false,
      "tags": [],
      "tokens": 5000,
      "createdAt": 1234567890,
      "updatedAt": 1234567890
    }
  ],
  "chatHistory": {
    "transcript-1234567890": {
      "messages": [
        { "role": "user", "content": "...", "timestamp": 1234567890 },
        { "role": "assistant", "content": "...", "timestamp": 1234567891 }
      ]
    }
  },
  "summary-templates": []
}
```

### IPC Communication (Electron)

**Main Process (`main.js`):**
- Lightweight Electron setup only
- Imports and registers handlers from `backend/handlers/`
- FFmpeg configuration for audio processing

**Preload Script (`preload.js`):**
- Exposes secure IPC channels to renderer
- Key APIs: `transcribeAudio()`, `chatWithAI()`, `saveTranscriptToAnalysis()`, `getApiKey()`, `setApiKey()`

**IPC Handlers:**
- `transcribe-audio` - Transcribe audio file with Whisper
- `chat-with-ai` - AI chat using Agent SDK with tools
- `get-transcripts` / `save-transcripts` - Transcript CRUD
- `save-transcript-to-analysis` - Auto-save from Recording tab
- `get-api-key` / `set-api-key` - Secure keychain access
- `validate-api-key` - Verify OpenAI API key

## OpenAI Agents SDK Integration

**Agent-Based Chat System:**
- Replaces basic Chat Completions with intelligent tool-using agent
- Agent has access to 4 tools for efficient transcript analysis
- Guardrails prevent token overload and irrelevant queries
- **90%+ token reduction** compared to dumping full transcripts in prompt

**How It Works:**
1. User asks question in Analysis tab
2. Guardrails validate (token limit < 100k, relevance check)
3. Agent receives lightweight context summary (~100 tokens)
4. Agent decides which tools to call (if any)
5. Tools fetch only relevant transcript sections (~50-200 tokens)
6. Agent synthesizes final answer with citations
7. Response includes line numbers and specific excerpts

**Example Flow:**
```
User: "What did John say about the budget?"
  ↓
Agent calls: search_transcript({ query: "budget John" })
  ↓
Tool returns: 5 matching excerpts (50 tokens)
  ↓
Agent responds: "On line 142, John mentioned..."
Total tokens: ~200 (vs 5000 with full transcript)
```

## Auto-Save Integration

**Recording → Analysis Flow:**
1. User transcribes audio in Recording tab
2. Transcription completes successfully
3. `RecordingPanel.jsx` calls `window.electron.saveTranscriptToAnalysis(result)`
4. Backend `TranscriptService.saveFromRecording()` stores transcript
5. Transcript appears in Analysis tab automatically

**Implementation:** See `src/components/Recording/RecordingPanel.jsx` lines 361-372

## API Key Management

**Secure Storage:**
- macOS: Keychain Access (via `keytar`)
- Windows: Credential Manager (via `keytar`)
- Service Name: "Audio Transcription App"
- Account Name: "openai-api-key"

**Validation:**
- API key validated on first entry via OpenAI API test call
- Key required for transcription and chat features
- Status indicator in header shows key state (missing/valid/invalid)

## FFmpeg Integration

**Used for:**
- Audio format conversion
- Duration calculation
- Audio recording

**Configuration:**
- Paths: `@ffmpeg-installer/ffmpeg` and `@ffprobe-installer/ffprobe`
- Special handling for ASAR packaging (`.asar.unpacked` path fix)
- Set in `main.js` lines 31-96

## Design System

**CSS Variables:** `src/styles/variables.css`
- Colors: `--accent-blue`, `--success-green`, `--error-red`, `--warning-orange`
- Typography: SF Pro (macOS), Segoe UI (Windows)
- Spacing scale: `xs` (4px) through `4xl` (64px)
- Border radius: `sm` (4px) through `full` (9999px)

**Dark Mode Support:**
- System-aware via `prefers-color-scheme`
- Automatic switching between light/dark themes

## Adding New Agent Tools

**Steps:**
1. Create tool file: `backend/tools/myTool.tool.js`
2. Define Zod schema for parameters
3. Implement `execute(input, context)` function
4. Export tool in `backend/tools/index.js`
5. Add to `ChatService.js` tool definitions (line ~160)

**Example:**
```javascript
const { z } = require('zod');

const myToolSchema = z.object({
  param1: z.string().describe('Description')
});

async function execute(input, context) {
  // Access context.transcriptMap for transcript data
  return { result: 'data' };
}

module.exports = {
  name: 'my_tool',
  description: 'What it does',
  parameters: myToolSchema,
  execute
};
```

## Adding New Guardrails

**Steps:**
1. Create guardrail file: `backend/guardrails/myGuardrail.guardrail.js`
2. Implement `validate(input, context)` function
3. Export in `backend/guardrails/index.js`
4. Add to `ChatService.js` guardrails array

**Example:**
```javascript
function validate(input, context) {
  if (/* invalid condition */) {
    return { valid: false, message: 'Error message' };
  }
  return { valid: true };
}

module.exports = { name: 'My Guardrail', validate };
```

## Testing

**Manual Testing Checklist:**
- Record/upload audio → transcribe → auto-saved to Analysis
- View transcript in Analysis tab
- Ask single-transcript question in chat
- Select multiple transcripts for comparison
- Test search tool usage (check console logs)
- Test speaker extraction (diarized transcripts)
- Verify token limit guardrail triggers at 100k tokens
- Check chat history persists across app restarts

**Console Logging:**
- Backend logs prefixed with `[INFO]`, `[ERROR]`, `[DEBUG]`
- Check logs for agent tool calls and token usage
- Example: `"[INFO] [ChatService] Agent called tool: search_transcript"`

## Known Issues & Limitations

1. **Max 5 tool iterations** - Prevents infinite loops, complex queries may need refinement
2. **Token estimation** - Approximate (4 chars = 1 token), not exact
3. **No streaming** - Responses arrive all at once (streaming can be added)
4. **Direct function calling** - Uses OpenAI function calling, not full Agents SDK `run()` (simpler implementation)

## Performance Considerations

**Token Optimization:**
- Agent tools fetch only relevant sections (not entire transcripts)
- Avg 200-500 tokens/message vs 5000+ with full transcripts
- 90-96% token reduction = 90% cost savings

**Caching Strategy:**
- Transcripts stored in electron-store (persistent)
- Chat history cached per transcript
- No additional caching needed currently

## Security & Privacy

**Data Privacy:**
- All transcripts stored locally (no cloud sync)
- Chat history stored locally
- API calls only to OpenAI (no third-party analytics)

**API Key Security:**
- Never stored in localStorage or plaintext
- Accessed only via secure keychain APIs
- Injected at runtime into ChatService

## Important File Locations

**Key Files to Modify:**
- `main.js` - Electron main process setup
- `backend/services/ChatService.js` - Agent logic and tool definitions
- `backend/tools/` - Add new agent tools here
- `src/components/Recording/RecordingPanel.jsx` - Recording/transcription logic
- `src/components/Analysis/` - Analysis tab UI components
- `src/context/AppContext.jsx` - Global state management

**Configuration Files:**
- `package.json` - Dependencies and build scripts
- `vite.config.js` - Vite build configuration
- `tailwind.config.js` - Tailwind CSS configuration (if used)

## Documentation

- `README.md` - User-facing documentation
- `DEVELOPMENT.md` - Detailed development guide with phase-by-phase roadmap
- `ANALYSIS_BACKEND_GAMEPLAN.md` - Comprehensive backend implementation plan
- `IMPLEMENTATION_COMPLETE.md` - Backend implementation summary with testing results
- `ICON-README.md` - App icon generation instructions

## Resources

- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [OpenAI Agents SDK](https://github.com/openai/openai-agents-js)
- [Electron IPC Documentation](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [electron-store](https://github.com/sindresorhus/electron-store)
- [Zod Documentation](https://zod.dev/)
