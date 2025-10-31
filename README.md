# Audio Transcription App v2.0.0

A powerful desktop application for audio transcription and AI-powered analysis. Transcribe audio files using OpenAI's advanced models, then chat with your transcripts using intelligent AI assistance.

![App Icon](Transcribe%20by%20Patrick.png)

## ✨ Key Features

### 🎙️ Recording & Transcription
- **Multiple transcription models** - Choose from `gpt-4o-transcribe`, `whisper-1`, or `gpt-4o-transcribe-diarize`
- **Speaker diarization** - Automatic speaker identification with reference audio support
- **Direct audio recording** - Record audio directly in the app with live waveform visualization
- **Drag-and-drop upload** - Support for MP3, WAV, M4A, WEBM, MP4, OGG, FLAC formats
- **Large file support** - Automatic chunking for files of any size (no 25MB limit)
- **Custom prompts** - Guide transcription with context-specific prompts
- **Summary generation** - AI-powered summaries with customizable templates

### 🚀 Performance Optimizations (NEW in v2.0.0)
- **Parallel chunk processing** - 60-80% faster transcription for large files
- **Dynamic rate limiting** - Intelligent API request management (80 RPM)
- **Audio speed optimization** - Optional 2-3x speed-up for 23-33% cost savings
- **Opus compression** - Bandwidth optimization with 5-10x file size reduction

### 💬 AI-Powered Analysis
- **Intelligent chat interface** - Ask questions about your transcripts using OpenAI Agents SDK
- **Context-aware responses** - AI fetches only relevant sections (90% token reduction)
- **Multi-transcript support** - Compare and analyze multiple transcripts simultaneously
- **Advanced tools** - Search, chunk retrieval, speaker extraction, transcript comparison
- **Chat history** - Persistent conversation history per transcript

### 📚 Transcript Library
- **Organized storage** - All transcripts saved automatically with metadata
- **Smart search** - Find transcripts by name, content, or date
- **Filtering options** - View All, Starred, or Recent transcripts
- **Export formats** - TXT, VTT, or Markdown with one click
- **Secure storage** - API keys stored in system keychain (macOS/Windows)

### 🎨 Modern Interface
- **Two-tab design** - Separate Recording and Analysis workspaces
- **Dark mode** - Beautiful dark theme with system-aware switching
- **Resizable panels** - Customize your workspace layout
- **Apple-inspired design** - Clean, minimal, and intuitive

## 📦 Installation

### macOS
Download and install `Audio Transcription-2.0.0-arm64.dmg`

### Windows
Download and run `Audio Transcription Setup 2.0.0.exe` or use the portable version

## 🚀 Quick Start

1. **Launch the app** and enter your OpenAI API key
2. **Recording tab**: Upload or record audio, then transcribe
3. **Analysis tab**: View transcripts and chat with AI about the content

## 📖 Usage Guide

### Recording Tab

1. **Upload or Record Audio**
   - Drag and drop an audio file
   - Click "Choose File" to browse
   - Or use "Record" to capture audio directly

2. **Configure Transcription**
   - Select transcription model (gpt-4o-transcribe recommended)
   - Enable speaker diarization if needed
   - Add optional context prompt
   - Choose summary template

3. **Transcribe**
   - Click "Transcribe" and monitor progress
   - Large files automatically chunked and processed in parallel
   - Transcript auto-saves to Analysis tab when complete

### Analysis Tab

1. **Transcript Library (Left Panel)**
   - Search transcripts by name
   - Filter: All / Starred / Recent
   - Click to view transcript

2. **Transcript Viewer (Middle Panel)**
   - Read full transcript with formatting
   - Export to TXT, VTT, or Markdown
   - Star important transcripts

3. **AI Chat (Right Panel)**
   - Select one or more transcripts for context
   - Ask questions about the content
   - AI intelligently searches and references specific sections
   - Chat history saved per transcript

### Example Chat Queries

- "What were the main topics discussed?"
- "Summarize the key decisions made"
- "What did [Speaker Name] say about [topic]?"
- "Find all mentions of [keyword]"
- "Compare how the speakers approached [topic]"

## 🔧 Technical Details

### Architecture
- **Frontend**: React 19, Vite, TailwindCSS
- **Backend**: Electron 28, Node.js
- **AI**: OpenAI Agents SDK, gpt-4o, Whisper models
- **Storage**: electron-store with system keychain integration
- **Audio**: FFmpeg with fluent-ffmpeg wrapper

### Transcription Models
- **gpt-4o-transcribe** - Latest model, best quality, $0.006/minute
- **whisper-1** - Previous generation, $0.006/minute
- **gpt-4o-transcribe-diarize** - Automatic speaker identification

### Performance Features
- Parallel chunk processing (5 concurrent)
- Dynamic rate limiting (80 RPM)
- Optional audio speed optimization (1x-3x)
- Optional Opus compression for uploads
- Automatic format conversion (OGG, FLAC → MP3)

### Security & Privacy
- API keys stored in system keychain (macOS Keychain/Windows Credential Manager)
- All data stored locally (no cloud sync)
- Chat history encrypted with OS-level encryption

## 🔑 API Key Setup

1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Click the key icon in the app header
3. Paste your API key and click "Save"
4. Key is securely stored in your system keychain

## 🧪 Testing

### Prerequisites
- Node.js 20+
- OpenAI API key

### Setup
```bash
# Install dependencies
npm install

# Run in development mode
npm start

# Run tests
export OPENAI_API_KEY=your-api-key-here
npm test

# Build for macOS
npm run build:mac

# Build for Windows
npm run build:win
```

### Test Files
- `test-ffmpeg.js` - FFmpeg infrastructure tests
- `test-transcription-service.js` - Integration tests for optimizations

## 📊 Performance Benchmarks

### Large File Example (60 min audio, 10 chunks)

**v1.0.0 (Sequential):**
- Processing time: ~320 seconds
- Cost: $0.36

**v2.0.0 (Parallel):**
- Processing time: ~70 seconds (78% faster)
- Cost: $0.36

**v2.0.0 (Parallel + 2.5x Speed):**
- Processing time: ~50 seconds
- Cost: $0.27 (25% savings)

## 🛠️ Development

See [CLAUDE.md](CLAUDE.md) for comprehensive development documentation including:
- Project architecture
- Backend services structure
- Adding new features
- Agent tools and guardrails
- Testing strategies

## 🐛 Troubleshooting

### "FFmpeg not found" error
- Reinstall the app (FFmpeg should be bundled automatically)
- On Windows: Ensure you're running the installer, not just the .exe

### Transcription fails for large files
- Check your OpenAI API rate limits
- Ensure stable internet connection
- Try transcribing in smaller chunks

### Chat responses are slow
- This is normal for long transcripts
- The AI is intelligently searching through the content
- Responses typically arrive within 5-10 seconds

## 📝 Credits

Created by [Patrick C. Freyer](https://patrickfreyer.com) and Alexander Achba

### Open Source Libraries
- [Electron](https://www.electronjs.org/)
- [React](https://react.dev/)
- [OpenAI Node SDK](https://github.com/openai/openai-node)
- [OpenAI Agents SDK](https://github.com/openai/openai-agents-js)
- [FFmpeg](https://ffmpeg.org/)

## 📄 License

MIT

## 🔗 Links

- [Repository](https://github.com/patrickfreyer/transcription-app)
- [OpenAI Platform](https://platform.openai.com/)
- [Issue Tracker](https://github.com/patrickfreyer/transcription-app/issues)

---

**Version 2.0.0** - Major redesign with AI chat, performance optimizations, and comprehensive analysis features
