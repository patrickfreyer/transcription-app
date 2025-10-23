const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const OpenAI = require('openai');
const fs = require('fs');
const os = require('os');

// App data directory for persistent storage
const APP_DATA_DIR = path.join(app.getPath('userData'), 'transcriptions');

// Ensure app data directory exists
if (!fs.existsSync(APP_DATA_DIR)) {
  fs.mkdirSync(APP_DATA_DIR, { recursive: true });
}

// Add error logging for startup issues
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dialog.showErrorBox('Application Error', `An error occurred during startup:\n\n${error.message}\n\nStack: ${error.stack}`);
});

let ffmpeg, ffmpegPath, ffprobePath;
let ffmpegAvailable = false;

try {
  console.log('=== FFmpeg Loading Debug Info ===');
  console.log('Platform:', process.platform);
  console.log('Architecture:', process.arch);
  console.log('App path:', app.getAppPath());
  console.log('Resource path:', process.resourcesPath);

  ffmpeg = require('fluent-ffmpeg');
  console.log('✓ fluent-ffmpeg loaded');

  try {
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
    ffmpegPath = ffmpegInstaller.path;

    // Fix path for packaged app with asar.unpacked
    if (ffmpegPath.includes('app.asar') && !ffmpegPath.includes('.asar.unpacked')) {
      ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
    }

    console.log('✓ ffmpeg-installer loaded');
    console.log('FFmpeg path:', ffmpegPath);
    console.log('FFmpeg exists:', fs.existsSync(ffmpegPath));

    if (fs.existsSync(ffmpegPath)) {
      const stat = fs.statSync(ffmpegPath);
      console.log('FFmpeg is file:', stat.isFile());
      console.log('FFmpeg is directory:', stat.isDirectory());
    }
  } catch (e) {
    console.error('✗ Error loading ffmpeg-installer:', e.message);
    throw e;
  }

  try {
    const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
    ffprobePath = ffprobeInstaller.path;

    // Fix path for packaged app with asar.unpacked
    if (ffprobePath.includes('app.asar') && !ffprobePath.includes('.asar.unpacked')) {
      ffprobePath = ffprobePath.replace('app.asar', 'app.asar.unpacked');
    }

    console.log('✓ ffprobe-installer loaded');
    console.log('FFprobe path:', ffprobePath);
    console.log('FFprobe exists:', fs.existsSync(ffprobePath));

    if (fs.existsSync(ffprobePath)) {
      const stat = fs.statSync(ffprobePath);
      console.log('FFprobe is file:', stat.isFile());
      console.log('FFprobe is directory:', stat.isDirectory());
    }
  } catch (e) {
    console.error('✗ Error loading ffprobe-installer:', e.message);
    throw e;
  }

  // Set ffmpeg and ffprobe paths
  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);

  ffmpegAvailable = true;
  console.log('✓ FFmpeg fully configured and available');
  console.log('=================================');
} catch (error) {
  console.error('=== FFmpeg Loading Failed ===');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  console.error('============================');

  // Show error dialog on Windows
  if (process.platform === 'win32') {
    dialog.showErrorBox(
      'Large File Support Unavailable',
      `FFmpeg could not be loaded. Large file support (>25MB) will not work.\n\nError: ${error.message}\n\nFiles under 25MB will still work normally.`
    );
  }
}

// Set the app name for dock and menu bar
app.setName('Audio Transcription');

let mainWindow;

// Helper function to get audio duration
function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata.format.duration);
      }
    });
  });
}

// Helper function to convert audio to MP3 format
async function convertToMP3(filePath) {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const outputPath = path.join(tempDir, `converted-${Date.now()}.mp3`);

    ffmpeg(filePath)
      .output(outputPath)
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .audioFrequency(44100)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(new Error(`Audio conversion failed: ${err.message}`)))
      .run();
  });
}

