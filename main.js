const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const OpenAI = require('openai');
const fs = require('fs');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

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

// Handle transcription
ipcMain.handle('transcribe-audio', async (event, filePath, apiKey) => {
  try {
    const openai = new OpenAI({ apiKey });

    // Check file size (25MB limit)
    const stats = fs.statSync(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);

    if (fileSizeInMB > 25) {
      return {
        success: false,
        error: 'File size exceeds 25MB limit. Please use a smaller file.',
      };
    }

    // Create transcription with VTT format for timestamps
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      response_format: 'vtt',
    });

    return {
      success: true,
      transcript: transcription,
    };
  } catch (error) {
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
