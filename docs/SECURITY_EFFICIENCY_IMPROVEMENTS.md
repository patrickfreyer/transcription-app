# Security & Efficiency Improvements Analysis

Comprehensive review of the current implementation and recommendations for further improvements.

---

## Current Implementation Status

### ✅ Already Implemented (Good!)

**Security:**
- ✅ Comprehensive IPC input validation with Zod schemas (24 handlers)
- ✅ Electron security basics: `contextIsolation: true`, `nodeIntegration: false`
- ✅ API key storage in system keychain (macOS Keychain / Windows Credential Manager)
- ✅ XSS prevention: Script tag validation in input schemas
- ✅ Path traversal prevention: File path validation

**Efficiency:**
- ✅ Brotli compression level 11 (96% storage savings)
- ✅ Lazy loading: On-demand transcript content loading
- ✅ Metadata-only storage: electron-store only contains lightweight metadata
- ✅ Compressed external files: Large content stored as `.vtt.br` files

---

## 🔒 Security Improvements Needed

### 1. Content Security Policy (CSP) - HIGH PRIORITY
**Current State:** Not configured
**Risk:** XSS attacks through compromised dependencies or injected content

**Implementation:**
```javascript
// main.js - Add after creating BrowserWindow
mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'", // Needed for React inline styles
        "img-src 'self' data:",
        "connect-src 'self' https://api.openai.com",
        "font-src 'self'",
        "media-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'",
        "frame-ancestors 'none'"
      ].join('; ')
    }
  });
});
```

**Impact:** Prevents execution of malicious scripts even if XSS vulnerability exists

---

### 2. IPC Output Validation - MEDIUM PRIORITY
**Current State:** Only input validation, responses not validated
**Risk:** Corrupted data from backend could crash renderer or cause security issues

**Implementation:**
Create response schemas and validate before returning:

```javascript
// backend/utils/ipcValidation.js - Add response validation
function validateIpcHandler(inputSchema, handler, options = {}) {
  const { name, responseSchema } = options;

  return async (event, ...args) => {
    // ... existing input validation ...

    const result = await handler(event, ...validatedArgs);

    // Validate response if schema provided
    if (responseSchema) {
      try {
        return responseSchema.parse(result);
      } catch (error) {
        logger.error(`Response validation failed for ${name}:`, error);
        return {
          success: false,
          error: 'Invalid response from server',
          validationError: true
        };
      }
    }

    return result;
  };
}
```

**Example Usage:**
```javascript
// Define response schemas
const transcriptResponseSchema = z.object({
  success: z.boolean(),
  transcript: transcriptSchema.optional(),
  error: z.string().optional()
});

// Use in handler
ipcMain.handle('get-transcript-with-content', validateIpcHandler(
  getTranscriptSchema,
  async (event, { transcriptId }) => { /* ... */ },
  {
    name: 'get-transcript-with-content',
    responseSchema: transcriptResponseSchema
  }
));
```

**Impact:** Prevents corrupted/malicious data from reaching renderer

---

### 3. Transcript Encryption at Rest - MEDIUM-HIGH PRIORITY
**Current State:** Transcripts stored unencrypted as `.vtt.br` files
**Risk:** Sensitive conversations accessible if device compromised

**Implementation Options:**

**Option A: Electron safeStorage (Recommended)**
```javascript
// backend/utils/transcriptEncryption.js
const { safeStorage } = require('electron');

async function encryptTranscript(buffer) {
  if (!safeStorage.isEncryptionAvailable()) {
    logger.warn('Encryption not available, storing unencrypted');
    return buffer;
  }

  return safeStorage.encryptBuffer(buffer);
}

async function decryptTranscript(buffer) {
  if (!safeStorage.isEncryptionAvailable()) {
    return buffer;
  }

  return safeStorage.decryptBuffer(buffer);
}
```

**Usage in TranscriptStorageManager:**
```javascript
async saveVTT(transcriptId, vttContent) {
  const compressed = await compressVTT(vttContent);
  const encrypted = await encryptTranscript(compressed);
  await fs.writeFile(filePath, encrypted);
}

async loadVTT(transcriptId) {
  const encrypted = await fs.readFile(filePath);
  const compressed = await decryptTranscript(encrypted);
  return await decompressVTT(compressed);
}
```

