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
- Powered by OpenAI Whisper API
- VTT format with automatic SRT conversion
- File size limit: 25MB

## Credits

Created by [Patrick C. Freyer](https://patrickfreyer.com)

## License

MIT
