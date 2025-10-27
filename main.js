const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const OpenAI = require('openai');
const fs = require('fs');
const os = require('os');
const keytar = require('keytar');
const Store = require('electron-store');

// Import new backend handlers
const { registerAllHandlers } = require('./backend/handlers');

// Constants for secure storage
const SERVICE_NAME = 'Audio Transcription App';
const ACCOUNT_NAME = 'openai-api-key';

// Initialize electron-store with defaults
const store = new Store({
  defaults: {
    transcripts: [],
    chatHistory: {},
    'summary-templates': []
  }
});

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
  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    title: 'Audio Transcription',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    // Platform-specific title bar configuration
    titleBarStyle: isWindows ? 'hidden' : 'hiddenInset',
    frame: !isWindows, // Remove frame on Windows (using custom title bar)
    backgroundColor: '#ffffff',
  });

  // Load the app (Vite dev server or built files)
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // Open DevTools in development
  // mainWindow.webContents.openDevTools();

  // Check for existing API key after window loads
  mainWindow.webContents.on('did-finish-load', async () => {
    try {
      const apiKey = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
      if (apiKey) {
        mainWindow.webContents.send('api-key-status', 'valid');
      } else {
        mainWindow.webContents.send('api-key-status', 'missing');
      }
    } catch (error) {
      console.error('Error checking API key on startup:', error);
      mainWindow.webContents.send('api-key-status', 'missing');
    }
  });
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