// Helper function to split audio into chunks
async function splitAudioIntoChunks(filePath, chunkSizeInMB = 20) {
  try {
    const stats = fs.statSync(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);

    // If file is small enough, return the original file
    if (fileSizeInMB <= 25) {
      return [filePath];
    }

    const duration = await getAudioDuration(filePath);
    const tempDir = os.tmpdir();
    const chunksDir = path.join(tempDir, `chunks-${Date.now()}`);
    fs.mkdirSync(chunksDir, { recursive: true });

    // Calculate chunk duration based on file size and desired chunk size
    const chunkDuration = Math.floor((duration * chunkSizeInMB) / fileSizeInMB);
    const numChunks = Math.ceil(duration / chunkDuration);

    const chunkPaths = [];

    // Split audio into chunks
    for (let i = 0; i < numChunks; i++) {
      const startTime = i * chunkDuration;
      const chunkPath = path.join(chunksDir, `chunk-${i}.mp3`);

      await new Promise((resolve, reject) => {
        ffmpeg(filePath)
          .setStartTime(startTime)
          .setDuration(chunkDuration)
          .output(chunkPath)
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      chunkPaths.push(chunkPath);
    }

    return chunkPaths;
  } catch (error) {
    throw new Error(`Failed to split audio: ${error.message}`);
  }
}

// Helper function to parse VTT timestamp
function parseVTTTimestamp(timestamp) {
  const parts = timestamp.split(':');
  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  const secondsParts = parts[2].split('.');
  const seconds = parseInt(secondsParts[0]);
  const milliseconds = parseInt(secondsParts[1]);

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

// Helper function to format VTT timestamp
function formatVTTTimestamp(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor((totalSeconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

// Helper function to adjust VTT timestamps
function adjustVTTTimestamps(vttContent, offsetSeconds) {
  const lines = vttContent.split('\n');
  const adjustedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line contains timestamp (format: HH:MM:SS.mmm --> HH:MM:SS.mmm)
    if (line.includes('-->')) {
      const [start, end] = line.split('-->').map(s => s.trim());
      const startSeconds = parseVTTTimestamp(start) + offsetSeconds;
      const endSeconds = parseVTTTimestamp(end) + offsetSeconds;

      adjustedLines.push(`${formatVTTTimestamp(startSeconds)} --> ${formatVTTTimestamp(endSeconds)}`);
    } else {
      adjustedLines.push(line);
    }
  }

  return adjustedLines.join('\n');
}

// Helper function to combine VTT transcripts
function combineVTTTranscripts(vttTranscripts, chunkDurations) {
  let combinedVTT = 'WEBVTT\n\n';
  let cueNumber = 1;
  let timeOffset = 0;

  for (let i = 0; i < vttTranscripts.length; i++) {
    const vtt = vttTranscripts[i];
    const lines = vtt.split('\n');

    let skipHeader = true;
    let currentCue = [];

    for (let j = 0; j < lines.length; j++) {
      const line = lines[j];

      // Skip WEBVTT header and initial blank lines
      if (skipHeader) {
        if (line.trim() === '' || line.startsWith('WEBVTT')) {
          continue;
        }
        skipHeader = false;
      }

      // Process cue lines
      if (line.includes('-->')) {
        const [start, end] = line.split('-->').map(s => s.trim());
        const startSeconds = parseVTTTimestamp(start) + timeOffset;
        const endSeconds = parseVTTTimestamp(end) + timeOffset;

        currentCue.push(`${cueNumber}`);
        currentCue.push(`${formatVTTTimestamp(startSeconds)} --> ${formatVTTTimestamp(endSeconds)}`);
        cueNumber++;
      } else if (line.trim() === '') {
        // End of cue
        if (currentCue.length > 0) {
          combinedVTT += currentCue.join('\n') + '\n\n';
          currentCue = [];
        }
      } else if (!line.match(/^\d+$/)) {
        // Text content (skip standalone numbers which are cue IDs)
        currentCue.push(line);
      }
    }

    // Add any remaining cue
    if (currentCue.length > 0) {
      combinedVTT += currentCue.join('\n') + '\n\n';
    }

    // Update time offset for next chunk
    if (i < chunkDurations.length) {
      timeOffset += chunkDurations[i];
    }
  }

  return combinedVTT;
}

// Helper function to clean up chunk files
function cleanupChunks(chunkPaths) {
  try {
    if (chunkPaths.length > 0) {
      const chunksDir = path.dirname(chunkPaths[0]);
      // Delete all chunk files
      chunkPaths.forEach(chunkPath => {
        if (fs.existsSync(chunkPath)) {
          fs.unlinkSync(chunkPath);
        }
      });
      // Delete chunks directory
      if (fs.existsSync(chunksDir)) {
        fs.rmdirSync(chunksDir);
      }
    }
  } catch (error) {
    console.error('Error cleaning up chunks:', error);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 700,
    minHeight: 600,
    title: 'Audio Transcription',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#ffffff',
  });

  // Check if API key exists, otherwise show setup
  const apiKey = global.apiKey || null;
  if (!apiKey) {
    mainWindow.loadFile('src/setup.html');
  } else {
    mainWindow.loadFile('src/upload.html');
  }

  // Open DevTools in development
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Validate API key by making a test request
ipcMain.handle('validate-api-key', async (event, apiKey) => {
  try {
    const openai = new OpenAI({ apiKey });

    // Make a simple API call to verify the key works
    // Using models.list() is lightweight and fast
    await openai.models.list();

    return {
      success: true,
      message: 'API key is valid'
    };
  } catch (error) {
    let errorMessage = 'Invalid API key';

    if (error.status === 401) {
      errorMessage = 'Invalid API key. Please check your key and try again.';
    } else if (error.status === 429) {
      errorMessage = 'Rate limit exceeded. Please try again later.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
});

// Handle API key storage
ipcMain.handle('save-api-key', async (event, apiKey) => {
  global.apiKey = apiKey;
  return { success: true };
});

ipcMain.handle('get-api-key', async () => {
  return global.apiKey || null;
});

// Navigate to different screens
ipcMain.handle('navigate', async (event, page) => {
  mainWindow.loadFile(`src/${page}.html`);
});

// Save recording to temporary file
ipcMain.handle('save-recording', async (event, arrayBuffer) => {
  try {
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `recording-${Date.now()}.webm`);
    const buffer = Buffer.from(arrayBuffer);

    fs.writeFileSync(tempFilePath, buffer);

    return {
      success: true,
      filePath: tempFilePath,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to save recording',
    };
  }
});

// Helper function to convert file to base64 data URL
function fileToDataURL(filePath) {
  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString('base64');
  const ext = path.extname(filePath).toLowerCase();

  // Map extensions to MIME types
  const mimeTypes = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.webm': 'audio/webm',
    '.mp4': 'audio/mp4',
    '.mpeg': 'audio/mpeg',
    '.mpga': 'audio/mpeg'
  };

  const mimeType = mimeTypes[ext] || 'audio/mpeg';
  return `data:${mimeType};base64,${base64}`;
}

// Helper function to convert JSON transcript to VTT-like format
function jsonToVTT(jsonTranscript) {
  if (!jsonTranscript || !jsonTranscript.text) {
    return 'WEBVTT\n\n' + (jsonTranscript?.text || '');
  }
  // For simple JSON responses without segments, just return the text as VTT
  return 'WEBVTT\n\n' + jsonTranscript.text;
}

// Helper function to convert diarized JSON to VTT-like format with speakers
function diarizedJsonToVTT(diarizedTranscript) {
  if (!diarizedTranscript || !diarizedTranscript.segments) {
    return 'WEBVTT\n\n';
  }

  let vtt = 'WEBVTT\n\n';
  let cueNumber = 1;

  for (const segment of diarizedTranscript.segments) {
    const start = formatVTTTimestamp(segment.start);
    const end = formatVTTTimestamp(segment.end);
    const speaker = segment.speaker || 'Unknown';
    const text = segment.text || '';

    vtt += `${cueNumber}\n`;
    vtt += `${start} --> ${end}\n`;
    vtt += `[${speaker}] ${text}\n\n`;
    cueNumber++;
  }

  return vtt;
}

// Handle transcription
ipcMain.handle('transcribe-audio', async (event, filePath, apiKey, options) => {
  let chunkPaths = [];
  let convertedFilePath = null;

  // Always use diarized model
  const model = 'gpt-4o-transcribe-diarize';
  const speakers = options?.speakers || null;

  try {
    const openai = new OpenAI({ apiKey });

    // Check if file is WebM and needs conversion
    let processFilePath = filePath;
    if (filePath.toLowerCase().endsWith('.webm')) {
      // Check if ffmpeg is available for conversion
      if (!ffmpegAvailable) {
        return {
          success: false,
          error: 'WebM recordings require FFmpeg for conversion, which could not be loaded on this system.\n\nPlease try uploading an MP3 or WAV file instead, or try re-downloading the application.',
        };
      }

      // Send progress update for conversion
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('transcription-progress', {
          status: 'converting',
          message: 'Converting recording to MP3 format...',
        });
      }

      // Convert WebM to MP3
      convertedFilePath = await convertToMP3(filePath);
      processFilePath = convertedFilePath;
    }

    const stats = fs.statSync(processFilePath);
    const fileSizeInMB = stats.size / (1024 * 1024);

    // Check if file needs to be split
    if (fileSizeInMB > 25) {
      // Check if ffmpeg is available for splitting
      if (!ffmpegAvailable) {
        // Clean up converted file if it exists
        if (convertedFilePath && fs.existsSync(convertedFilePath)) {
          fs.unlinkSync(convertedFilePath);
        }

        return {
          success: false,
          error: `File size is ${fileSizeInMB.toFixed(1)}MB, which exceeds the 25MB API limit.\n\nLarge file support requires FFmpeg, which could not be loaded on this system.\n\nPlease use a file smaller than 25MB, or try re-downloading the application.`,
        };
      }

      // Send progress update for splitting
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('transcription-progress', {
          status: 'splitting',
          message: 'Splitting large audio file into chunks...',
        });
      }

      // Split audio into chunks
      chunkPaths = await splitAudioIntoChunks(processFilePath, 20);

      // Get duration of each chunk for timestamp adjustment
      const chunkDurations = [];
      for (const chunkPath of chunkPaths) {
        const duration = await getAudioDuration(chunkPath);
        chunkDurations.push(duration);
      }

      // Process each chunk
      const transcripts = [];
      for (let i = 0; i < chunkPaths.length; i++) {
        const chunkPath = chunkPaths[i];

        // Send progress update
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('transcription-progress', {
            status: 'transcribing',
            message: `Transcribing chunk ${i + 1} of ${chunkPaths.length}...`,
            current: i + 1,
            total: chunkPaths.length,
          });
        }

        // Transcribe chunk
        try {
          console.log(`[Transcription] Starting chunk ${i + 1}/${chunkPaths.length} with model: ${model}`);

          const transcriptionParams = {
            file: fs.createReadStream(chunkPath),
            model: model,
            response_format: 'diarized_json',
            chunking_strategy: 'auto',
          };

          // Add speaker references if provided (only for first chunk)
          if (speakers && speakers.length > 0 && i === 0) {
            const speakerNames = [];
            const speakerReferences = [];

            for (const speaker of speakers) {
              speakerNames.push(speaker.name);
              const dataURL = fileToDataURL(speaker.path);
              speakerReferences.push(dataURL);
            }

            transcriptionParams.known_speaker_names = speakerNames;
            transcriptionParams.known_speaker_references = speakerReferences;
          }

          console.log(`[Transcription] Calling OpenAI API for chunk ${i + 1}...`);
          const transcription = await openai.audio.transcriptions.create(transcriptionParams);
          console.log(`[Transcription] Chunk ${i + 1} completed successfully`);
          transcripts.push(transcription);
        } catch (error) {
          console.error(`[Transcription] Error transcribing chunk ${i + 1}:`, error);
          // Add empty transcript for failed chunk
          transcripts.push({ segments: [] });
        }
      }

      // Send progress update for combining
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('transcription-progress', {
          status: 'combining',
          message: 'Combining transcripts...',
        });
      }

      // Combine diarized transcripts with time offset
      let allSegments = [];
      let timeOffset = 0;

      for (let i = 0; i < transcripts.length; i++) {
        const transcript = transcripts[i];
        if (transcript.segments) {
          const offsetSegments = transcript.segments.map(seg => ({
            ...seg,
            start: seg.start + timeOffset,
            end: seg.end + timeOffset
          }));
          allSegments = allSegments.concat(offsetSegments);
        }
        if (i < chunkDurations.length) {
          timeOffset += chunkDurations[i];
        }
      }

      const combinedTranscript = diarizedJsonToVTT({ segments: allSegments });

      // Check if we have any actual content
      if (allSegments.length === 0) {
        throw new Error('All chunks failed to transcribe. Please check your audio file and try again.');
      }

      // Clean up chunks
      cleanupChunks(chunkPaths);

      // Clean up converted file if it exists
      if (convertedFilePath && fs.existsSync(convertedFilePath)) {
        fs.unlinkSync(convertedFilePath);
      }

      return {
        success: true,
        transcript: combinedTranscript,
        chunked: true,
        totalChunks: chunkPaths.length,
        isDiarized: true,
      };
    } else {
      // File is small enough, process normally
      const transcriptionParams = {
        file: fs.createReadStream(processFilePath),
        model: model,
        response_format: 'diarized_json',
        chunking_strategy: 'auto',
      };

      // Add speaker references if provided
      if (speakers && speakers.length > 0) {
        const speakerNames = [];
        const speakerReferences = [];

        for (const speaker of speakers) {
          speakerNames.push(speaker.name);
          // Convert speaker reference file to data URL
          const dataURL = fileToDataURL(speaker.path);
          speakerReferences.push(dataURL);
        }

        transcriptionParams.known_speaker_names = speakerNames;
        transcriptionParams.known_speaker_references = speakerReferences;
      }

      const transcription = await openai.audio.transcriptions.create(transcriptionParams);

      // Convert diarized response to VTT format
      const finalTranscript = diarizedJsonToVTT(transcription);

      // Clean up converted file if it exists
      if (convertedFilePath && fs.existsSync(convertedFilePath)) {
        fs.unlinkSync(convertedFilePath);
      }

      return {
        success: true,
        transcript: finalTranscript,
        chunked: false,
        isDiarized: true,
      };
    }
  } catch (error) {
    // Clean up chunks on error
    if (chunkPaths.length > 0) {
      cleanupChunks(chunkPaths);
    }

    // Clean up converted file on error
    if (convertedFilePath && fs.existsSync(convertedFilePath)) {
      try {
        fs.unlinkSync(convertedFilePath);
      } catch (cleanupError) {
        console.error('Error cleaning up converted file:', cleanupError);
      }
    }

    return {
      success: false,
      error: error.message || 'Transcription failed',
    };
  }
});

// Handle save transcript
ipcMain.handle('save-transcript', async (event, content, format, fileName) => {
  try {
    // Show save dialog
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Transcript',
      defaultPath: fileName || 'transcript',
      filters: [
        { name: format.toUpperCase(), extensions: [format] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled) {
      return { success: false, canceled: true };
    }

    // Write file
    fs.writeFileSync(result.filePath, content, 'utf8');

    return {
      success: true,
      filePath: result.filePath
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to save file'
    };
  }
});

// Handle meeting summary generation
ipcMain.handle('generate-meeting-summary', async (event, transcript, fileName, apiKey) => {
  try {
    const openai = new OpenAI({ apiKey });

    // Extract plain text from VTT format
    const plainText = transcript
      .split('\n')
      .filter(line => !line.includes('-->') && !line.startsWith('WEBVTT') && line.trim() !== '' && !/^\d+$/.test(line.trim()))
      .join('\n')
      .trim();

    // System prompt for generating structured meeting summary
    const systemPrompt = `You are an expert meeting analyst for Boston Consulting Group (BCG). Your task is to analyze meeting transcripts and create comprehensive, professional markdown summaries with embedded mermaid.js diagrams where appropriate.

Structure your output with these sections:

# [Meeting Title] - Meeting Summary

## Overview & Context
- Brief description of the meeting purpose, participants, and background
- Date and duration if evident

## Key Topics & Decisions
- Main discussion points organized by topic
- Key decisions made
- Important insights or conclusions

## Process Flow / Diagrams
[Include mermaid.js flowcharts, decision trees, or sequence diagrams ONLY where they add value]
- Use \`\`\`mermaid blocks for diagrams
- Choose appropriate diagram types (flowchart, sequence, gantt, etc.)
- Keep diagrams focused and relevant

## Action Items & Next Steps
- Clear, actionable tasks
- Assigned owners if mentioned
- Deadlines or timeframes
- Follow-up items

## BCG-Style Email Summary
Write a concise 2-3 paragraph executive summary suitable for a BCG email:
- Professional, direct tone
- Highlight key decisions and action items
- Use bullet points where appropriate
- Focus on outcomes and next steps

Guidelines:
- Use professional, clear language
- Be concise but comprehensive
- Only include mermaid diagrams if they genuinely add value (not required)
- Format with proper markdown (headers, lists, emphasis)
- Include timestamps from transcript where relevant for reference`;

    const userPrompt = `Please analyze this meeting transcript and create a comprehensive markdown summary following the structure provided:\n\n${plainText}`;

    // Send progress update
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('summary-progress', {
        status: 'generating',
        message: 'Generating meeting summary...',
      });
    }

    // Call GPT-4o to generate summary
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const summary = completion.choices[0].message.content;

    return {
      success: true,
      summary: summary,
    };
  } catch (error) {
    console.error('Error generating summary:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate summary',
    };
  }
});

// Handle save summary
ipcMain.handle('save-summary', async (event, content, fileName, openInTypora = false) => {
  try {
    // Show save dialog
    const baseName = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'meeting-summary';
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Meeting Summary',
      defaultPath: `${baseName}.md`,
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled) {
      return { success: false, canceled: true };
    }

    // Write file
    fs.writeFileSync(result.filePath, content, 'utf8');

    // Open in Typora if requested
    if (openInTypora) {
      try {
        const { exec } = require('child_process');
        exec(`open -a Typora "${result.filePath}"`);
      } catch (error) {
        console.error('Error opening in Typora:', error);
        // Don't fail the entire operation if Typora fails
      }
    }

    return {
      success: true,
      filePath: result.filePath
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to save summary'
    };
  }
});

