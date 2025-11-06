# IPC Validation Schemas

Complete specification of all IPC input validation schemas using Zod.

## Overview

This document defines validation schemas for **all 31 IPC handlers** across:
- `main.js` - 18 handlers
- `backend/handlers/transcriptHandlers.js` - 10 handlers
- `backend/handlers/chatHandlers.js` - 4 handlers

**Security Goals:**
- Prevent DoS attacks (massive arrays/strings)
- Block code injection (XSS, path traversal, command injection)
- Validate types and ranges
- Enforce business logic constraints

---

## Table of Contents

1. [main.js Handlers](#mainjs-handlers)
2. [Transcript Handlers](#transcript-handlers)
3. [Chat Handlers](#chat-handlers)
4. [Shared Schemas](#shared-schemas)

---

## main.js Handlers

### 1. validate-api-key

**Handler:** `ipcMain.handle('validate-api-key', async (event, apiKey) => {...})`

**Input:** Single API key string

**Schema:**
```javascript
const validateApiKeySchema = z.object({
  apiKey: z.string()
    .min(20, 'API key too short')
    .max(500, 'API key too long (max 500 chars)')
    .regex(/^sk-[A-Za-z0-9\-_]+$/, 'Invalid API key format (must start with sk-)')
    .refine(val => !val.includes('\0'), 'Null bytes not allowed')
    .refine(val => !val.includes('<'), 'HTML tags not allowed')
});
```

**Attack Vectors:**
- XSS: `<script>alert(1)</script>` as API key
- DoS: 10MB string as API key
- Null byte injection: `sk-123\0malicious`

**Max Lengths:**
- OpenAI API keys are typically 51 chars
- Set max to 500 for safety margin

---

### 2. save-api-key-secure

**Handler:** `ipcMain.handle('save-api-key-secure', async (event, apiKey) => {...})`

**Input:** Single API key string

**Schema:**
```javascript
const saveApiKeySchema = z.object({
  apiKey: z.string()
    .min(20, 'API key too short')
    .max(500, 'API key too long')
    .regex(/^sk-[A-Za-z0-9\-_]+$/, 'Invalid API key format')
    .refine(val => !val.includes('\0'), 'Null bytes not allowed')
});
```

**Notes:**
- Same as `validate-api-key` schema
- Can reuse the schema

---

### 3. get-api-key-secure

**Handler:** `ipcMain.handle('get-api-key-secure', async () => {...})`

**Input:** None

**Schema:**
```javascript
// No schema needed - no parameters
```

---

### 4. delete-api-key-secure

**Handler:** `ipcMain.handle('delete-api-key-secure', async () => {...})`

**Input:** None

**Schema:**
```javascript
// No schema needed - no parameters
```

---

### 5. get-disclaimer-status

**Handler:** `ipcMain.handle('get-disclaimer-status', async () => {...})`

**Input:** None

**Schema:**
```javascript
// No schema needed - no parameters
```

---

### 6. set-disclaimer-accepted

**Handler:** `ipcMain.handle('set-disclaimer-accepted', async () => {...})`

**Input:** None

**Schema:**
```javascript
// No schema needed - no parameters
```

---

### 7. get-templates

**Handler:** `ipcMain.handle('get-templates', async () => {...})`

**Input:** None

**Schema:**
```javascript
// No schema needed - no parameters
```

---

### 8. save-templates

**Handler:** `ipcMain.handle('save-templates', async (event, templates) => {...})`

**Input:** Array of template objects

**Schema:**
```javascript
const templateSchema = z.object({
  id: z.string()
    .uuid('Template ID must be valid UUID'),
  name: z.string()
    .min(1, 'Template name required')
    .max(100, 'Template name too long (max 100 chars)')
    .refine(val => !/<script/i.test(val), 'HTML script tags not allowed'),
  prompt: z.string()
    .min(1, 'Template prompt required')
    .max(5000, 'Template prompt too long (max 5000 chars)')
    .refine(val => !/<script/i.test(val), 'HTML script tags not allowed'),
  category: z.string()
    .max(50, 'Category too long (max 50 chars)')
    .optional(),
  createdAt: z.number()
    .int()
    .positive('Created timestamp must be positive'),
  updatedAt: z.number()
    .int()
    .positive('Updated timestamp must be positive')
});

const saveTemplatesSchema = z.object({
  templates: z.array(templateSchema)
    .max(100, 'Too many templates (max 100)')
});
```

**Attack Vectors:**
- XSS: Template name with `<script>alert(1)</script>`
- DoS: 10,000 templates in array
- DoS: 10MB prompt string

**Business Logic:**
- Max 100 templates total
- Max 5000 chars per prompt (reasonable for GPT-4)
- Timestamps must be positive integers

---

### 9. save-file-to-temp

**Handler:** `ipcMain.handle('save-file-to-temp', async (event, arrayBuffer, fileName) => {...})`

**Input:** ArrayBuffer and filename string

**Schema:**
```javascript
const saveFileToTempSchema = z.object({
  arrayBuffer: z.instanceof(ArrayBuffer)
    .refine(val => val.byteLength > 0, 'File is empty')
    .refine(val => val.byteLength <= 500 * 1024 * 1024, 'File too large (max 500MB)'),
  fileName: z.string()
    .min(1, 'Filename required')
    .max(255, 'Filename too long (max 255 chars)')
    .refine(val => !val.includes('../'), 'Path traversal not allowed')
    .refine(val => !val.includes('..\\'), 'Path traversal not allowed')
    .refine(val => !val.includes('\0'), 'Null bytes not allowed')
    .refine(val => !/[<>:"|?*]/.test(val), 'Invalid filename characters')
    .refine(val => {
      const basename = val.split('/').pop().split('\\').pop();
      return basename.length > 0 && basename !== '.' && basename !== '..';
    }, 'Invalid filename')
});
```

**Attack Vectors:**
- Path traversal: `../../../../etc/passwd`
- Path traversal (Windows): `..\..\..\Windows\System32\config\sam`
- Null bytes: `file.txt\0.exe`
- Invalid chars: `file<script>.txt`
- DoS: 2GB ArrayBuffer

**Implementation Notes:**
- Code already uses `path.basename()` for sanitization (line 300)
- Validation adds extra layer

---

### 10-12. Window Control Handlers

**Handlers:**
- `ipcMain.on('window-minimize', () => {...})`
- `ipcMain.on('window-maximize', () => {...})`
- `ipcMain.on('window-close', () => {...})`

**Input:** None (ipcMain.on, not ipcMain.handle)

**Schema:**
```javascript
// No schema needed - no parameters and uses ipcMain.on (not handle)
```

---

### 13. navigate

**Handler:** `ipcMain.handle('navigate', async (event, page) => {...})`

**Input:** Page name string

**Schema:**
```javascript
const navigateSchema = z.object({
  page: z.string()
    .min(1, 'Page name required')
    .max(50, 'Page name too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Page name must be alphanumeric with dashes/underscores')
    .refine(val => !val.includes('../'), 'Path traversal not allowed')
    .refine(val => !val.includes('..\\'), 'Path traversal not allowed')
});
```

**Attack Vectors:**
- Path traversal: `../../etc/passwd`
- Code injection: `index.html?<script>alert(1)</script>`

**Implementation Note:**
- Current code: `mainWindow.loadFile(\`src/${page}.html\`)`
- Vulnerable to path traversal attacks
- Should use whitelist of allowed pages

---

### 14. save-recording

**Handler:** `ipcMain.handle('save-recording', async (event, arrayBuffer) => {...})`

**Input:** ArrayBuffer of WebM recording

**Schema:**
```javascript
const saveRecordingSchema = z.object({
  arrayBuffer: z.instanceof(ArrayBuffer)
    .refine(val => val.byteLength >= 1000, 'Recording too small (min 1KB)')
    .refine(val => val.byteLength <= 500 * 1024 * 1024, 'Recording too large (max 500MB)')
    .refine(val => {
      // Verify WebM header signature (0x1A 0x45 0xDF 0xA3)
      const view = new Uint8Array(val);
      return view[0] === 0x1A && view[1] === 0x45 && view[2] === 0xDF && view[3] === 0xA3;
    }, 'Invalid WebM format')
});
```

**Attack Vectors:**
- DoS: 2GB recording
- Format confusion: Send MP3 with .webm extension

**Implementation Notes:**
- Code already validates WebM header (line 365)
- Code already checks min 1000 bytes (line 360)
- Validation provides additional layer

---

### 15. transcribe-audio

**Handler:** `ipcMain.handle('transcribe-audio', async (event, filePath, apiKey, options) => {...})`

**Input:** File path, API key, options object

**Schema:**
```javascript
const speakerSchema = z.object({
  name: z.string()
    .min(1, 'Speaker name required')
    .max(100, 'Speaker name too long'),
  path: z.string()
    .min(1, 'Speaker reference path required')
    .max(1000, 'Speaker reference path too long')
});

const transcribeAudioSchema = z.object({
  filePath: z.string()
    .min(1, 'File path required')
    .max(1000, 'File path too long')
    .refine(val => !val.includes('\0'), 'Null bytes not allowed')
    .refine(val => !val.includes(';'), 'Shell metacharacters not allowed')
    .refine(val => !val.includes('|'), 'Shell metacharacters not allowed')
    .refine(val => !val.includes('&'), 'Shell metacharacters not allowed')
    .refine(val => !val.includes('$'), 'Shell metacharacters not allowed')
    .refine(val => !val.includes('`'), 'Shell metacharacters not allowed'),

  apiKey: z.string()
    .min(20, 'API key too short')
    .max(500, 'API key too long')
    .regex(/^sk-[A-Za-z0-9\-_]+$/, 'Invalid API key format'),

  options: z.object({
    model: z.enum(['whisper-1', 'gpt-4o-transcribe', 'gpt-4o-transcribe-diarize'])
      .default('gpt-4o-transcribe'),
    prompt: z.string()
      .max(1000, 'Prompt too long (max 1000 chars)')
      .optional()
      .nullable(),
    speakers: z.array(speakerSchema)
      .max(10, 'Too many speakers (max 10)')
      .optional()
      .nullable(),
    speedMultiplier: z.number()
      .min(1.0, 'Speed multiplier must be >= 1.0')
      .max(3.0, 'Speed multiplier must be <= 3.0')
      .default(1.0)
      .optional(),
    useCompression: z.boolean()
      .default(false)
      .optional()
  }).optional()
});
```

**Attack Vectors:**
- Command injection: `audio.mp3; rm -rf /`
- DoS: 10MB prompt string
- DoS: 1000 speakers array

**Implementation Notes:**
- Code already has `validateFilePath()` function (backend/utils/pathValidator.js)
- This adds IPC-level validation before even reaching that code
- Backward compatibility: Code handles legacy string prompts (line 411)

---

### 16. generate-summary

**Handler:** `ipcMain.handle('generate-summary', async (event, transcript, templatePrompt, apiKey) => {...})`

**Input:** Transcript text, template prompt, API key

**Schema:**
```javascript
const generateSummarySchema = z.object({
  transcript: z.string()
    .min(1, 'Transcript required')
    .max(1000000, 'Transcript too long (max 1MB)')
    .refine(val => !/<script/i.test(val), 'Script tags not allowed in transcript'),

  templatePrompt: z.string()
    .min(1, 'Template prompt required')
    .max(5000, 'Template prompt too long (max 5000 chars)')
    .refine(val => !/<script/i.test(val), 'Script tags not allowed in prompt'),

  apiKey: z.string()
    .min(20, 'API key too short')
    .max(500, 'API key too long')
    .regex(/^sk-[A-Za-z0-9\-_]+$/, 'Invalid API key format')
});
```

**Attack Vectors:**
- DoS: 10MB transcript string
- XSS: `<script>alert(1)</script>` in prompt
- Cost attack: Generate 1000 summaries rapidly

**Business Logic:**
- Max 1MB transcript (reasonable for transcriptions)
- Max 5000 chars for prompt

---

### 17. open-external

**Handler:** `ipcMain.handle('open-external', async (event, url) => {...})`

**Input:** URL string

**Schema:**
```javascript
const openExternalSchema = z.object({
  url: z.string()
    .min(1, 'URL required')
    .max(2048, 'URL too long (max 2048 chars)')
    .url('Invalid URL format')
    .refine(val => {
      const validUrl = new URL(val);
      return validUrl.protocol === 'http:' || validUrl.protocol === 'https:';
    }, 'Only HTTP and HTTPS protocols allowed')
    .refine(val => !val.includes('<'), 'HTML tags not allowed')
});
```

**Attack Vectors:**
- Local file access: `file:///etc/passwd`
- Custom protocol: `javascript:alert(1)`
- XSS: `https://example.com/<script>alert(1)</script>`

**Implementation Notes:**
- Code already validates protocol (line 737)
- Validation adds extra layer

---

### 18. save-transcript

**Handler:** `ipcMain.handle('save-transcript', async (event, content, format, fileName) => {...})`

**Input:** Content string, format enum, filename string

**Schema:**
```javascript
const saveTranscriptSchema = z.object({
  content: z.string()
    .min(1, 'Content required')
    .max(10 * 1024 * 1024, 'Content too large (max 10MB)'),

  format: z.enum(['txt', 'vtt', 'md', 'pdf'])
    .default('txt'),

  fileName: z.string()
    .min(1, 'Filename required')
    .max(255, 'Filename too long (max 255 chars)')
    .refine(val => !val.includes('../'), 'Path traversal not allowed')
    .refine(val => !val.includes('..\\'), 'Path traversal not allowed')
    .refine(val => !val.includes('\0'), 'Null bytes not allowed')
    .refine(val => !/[<>:"|?*]/.test(val), 'Invalid filename characters')
});
```

**Attack Vectors:**
- DoS: 100MB content string
- Path traversal: `../../etc/passwd`
- Format confusion: Request 'pdf' format (not implemented)

---

## Transcript Handlers

### 19. get-transcripts

**Handler:** `ipcMain.handle('get-transcripts', async () => {...})`

**Input:** None

**Schema:**
```javascript
// No schema needed - no parameters
```

---

### 20. save-transcripts

**Handler:** `ipcMain.handle('save-transcripts', async (event, transcripts) => {...})`

**Input:** Array of transcript objects

**Schema:**
```javascript
const transcriptSchema = z.object({
  id: z.string()
    .uuid('Transcript ID must be valid UUID'),

  fileName: z.string()
    .min(1, 'Filename required')
    .max(255, 'Filename too long')
    .refine(val => !/<script/i.test(val), 'Script tags not allowed'),

  rawTranscript: z.string()
    .max(1000000, 'Raw transcript too large (max 1MB)'),

  vttTranscript: z.string()
    .max(1000000, 'VTT transcript too large (max 1MB)')
    .optional(),

  summary: z.string()
    .max(50000, 'Summary too long (max 50KB)')
    .optional(),

  summaryTemplate: z.string()
    .max(500, 'Summary template name too long')
    .optional(),

  model: z.enum(['whisper-1', 'gpt-4o-transcribe', 'gpt-4o-transcribe-diarize']),

  duration: z.number()
    .min(0, 'Duration must be non-negative')
    .max(86400, 'Duration too long (max 24 hours)'),

  timestamp: z.number()
    .int()
    .positive('Timestamp must be positive'),

  isDiarized: z.boolean(),

  fileSize: z.number()
    .positive('File size must be positive')
    .max(2000, 'File size too large (max 2000 MB)'),

  starred: z.boolean()
    .default(false),

  tags: z.array(z.string().max(50))
    .max(20, 'Too many tags (max 20)'),

  tokens: z.number()
    .int()
    .min(0)
    .max(500000, 'Token count too high (max 500k)'),

  createdAt: z.number()
    .int()
    .positive(),

  updatedAt: z.number()
    .int()
    .positive(),

  // Optional fields
  vectorStoreFileId: z.string()
    .max(200)
    .optional(),

  uploadedToVectorStore: z.boolean()
    .optional()
});

const saveTranscriptsSchema = z.object({
  transcripts: z.array(transcriptSchema)
    .max(1000, 'Too many transcripts (max 1000)')
});
```

**Attack Vectors:**
- DoS: 10,000 transcripts array
- DoS: 100MB transcript string
- XSS: `<script>` in fileName
- Data corruption: Negative duration/timestamps

**Business Logic:**
- Max 1000 transcripts (reasonable app limit)
- Max 1MB per transcript
- Max 24 hours duration
- All timestamps must be positive

---

### 21. save-transcript-to-analysis

**Handler:** `ipcMain.handle('save-transcript-to-analysis', async (event, transcriptData) => {...})`

**Input:** Transcript data object (from recording)

**Schema:**
```javascript
const saveTranscriptToAnalysisSchema = z.object({
  text: z.string()
    .min(1, 'Transcript text required')
    .max(1000000, 'Transcript too large (max 1MB)'),

  transcript: z.string()
    .max(1000000, 'Transcript VTT too large (max 1MB)'),

  fileName: z.string()
    .min(1, 'Filename required')
    .max(255, 'Filename too long')
    .refine(val => !/<script/i.test(val), 'Script tags not allowed'),

  duration: z.number()
    .min(0)
    .max(86400, 'Duration too long (max 24 hours)'),

  model: z.enum(['whisper-1', 'gpt-4o-transcribe', 'gpt-4o-transcribe-diarize']),

  isDiarized: z.boolean()
    .default(false),

  summary: z.string()
    .max(50000, 'Summary too long (max 50KB)')
    .optional(),

  summaryTemplate: z.string()
    .max(500)
    .optional(),

  chunked: z.boolean()
    .optional(),

  totalChunks: z.number()
    .int()
    .min(0)
    .optional()
});
```

**Notes:**
- Similar to full transcript schema but for new recordings
- Some fields generated by service (id, timestamps)

---

### 22. delete-transcript

**Handler:** `ipcMain.handle('delete-transcript', async (event, transcriptId) => {...})`

**Input:** Transcript ID string

**Schema:**
```javascript
const deleteTranscriptSchema = z.object({
  transcriptId: z.string()
    .uuid('Transcript ID must be valid UUID')
});
```

**Attack Vectors:**
- SQL injection: `'; DROP TABLE--` (if using SQL)
- DoS: 10MB UUID string

---

### 23. toggle-star-transcript

**Handler:** `ipcMain.handle('toggle-star-transcript', async (event, transcriptId) => {...})`

**Input:** Transcript ID string

**Schema:**
```javascript
const toggleStarSchema = z.object({
  transcriptId: z.string()
    .uuid('Transcript ID must be valid UUID')
});
```

---

### 24. update-transcript

**Handler:** `ipcMain.handle('update-transcript', async (event, transcriptId, updates) => {...})`

**Input:** Transcript ID and partial updates object

**Schema:**
```javascript
const updateTranscriptSchema = z.object({
  transcriptId: z.string()
    .uuid('Transcript ID must be valid UUID'),

  updates: z.object({
    fileName: z.string()
      .min(1)
      .max(255)
      .refine(val => !/<script/i.test(val), 'Script tags not allowed')
      .optional(),

    rawTranscript: z.string()
      .max(1000000)
      .optional(),

    vttTranscript: z.string()
      .max(1000000)
      .optional(),

    summary: z.string()
      .max(50000)
      .optional(),

    summaryTemplate: z.string()
      .max(500)
      .optional(),

    starred: z.boolean()
      .optional(),

    tags: z.array(z.string().max(50))
      .max(20)
      .optional()
  })
    .refine(obj => Object.keys(obj).length > 0, 'At least one field required for update')
});
```

**Notes:**
- All update fields are optional (partial update)
- Must have at least 1 field to update

---

### 25. generate-transcript-name

**Handler:** `ipcMain.handle('generate-transcript-name', async (event, transcriptText, apiKey) => {...})`

**Input:** Transcript text and API key

**Schema:**
```javascript
const generateTranscriptNameSchema = z.object({
  transcriptText: z.string()
    .min(1, 'Transcript text required')
    .max(10000, 'Transcript text too long (using first 500 words only)')
    .refine(val => !/<script/i.test(val), 'Script tags not allowed'),

  apiKey: z.string()
    .min(20)
    .max(500)
    .regex(/^sk-[A-Za-z0-9\-_]+$/, 'Invalid API key format')
});
```

**Notes:**
- Code only uses first 500 words (line 132)
- But still validate to prevent DoS on parsing

---

### 26. bulk-upload-transcripts

**Handler:** `ipcMain.handle('bulk-upload-transcripts', async (event, options = {}) => {...})`

**Input:** Options object (optional)

**Schema:**
```javascript
const bulkUploadSchema = z.object({
  options: z.object({
    force: z.boolean()
      .optional()
      .default(false),

    maxConcurrency: z.number()
      .int()
      .min(1, 'Concurrency must be at least 1')
      .max(10, 'Concurrency too high (max 10)')
      .optional()
      .default(5),

    batchSize: z.number()
      .int()
      .min(1)
      .max(100, 'Batch size too large (max 100)')
      .optional()
  }).optional().default({})
});
```

**Attack Vectors:**
- DoS: Set maxConcurrency to 10000
- Rate limit exhaustion: Upload all transcripts simultaneously

---

### 27. retry-failed-uploads

**Handler:** `ipcMain.handle('retry-failed-uploads', async () => {...})`

**Input:** None

**Schema:**
```javascript
// No schema needed - no parameters
```

---

### 28. get-upload-status

**Handler:** `ipcMain.handle('get-upload-status', async () => {...})`

**Input:** None

**Schema:**
```javascript
// No schema needed - no parameters
```

---

## Chat Handlers

### 29. chat-with-ai-stream

**Handler:** `ipcMain.on('chat-with-ai-stream', async (event, messages, systemPrompt, contextIds, searchAllTranscripts) => {...})`

**Input:** Messages array, system prompt, context IDs, search flag

**Schema:**
```javascript
const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string()
    .min(1, 'Message content required')
    .max(50000, 'Message too long (max 50KB)'),
  timestamp: z.number()
    .int()
    .positive()
    .optional()
});

const chatWithAiStreamSchema = z.object({
  messages: z.array(chatMessageSchema)
    .min(1, 'At least one message required')
    .max(100, 'Too many messages in history (max 100)')
    .refine(messages => {
      // Last message must be from user
      const lastMessage = messages[messages.length - 1];
      return lastMessage.role === 'user';
    }, 'Last message must be from user'),

  systemPrompt: z.string()
    .max(5000, 'System prompt too long (max 5000 chars)')
    .optional()
    .nullable(),

  contextIds: z.array(z.string().uuid())
    .min(0)
    .max(5, 'Too many contexts (max 5 transcripts)')
    .optional(),

  searchAllTranscripts: z.boolean()
    .default(false)
});
```

**Attack Vectors:**
- DoS: 1000 messages in history
- DoS: 100MB message content
- Cost attack: Select all 1000 transcripts as context
- Token exhaustion: Send entire context + all chat history

**Business Logic:**
- Max 100 messages in history (reasonable for UI)
- Max 5 transcripts as context (Issue #3 cost protection)
- Last message must be from user

---

### 30. get-chat-history

**Handler:** `ipcMain.handle('get-chat-history', async () => {...})`

**Input:** None

**Schema:**
```javascript
// No schema needed - no parameters
```

---

### 31. save-chat-history

**Handler:** `ipcMain.handle('save-chat-history', async (event, chatHistory) => {...})`

**Input:** Chat history object (keyed by transcript ID)

**Schema:**
```javascript
const saveChatHistorySchema = z.object({
  chatHistory: z.record(
    z.string().uuid(), // Keys must be valid UUIDs (transcript IDs)
    z.object({
      messages: z.array(chatMessageSchema)
        .max(100, 'Too many messages per transcript (max 100)')
    })
  )
  .refine(obj => Object.keys(obj).length <= 1000, 'Too many chat sessions (max 1000)')
});
```

**Attack Vectors:**
- DoS: 10,000 chat sessions
- DoS: 1000 messages per session
- Memory exhaustion: Store entire app state in chat history

**Business Logic:**
- Max 1000 chat sessions (matches max transcripts)
- Max 100 messages per session

---

### 32. clear-chat-history

**Handler:** `ipcMain.handle('clear-chat-history', async (event, transcriptId) => {...})`

**Input:** Transcript ID string

**Schema:**
```javascript
const clearChatHistorySchema = z.object({
  transcriptId: z.string()
    .uuid('Transcript ID must be valid UUID')
});
```

---

## Shared Schemas

### Reusable Schemas

These schemas are used across multiple handlers:

```javascript
// API Key Schema (used in 5+ handlers)
const apiKeySchema = z.string()
  .min(20, 'API key too short')
  .max(500, 'API key too long')
  .regex(/^sk-[A-Za-z0-9\-_]+$/, 'Invalid API key format')
  .refine(val => !val.includes('\0'), 'Null bytes not allowed');

// UUID Schema (used in 10+ handlers)
const uuidSchema = z.string()
  .uuid('Must be valid UUID');

// Filename Schema (used in 5+ handlers)
const fileNameSchema = z.string()
  .min(1, 'Filename required')
  .max(255, 'Filename too long (max 255 chars)')
  .refine(val => !val.includes('../'), 'Path traversal not allowed')
  .refine(val => !val.includes('..\\'), 'Path traversal not allowed')
  .refine(val => !val.includes('\0'), 'Null bytes not allowed')
  .refine(val => !/[<>:"|?*]/.test(val), 'Invalid filename characters')
  .refine(val => !/<script/i.test(val), 'Script tags not allowed');

// Timestamp Schema (used in 10+ handlers)
const timestampSchema = z.number()
  .int()
  .positive('Timestamp must be positive');

// Chat Message Schema (used in 2 handlers)
const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string()
    .min(1, 'Message content required')
    .max(50000, 'Message too long (max 50KB)'),
  timestamp: timestampSchema.optional()
});
```

---

## Implementation Strategy

### Phase 1: Core Infrastructure (15 min)
1. Install Zod: `npm install zod`
2. Create `backend/utils/ipcValidation.js` with `validateIpcHandler()` wrapper
3. Create `backend/schemas/index.js` with shared schemas

### Phase 2: Main.js Schemas (20 min)
4. Create `backend/schemas/main.schemas.js` with all main.js schemas
5. Update main.js to use validation wrapper on all handlers

### Phase 3: Handler Schemas (20 min)
6. Create `backend/schemas/transcript.schemas.js`
7. Create `backend/schemas/chat.schemas.js`
8. Update handler files to use validation

### Phase 4: Testing (30 min)
9. Create `test-ipc-validation.js` with comprehensive tests
10. Test each schema with valid/invalid inputs
11. Test end-to-end in running app
12. Commit changes

---

## Testing Checklist

### Valid Input Tests
- ✅ Valid API key: `sk-proj-abc123...`
- ✅ Valid transcript with all fields
- ✅ Valid chat message array
- ✅ Valid template array
- ✅ Valid file upload

### Attack Vector Tests
- ✅ XSS: `<script>alert(1)</script>` in various fields
- ✅ Path traversal: `../../etc/passwd` as filename
- ✅ Command injection: `file; rm -rf /` as path
- ✅ Null bytes: `data\0malicious` in strings
- ✅ DoS: 10MB string as input
- ✅ DoS: 10,000 items in array
- ✅ SQL injection: `'; DROP TABLE--` as ID
- ✅ Negative numbers for counts/durations
- ✅ Invalid UUIDs
- ✅ Empty required fields

### Boundary Tests
- ✅ Max array length (100 templates, 1000 transcripts)
- ✅ Max string length (1MB transcript, 5000 char prompt)
- ✅ Max number value (86400 seconds = 24 hours)
- ✅ Min values (positive timestamps, non-empty strings)

### Business Logic Tests
- ✅ Last chat message must be from user
- ✅ At least 1 field required for updates
- ✅ Max 5 transcripts in context
- ✅ API key format validation

---

## Summary Statistics

**Total Handlers:** 32
- Requires validation: 24
- No parameters (skip): 8

**Handler Breakdown:**
- main.js: 18 handlers (10 need validation)
- transcriptHandlers.js: 10 handlers (7 need validation)
- chatHandlers.js: 4 handlers (2 need validation)

**Attack Vectors Prevented:**
- XSS: 15+ fields protected
- Path traversal: 5+ fields protected
- Command injection: 3+ fields protected
- DoS (large strings): 20+ fields protected
- DoS (large arrays): 10+ fields protected
- Invalid types: All fields protected
- Null byte injection: 10+ fields protected

**Time Estimate:** ~45 minutes total
- Infrastructure: 15 min
- Schema creation: 20 min
- Testing: 30 min

---

## Next Steps

1. Review this document with user
2. Begin implementation with Phase 1 (infrastructure)
3. Implement schemas phase by phase
4. Test thoroughly with attack vectors
5. Commit and push to feature branch
6. Update PR with IPC validation changes
