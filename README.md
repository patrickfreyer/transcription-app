# Audio Transcription App

A simple, sleek, and beautifully elegant desktop application for transcribing audio files using OpenAI's Whisper API.

![App Icon](Transcribe%20by%20Patrick.png)

## Features

### Transcription
- **Drag-and-drop audio file upload** - Support for MP3, WAV, M4A, WEBM, MP4 formats
- **Direct audio recording** - Record audio directly in the app
- **Multiple transcription models** - Choose between standard transcription or speaker identification
- **Speaker diarization** - Automatically identify and label different speakers
- **Large file support** - Automatically chunks and processes files larger than 25MB
- **Context-aware transcription** - Add custom prompts to improve accuracy for technical terms, names, and industry jargon

### Meeting Summaries (NEW!)
- **Automatic summary generation** - AI-powered meeting summaries using GPT-4o
- **Mermaid.js diagrams** - Automatically generates flowcharts and process diagrams where relevant
- **BCG-style formatting** - Professional, concise summaries perfect for business contexts
- **Multiple sections** - Overview, Key Topics, Action Items, and Executive Summary
- **Markdown export** - Save summaries as beautifully formatted markdown files
- **Typora integration** - One-click save and open in Typora

### Export & Display
- **Timestamp toggle** - View transcripts with or without timestamps
- **Multiple export formats** - Save as Plain Text (.txt), WebVTT (.vtt), SubRip (.srt), or Markdown (.md)
- **Apple-inspired design** - Flat, minimal, and elegant interface
- **Cross-platform** - Works on macOS and Windows

## Installation

### macOS
Download and install `Audio Transcription-1.0.0-arm64.dmg`

### Windows
Download and run `Audio Transcription Setup 1.0.0.exe` or use the portable version `Audio Transcription 1.0.0.exe`

## Setup

1. Launch the application
2. Enter your OpenAI API key on first run
3. Start transcribing!

## Usage

1. **Upload or Record**
   - Drag and drop an audio file, or
   - Click to browse for a file, or
   - Switch to Record tab to record audio directly

2. **Choose Model & Options**
   - Select between Standard Transcription or Speaker Identification
   - Optionally add speaker reference clips (for speaker diarization)
   - Add custom prompts for better accuracy on technical terms

3. **Transcribe**
   - Click the "Transcribe" button
   - Wait for OpenAI to process your audio
   - Automatically generates a meeting summary

4. **View Summary**
   - Review AI-generated meeting summary with diagrams
   - Save as markdown or open in Typora
   - Switch to transcript view for detailed text

5. **Export**
   - Toggle timestamps on/off in transcript view
   - Select export format (TXT, VTT, SRT, or MD)
   - Click "Save As..." to export
   - Or click "Copy" to copy to clipboard

## Technical Details

- Built with Electron 28
- Powered by OpenAI GPT-4o Transcribe and GPT-4o
- Models: `gpt-4o-transcribe`, `gpt-4o-transcribe-diarize`, `gpt-4o`
- Large file support with automatic chunking (no file size limit)
- FFmpeg integration for audio conversion and processing
- Markdown rendering with Marked.js
- Diagram generation with Mermaid.js

## Development

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

### Testing

The project includes comprehensive tests for transcription and summary generation:

#### Local Testing
```bash
# Set your OpenAI API key
export OPENAI_API_KEY=your-api-key-here

# Run all tests (uses local test_audio.mp3)
npm test

# Run only transcription tests
npm run test:transcription

# Run only FFmpeg tests
npm run test:ffmpeg
```

#### CI/CD Testing
The GitHub Actions workflow automatically:
- Downloads test audio from [Planetary Radio podcast](https://omny.fm/shows/planetary-radio-space-exploration-astronomy-and-sc/elon-musk-of-spacex)
- Tests transcription and summary generation
- Validates build artifacts for macOS and Windows

**Note:** You must add `OPENAI_API_KEY` as a repository secret for CI/CD tests to run.

### Test Files
- `test_audio.mp3` - Local test file (26MB, included in repo)
- Remote test URL: Used automatically in CI/CD (see `CREDITS.md`)

## Credits

Created by [Patrick C. Freyer](https://patrickfreyer.com)

See [CREDITS.md](CREDITS.md) for audio attribution and third-party library acknowledgments.

## License

MIT