**Option B: AES-256-GCM with PBKDF2-derived key**
- More control but requires key management
- User would need master password or derive from API key

**Impact:** Protects sensitive transcript data at rest

---

### 4. Rate Limiting for IPC Handlers - MEDIUM PRIORITY
**Current State:** No rate limiting on IPC calls
**Risk:** Malicious renderer could spam backend with requests (DoS)

**Implementation:**
```javascript
// backend/utils/rateLimiter.js
class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map(); // webContentsId -> [timestamps]
  }

  check(webContentsId) {
    const now = Date.now();
    const requests = this.requests.get(webContentsId) || [];

    // Remove old requests outside window
    const recentRequests = requests.filter(time => now - time < this.windowMs);

    if (recentRequests.length >= this.maxRequests) {
      return { allowed: false, retryAfter: this.windowMs - (now - recentRequests[0]) };
    }

    recentRequests.push(now);
    this.requests.set(webContentsId, recentRequests);

    return { allowed: true };
  }
}

const rateLimiter = new RateLimiter(100, 60000); // 100 req/min

// Wrap in validateIpcHandler
function validateIpcHandler(schema, handler, options = {}) {
  return async (event, ...args) => {
    // Rate limit check
    const { allowed, retryAfter } = rateLimiter.check(event.sender.id);
    if (!allowed) {
      logger.warn(`Rate limit exceeded for ${options.name}`);
      return {
        success: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil(retryAfter / 1000)}s`,
        rateLimited: true
      };
    }

    // ... rest of validation ...
  };
}
```

**Impact:** Prevents DoS attacks from compromised renderer

---

### 5. Audit Logging for Security Events - LOW-MEDIUM PRIORITY
**Current State:** General logging exists but no security-specific audit trail
**Risk:** Cannot detect or investigate security incidents

**Implementation:**
```javascript
// backend/utils/auditLogger.js
const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

class AuditLogger {
  constructor() {
    this.auditFile = path.join(app.getPath('userData'), 'logs', 'audit.log');
  }

  async log(event, data = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      ...data,
      pid: process.pid
    };

    await fs.appendFile(this.auditFile, JSON.stringify(entry) + '\n');
  }

  // Security events to track
  async logApiKeyAccess(action) { await this.log('api_key_access', { action }); }
  async logTranscriptAccess(transcriptId, action) { await this.log('transcript_access', { transcriptId, action }); }
  async logAuthFailure(reason) { await this.log('auth_failure', { reason }); }
  async logRateLimitExceeded(handler) { await this.log('rate_limit', { handler }); }
  async logValidationFailure(handler, error) { await this.log('validation_failure', { handler, error }); }
}
```

**Track these events:**
- API key read/write/delete
- Transcript create/read/update/delete
- Validation failures
- Rate limit hits
- Authentication failures
- File access errors

**Impact:** Enables security incident detection and forensics

---

### 6. Restrictive File Permissions - LOW PRIORITY
**Current State:** Files created with default permissions
**Risk:** Other users on system could read transcripts

**Implementation:**
```javascript
// backend/utils/transcriptStorage.js
async saveVTT(transcriptId, vttContent) {
  const filePath = this.getTranscriptFilePath(transcriptId);
  const compressed = await compressVTT(vttContent);

  await fs.writeFile(filePath, compressed, { mode: 0o600 }); // Owner read/write only

  logger.info(`Saved with permissions 0600 (owner only)`);
}

