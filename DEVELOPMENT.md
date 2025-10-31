# Audio Transcription App v2.0.0 - Development Guide

## 🎯 Project Overview

This is a complete redesign of the audio transcription application, transforming it from a simple linear workflow tool into a comprehensive transcript management and analysis system with AI-powered chat capabilities.

### Major Changes from v1.3.0

**Architecture:**
- ✅ Single Page Application (SPA) instead of multi-page navigation
- ✅ Cross-platform support (macOS + Windows) with platform-specific UI
- ✅ Secure API key storage using system keychain/credential manager
- ✅ Two-mode interface: Recording & Analysis tabs

**New Features:**
- API key management in header (no blocking setup screen)
- Transcript library with search and filtering
- AI-powered chat interface for transcript analysis
- Persistent storage with IndexedDB + file system
- Custom title bar for Windows

---

## 📁 Project Structure

```
transcription-app-2.0.0/
├── src/
│   ├── main.html                    # Main SPA shell
│   ├── styles/
│   │   ├── base/
│   │   │   ├── variables.css        # Design tokens
│   │   │   ├── reset.css            # CSS reset
│   │   │   └── typography.css       # Typography styles
│   │   ├── components/
│   │   │   ├── buttons.css          # Button components
│   │   │   ├── inputs.css           # Input/form components
│   │   │   ├── cards.css            # Card components
│   │   │   └── modals.css           # Modal/toast components
│   │   └── layout/
│   │       ├── title-bar.css        # Windows title bar
│   │       ├── header.css           # App header
│   │       └── main.css             # Main layout
│   └── scripts/
│       ├── core/
│       │   └── app.js               # Main application controller
│       ├── features/                # Feature modules (to be added)
│       └── utils/
│           ├── platform.js          # Platform detection
│           ├── icons.js             # SVG icon system
│           ├── helpers.js           # General utilities
│           └── dom.js               # DOM utilities
│
├── main.js                          # Electron main process
├── preload.js                       # IPC bridge
├── package.json                     # Dependencies
└── build/                           # App icons

```

---

## ✅ Completed (Phase 1)

### 1. Foundation & Architecture
- ✅ Organized file structure with clear separation of concerns
- ✅ Design system with CSS variables (light/dark mode support)
- ✅ Cross-platform utilities and platform detection
- ✅ SVG icon system (no emoji dependencies)
- ✅ CSS reset and typography system

### 2. Core Components
- ✅ Button components (primary, secondary, icon, action buttons)
- ✅ Input components (text, password, textarea, search, select)
- ✅ Card components (transcript cards, mini cards, empty states)
- ✅ Modal components (overlays, dialogs, toasts)

### 3. App Shell
- ✅ Main HTML structure with tab navigation
- ✅ Custom title bar for Windows (minimize, maximize, close)
- ✅ App header with mode tabs and action buttons
- ✅ API key button with status indicator
- ✅ Recording tab panel (with blocking overlay when no API key)
- ✅ Analysis tab panel (placeholder)

### 4. API Key Management
- ✅ Secure storage using keytar (Keychain on macOS, Credential Manager on Windows)
- ✅ Modal interface for API key input
- ✅ Validation with OpenAI API
- ✅ Status indicators (missing, valid, loading)
- ✅ Show/hide password toggle
- ✅ Paste from clipboard button

### 5. Main Application Logic
- ✅ App initialization and platform detection
- ✅ Tab switching functionality
- ✅ Keyboard shortcuts (Cmd/Ctrl+K, Cmd/Ctrl+1, Cmd/Ctrl+2)
- ✅ Window controls for Windows custom title bar
- ✅ API key check on startup

---

## 🚧 Next Steps (Phase 2-5)

### Phase 2: Recording Tab Migration
**Tasks:**
- Migrate recording/upload functionality from v1.3.0
- Adapt styling to new design system
- Add "Recent Transcriptions" preview section
- Update transcription flow to auto-save to storage
- Test with various audio formats

**Files to create:**
- `src/scripts/features/recording.js`
- `src/styles/tabs/recording.css`

---

### Phase 3: Transcript Storage Layer
**Tasks:**
- Design and implement IndexedDB schema
- Create CRUD operations for transcripts
- Implement file system storage for full transcripts
- Add search indexing
- Create backup/restore functionality

**Files to create:**
- `src/scripts/features/transcript-storage.js`
- `src/scripts/core/database.js`

**Database Schema:**
```javascript
// transcripts store
{
  id: "uuid",
  title: "Meeting Notes",
  dateCreated: timestamp,
  duration: seconds,
  model: "gpt-4o-transcribe",
  isDiarized: false,
  transcriptFilePath: "/path/to/transcript.json",
  audioFilePath: "/path/to/audio.mp3", // optional
  previewText: "First 200 chars...",
  chatMessageCount: 0,
  tags: [],
  searchIndex: "searchable text"
}

// chatHistory store
{
  id: "uuid",
  transcriptId: "transcript-uuid",
  messages: [{role, content, timestamp}]
}
```