// ==================== TRANSCRIPTION HISTORY ====================

// Save transcription and summary to app data
ipcMain.handle('save-transcription-history', async (event, data) => {
  try {
    const { fileName, transcript, summary, isDiarized, model } = data;

    // Create unique ID based on timestamp
    const timestamp = Date.now();
    const id = `${timestamp}`;

    // Create directory for this transcription
    const transcriptionDir = path.join(APP_DATA_DIR, id);
    fs.mkdirSync(transcriptionDir, { recursive: true });

    // Save metadata
    const metadata = {
      id,
      fileName,
      timestamp,
      date: new Date(timestamp).toISOString(),
      isDiarized,
      model,
      transcriptPreview: transcript.substring(0, 200),
    };

    fs.writeFileSync(
      path.join(transcriptionDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf8'
    );

    // Save transcript
    fs.writeFileSync(
      path.join(transcriptionDir, 'transcript.txt'),
      transcript,
      'utf8'
    );

    // Save summary if provided
    if (summary) {
      fs.writeFileSync(
        path.join(transcriptionDir, 'summary.md'),
        summary,
        'utf8'
      );
    }

    return {
      success: true,
      id,
    };
  } catch (error) {
    console.error('Error saving transcription history:', error);
    return {
      success: false,
      error: error.message || 'Failed to save transcription history',
    };
  }
});

// Get list of all transcription history items
ipcMain.handle('get-transcription-history', async () => {
  try {
    const items = [];

    // Read all directories in APP_DATA_DIR
    const entries = fs.readdirSync(APP_DATA_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const metadataPath = path.join(APP_DATA_DIR, entry.name, 'metadata.json');

        if (fs.existsSync(metadataPath)) {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          items.push(metadata);
        }
      }
    }

    // Sort by timestamp (newest first)
    items.sort((a, b) => b.timestamp - a.timestamp);

    return {
      success: true,
      items,
    };
  } catch (error) {
    console.error('Error getting transcription history:', error);
    return {
      success: false,
      error: error.message || 'Failed to get transcription history',
      items: [],
    };
  }
});