// Also set directory permissions
async ensureDirectory() {
  await fs.mkdir(this.transcriptsDir, { recursive: true, mode: 0o700 }); // Owner only
}
```

**Impact:** Prevents other system users from accessing transcripts

---

### 7. Error Information Leakage Prevention - LOW PRIORITY
**Current State:** Detailed error messages may expose internal paths/structure
**Risk:** Information disclosure aids attackers

**Implementation:**
```javascript
// backend/utils/errorSanitizer.js
function sanitizeError(error, context = '') {
  // Log full error internally
  logger.error(`[${context}] Full error:`, error);

  // Return sanitized version to renderer
  if (process.env.NODE_ENV === 'development') {
    return error.message; // Full details in dev mode
  }

  // Production: Generic messages only
  const sanitizedMessages = {
    'ENOENT': 'File not found',
    'EACCES': 'Permission denied',
    'EPERM': 'Operation not permitted',
    'EEXIST': 'File already exists'
  };

  return sanitizedMessages[error.code] || 'An error occurred';
}
```

**Impact:** Prevents information disclosure through error messages

---

## ⚡ Efficiency Improvements Needed

### 1. In-Memory Caching for Decompressed Transcripts - HIGH PRIORITY
**Current State:** Decompress from disk every time
**Impact:** Slow repeated access to same transcript

**Implementation:**
```javascript
// backend/utils/transcriptCache.js
const LRU = require('lru-cache');

class TranscriptCache {
  constructor() {
    // 100MB cache, 50 transcripts max, 30min TTL
    this.cache = new LRU({
      max: 50,
      maxSize: 100 * 1024 * 1024, // 100MB
      sizeCalculation: (value) => Buffer.byteLength(value, 'utf8'),
      ttl: 30 * 60 * 1000, // 30 minutes
      updateAgeOnGet: true,
      updateAgeOnHas: false
    });
  }

  get(transcriptId) {
    return this.cache.get(transcriptId);
  }

  set(transcriptId, content) {
    this.cache.set(transcriptId, content);
  }

  invalidate(transcriptId) {
    this.cache.delete(transcriptId);
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      calculatedSize: this.cache.calculatedSize,
      hitRate: this.cache.hits / (this.cache.hits + this.cache.misses)
    };
  }
}

// Use in TranscriptStorageManager
async loadVTT(transcriptId) {
  // Check cache first
  const cached = transcriptCache.get(transcriptId);
  if (cached) {
    logger.debug(`Cache hit for ${transcriptId}`);
    return cached;
  }

  // Load and decompress from disk
  const filePath = this.getTranscriptFilePath(transcriptId);
  const compressed = await fs.readFile(filePath);
  const vttContent = await decompressVTT(compressed);

  // Store in cache
  transcriptCache.set(transcriptId, vttContent);
  logger.debug(`Cache miss - loaded from disk: ${transcriptId}`);

  return vttContent;
}
```

**Dependencies:**
```bash
npm install lru-cache
```

**Impact:**
- 90% faster subsequent access to same transcript
- Reduces disk I/O and decompression CPU usage
- Better chat performance when asking multiple questions about same transcript

---

### 2. Full-Text Search Index - MEDIUM-HIGH PRIORITY
**Current State:** Naive string matching `includes()` on every keystroke
**Impact:** Slow search with many transcripts, no ranking, searches legacy transcripts only

**Implementation Options:**

**Option A: MiniSearch (Lightweight, in-memory)**
```javascript
// backend/services/SearchIndexService.js
const MiniSearch = require('minisearch');

class SearchIndexService {
  constructor() {
    this.index = new MiniSearch({
      fields: ['fileName', 'summary', 'content'], // Fields to index
      storeFields: ['id', 'fileName', 'timestamp'], // Fields to return
      searchOptions: {
        boost: { fileName: 2, summary: 1.5, content: 1 }, // Relevance weights
        fuzzy: 0.2,
        prefix: true
      }
    });
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    const transcripts = await transcriptService.getAll();
    const documents = [];

    for (const t of transcripts) {
      const content = t.hasVTTFile
        ? await transcriptStorage.loadPlainText(t.id)
        : t.rawTranscript || '';

      documents.push({
        id: t.id,
        fileName: t.fileName,
        summary: t.summary || '',
        content,
        timestamp: t.timestamp
      });
    }

    this.index.addAll(documents);
    this.initialized = true;
    logger.info(`Search index built with ${documents.length} transcripts`);
  }

  search(query, options = {}) {
    return this.index.search(query, options);
  }

