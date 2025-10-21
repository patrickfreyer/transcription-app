# Audio Transcription App

A simple, sleek, and beautifully elegant desktop application for transcribing audio files using OpenAI's Whisper API.

![App Icon](Transcribe%20by%20Patrick.png)

## Features

- **Drag-and-drop audio file upload** - Support for MP3, WAV, M4A, WEBM, MP4 formats
- **Direct audio recording** - Record audio directly in the app
- **OpenAI Whisper API integration** - High-quality transcription powered by OpenAI
- **Timestamp toggle** - View transcripts with or without timestamps
- **Multiple export formats** - Save as Plain Text (.txt), WebVTT (.vtt), or SubRip (.srt)
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

2. **Transcribe**
   - Click the "Transcribe" button
   - Wait for OpenAI to process your audio

3. **View & Export**
   - Toggle timestamps on/off
   - Select export format (TXT, VTT, or SRT)
   - Click "Save As..." to export
   - Or click "Copy" to copy to clipboard

## Technical Details

- Built with Electron 28
- Powered by OpenAI Whisper API
- VTT format with automatic SRT conversion
- File size limit: 25MB

## Credits

Created by [Patrick C. Freyer](https://patrickfreyer.com)
- Email: freyer.patrick@bcg.com

## License

MIT
