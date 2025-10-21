const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const OpenAI = require('openai');
const fs = require('fs');
const os = require('os');

// Import Transformers.js for local Whisper
let pipeline;
let env;
let localTranscriber = null;
let modelDownloading = false;

// Lazy load the pipeline to avoid slowing down app startup
async function getLocalTranscriber(progressCallback) {
  if (!localTranscriber && !modelDownloading) {
    modelDownloading = true;
    try {
      if (!pipeline) {
        if (progressCallback) progressCallback({ status: 'loading_library', progress: 0 });

        // Use dynamic import with proper error handling
        const transformers = await import('@xenova/transformers').catch(err => {
          throw new Error(`Failed to load transformers library: ${err.message}`);
        });
        pipeline = transformers.pipeline;
        env = transformers.env;

        // Configure the cache directory for Electron
        // Use app's user data directory to store models
        const cacheDir = path.join(app.getPath('userData'), 'models');
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
        }
        env.cacheDir = cacheDir;

        // Set backend to use ONNX Runtime Node (better for desktop)
        env.backends.onnx.wasm.numThreads = 4;

        // Allow local models and remote loading
        env.allowRemoteModels = true;
        env.allowLocalModels = true;

        if (progressCallback) progressCallback({ status: 'downloading_model', progress: 25 });
      }

      // Use Whisper small model for good balance of size and quality
      // First time this runs, it will download the model (~150MB)
      if (progressCallback) progressCallback({ status: 'initializing_model', progress: 50 });

      localTranscriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small', {
        progress_callback: (progress) => {
          if (progressCallback && progress.status === 'progress') {
            const percentage = 50 + (progress.progress * 40); // Scale to 50-90%
            progressCallback({ status: 'downloading_model', progress: percentage, ...progress });
          }
        }
      });

      if (progressCallback) progressCallback({ status: 'ready', progress: 100 });
      modelDownloading = false;
    } catch (error) {
      modelDownloading = false;
      throw error;
    }
  }
  return localTranscriber;
}

// Set the app name for dock and menu bar
app.setName('Audio Transcription');

let mainWindow;

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

  // Check if settings exist, otherwise show setup
  const settings = global.settings || null;
  if (!settings || (!settings.apiKey && settings.mode === 'api')) {
    mainWindow.loadFile('src/setup.html');
  } else {
    mainWindow.loadFile('src/upload.html');
  }

  // Open DevTools in development
  mainWindow.webContents.openDevTools();
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

// Handle settings storage (replaces old API key storage)
ipcMain.handle('save-settings', async (event, settings) => {
  global.settings = settings;
  return { success: true };
});

ipcMain.handle('get-settings', async () => {
  return global.settings || null;
});

// Legacy support for old getApiKey calls
ipcMain.handle('get-api-key', async () => {
  return global.settings?.apiKey || null;
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
ipcMain.handle('transcribe-audio', async (event, filePath, mode) => {
  try {
    // Check file size (25MB limit for API, relaxed for local)
    const stats = fs.statSync(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);

    if (mode === 'api') {
      // API mode - use OpenAI Whisper API
      const apiKey = global.settings?.apiKey;

      if (!apiKey) {
        return {
          success: false,
          error: 'API key not found. Please configure your API key.',
        };
      }

      if (fileSizeInMB > 25) {
        return {
          success: false,
          error: 'File size exceeds 25MB limit. Please use a smaller file.',
        };
      }

      const openai = new OpenAI({ apiKey });

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
    } else {
      // Local mode - use Transformers.js
      if (fileSizeInMB > 100) {
        return {
          success: false,
          error: 'File size exceeds 100MB limit. Please use a smaller file.',
        };
      }

      // Send progress updates to renderer
      const progressCallback = (progressData) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('model-download-progress', progressData);
        }
      };

      // Get or initialize local transcriber (lazy loading with progress)
      const transcriber = await getLocalTranscriber(progressCallback);

      // Send transcription start message
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('transcription-progress', { status: 'transcribing' });
      }

      // Transcribe the audio file
      const result = await transcriber(filePath, {
        return_timestamps: true,
        chunk_length_s: 30,
      });

      // Convert result to VTT format to match API output
      const vttContent = convertToVTT(result);

      return {
        success: true,
        transcript: vttContent,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Transcription failed',
    };
  }
});

// Helper function to convert Transformers.js output to VTT format
function convertToVTT(result) {
  let vtt = 'WEBVTT\n\n';

  if (result.chunks && result.chunks.length > 0) {
    result.chunks.forEach((chunk, index) => {
      const start = formatTimestamp(chunk.timestamp[0]);
      const end = formatTimestamp(chunk.timestamp[1]);
      vtt += `${index + 1}\n`;
      vtt += `${start} --> ${end}\n`;
      vtt += `${chunk.text.trim()}\n\n`;
    });
  } else {
    // If no chunks, just output the full text
    vtt += '1\n';
    vtt += '00:00:00.000 --> 00:00:10.000\n';
    vtt += `${result.text}\n\n`;
  }

  return vtt;
}

// Helper function to format timestamp for VTT
function formatTimestamp(seconds) {
  if (seconds === null || seconds === undefined) {
    return '00:00:00.000';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

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