  addTranscript(transcript, content) {
    this.index.add({
      id: transcript.id,
      fileName: transcript.fileName,
      summary: transcript.summary || '',
      content,
      timestamp: transcript.timestamp
    });
  }

  removeTranscript(transcriptId) {
    this.index.remove({ id: transcriptId });
  }

  updateTranscript(transcriptId, updates, content) {
    this.removeTranscript(transcriptId);
    this.addTranscript({ id: transcriptId, ...updates }, content);
  }
}
```

**Frontend Integration:**
```javascript
// IPC handler
ipcMain.handle('search-transcripts', validateIpcHandler(
  z.object({ query: z.string().min(1).max(200) }),
  async (event, { query }) => {
    const results = searchIndexService.search(query);
    return { success: true, results };
  },
  { name: 'search-transcripts' }
));

// React component - debounced search
const [searchResults, setSearchResults] = useState([]);
const debouncedSearch = useMemo(
  () => debounce(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const result = await window.electron.searchTranscripts(query);
    setSearchResults(result.results);
  }, 300),
  []
);
```

**Option B: Fuse.js (No dependencies, simpler)**
- Easier to implement but slower with many documents
- No incremental updates (must rebuild index)

**Dependencies:**
```bash
npm install minisearch
```

**Impact:**
- 100x faster search with many transcripts
- Fuzzy matching (typo tolerance)
- Relevance ranking (best matches first)
- Searches both metadata AND compressed transcript content

---

### 3. Debounced Search Input - HIGH PRIORITY
**Current State:** Search re-runs on every keystroke
**Impact:** Excessive re-renders, poor UX, unnecessary work

**Implementation:**
```javascript
// src/components/Analysis/Sidebar/TranscriptList.jsx
import { debounce } from 'lodash'; // or implement custom

function TranscriptList() {
  const { setSearchQuery } = useApp();
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  // Debounce 300ms
  const debouncedSetSearch = useMemo(
    () => debounce((value) => {
      setSearchQuery(value);
    }, 300),
    [setSearchQuery]
  );

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearchQuery(value); // Immediate UI update
    debouncedSetSearch(value); // Delayed actual search
  };

  useEffect(() => {
    return () => debouncedSetSearch.cancel();
  }, [debouncedSetSearch]);

  // Use localSearchQuery for input value
  return (
    <input
      value={localSearchQuery}
      onChange={handleSearchChange}
      placeholder="Search transcripts..."
    />
  );
}
```

**Alternative: Custom hook**
```javascript
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Usage
const debouncedQuery = useDebounce(searchQuery, 300);
```

**Impact:**
- Eliminates lag when typing
- Reduces unnecessary filtering operations by 90%
- Better UX - instant input feedback

---

### 4. Virtual Scrolling for Large Lists - MEDIUM PRIORITY
**Current State:** All transcripts rendered at once
**Impact:** Slow rendering with 100+ transcripts

**Implementation:**
```javascript
// Use react-window or react-virtualized
import { FixedSizeList as List } from 'react-window';