---

### Phase 4: Analysis Tab (Library + Chat)
**Tasks:**
- Build transcript library sidebar
- Implement search and filter functionality
- Create transcript card rendering
- Build chat interface UI
- Implement message bubbles and chat history
- Add suggested prompts
- Create context menu for transcript actions

**Files to create:**
- `src/scripts/features/transcript-library.js`
- `src/scripts/features/chat.js`
- `src/scripts/features/search-filter.js`
- `src/styles/tabs/analysis.css`

---

### Phase 5: Chat API Integration
**Tasks:**
- Integrate OpenAI Chat API
- Implement streaming responses
- Add conversation history management
- Create context strategy (full transcript vs. RAG)
- Add error handling and retry logic
- Implement copy and regenerate actions

**Chat Context Strategy:**
```javascript
// Initial: Send full transcript as context
// Future: Implement RAG with vector embeddings
```

---

### Phase 6: Modals & Additional Features
**Tasks:**
- Full transcript viewer modal
- Settings panel
- Export functionality (TXT, VTT, SRT, Markdown)
- Delete confirmation dialogs
- Toast notifications

**Files to create:**
- `src/scripts/features/modal-manager.js`
- `src/scripts/features/export.js`

---

### Phase 7: Polish & Testing
**Tasks:**
- Add all animations and transitions
- Implement loading states everywhere
- Accessibility audit (keyboard nav, ARIA labels)
- Cross-platform testing (macOS & Windows)
- Performance optimization
- Bug fixes

---

## 🔧 Development Commands

```bash
# Install dependencies
npm install

# Start dev mode
npm start

# Build for macOS
npm run build:mac

# Build for Windows
npm run build:win

# Build for both
npm run build
```

---

## 🎨 Design System

### Colors
- Accent Blue: `#007AFF` (macOS), `#0A84FF` (dark mode)
- Success Green: `#34C759`
- Error Red: `#FF3B30`
- Warning Orange: `#FF9500`

### Typography
- Font Family: SF Pro (macOS), Segoe UI (Windows), fallback to system
- Base Size: 15px
- Heading Sizes: 32px, 24px, 20px, 17px, 15px, 13px

### Spacing Scale
- xs: 4px, sm: 8px, md: 12px, lg: 16px, xl: 24px, 2xl: 32px, 3xl: 48px, 4xl: 64px

### Border Radius
- sm: 4px, md: 8px, lg: 12px, xl: 16px, 2xl: 20px, full: 9999px

---

## 🔐 Security

### API Key Storage
- **macOS:** Keychain Access (`keytar` package)
- **Windows:** Credential Manager (`keytar` package)
- **Service Name:** "Audio Transcription App"
- **Account Name:** "openai-api-key"

### Data Security
- No API keys stored in localStorage or plaintext
- Transcripts stored locally (not sent to cloud)
- Chat history stored locally

---

## 🐛 Known Issues & Limitations

1. **API Key Migration:** Old API keys in `global.apiKey` won't auto-migrate to secure storage
2. **Recording Tab:** Currently shows placeholder, needs full implementation
3. **Analysis Tab:** Placeholder only, needs implementation
4. **Settings:** Not implemented yet
5. **Export:** Not implemented yet

---

## 📝 Code Style Guidelines

### JavaScript
- Use ES6 modules (`import`/`export`)
- Use classes for major features
- Use async/await for promises
- Add JSDoc comments for public methods
- Use descriptive variable names

### CSS
- Use BEM-like naming for components
- Use CSS variables for all colors/spacing
- Mobile-first responsive design
- Support light & dark modes

### File Organization
- One major feature per file (no files < 50 lines unless necessary)
- Group related utilities together
- Keep components modular and reusable

---

## 🚀 Running the App

The app will launch with:
1. Custom title bar (Windows only)
2. Header with Recording/Analysis tabs
3. API key button showing status
4. Recording tab with blocking overlay if no API key
5. Modal for API key input

**First Run:**
1. Click the red API key button
2. Enter your OpenAI API key
3. Key is validated and saved to secure storage
4. Recording interface becomes accessible

---

## 📚 Resources

- **Electron Docs:** https://www.electronjs.org/docs
- **OpenAI API:** https://platform.openai.com/docs
- **Keytar (Secure Storage):** https://github.com/atom/node-keytar
- **Lucide Icons:** https://lucide.dev/

---

## 👥 Credits

- **Original Author:** Patrick C. Freyer (freyer.patrick@bcg.com)
- **Redesign:** v2.0.0 with AI-powered analysis features
- **License:** MIT

---

## 📞 Support

For issues, questions, or contributions:
1. Check this documentation first
2. Review the code comments
3. Test in dev mode before building
4. Report bugs with detailed steps to reproduce