// Secure API key storage using system keychain/credential manager
ipcMain.handle('save-api-key-secure', async (event, apiKey) => {
  try {
    await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, apiKey);
    console.log('✓ API key saved to secure storage');
    return { success: true };
  } catch (error) {
    console.error('Failed to save API key:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-api-key-secure', async () => {
  try {
    const apiKey = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
    return { success: true, apiKey };
  } catch (error) {
    console.error('Failed to retrieve API key:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-api-key-secure', async () => {
  try {
    const deleted = await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
    console.log('✓ API key deleted from secure storage');
    return { success: deleted };
  } catch (error) {
    console.error('Failed to delete API key:', error);
    return { success: false, error: error.message };
  }
});

// Disclaimer handlers
ipcMain.handle('get-disclaimer-status', async () => {
  try {
    const accepted = store.get('disclaimer-accepted', false);
    console.log('✓ Disclaimer status:', accepted ? 'accepted' : 'not accepted');
    return { success: true, accepted };
  } catch (error) {
    console.error('Failed to get disclaimer status:', error);
    return { success: false, accepted: false };
  }
});

ipcMain.handle('set-disclaimer-accepted', async () => {
  try {
    store.set('disclaimer-accepted', true);
    console.log('✓ Disclaimer accepted and saved');
    return { success: true };
  } catch (error) {
    console.error('Failed to save disclaimer acceptance:', error);
    return { success: false, error: error.message };
  }
});

// Summary Template handlers
ipcMain.handle('get-templates', async () => {
  try {
    const templates = store.get('summary-templates', []);
    console.log('✓ Loaded summary templates from storage');
    return { success: true, templates };
  } catch (error) {
    console.error('Failed to load templates:', error);
    return { success: false, error: error.message, templates: [] };
  }
});

ipcMain.handle('save-templates', async (event, templates) => {
  try {
    store.set('summary-templates', templates);
    console.log('✓ Saved summary templates to storage');
    return { success: true };
  } catch (error) {
    console.error('Failed to save templates:', error);
    return { success: false, error: error.message };
  }
});

// Save file to temp directory
ipcMain.handle('save-file-to-temp', async (event, arrayBuffer, fileName) => {
  try {
    const tempDir = os.tmpdir();
    const sanitizedFileName = path.basename(fileName); // Prevent path traversal
    const tempFilePath = path.join(tempDir, `upload-${Date.now()}-${sanitizedFileName}`);

    console.log('Saving file to temp:', tempFilePath);
    fs.writeFileSync(tempFilePath, Buffer.from(arrayBuffer));

    return {
      success: true,
      filePath: tempFilePath
    };
  } catch (error) {
    console.error('Failed to save file to temp:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Window control handlers (for Windows custom title bar)
ipcMain.on('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
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

// Helper function to convert VTT format to plain text
function vttToPlainText(vtt) {
  if (!vtt) return '';

  return vtt
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      // Skip empty lines, WEBVTT header, timestamps, and cue numbers
      return trimmed !== '' &&
             !trimmed.startsWith('WEBVTT') &&
             !trimmed.includes('-->') &&
             !/^\d+$/.test(trimmed);
    })
    .join('\n')
    .trim();
}

// Handle transcription
ipcMain.handle('transcribe-audio', async (event, filePath, apiKey, options) => {
  let chunkPaths = [];
  let convertedFilePath = null;

  // Parse options (backward compatibility: if options is a string, treat it as prompt)
  const isLegacyCall = typeof options === 'string';
  const model = isLegacyCall ? 'whisper-1' : (options?.model || 'gpt-4o-transcribe');
  const prompt = isLegacyCall ? options : (options?.prompt || null);
  const speakers = isLegacyCall ? null : (options?.speakers || null);

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

      // Process each chunk with retry logic
      const transcripts = [];
      const failedChunks = [];
      const MAX_RETRIES = 3;
      const RATE_LIMIT_DELAY = 2000; // 2 seconds between chunks

      for (let i = 0; i < chunkPaths.length; i++) {
        const chunkPath = chunkPaths[i];
        let transcription = null;
        let lastError = null;

        // Build prompt for this chunk
        let chunkPrompt = null;
        if (i === 0 && prompt) {
          // First chunk: use user's prompt
          chunkPrompt = prompt;
        } else if (i > 0 && transcripts[i - 1]) {
          // Subsequent chunks: use last portion of previous transcript for context
          const prevTranscript = transcripts[i - 1];

          // Extract plain text based on model format
          let plainText;
          if (model === 'whisper-1') {
            // VTT format: remove timestamps and headers
            plainText = prevTranscript
              .split('\n')
              .filter(line => !line.includes('-->') && !line.startsWith('WEBVTT') && line.trim() !== '' && !/^\d+$/.test(line.trim()))
              .join(' ')
              .trim();
          } else if (model === 'gpt-4o-transcribe') {
            // JSON format: extract text field
            plainText = prevTranscript.text || '';
          } else if (model === 'gpt-4o-transcribe-diarize') {
            // Diarized format: extract text from segments
            plainText = prevTranscript.segments
              ? prevTranscript.segments.map(seg => seg.text || '').join(' ')
              : '';
          } else {
            plainText = '';
          }

          // Use last ~200 characters for context (stays well under 224 token limit)
          const contextLength = 200;
          const contextText = plainText.slice(-contextLength);

          // Combine user prompt (if any) with previous context
          if (prompt) {
            chunkPrompt = `${prompt}\n\nPrevious context: ${contextText}`;
          } else {
            chunkPrompt = contextText;
          }
        }

        // Retry logic with exponential backoff
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            // Send progress update
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('transcription-progress', {
                status: 'transcribing',
                message: attempt === 1
                  ? `Transcribing chunk ${i + 1} of ${chunkPaths.length}...`
                  : `Retrying chunk ${i + 1} (attempt ${attempt}/${MAX_RETRIES})...`,
                current: i + 1,
                total: chunkPaths.length,
                attempt: attempt,
              });
            }

            const transcriptionParams = {
              file: fs.createReadStream(chunkPath),
              model: model,
            };

            // Set response format and parameters based on model
            if (model === 'whisper-1') {
              transcriptionParams.response_format = 'vtt';
              if (chunkPrompt) {
                transcriptionParams.prompt = chunkPrompt;
              }
            } else if (model === 'gpt-4o-transcribe') {
              transcriptionParams.response_format = 'json';
              if (chunkPrompt) {
                transcriptionParams.prompt = chunkPrompt;
              }
            } else if (model === 'gpt-4o-transcribe-diarize') {
              transcriptionParams.response_format = 'diarized_json';
              transcriptionParams.chunking_strategy = 'auto';

              // Add speaker references if provided
              if (speakers && speakers.length > 0 && i === 0) {
                // Only add speaker references for the first chunk
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
            }

            transcription = await openai.audio.transcriptions.create(transcriptionParams);

            // Validate that we got non-empty content
            let hasContent = false;
            if (model === 'whisper-1') {
              hasContent = transcription && transcription.trim().length > 0;
            } else if (model === 'gpt-4o-transcribe') {
              hasContent = transcription && transcription.text && transcription.text.trim().length > 0;
            } else if (model === 'gpt-4o-transcribe-diarize') {
              hasContent = transcription && transcription.segments && transcription.segments.length > 0;
            }

            if (!hasContent) {
              throw new Error('Received empty transcription from API');
            }

            // Success! Break out of retry loop
            console.log(`✓ Chunk ${i + 1} transcribed successfully${attempt > 1 ? ` (after ${attempt} attempts)` : ''}`);
            break;

          } catch (error) {
            lastError = error;
            console.error(`✗ Error transcribing chunk ${i + 1} (attempt ${attempt}/${MAX_RETRIES}):`, error.message);

            // If this was the last attempt, record the failure
            if (attempt === MAX_RETRIES) {
              failedChunks.push({
                index: i + 1,
                error: error.message,
                duration: chunkDurations[i] || 0
              });
              console.error(`✗✗✗ Chunk ${i + 1} FAILED after ${MAX_RETRIES} attempts`);
            } else {
              // Exponential backoff: 2s, 4s, 8s
              const backoffDelay = 1000 * Math.pow(2, attempt);
              console.log(`Waiting ${backoffDelay / 1000}s before retry...`);
              await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }
          }
        }

        // Add the transcription (or empty if all retries failed)
        if (transcription) {
          transcripts.push(transcription);
        } else {
          // All retries failed, add empty transcript
          transcripts.push(model === 'whisper-1' ? '' : { text: '' });
        }

        // Rate limiting: delay between chunks (except after last chunk)
        if (i < chunkPaths.length - 1) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        }
      }

      // Check if any chunks failed
      if (failedChunks.length > 0) {
        // Clean up files
        cleanupChunks(chunkPaths);
        if (convertedFilePath && fs.existsSync(convertedFilePath)) {
          fs.unlinkSync(convertedFilePath);
        }

        // Calculate how much content is missing
        const totalDuration = chunkDurations.reduce((sum, d) => sum + d, 0);
        const missingDuration = failedChunks.reduce((sum, chunk) => sum + chunk.duration, 0);
        const missingPercent = ((missingDuration / totalDuration) * 100).toFixed(1);

        const errorMessage = `Transcription incomplete: ${failedChunks.length} of ${chunkPaths.length} chunks failed after multiple retries.\n\n` +
          `Missing approximately ${Math.floor(missingDuration / 60)} minutes (${missingPercent}% of total audio).\n\n` +
          `Failed chunks: ${failedChunks.map(c => `#${c.index}`).join(', ')}\n\n` +
          `This may be due to:\n` +
          `• OpenAI API rate limits\n` +
          `• Network connectivity issues\n` +
          `• Temporary API service issues\n\n` +
          `Please try again in a few minutes, or split your file into smaller segments.`;

        return {
          success: false,
          error: errorMessage,
        };
      }

      // Send progress update for combining
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('transcription-progress', {
          status: 'combining',
          message: 'Combining transcripts...',
        });
      }

      // Combine transcripts based on model
      let combinedTranscript;
      let isDiarized = false;

      if (model === 'whisper-1') {
        combinedTranscript = combineVTTTranscripts(transcripts, chunkDurations);
      } else if (model === 'gpt-4o-transcribe') {
        // Combine JSON transcripts
        const combinedText = transcripts.map(t => t.text || '').join(' ');
        combinedTranscript = jsonToVTT({ text: combinedText });
      } else if (model === 'gpt-4o-transcribe-diarize') {
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

        combinedTranscript = diarizedJsonToVTT({ segments: allSegments });
        isDiarized = true;
      }

      // Clean up chunks
      cleanupChunks(chunkPaths);

      // Clean up converted file if it exists
      if (convertedFilePath && fs.existsSync(convertedFilePath)) {
        fs.unlinkSync(convertedFilePath);
      }

      return {
        success: true,
        text: vttToPlainText(combinedTranscript),  // Plain text for display
        transcript: combinedTranscript,            // VTT format for download
        chunked: true,
        totalChunks: chunkPaths.length,
        isDiarized: isDiarized,
      };
    } else {
      // File is small enough, process normally
      const transcriptionParams = {
        file: fs.createReadStream(processFilePath),
        model: model,
      };

      // Set response format based on model
      if (model === 'whisper-1') {
        transcriptionParams.response_format = 'vtt';
        // Add prompt if provided
        if (prompt) {
          transcriptionParams.prompt = prompt;
        }
      } else if (model === 'gpt-4o-transcribe') {
        transcriptionParams.response_format = 'json';
        // Add prompt if provided
        if (prompt) {
          transcriptionParams.prompt = prompt;
        }
      } else if (model === 'gpt-4o-transcribe-diarize') {
        transcriptionParams.response_format = 'diarized_json';
        transcriptionParams.chunking_strategy = 'auto';

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
      }

      const transcription = await openai.audio.transcriptions.create(transcriptionParams);

      // Convert response to VTT format if needed
      let finalTranscript;
      let isDiarized = false;

      if (model === 'whisper-1') {
        finalTranscript = transcription;
      } else if (model === 'gpt-4o-transcribe') {
        finalTranscript = jsonToVTT(transcription);
      } else if (model === 'gpt-4o-transcribe-diarize') {
        finalTranscript = diarizedJsonToVTT(transcription);
        isDiarized = true;
      }

      // Clean up converted file if it exists
      if (convertedFilePath && fs.existsSync(convertedFilePath)) {
        fs.unlinkSync(convertedFilePath);
      }

      return {
        success: true,
        text: vttToPlainText(finalTranscript),  // Plain text for display
        transcript: finalTranscript,            // VTT format for download
        chunked: false,
        isDiarized: isDiarized,
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

// Handle summary generation
ipcMain.handle('generate-summary', async (event, transcript, templatePrompt, apiKey) => {
  try {
    const openai = new OpenAI({ apiKey });

    console.log('Generating summary with OpenAI...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates summaries of transcriptions based on user instructions.'
        },
        {
          role: 'user',
          content: `Here is a transcription:\n\n${transcript}\n\n${templatePrompt}`
        }
      ],
      temperature: 0.3,
    });

    const summary = response.choices[0]?.message?.content;

    if (!summary) {
      throw new Error('No summary generated');
    }

    console.log('✓ Summary generated successfully');

    return {
      success: true,
      summary: summary.trim()
    };

  } catch (error) {
    console.error('Summary generation error:', error);
    return {
      success: false,
      error: error.message || 'Summary generation failed',
    };
  }
});

// Register all new backend handlers (transcript, chat, etc.)
// These replace the old inline handlers with the new modular system
registerAllHandlers();

// Handle opening external links (for markdown links)
ipcMain.handle('open-external', async (event, url) => {
  try {
    // Validate URL to prevent security issues
    const validUrl = new URL(url);
    if (validUrl.protocol === 'http:' || validUrl.protocol === 'https:') {
      await shell.openExternal(url);
      return { success: true };
    } else {
      console.error('Invalid protocol:', validUrl.protocol);
      return { success: false, error: 'Only HTTP and HTTPS URLs are allowed' };
    }
  } catch (error) {
    console.error('Error opening external URL:', error);
    return { success: false, error: error.message };
  }
});

// Handle save transcript
ipcMain.handle('save-transcript', async (event, content, format, fileName) => {
  try {
    // Format configuration
    const formatConfig = {
      txt: { name: 'Text File', extensions: ['txt'] },
      vtt: { name: 'WebVTT Subtitle', extensions: ['vtt'] },
      md: { name: 'Markdown', extensions: ['md'] },
      pdf: { name: 'PDF Document', extensions: ['pdf'] }
    };

    const config = formatConfig[format] || formatConfig.txt;

    // Show save dialog
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Transcript',
      defaultPath: path.join(app.getPath('documents'), `${fileName}.${config.extensions[0]}`),
      filters: [
        { name: config.name, extensions: config.extensions },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled) {
      return { success: false, cancelled: true };
    }

    // PDF export not yet implemented
    if (format === 'pdf') {
      throw new Error('PDF export not yet implemented. Please use TXT, VTT, or Markdown format.');
    }

    // Format content based on export type
    let finalContent = content;
    if (format === 'md') {
      // Add markdown formatting
      finalContent = `# Transcript\n\n${content}`;
    }

    // Write file
    fs.writeFileSync(result.filePath, finalContent, 'utf8');

    console.log(`✓ Transcript saved as ${format.toUpperCase()}: ${result.filePath}`);

    return {
      success: true,
      filePath: result.filePath
    };
  } catch (error) {
    console.error('Save transcript error:', error);
    return {
      success: false,
      error: error.message || 'Failed to save file'
    };
  }
});