function TranscriptList() {
  const { filteredTranscripts } = useApp();

  const Row = ({ index, style }) => {
    const transcript = filteredTranscripts[index];
    return (
      <div style={style}>
        <TranscriptCard transcript={transcript} />
      </div>
    );
  };

  return (
    <List
      height={600} // Viewport height
      itemCount={filteredTranscripts.length}
      itemSize={120} // Height of each card
      width="100%"
    >
      {Row}
    </List>
  );
}
```

**Dependencies:**
```bash
npm install react-window
```

**Impact:**
- Instant rendering regardless of list size
- Only renders visible items (~10) instead of all (1000+)
- Smooth scrolling

---

### 5. Pagination for Transcript List - MEDIUM PRIORITY
**Current State:** All transcripts loaded into memory at once
**Impact:** High memory usage, slow initial load with many transcripts

**Implementation:**
```javascript
// Backend pagination
ipcMain.handle('get-transcripts-paginated', validateIpcHandler(
  z.object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(10).max(100).default(50),
    sortBy: z.enum(['timestamp', 'fileName', 'duration']).default('timestamp'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  }),
  async (event, { page, pageSize, sortBy, sortOrder }) => {
    const transcripts = transcriptService.getAll();

    // Sort
    transcripts.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Paginate
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageData = transcripts.slice(start, end);

    return {
      success: true,
      data: pageData,
      total: transcripts.length,
      page,
      pageSize,
      totalPages: Math.ceil(transcripts.length / pageSize)
    };
  }
));
```

**Frontend:**
```javascript
function TranscriptList() {
  const [page, setPage] = useState(1);
  const [transcripts, setTranscripts] = useState([]);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const load = async () => {
      const result = await window.electron.getTranscriptsPaginated({ page, pageSize: 50 });
      setTranscripts(result.data);
      setTotalPages(result.totalPages);
    };
    load();
  }, [page]);

  return (
    <>
      {transcripts.map(t => <TranscriptCard key={t.id} transcript={t} />)}
      <Pagination page={page} total={totalPages} onChange={setPage} />
    </>
  );
}
```

**Impact:**
- Fast initial load (only 50 transcripts instead of all)
- Lower memory usage
- Scalable to thousands of transcripts

---

### 6. Background Processing with Worker Threads - MEDIUM PRIORITY
**Current State:** Compression/decompression blocks main thread
**Impact:** UI freezes during heavy operations

**Implementation:**
```javascript
// backend/workers/compressionWorker.js
const { parentPort, workerData } = require('worker_threads');
const { compressVTT, decompressVTT } = require('../utils/transcriptCompression');

parentPort.on('message', async (message) => {
  const { action, data } = message;

  try {
    if (action === 'compress') {
      const result = await compressVTT(data);
      parentPort.postMessage({ success: true, result });
    } else if (action === 'decompress') {
      const result = await decompressVTT(data);
      parentPort.postMessage({ success: true, result });
    }
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  }
});

// Use in TranscriptStorage
const { Worker } = require('worker_threads');

class TranscriptStorageManager {
  constructor() {
    this.worker = new Worker(path.join(__dirname, '../workers/compressionWorker.js'));
  }

  async compressInWorker(content) {
    return new Promise((resolve, reject) => {
      this.worker.once('message', (msg) => {
        if (msg.success) resolve(msg.result);
        else reject(new Error(msg.error));
      });
      this.worker.postMessage({ action: 'compress', data: content });
    });
  }
}
```

**Impact:**
- Main thread stays responsive during compression/decompression
- Better UX - no freezing
- Better multi-core utilization

---

### 7. Connection Pooling for OpenAI API - LOW-MEDIUM PRIORITY
**Current State:** New connection for each API call
**Impact:** Higher latency, more overhead

**Implementation:**
```javascript
// OpenAI SDK already does this via fetch with keep-alive
// Verify http.Agent is configured

const https = require('https');
const { OpenAI } = require('openai');

const client = new OpenAI({
  apiKey: apiKey,
  httpAgent: new https.Agent({
    keepAlive: true,
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 60000,
    freeSocketTimeout: 30000
  })
});
```

**Impact:**
- 20-30% faster API calls (TCP handshake reuse)
- Lower latency for chat responses

---

### 8. Streaming Chat Responses - MEDIUM PRIORITY
**Current State:** Wait for entire response before showing
**Impact:** Poor UX for long responses (30+ seconds wait)

**Implementation:**
```javascript
// Already using OpenAI streaming! Just need to expose via IPC

// ChatService
async sendMessageStream({ transcriptId, userMessage, onToken }) {
  const stream = await client.chat.completions.create({
    model: 'gpt-4',
    messages,
    stream: true
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      onToken(content); // Send each token via IPC
    }
  }
}

