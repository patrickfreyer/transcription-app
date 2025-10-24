# Analysis Tab - Detailed Implementation Plan

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Data Models](#data-models)
3. [State Management](#state-management)
4. [Backend API Specifications](#backend-api-specifications)
5. [Component Specifications](#component-specifications)
6. [Styling Guidelines](#styling-guidelines)
7. [Integration Points](#integration-points)
8. [Implementation Phases](#implementation-phases)

---

## Architecture Overview

### Layout Structure

```
┌──────────────────────────────────────────────────────────────────────┐
│                         App Header (existing)                        │
├─────────────┬─────────────────────────────────┬──────────────────────┤
│             │                                 │                      │
│  Sidebar    │     Center Viewer               │    Chat Panel        │
│  (280px)    │     (flex-grow)                 │    (360px)           │
│             │                                 │    (collapsible)     │
│  Fixed      │     Scrollable                  │    Fixed             │
│  width      │     Content                     │    width             │
│             │                                 │                      │
└─────────────┴─────────────────────────────────┴──────────────────────┘
```

### Component Hierarchy

```
AnalysisPanel (src/components/Analysis/AnalysisPanel.jsx)
├── TranscriptSidebar (src/components/Analysis/Sidebar/TranscriptSidebar.jsx)
│   ├── SearchBar (src/components/Analysis/Sidebar/SearchBar.jsx)
│   ├── FilterTabs (src/components/Analysis/Sidebar/FilterTabs.jsx)
│   ├── TranscriptList (src/components/Analysis/Sidebar/TranscriptList.jsx)
│   │   └── TranscriptCard (src/components/Analysis/Sidebar/TranscriptCard.jsx) [repeatable]
│   └── StorageInfo (src/components/Analysis/Sidebar/StorageInfo.jsx)
│
├── TranscriptViewer (src/components/Analysis/Viewer/TranscriptViewer.jsx)
│   ├── ViewerHeader (src/components/Analysis/Viewer/ViewerHeader.jsx)
│   ├── ViewerContent (src/components/Analysis/Viewer/ViewerContent.jsx)
│   └── ViewerEmptyState (src/components/Analysis/Viewer/ViewerEmptyState.jsx)
│
└── ChatPanel (src/components/Analysis/Chat/ChatPanel.jsx)
    ├── ChatHeader (src/components/Analysis/Chat/ChatHeader.jsx)
    ├── ContextSelector (src/components/Analysis/Chat/ContextSelector.jsx) [modal]
    ├── ContextChips (src/components/Analysis/Chat/ContextChips.jsx)
    ├── MessageList (src/components/Analysis/Chat/MessageList.jsx)
    │   └── MessageBubble (src/components/Analysis/Chat/MessageBubble.jsx) [repeatable]
    ├── SuggestedQuestions (src/components/Analysis/Chat/SuggestedQuestions.jsx)
    └── ChatInput (src/components/Analysis/Chat/ChatInput.jsx)
```

---

## Data Models

### Transcript Model

```javascript
/**
 * Represents a saved transcription
 * Stored in electron-store under key 'transcripts' as an array
 */
const TranscriptModel = {
  id: String,                    // Format: "transcript-{timestamp}"
  fileName: String,              // Original audio file name or "Recording"
  rawTranscript: String,         // Plain text transcript (from vttToPlainText)
  vttTranscript: String,         // VTT format with timestamps (for download)
  summary: String | null,        // AI-generated summary (null if none)
  summaryTemplate: String | null, // Template name used (e.g., "Detailed Summary")
  model: String,                 // "whisper-1" | "gpt-4o-transcribe" | "gpt-4o-transcribe-diarize"
  duration: Number,              // Audio duration in seconds
  timestamp: Number,             // Creation timestamp (Date.now())
  tags: Array<String>,           // User-added tags (future feature)
  starred: Boolean,              // User favorite flag
  fileSize: Number,              // Original file size in MB (optional)
  isDiarized: Boolean,           // True if diarization model was used
  createdAt: Number,             // Timestamp of creation
  updatedAt: Number              // Timestamp of last update
};

// Example:
{
  id: "transcript-1730659080000",
  fileName: "Team Meeting Notes.mp3",
  rawTranscript: "Hello everyone. Today we're discussing...",
  vttTranscript: "WEBVTT\n\n1\n00:00:00.000 --> 00:00:05.000\nHello everyone...",
  summary: "The team discussed Q4 priorities including...",
  summaryTemplate: "Detailed Summary",
  model: "gpt-4o-transcribe",
  duration: 320,
  timestamp: 1730659080000,
  tags: [],
  starred: false,
  fileSize: 2.5,
  isDiarized: false,
  createdAt: 1730659080000,
  updatedAt: 1730659080000
}
```

### Chat Message Model

```javascript
/**
 * Represents a single message in a chat
 */
const ChatMessageModel = {
  id: String,                    // Format: "msg-{timestamp}-{random}"
  role: "user" | "assistant",    // Message sender
  content: String,               // Message text
  timestamp: Number,             // When message was sent
  contextUsed: Array<String>     // Transcript IDs used as context (for assistant only)
};

// Example:
{
  id: "msg-1730659100000-a1b2c3",
  role: "user",
  content: "What were the main action items discussed?",
  timestamp: 1730659100000,
  contextUsed: []
}
```

### Chat History Model

```javascript
/**
 * Represents chat history for a specific transcript
 * Stored in electron-store under key 'chatHistory' as an object
 * Key structure: chatHistory[transcriptId] = ChatHistoryModel
 */
const ChatHistoryModel = {
  transcriptId: String,          // Associated transcript ID
  messages: Array<ChatMessageModel>, // Array of messages
  createdAt: Number,             // When chat started
  updatedAt: Number              // When last message was sent
};

// Storage structure:
{
  "transcript-1730659080000": {
    transcriptId: "transcript-1730659080000",
    messages: [
      { id: "msg-1", role: "user", content: "...", timestamp: 1730659100000 },
      { id: "msg-2", role: "assistant", content: "...", timestamp: 1730659101000, contextUsed: ["transcript-1730659080000"] }
    ],
    createdAt: 1730659100000,
    updatedAt: 1730659101000
  }
}
```

---

## State Management

### AppContext Extensions

Add the following to `src/context/AppContext.jsx`:

```javascript
// Transcript management state
const [transcripts, setTranscripts] = useState([]);
const [selectedTranscriptId, setSelectedTranscriptId] = useState(null);
const [searchQuery, setSearchQuery] = useState('');
const [filterMode, setFilterMode] = useState('all'); // 'all' | 'starred' | 'recent'

// Chat management state
const [chatHistory, setChatHistory] = useState({}); // Object keyed by transcriptId
const [selectedContextIds, setSelectedContextIds] = useState([]); // Array of transcript IDs
const [isChatPanelOpen, setIsChatPanelOpen] = useState(true);
const [isChatStreaming, setIsChatStreaming] = useState(false);

// Computed values
const selectedTranscript = transcripts.find(t => t.id === selectedTranscriptId) || null;
const currentChatMessages = selectedTranscriptId ? (chatHistory[selectedTranscriptId]?.messages || []) : [];

// Functions to add
const loadTranscripts = async () => {
  const result = await window.electron.getTranscripts();
  if (result.success) {
    setTranscripts(result.transcripts || []);
  }
};

const saveTranscript = async (transcriptData) => {
  const newTranscript = {
    id: `transcript-${Date.now()}`,
    ...transcriptData,
    starred: false,
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const updatedTranscripts = [newTranscript, ...transcripts];
  setTranscripts(updatedTranscripts);

  await window.electron.saveTranscripts(updatedTranscripts);
  return newTranscript.id;
};

const deleteTranscript = async (transcriptId) => {
  const updatedTranscripts = transcripts.filter(t => t.id !== transcriptId);
  setTranscripts(updatedTranscripts);

  // Also delete associated chat history
  const updatedChatHistory = { ...chatHistory };
  delete updatedChatHistory[transcriptId];
  setChatHistory(updatedChatHistory);

  await window.electron.saveTranscripts(updatedTranscripts);
  await window.electron.saveChatHistory(updatedChatHistory);

  if (selectedTranscriptId === transcriptId) {
    setSelectedTranscriptId(null);
  }
};

const toggleStarTranscript = async (transcriptId) => {
  const updatedTranscripts = transcripts.map(t =>
    t.id === transcriptId ? { ...t, starred: !t.starred, updatedAt: Date.now() } : t
  );
  setTranscripts(updatedTranscripts);
  await window.electron.saveTranscripts(updatedTranscripts);
};

const loadChatHistory = async () => {
  const result = await window.electron.getChatHistory();
  if (result.success) {
    setChatHistory(result.chatHistory || {});
  }
};

const sendChatMessage = async (messageContent) => {
  if (!selectedTranscriptId || isChatStreaming) return;

  const userMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    role: "user",
    content: messageContent,
    timestamp: Date.now(),
    contextUsed: []
  };

  // Add user message to chat
  const updatedMessages = [...currentChatMessages, userMessage];
  const updatedChatHistory = {
    ...chatHistory,
    [selectedTranscriptId]: {
      transcriptId: selectedTranscriptId,
      messages: updatedMessages,
      createdAt: chatHistory[selectedTranscriptId]?.createdAt || Date.now(),
      updatedAt: Date.now()
    }
  };
  setChatHistory(updatedChatHistory);

  // Build context from selected transcripts
  const contextIds = selectedContextIds.length > 0 ? selectedContextIds : [selectedTranscriptId];
  const contextTranscripts = transcripts.filter(t => contextIds.includes(t.id));

  // Build system prompt with transcripts
  const systemPrompt = buildSystemPrompt(contextTranscripts);

  // Call OpenAI API
  setIsChatStreaming(true);
  const result = await window.electron.chatWithAI(
    updatedMessages,
    systemPrompt,
    contextIds
  );

  if (result.success) {
    const assistantMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: "assistant",
      content: result.message,
      timestamp: Date.now(),
      contextUsed: contextIds
    };

    const finalMessages = [...updatedMessages, assistantMessage];
    const finalChatHistory = {
      ...chatHistory,
      [selectedTranscriptId]: {
        transcriptId: selectedTranscriptId,
        messages: finalMessages,
        createdAt: chatHistory[selectedTranscriptId]?.createdAt || Date.now(),
        updatedAt: Date.now()
      }
    };
    setChatHistory(finalChatHistory);
    await window.electron.saveChatHistory(finalChatHistory);
  }

  setIsChatStreaming(false);
};

const clearChatHistory = async (transcriptId) => {
  const updatedChatHistory = { ...chatHistory };
  delete updatedChatHistory[transcriptId];
  setChatHistory(updatedChatHistory);
  await window.electron.saveChatHistory(updatedChatHistory);
};

const buildSystemPrompt = (contextTranscripts) => {
  let prompt = "You are an AI assistant helping to analyze audio transcripts.\n\n";

  if (contextTranscripts.length === 0) {
    prompt += "No transcripts are currently loaded. Ask the user to select transcripts to analyze.";
  } else {
    prompt += `You have access to ${contextTranscripts.length} transcript(s):\n\n`;

    contextTranscripts.forEach((transcript, index) => {
      prompt += `--- Transcript ${index + 1}: ${transcript.fileName} ---\n`;
      prompt += `Duration: ${Math.floor(transcript.duration / 60)}:${(transcript.duration % 60).toString().padStart(2, '0')}\n`;
      prompt += `Model: ${transcript.model}\n`;
      if (transcript.summary) {
        prompt += `Summary: ${transcript.summary}\n\n`;
      }
      prompt += `Full Transcript:\n${transcript.rawTranscript}\n\n`;
    });

    prompt += "Instructions:\n";
    prompt += "- Answer questions accurately based on the transcript content above.\n";
    prompt += "- If the answer isn't in the transcripts, say so clearly.\n";
    prompt += "- Cite specific speakers or sections when relevant.\n";
    prompt += "- Be concise but thorough.\n";
  }

  return prompt;
};

// Export additions to context value
const value = {
  // ... existing values
  transcripts,
  selectedTranscriptId,
  setSelectedTranscriptId,
  searchQuery,
  setSearchQuery,
  filterMode,
  setFilterMode,
  chatHistory,
  selectedContextIds,
  setSelectedContextIds,
  isChatPanelOpen,
  setIsChatPanelOpen,
  isChatStreaming,
  selectedTranscript,
  currentChatMessages,
  loadTranscripts,
  saveTranscript,
  deleteTranscript,
  toggleStarTranscript,
  loadChatHistory,
  sendChatMessage,
  clearChatHistory,
};
```

---

## Backend API Specifications

Add the following handlers to `main.js`:

### 1. Save Transcripts

```javascript
ipcMain.handle('save-transcripts', async (event, transcripts) => {
  try {
    store.set('transcripts', transcripts);
    console.log(`✓ Saved ${transcripts.length} transcripts to storage`);
    return { success: true };
  } catch (error) {
    console.error('Error saving transcripts:', error);
    return { success: false, error: error.message };
  }
});
```

### 2. Get Transcripts

```javascript
ipcMain.handle('get-transcripts', async () => {
  try {
    const transcripts = store.get('transcripts', []);
    console.log(`✓ Loaded ${transcripts.length} transcripts from storage`);
    return { success: true, transcripts };
  } catch (error) {
    console.error('Error loading transcripts:', error);
    return { success: false, error: error.message, transcripts: [] };
  }
});
```

### 3. Save Chat History

```javascript
ipcMain.handle('save-chat-history', async (event, chatHistory) => {
  try {
    store.set('chatHistory', chatHistory);
    const chatCount = Object.keys(chatHistory).length;
    console.log(`✓ Saved chat history for ${chatCount} transcript(s)`);
    return { success: true };
  } catch (error) {
    console.error('Error saving chat history:', error);
    return { success: false, error: error.message };
  }
});
```

### 4. Get Chat History

```javascript
ipcMain.handle('get-chat-history', async () => {
  try {
    const chatHistory = store.get('chatHistory', {});
    const chatCount = Object.keys(chatHistory).length;
    console.log(`✓ Loaded chat history for ${chatCount} transcript(s)`);
    return { success: true, chatHistory };
  } catch (error) {
    console.error('Error loading chat history:', error);
    return { success: false, error: error.message, chatHistory: {} };
  }
});
```

### 5. Chat with AI

```javascript
ipcMain.handle('chat-with-ai', async (event, messages, systemPrompt, contextIds) => {
  try {
    // Get API key
    const apiKeyResult = await keytar.getPassword('transcription-app', 'openai-api-key');
    if (!apiKeyResult) {
      throw new Error('API key not found');
    }

    const openai = new OpenAI({ apiKey: apiKeyResult });

    console.log('Sending chat request to OpenAI...');
    console.log(`Context: ${contextIds.length} transcript(s)`);
    console.log(`Messages: ${messages.length}`);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(msg => ({ role: msg.role, content: msg.content }))
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const assistantMessage = response.choices[0]?.message?.content;

    console.log('✓ Received response from OpenAI');

    return {
      success: true,
      message: assistantMessage
    };

  } catch (error) {
    console.error('Chat error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get response from AI'
    };
  }
});
```

### Preload.js Additions

Add to `preload.js`:

```javascript
// Transcript management
getTranscripts: () => ipcRenderer.invoke('get-transcripts'),
saveTranscripts: (transcripts) => ipcRenderer.invoke('save-transcripts', transcripts),

// Chat management
getChatHistory: () => ipcRenderer.invoke('get-chat-history'),
saveChatHistory: (chatHistory) => ipcRenderer.invoke('save-chat-history', chatHistory),
chatWithAI: (messages, systemPrompt, contextIds) =>
  ipcRenderer.invoke('chat-with-ai', messages, systemPrompt, contextIds),
```

---

## Component Specifications

### 1. AnalysisPanel (Main Container)

**File:** `src/components/Analysis/AnalysisPanel.jsx`

**Purpose:** Main container managing three-column layout

**Props:**
```javascript
{
  isActive: Boolean  // From parent, controls visibility
}
```

**State:** None (uses AppContext)

**Structure:**
```jsx
<div className="absolute inset-0 flex">
  {/* Left Sidebar - Fixed width */}
  <div className="w-[280px] flex-shrink-0 border-r-2 border-gray-200 bg-white">
    <TranscriptSidebar />
  </div>

  {/* Center Viewer - Flexible */}
  <div className="flex-1 min-w-0">
    <TranscriptViewer />
  </div>

  {/* Right Chat Panel - Fixed width, collapsible */}
  {isChatPanelOpen && (
    <div className="w-[360px] flex-shrink-0 border-l-2 border-gray-200 bg-gray-50">
      <ChatPanel />
    </div>
  )}
</div>
```

**Lifecycle:**
```javascript
useEffect(() => {
  // Load transcripts on mount
  loadTranscripts();
  loadChatHistory();
}, []);
```

---

### 2. TranscriptSidebar

**File:** `src/components/Analysis/Sidebar/TranscriptSidebar.jsx`

**Purpose:** Left sidebar containing search, filters, and transcript list

**Props:** None (uses AppContext)

**Structure:**
```jsx
<div className="h-full flex flex-col">
  {/* Header with search */}
  <div className="flex-shrink-0 p-4 border-b-2 border-gray-200">
    <h2 className="text-xl font-bold text-text-dark mb-3">Transcripts</h2>
    <SearchBar />
  </div>

  {/* Filter tabs */}
  <div className="flex-shrink-0 border-b-2 border-gray-200">
    <FilterTabs />
  </div>

  {/* Scrollable transcript list */}
  <div className="flex-1 overflow-y-auto">
    <TranscriptList />
  </div>

  {/* Storage info footer */}
  <div className="flex-shrink-0 border-t-2 border-gray-200">
    <StorageInfo />
  </div>
</div>
```

---

### 3. SearchBar

**File:** `src/components/Analysis/Sidebar/SearchBar.jsx`

**Purpose:** Search input for filtering transcripts

**Props:** None (uses AppContext)

**State:**
```javascript
const [localQuery, setLocalQuery] = useState('');
```

**Structure:**
```jsx
<div className="relative">
  <input
    type="text"
    value={localQuery}
    onChange={(e) => setLocalQuery(e.target.value)}
    onKeyDown={(e) => e.key === 'Enter' && setSearchQuery(localQuery)}
    placeholder="Search transcripts..."
    className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
  />
  <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" /* search icon */>
    <path /* search icon path */ />
  </svg>
  {localQuery && (
    <button
      onClick={() => { setLocalQuery(''); setSearchQuery(''); }}
      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
    >
      <svg className="w-4 h-4" /* x icon */>
        <path /* x icon path */ />
      </svg>
    </button>
  )}
</div>
```

---

### 4. FilterTabs

**File:** `src/components/Analysis/Sidebar/FilterTabs.jsx`

**Purpose:** Toggle between All, Starred, Recent transcripts

**Props:** None (uses AppContext)

**Structure:**
```jsx
<div className="flex items-center bg-gray-50 p-2">
  {['all', 'starred', 'recent'].map(mode => (
    <button
      key={mode}
      onClick={() => setFilterMode(mode)}
      className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
        filterMode === mode
          ? 'bg-primary text-white'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {mode === 'all' && 'All'}
      {mode === 'starred' && (
        <>
          <svg className="w-4 h-4 inline mr-1" /* star icon */>
            <path /* star icon path */ />
          </svg>
          Starred
        </>
      )}
      {mode === 'recent' && 'Recent'}
    </button>
  ))}
</div>
```

---

### 5. TranscriptList

**File:** `src/components/Analysis/Sidebar/TranscriptList.jsx`

**Purpose:** Scrollable list of transcript cards

**Props:** None (uses AppContext)

**Computed Values:**
```javascript
const filteredTranscripts = useMemo(() => {
  let filtered = transcripts;

  // Apply search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(t =>
      t.fileName.toLowerCase().includes(query) ||
      t.rawTranscript.toLowerCase().includes(query)
    );
  }

  // Apply mode filter
  if (filterMode === 'starred') {
    filtered = filtered.filter(t => t.starred);
  } else if (filterMode === 'recent') {
    // Recent = last 7 days
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    filtered = filtered.filter(t => t.timestamp > sevenDaysAgo);
  }

  // Sort by timestamp (newest first)
  return filtered.sort((a, b) => b.timestamp - a.timestamp);
}, [transcripts, searchQuery, filterMode]);
```

**Structure:**
```jsx
<div className="p-2 space-y-2">
  {filteredTranscripts.length === 0 ? (
    <div className="p-8 text-center text-gray-500">
      <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" /* empty icon */>
        <path /* icon path */ />
      </svg>
      <p className="text-sm">No transcripts found</p>
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="mt-2 text-xs text-primary hover:underline"
        >
          Clear search
        </button>
      )}
    </div>
  ) : (
    filteredTranscripts.map(transcript => (
      <TranscriptCard
        key={transcript.id}
        transcript={transcript}
      />
    ))
  )}
</div>
```

---

### 6. TranscriptCard

**File:** `src/components/Analysis/Sidebar/TranscriptCard.jsx`

**Purpose:** Individual transcript card in the list

**Props:**
```javascript
{
  transcript: TranscriptModel  // The transcript object to display
}
```

**Structure:**
```jsx
<div
  onClick={() => setSelectedTranscriptId(transcript.id)}
  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
    selectedTranscriptId === transcript.id
      ? 'bg-primary bg-opacity-5 border-primary'
      : 'bg-white border-gray-200 hover:border-primary hover:shadow-sm'
  }`}
>
  {/* Header row with icon, title, star */}
  <div className="flex items-start gap-2 mb-2">
    <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" /* document icon */>
      <path /* icon path */ />
    </svg>
    <div className="flex-1 min-w-0">
      <h3 className="font-semibold text-sm text-text-dark truncate">
        {transcript.fileName}
      </h3>
    </div>
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleStarTranscript(transcript.id);
      }}
      className="flex-shrink-0 p-1 hover:bg-gray-100 rounded"
    >
      <svg className={`w-4 h-4 ${transcript.starred ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} /* star icon */>
        <path /* star icon path */ />
      </svg>
    </button>
  </div>

  {/* Timestamp */}
  <div className="text-xs text-text-gray mb-2">
    {formatTimestamp(transcript.timestamp)}
  </div>

  {/* Preview snippet */}
  <p className="text-xs text-text-gray line-clamp-2 mb-2">
    {transcript.summary || transcript.rawTranscript}
  </p>

  {/* Badges row */}
  <div className="flex items-center gap-2 flex-wrap">
    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
      {formatDuration(transcript.duration)}
    </span>
    <span className="px-2 py-0.5 bg-primary bg-opacity-10 text-primary text-xs rounded-full">
      {getModelDisplayName(transcript.model)}
    </span>
    {transcript.isDiarized && (
      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
        Diarized
      </span>
    )}
  </div>
</div>
```

**Helper Functions:**
```javascript
const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  } else if (diffDays === 1) {
    return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
};

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getModelDisplayName = (model) => {
  const names = {
    'whisper-1': 'Whisper',
    'gpt-4o-transcribe': 'GPT-4o',
    'gpt-4o-transcribe-diarize': 'GPT-4o Diarized'
  };
  return names[model] || model;
};
```

---

### 7. StorageInfo

**File:** `src/components/Analysis/Sidebar/StorageInfo.jsx`

**Purpose:** Display storage statistics

**Props:** None (uses AppContext)

**Computed Values:**
```javascript
const totalCount = transcripts.length;
const totalDuration = transcripts.reduce((sum, t) => sum + t.duration, 0);
const totalSize = transcripts.reduce((sum, t) => sum + (t.fileSize || 0), 0);
```

**Structure:**
```jsx
<div className="p-4 bg-gray-50">
  <div className="text-xs text-text-gray space-y-1">
    <div className="flex justify-between">
      <span>Total transcripts:</span>
      <span className="font-semibold">{totalCount}</span>
    </div>
    <div className="flex justify-between">
      <span>Total duration:</span>
      <span className="font-semibold">
        {Math.floor(totalDuration / 60)} min
      </span>
    </div>
    {totalSize > 0 && (
      <div className="flex justify-between">
        <span>Total size:</span>
        <span className="font-semibold">{totalSize.toFixed(1)} MB</span>
      </div>
    )}
  </div>
</div>
```

---

### 8. TranscriptViewer (Updated)

**File:** `src/components/Analysis/Viewer/TranscriptViewer.jsx`

**Purpose:** Display selected transcript content

**Props:** None (uses AppContext, reads `selectedTranscript`)

**Structure:**
```jsx
{selectedTranscript ? (
  <div className="h-full flex flex-col bg-gray-50">
    <ViewerHeader transcript={selectedTranscript} />
    <ViewerContent transcript={selectedTranscript} />
  </div>
) : (
  <ViewerEmptyState />
)}
```

---

### 9. ViewerHeader

**File:** `src/components/Analysis/Viewer/ViewerHeader.jsx`

**Purpose:** Header with file info and action buttons

**Props:**
```javascript
{
  transcript: TranscriptModel
}
```

**State:**
```javascript
const [showExportMenu, setShowExportMenu] = useState(false);
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
```

**Structure:**
```jsx
<div className="flex-shrink-0 bg-white border-b-2 border-gray-200 p-6">
  <div className="max-w-5xl mx-auto">
    {/* Title and metadata */}
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-2xl font-bold text-text-dark mb-2">
          {transcript.fileName}
        </h2>
        <div className="flex items-center gap-4 text-sm text-text-gray">
          {/* Duration badge */}
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4" /* clock icon */>
              <path /* icon path */ />
            </svg>
            <span>{formatDuration(transcript.duration)}</span>
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4" /* calendar icon */>
              <path /* icon path */ />
            </svg>
            <span>{formatDate(transcript.timestamp)}</span>
          </div>

          {/* Model */}
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4" /* model icon */>
              <path /* icon path */ />
            </svg>
            <span>{getModelDisplayName(transcript.model)}</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* Star button */}
        <button
          onClick={() => toggleStarTranscript(transcript.id)}
          className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-all"
        >
          <svg className={`w-4 h-4 ${transcript.starred ? 'text-yellow-500 fill-current' : ''}`} /* star icon */>
            <path /* icon path */ />
          </svg>
        </button>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-all"
        >
          Copy
        </button>

        {/* Export button with dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="px-4 py-2 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary-hover transition-all"
          >
            Export
          </button>
          {/* Export menu (same as before) */}
        </div>

        {/* Delete button */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 rounded-lg bg-red-100 text-red-700 font-semibold text-sm hover:bg-red-200 transition-all"
        >
          Delete
        </button>
      </div>
    </div>

    {/* Raw/Summary toggle (if summary exists) */}
    {transcript.summary && (
      <div className="flex items-center gap-2">
        {/* Toggle buttons (same as before) */}
      </div>
    )}
  </div>

  {/* Delete confirmation modal */}
  {showDeleteConfirm && (
    <ConfirmDeleteModal
      onConfirm={() => {
        deleteTranscript(transcript.id);
        setShowDeleteConfirm(false);
      }}
      onCancel={() => setShowDeleteConfirm(false)}
      fileName={transcript.fileName}
    />
  )}
</div>
```

---

### 10. ViewerContent

**File:** `src/components/Analysis/Viewer/ViewerContent.jsx`

**Purpose:** Display transcript text content

**Props:**
```javascript
{
  transcript: TranscriptModel
}
```

**State:**
```javascript
const [activeView, setActiveView] = useState('raw'); // 'raw' or 'summary'
```

**Structure:**
```jsx
<div className="flex-1 overflow-auto">
  <div className="max-w-5xl mx-auto p-6">
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 shadow-lg">
      <div className="prose prose-sm max-w-none">
        <pre className="whitespace-pre-wrap font-sans text-base text-text-dark leading-relaxed">
          {activeView === 'summary' ? transcript.summary : transcript.rawTranscript}
        </pre>
      </div>
    </div>
  </div>
</div>
```

---

### 11. ViewerEmptyState

**File:** `src/components/Analysis/Viewer/ViewerEmptyState.jsx`

**Purpose:** Empty state when no transcript selected

**Props:** None

**Structure:**
```jsx
<div className="h-full flex items-center justify-center bg-gray-50">
  <div className="text-center space-y-6 max-w-md">
    <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center shadow-lg">
      <svg className="w-12 h-12 text-gray-400" /* document icon */>
        <path /* icon path */ />
      </svg>
    </div>

    <div className="space-y-2">
      <h3 className="text-2xl font-bold text-text-dark">
        Select a Transcript
      </h3>
      <p className="text-sm text-text-gray">
        Choose a transcript from the list to view its content and chat with AI about it
      </p>
    </div>

    <button
      onClick={() => switchTab('recording')}
      className="px-6 py-3 rounded-xl bg-gradient-bcg text-white font-semibold text-sm transition-all hover:shadow-lg hover:scale-105 inline-flex items-center gap-2"
    >
      <svg className="w-4 h-4" /* mic icon */>
        <path /* icon path */ />
      </svg>
      Create New Transcription
    </button>
  </div>
</div>
```

---

### 12. ChatPanel

**File:** `src/components/Analysis/Chat/ChatPanel.jsx`

**Purpose:** Right panel containing AI chat interface

**Props:** None (uses AppContext)

**Structure:**
```jsx
<div className="h-full flex flex-col">
  <ChatHeader />

  {selectedContextIds.length > 0 && (
    <div className="flex-shrink-0 px-4 py-2 border-b-2 border-gray-200 bg-white">
      <ContextChips />
    </div>
  )}

  <div className="flex-1 overflow-y-auto p-4">
    {currentChatMessages.length === 0 ? (
      <SuggestedQuestions />
    ) : (
      <MessageList />
    )}
  </div>

  <div className="flex-shrink-0 border-t-2 border-gray-200 bg-white">
    <ChatInput />
  </div>
</div>
```

---

### 13. ChatHeader

**File:** `src/components/Analysis/Chat/ChatHeader.jsx`

**Purpose:** Header with title and controls

**Props:** None (uses AppContext)

**State:**
```javascript
const [showContextSelector, setShowContextSelector] = useState(false);
```

**Structure:**
```jsx
<div className="flex-shrink-0 p-4 border-b-2 border-gray-200 bg-white">
  <div className="flex items-center justify-between mb-2">
    <h3 className="text-lg font-bold text-text-dark flex items-center gap-2">
      <svg className="w-5 h-5 text-primary" /* sparkle icon */>
        <path /* icon path */ />
      </svg>
      AI Assistant
    </h3>

    <div className="flex items-center gap-2">
      {/* Add context button */}
      <button
        onClick={() => setShowContextSelector(true)}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition-all"
        title="Select transcripts for context"
      >
        <svg className="w-4 h-4 text-gray-600" /* plus icon */>
          <path /* icon path */ />
        </svg>
      </button>

      {/* Clear chat button */}
      {currentChatMessages.length > 0 && (
        <button
          onClick={() => {
            if (confirm('Clear this chat history?')) {
              clearChatHistory(selectedTranscriptId);
            }
          }}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-all"
          title="Clear chat history"
        >
          <svg className="w-4 h-4 text-gray-600" /* trash icon */>
            <path /* icon path */ />
          </svg>
        </button>
      )}

      {/* Collapse panel button */}
      <button
        onClick={() => setIsChatPanelOpen(false)}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition-all"
        title="Hide chat panel"
      >
        <svg className="w-4 h-4 text-gray-600" /* chevron right icon */>
          <path /* icon path */ />
        </svg>
      </button>
    </div>
  </div>

  {!selectedTranscriptId && (
    <p className="text-xs text-text-gray">
      Select a transcript to start chatting
    </p>
  )}
</div>

{showContextSelector && (
  <ContextSelector onClose={() => setShowContextSelector(false)} />
)}
```

---

### 14. ContextSelector

**File:** `src/components/Analysis/Chat/ContextSelector.jsx`

**Purpose:** Modal to select multiple transcripts for chat context

**Props:**
```javascript
{
  onClose: Function  // Callback to close modal
}
```

**State:**
```javascript
const [localSelectedIds, setLocalSelectedIds] = useState([...selectedContextIds]);
const [searchQuery, setSearchQuery] = useState('');
```

**Computed Values:**
```javascript
const filteredTranscripts = transcripts.filter(t =>
  t.fileName.toLowerCase().includes(searchQuery.toLowerCase())
);

// Estimate token count (rough: 4 chars = 1 token)
const estimatedTokens = localSelectedIds.reduce((sum, id) => {
  const transcript = transcripts.find(t => t.id === id);
  return sum + (transcript ? Math.ceil(transcript.rawTranscript.length / 4) : 0);
}, 0);

const isOverLimit = estimatedTokens > 100000; // 100k tokens (safe limit for gpt-4o)
```

**Structure:**
```jsx
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
    {/* Header */}
    <div className="p-6 border-b-2 border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-text-dark">
          Select Context Transcripts
        </h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-5 h-5" /* x icon */>
            <path /* icon path */ />
          </svg>
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search transcripts..."
        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-sm"
      />
    </div>

    {/* List */}
    <div className="flex-1 overflow-y-auto p-4">
      {filteredTranscripts.map(transcript => (
        <label
          key={transcript.id}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={localSelectedIds.includes(transcript.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setLocalSelectedIds([...localSelectedIds, transcript.id]);
              } else {
                setLocalSelectedIds(localSelectedIds.filter(id => id !== transcript.id));
              }
            }}
            className="w-4 h-4 text-primary rounded"
          />
          <div className="flex-1">
            <div className="font-semibold text-sm text-text-dark">
              {transcript.fileName}
            </div>
            <div className="text-xs text-text-gray">
              {formatTimestamp(transcript.timestamp)} • {formatDuration(transcript.duration)}
            </div>
          </div>
        </label>
      ))}
    </div>

    {/* Footer */}
    <div className="p-4 border-t-2 border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm">
          <span className="text-text-gray">Selected: </span>
          <span className="font-semibold text-text-dark">{localSelectedIds.length}</span>
          <span className="text-text-gray"> transcript(s)</span>
        </div>
        <div className={`text-xs ${isOverLimit ? 'text-red-600 font-semibold' : 'text-text-gray'}`}>
          ~{(estimatedTokens / 1000).toFixed(1)}k tokens
          {isOverLimit && ' (exceeds safe limit)'}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 rounded-xl border-2 border-gray-200 font-semibold text-sm hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            setSelectedContextIds(localSelectedIds);
            onClose();
          }}
          disabled={isOverLimit}
          className={`flex-1 px-4 py-2 rounded-xl font-semibold text-sm ${
            isOverLimit
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-primary text-white hover:bg-primary-hover'
          }`}
        >
          Apply
        </button>
      </div>
    </div>
  </div>
</div>
```

---

### 15. ContextChips

**File:** `src/components/Analysis/Chat/ContextChips.jsx`

**Purpose:** Display selected context transcripts as removable chips

**Props:** None (uses AppContext)

**Structure:**
```jsx
<div className="flex flex-wrap gap-2">
  {selectedContextIds.map(id => {
    const transcript = transcripts.find(t => t.id === id);
    if (!transcript) return null;

    return (
      <div
        key={id}
        className="inline-flex items-center gap-2 px-3 py-1 bg-primary bg-opacity-10 text-primary text-xs font-semibold rounded-full"
      >
        <span className="truncate max-w-[150px]">{transcript.fileName}</span>
        <button
          onClick={() => setSelectedContextIds(selectedContextIds.filter(cid => cid !== id))}
          className="hover:bg-primary hover:bg-opacity-20 rounded-full p-0.5"
        >
          <svg className="w-3 h-3" /* x icon */>
            <path /* icon path */ />
          </svg>
        </button>
      </div>
    );
  })}

  {selectedContextIds.length === 0 && selectedTranscript && (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
      <span className="truncate max-w-[150px]">{selectedTranscript.fileName}</span>
      <span className="text-gray-500">(current)</span>
    </div>
  )}
</div>
```

---

### 16. MessageList

**File:** `src/components/Analysis/Chat/MessageList.jsx`

**Purpose:** Display chat message history

**Props:** None (uses AppContext)

**Effect:**
```javascript
const messagesEndRef = useRef(null);

useEffect(() => {
  // Scroll to bottom when new message arrives
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [currentChatMessages]);
```

**Structure:**
```jsx
<div className="space-y-4">
  {currentChatMessages.map(message => (
    <MessageBubble key={message.id} message={message} />
  ))}

  {isChatStreaming && (
    <div className="flex items-center gap-2 text-gray-500 text-sm">
      <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
      <span>Thinking...</span>
    </div>
  )}

  <div ref={messagesEndRef} />
</div>
```

---

### 17. MessageBubble

**File:** `src/components/Analysis/Chat/MessageBubble.jsx`

**Purpose:** Individual message bubble

**Props:**
```javascript
{
  message: ChatMessageModel
}
```

**State:**
```javascript
const [showCopyFeedback, setShowCopyFeedback] = useState(false);
```

**Functions:**
```javascript
const handleCopy = () => {
  navigator.clipboard.writeText(message.content);
  setShowCopyFeedback(true);
  setTimeout(() => setShowCopyFeedback(false), 2000);
};
```

**Structure:**
```jsx
<div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
  <div className={`max-w-[85%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
    {/* Message bubble */}
    <div className={`p-3 rounded-2xl ${
      message.role === 'user'
        ? 'bg-primary text-white'
        : 'bg-white border-2 border-gray-200 text-text-dark'
    }`}>
      <p className="text-sm whitespace-pre-wrap break-words">
        {message.content}
      </p>
    </div>

    {/* Metadata row */}
    <div className={`flex items-center gap-2 mt-1 text-xs text-text-gray ${
      message.role === 'user' ? 'justify-end' : 'justify-start'
    }`}>
      <span>{formatMessageTime(message.timestamp)}</span>

      {message.role === 'assistant' && message.contextUsed && message.contextUsed.length > 1 && (
        <>
          <span>•</span>
          <span>{message.contextUsed.length} transcripts</span>
        </>
      )}

      <button
        onClick={handleCopy}
        className="p-1 hover:bg-gray-100 rounded"
        title="Copy message"
      >
        {showCopyFeedback ? (
          <svg className="w-3 h-3 text-green-600" /* check icon */>
            <path /* icon path */ />
          </svg>
        ) : (
          <svg className="w-3 h-3" /* copy icon */>
            <path /* icon path */ />
          </svg>
        )}
      </button>
    </div>
  </div>
</div>
```

**Helper:**
```javascript
const formatMessageTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};
```

---

### 18. SuggestedQuestions

**File:** `src/components/Analysis/Chat/SuggestedQuestions.jsx`

**Purpose:** Display suggested questions when chat is empty

**Props:** None (uses AppContext)

**Constants:**
```javascript
const SUGGESTED_QUESTIONS = [
  {
    icon: '📋',
    text: 'What were the main topics discussed?'
  },
  {
    icon: '✅',
    text: 'Summarize the key decisions made'
  },
  {
    icon: '📝',
    text: 'What action items were mentioned?'
  },
  {
    icon: '👥',
    text: 'Who were the main participants?'
  },
  {
    icon: '❓',
    text: 'What questions were raised?'
  }
];
```

**Structure:**
```jsx
<div className="space-y-4">
  <div className="text-center">
    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary bg-opacity-10 flex items-center justify-center">
      <svg className="w-8 h-8 text-primary" /* sparkle icon */>
        <path /* icon path */ />
      </svg>
    </div>
    <h4 className="text-lg font-bold text-text-dark mb-2">
      Ask me anything
    </h4>
    <p className="text-sm text-text-gray">
      I can help you analyze this transcript
    </p>
  </div>

  <div className="space-y-2">
    <p className="text-xs text-text-gray font-semibold uppercase">
      Suggested Questions
    </p>
    {SUGGESTED_QUESTIONS.map((q, index) => (
      <button
        key={index}
        onClick={() => sendChatMessage(q.text)}
        disabled={!selectedTranscriptId || isChatStreaming}
        className="w-full text-left p-3 rounded-xl bg-white border-2 border-gray-200 hover:border-primary hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="mr-2">{q.icon}</span>
        <span className="text-sm text-text-dark">{q.text}</span>
      </button>
    ))}
  </div>
</div>
```

---

### 19. ChatInput

**File:** `src/components/Analysis/Chat/ChatInput.jsx`

**Purpose:** Text input for sending messages

**Props:** None (uses AppContext)

**State:**
```javascript
const [inputValue, setInputValue] = useState('');
const textareaRef = useRef(null);
```

**Functions:**
```javascript
const handleSend = () => {
  const trimmed = inputValue.trim();
  if (!trimmed || !selectedTranscriptId || isChatStreaming) return;

  sendChatMessage(trimmed);
  setInputValue('');

  // Reset textarea height
  if (textareaRef.current) {
    textareaRef.current.style.height = 'auto';
  }
};

const handleKeyDown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};

const handleInput = (e) => {
  setInputValue(e.target.value);

  // Auto-resize textarea
  e.target.style.height = 'auto';
  e.target.style.height = e.target.scrollHeight + 'px';
};
```

**Structure:**
```jsx
<div className="p-4">
  <div className="flex gap-2">
    <textarea
      ref={textareaRef}
      value={inputValue}
      onChange={handleInput}
      onKeyDown={handleKeyDown}
      disabled={!selectedTranscriptId || isChatStreaming}
      placeholder={
        !selectedTranscriptId
          ? 'Select a transcript to start chatting...'
          : 'Ask a question...'
      }
      rows={1}
      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 max-h-32"
    />

    <button
      onClick={handleSend}
      disabled={!inputValue.trim() || !selectedTranscriptId || isChatStreaming}
      className="px-4 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      {isChatStreaming ? (
        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
      ) : (
        <>
          <svg className="w-4 h-4" /* send icon */>
            <path /* icon path */ />
          </svg>
          Send
        </>
      )}
    </button>
  </div>

  <p className="text-xs text-text-gray mt-2">
    Press Enter to send, Shift+Enter for new line
  </p>
</div>
```

---

## Styling Guidelines

### Color Palette

```css
/* Primary Colors */
--primary: #00A758;           /* BCG Green */
--primary-hover: #008F4A;     /* Darker green for hover */
--primary-light: rgba(0, 167, 88, 0.1); /* 10% opacity for backgrounds */

/* Text Colors */
--text-dark: #1F2937;         /* Dark gray for headings */
--text-gray: #6B7280;         /* Medium gray for body text */
--text-light: #9CA3AF;        /* Light gray for secondary text */

/* Background Colors */
--bg-white: #FFFFFF;
--bg-gray-50: #F9FAFB;
--bg-gray-100: #F3F4F6;

/* Border Colors */
--border-gray-200: #E5E7EB;
--border-gray-300: #D1D5DB;

/* Status Colors */
--success: #10B981;
--error: #EF4444;
--warning: #F59E0B;
--info: #3B82F6;
```

### Tailwind Classes Reference

**Layout:**
- Container widths: `w-[280px]`, `w-[360px]`
- Spacing: `p-4`, `px-6`, `py-3`, `gap-2`, `space-y-4`
- Borders: `border-2 border-gray-200`
- Rounded corners: `rounded-xl` (12px), `rounded-2xl` (16px), `rounded-full`

**Typography:**
- Headers: `text-xl font-bold text-text-dark`
- Body: `text-sm text-text-gray`
- Small: `text-xs text-text-gray`

**Buttons:**
- Primary: `px-4 py-2 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary-hover transition-all`
- Secondary: `px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-all`
- Danger: `px-4 py-2 rounded-lg bg-red-100 text-red-700 font-semibold text-sm hover:bg-red-200 transition-all`

**Cards:**
- Base: `bg-white rounded-xl border-2 border-gray-200 p-4`
- Hover: `hover:border-primary hover:shadow-sm transition-all`
- Selected: `bg-primary bg-opacity-5 border-primary`

---

## Integration Points

### 1. Recording Tab → Analysis Tab

When user completes transcription on Recording tab:

```javascript
// In RecordingPanel.jsx, after transcription completes:

// Create transcript object
const transcriptData = {
  fileName: selectedFile?.name || 'Recording',
  rawTranscript: result.rawTranscript,
  vttTranscript: transcriptionResult.transcript, // VTT format
  summary: result.summary,
  summaryTemplate: result.summaryTemplate,
  model: selectedModel,
  duration: recordingDuration || 0,
  timestamp: Date.now(),
  isDiarized: transcriptionResult.isDiarized || false,
  fileSize: selectedFile ? selectedFile.size / (1024 * 1024) : null
};

// Save to analysis
const transcriptId = await saveTranscript(transcriptData);

// Show "Save to Analysis" button or auto-save
// Optional: Switch to Analysis tab
// switchTab('analysis');
// setSelectedTranscriptId(transcriptId);
```

### 2. AppContext Initialization

In `AppContext.jsx`, initialize on mount:

```javascript
useEffect(() => {
  // ... existing initialization
  loadTranscripts();
  loadChatHistory();
}, []);
```

### 3. Main Process Startup

In `main.js`, ensure electron-store is initialized:

```javascript
const Store = require('electron-store');
const store = new Store({
  defaults: {
    transcripts: [],
    chatHistory: {}
  }
});
```

---

## Implementation Phases

### Phase 1: Foundation (Storage & Display)
**Goal:** Save and display transcripts

**Tasks:**
1. Add storage functions to AppContext
2. Add backend handlers (save/get transcripts)
3. Update preload.js with new APIs
4. Create TranscriptSidebar components (SearchBar, FilterTabs, TranscriptList, TranscriptCard, StorageInfo)
5. Update AnalysisPanel to three-column layout
6. Add "Save to Analysis" button on Recording tab
7. Test: Create transcript → See it in list → Click to view

**Files to Create:**
- `Sidebar/TranscriptSidebar.jsx`
- `Sidebar/SearchBar.jsx`
- `Sidebar/FilterTabs.jsx`
- `Sidebar/TranscriptList.jsx`
- `Sidebar/TranscriptCard.jsx`
- `Sidebar/StorageInfo.jsx`

**Files to Modify:**
- `AnalysisPanel.jsx`
- `AppContext.jsx`
- `main.js`
- `preload.js`
- `Recording/RecordingPanel.jsx`

### Phase 2: Enhanced Viewer
**Goal:** Improve transcript viewing experience

**Tasks:**
1. Create ViewerHeader with delete functionality
2. Create ViewerContent
3. Create ViewerEmptyState
4. Add star/favorite system
5. Add delete confirmation modal
6. Test: View transcript → Star it → Delete it

**Files to Create:**
- `Viewer/ViewerHeader.jsx`
- `Viewer/ViewerContent.jsx`
- `Viewer/ViewerEmptyState.jsx`

**Files to Modify:**
- `Viewer/TranscriptViewer.jsx`

### Phase 3: Basic Chat
**Goal:** Single-transcript AI chat

**Tasks:**
1. Add chat state to AppContext
2. Add backend chat handler
3. Create ChatPanel structure
4. Create ChatHeader, MessageList, MessageBubble, ChatInput
5. Create SuggestedQuestions
6. Test: Select transcript → Ask question → Get response

**Files to Create:**
- `Chat/ChatPanel.jsx`
- `Chat/ChatHeader.jsx`
- `Chat/MessageList.jsx`
- `Chat/MessageBubble.jsx`
- `Chat/ChatInput.jsx`
- `Chat/SuggestedQuestions.jsx`

**Files to Modify:**
- `AnalysisPanel.jsx`
- `AppContext.jsx`
- `main.js`
- `preload.js`

### Phase 4: Multi-Transcript Context
**Goal:** Chat across multiple transcripts

**Tasks:**
1. Create ContextSelector modal
2. Create ContextChips display
3. Add multi-transcript context logic
4. Add token count estimation
5. Test: Select multiple transcripts → Ask cross-transcript question

**Files to Create:**
- `Chat/ContextSelector.jsx`
- `Chat/ContextChips.jsx`

**Files to Modify:**
- `Chat/ChatPanel.jsx`
- `Chat/ChatHeader.jsx`
- `AppContext.jsx` (buildSystemPrompt function)

---

## Testing Checklist

### Phase 1 Testing
- [ ] Create new transcription on Recording tab
- [ ] Transcript appears in Analysis sidebar list
- [ ] Search for transcript by name
- [ ] Filter by All/Starred/Recent
- [ ] Click transcript card → Loads in center viewer
- [ ] Storage info shows correct counts

### Phase 2 Testing
- [ ] Star a transcript → Icon updates
- [ ] Filter by Starred → Only starred appear
- [ ] Delete transcript → Confirmation modal appears
- [ ] Confirm delete → Transcript removed from list and storage
- [ ] Export transcript as TXT/VTT/MD

### Phase 3 Testing
- [ ] Select transcript → Chat panel shows suggested questions
- [ ] Click suggested question → Message sent
- [ ] AI responds with relevant answer
- [ ] Continue conversation → Message history persists
- [ ] Clear chat history → Messages removed
- [ ] Chat history persists after app restart

### Phase 4 Testing
- [ ] Click "Add Context" → Modal opens
- [ ] Select 2-3 transcripts → Token count updates
- [ ] Apply selection → Context chips appear
- [ ] Ask question → AI uses all selected transcripts
- [ ] Remove context chip → Context updated
- [ ] Token limit warning appears when exceeded

---

## File Checklist

### New Files to Create (19 total)

**Sidebar (6 files):**
- [ ] `src/components/Analysis/Sidebar/TranscriptSidebar.jsx`
- [ ] `src/components/Analysis/Sidebar/SearchBar.jsx`
- [ ] `src/components/Analysis/Sidebar/FilterTabs.jsx`
- [ ] `src/components/Analysis/Sidebar/TranscriptList.jsx`
- [ ] `src/components/Analysis/Sidebar/TranscriptCard.jsx`
- [ ] `src/components/Analysis/Sidebar/StorageInfo.jsx`

**Viewer (3 files):**
- [ ] `src/components/Analysis/Viewer/ViewerHeader.jsx`
- [ ] `src/components/Analysis/Viewer/ViewerContent.jsx`
- [ ] `src/components/Analysis/Viewer/ViewerEmptyState.jsx`

**Chat (10 files):**
- [ ] `src/components/Analysis/Chat/ChatPanel.jsx`
- [ ] `src/components/Analysis/Chat/ChatHeader.jsx`
- [ ] `src/components/Analysis/Chat/ContextSelector.jsx`
- [ ] `src/components/Analysis/Chat/ContextChips.jsx`
- [ ] `src/components/Analysis/Chat/MessageList.jsx`
- [ ] `src/components/Analysis/Chat/MessageBubble.jsx`
- [ ] `src/components/Analysis/Chat/SuggestedQuestions.jsx`
- [ ] `src/components/Analysis/Chat/ChatInput.jsx`

### Files to Modify (6 total)

- [ ] `src/components/Analysis/AnalysisPanel.jsx` (complete rewrite for three-column layout)
- [ ] `src/components/Analysis/TranscriptViewer.jsx` (move to Viewer folder, split into sub-components)
- [ ] `src/context/AppContext.jsx` (add transcript and chat state/functions)
- [ ] `main.js` (add 5 new IPC handlers)
- [ ] `preload.js` (expose new IPC APIs)
- [ ] `src/components/Recording/RecordingPanel.jsx` (add "Save to Analysis" integration)

---

## Agent Assignment Plan

### Agent 1: Storage & Sidebar
**Responsibility:** Phase 1 - Foundation

**Tasks:**
1. Add transcript storage functions to AppContext
2. Create all Sidebar components (6 files)
3. Add backend handlers for save/get transcripts
4. Update preload.js

**Deliverables:**
- Sidebar showing list of transcripts
- Search and filter working
- Storage info displaying

### Agent 2: Viewer Enhancement
**Responsibility:** Phase 2 - Enhanced Viewer

**Tasks:**
1. Split TranscriptViewer into sub-components
2. Create ViewerHeader, ViewerContent, ViewerEmptyState
3. Add delete functionality with confirmation
4. Add star/favorite system

**Deliverables:**
- Enhanced viewer with all actions
- Delete and star working
- Empty state when no transcript selected

### Agent 3: Chat Foundation
**Responsibility:** Phase 3 - Basic Chat

**Tasks:**
1. Add chat state to AppContext
2. Create ChatPanel and sub-components (5 files)
3. Add backend chat handler
4. Implement single-transcript chat

**Deliverables:**
- Working chat panel with suggested questions
- Message history
- AI responses based on transcript

### Agent 4: Multi-Context & Integration
**Responsibility:** Phase 4 - Advanced Features

**Tasks:**
1. Create ContextSelector modal
2. Create ContextChips
3. Add multi-transcript context logic
4. Integrate with Recording tab
5. Final testing and polish

**Deliverables:**
- Multi-transcript context selection
- Cross-transcript queries
- Full end-to-end flow working

---

## Success Criteria

✅ **Phase 1 Complete When:**
- Transcripts saved and persisted
- List displays all transcripts
- Search/filter working
- Click transcript to view

✅ **Phase 2 Complete When:**
- Enhanced viewer with all actions
- Delete and star working
- Export still functional

✅ **Phase 3 Complete When:**
- Chat panel functional
- Messages sent and received
- AI provides relevant answers
- Chat history persists

✅ **Phase 4 Complete When:**
- Multi-transcript context working
- Token limit checking
- Full integration complete
- All tests passing

---

## Notes

- All timestamps should use `Date.now()` for consistency
- All IDs should use format `{type}-{timestamp}` for uniqueness
- Always save to electron-store after state changes
- Use `useMemo` for expensive computed values (filtered lists)
- Use `useCallback` for functions passed as props
- Add loading states for all async operations
- Add error boundaries for chat component
- Consider adding undo/redo for delete operations (future)
- Consider adding export all transcripts (future)
- Consider adding tags/categories (future)

---

## API Limits & Considerations

**OpenAI Token Limits:**
- GPT-4o: 128k context window
- Safe limit: ~100k tokens for input (leaving room for output)
- Rough estimate: 4 characters = 1 token
- Typical 5-minute transcript: ~1,500 words = ~2,000 tokens
- Can include 40-50 transcripts in context safely

**Electron-Store:**
- No hard limits, but keep reasonable
- Estimate 500 transcripts = ~50MB storage
- Consider adding cleanup for old transcripts (future)

**Performance:**
- Virtualize transcript list if > 100 items (future)
- Debounce search input (300ms)
- Lazy load chat history
- Stream OpenAI responses for better UX (future enhancement)