// Load a specific transcription by ID
ipcMain.handle('load-transcription', async (event, id) => {
  try {
    const transcriptionDir = path.join(APP_DATA_DIR, id);

    // Read metadata
    const metadata = JSON.parse(
      fs.readFileSync(path.join(transcriptionDir, 'metadata.json'), 'utf8')
    );

    // Read transcript
    const transcript = fs.readFileSync(
      path.join(transcriptionDir, 'transcript.txt'),
      'utf8'
    );

    // Read summary if it exists
    let summary = null;
    const summaryPath = path.join(transcriptionDir, 'summary.md');
    if (fs.existsSync(summaryPath)) {
      summary = fs.readFileSync(summaryPath, 'utf8');
    }

    return {
      success: true,
      data: {
        ...metadata,
        transcript,
        summary,
      },
    };
  } catch (error) {
    console.error('Error loading transcription:', error);
    return {
      success: false,
      error: error.message || 'Failed to load transcription',
    };
  }
});

// Delete a transcription by ID
ipcMain.handle('delete-transcription', async (event, id) => {
  try {
    const transcriptionDir = path.join(APP_DATA_DIR, id);

    // Delete all files in the directory
    const files = fs.readdirSync(transcriptionDir);
    for (const file of files) {
      fs.unlinkSync(path.join(transcriptionDir, file));
    }

    // Delete the directory
    fs.rmdirSync(transcriptionDir);

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting transcription:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete transcription',
    };
  }
});