// IPC Handler (already exists!)
ipcMain.on('chat-with-ai-stream', async (event, ...) => {
  await chatService.sendMessageStream({
    onToken: (token) => {
      event.sender.send('chat-stream-token', { token });
    }
  });
  event.sender.send('chat-stream-complete', { success: true });
});
```

**Frontend already supports this!**
- `onChatStreamToken` callback exists
- Just need to verify ChatService uses streaming properly

**Impact:**
- Immediate response feedback
- Better perceived performance
- User sees progress instead of spinner

---

### 9. Batch Operations for Compression - LOW PRIORITY
**Current State:** One transcript at a time
**Impact:** Migration of old transcripts is slow

**Implementation:**
```javascript
// backend/utils/batchCompressor.js
class BatchCompressor {
  async compressMany(transcripts, concurrency = 5) {
    const queue = [...transcripts];
    const results = [];
    const workers = [];

    for (let i = 0; i < concurrency; i++) {
      workers.push(this.worker());
    }

    async function worker() {
      while (queue.length > 0) {
        const t = queue.shift();
        if (!t) break;

        try {
          const result = await transcriptStorage.saveVTT(t.id, t.vttTranscript);
          results.push({ id: t.id, success: true, result });
        } catch (error) {
          results.push({ id: t.id, success: false, error: error.message });
        }
      }
    }

    await Promise.all(workers);
    return results;
  }
}
```

**Impact:**
- 5x faster bulk compression
- Better migration experience

---

### 10. Progressive Loading Strategy - LOW PRIORITY
**Current State:** Load all transcripts metadata before showing UI
**Impact:** Blank screen during initial load

**Implementation:**
```javascript
// Load in stages
async function progressiveLoad() {
  // Stage 1: Show UI immediately
  setLoading(false);

  // Stage 2: Load recent transcripts (last 10)
  const recent = await window.electron.getRecentTranscripts({ limit: 10 });
  setTranscripts(recent);

  // Stage 3: Load rest in background
  setTimeout(async () => {
    const all = await window.electron.getAllTranscripts();
    setTranscripts(all);
  }, 100);
}
```

**Impact:**
- Instant UI feedback
- Perceived performance improvement

---

## Priority Matrix

### Implement NOW (High Impact, Low Effort):
1. ✅ **Debounced Search** (30 min) - Immediate UX improvement
2. ✅ **In-Memory Caching** (2-3 hours) - 90% faster repeated access
3. ✅ **Content Security Policy** (1 hour) - Critical security improvement

### Implement SOON (High Impact, Medium Effort):
4. **Full-Text Search Index** (4-6 hours) - Much better search
5. **Transcript Encryption** (3-4 hours) - Important for sensitive data
6. **IPC Output Validation** (2-3 hours) - Security completeness

### Implement LATER (Medium Impact):
7. **Rate Limiting** (2-3 hours) - Good security practice
8. **Virtual Scrolling** (2-3 hours) - Better with 100+ transcripts
9. **Pagination** (3-4 hours) - Better with 500+ transcripts
10. **Audit Logging** (2-3 hours) - Security monitoring

### Nice to Have (Lower Priority):
11. Background Processing (4-5 hours)
12. Connection Pooling (1 hour)
13. Batch Operations (2 hours)
14. Progressive Loading (1 hour)
15. File Permissions (30 min)
16. Error Sanitization (1 hour)

---

## Dependencies to Add

```bash
# For caching
npm install lru-cache

# For search indexing
npm install minisearch

# For virtual scrolling
npm install react-window

# For debouncing (if not using lodash)
npm install lodash.debounce
```

---

## Estimated Time Investment

- **Quick Wins (1 day):** CSP, Debouncing, Caching
- **Week 1 (40 hours):** Add above + Search Index + Encryption + Output Validation
- **Week 2 (40 hours):** Rate Limiting + Virtual Scrolling + Pagination + Audit Logging
- **Optional (20 hours):** Background processing, connection pooling, batch ops

**Total for all high/medium priority items:** ~120 hours (~3 weeks)

---

## Testing Recommendations

For each improvement:
1. Unit tests for core logic
2. Integration tests for IPC handlers
3. Performance benchmarks (before/after)
4. Security testing (penetration testing for security features)
5. User testing for UX improvements

---

## Notes

- Most security improvements are transparent to users (no UI changes)
- Most efficiency improvements have immediate visible UX benefits
- Many can be implemented incrementally without breaking changes
- Consider implementing in sprints: Security → Performance → UX
