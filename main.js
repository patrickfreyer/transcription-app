const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const OpenAI = require('openai');
const fs = require('fs');
const os = require('os');
const Store = require('electron-store');

// Initialize electron-store for persistent settings
const store = new Store({
  defaults: {
    settings: null
  }
});

// Polyfill fetch for Node.js main process using undici
if (typeof globalThis.fetch === 'undefined') {
  const { fetch, Headers, Request, Response } = require('undici');
  globalThis.fetch = fetch;
  globalThis.Headers = Headers;
  globalThis.Request = Request;
  globalThis.Response = Response;
}

// Constants
const MAX_FILE_SIZE_API_MB = 25;
const MAX_FILE_SIZE_LOCAL_MB = 100;
const WHISPER_CHUNK_LENGTH_S = 30;
const MODEL_DOWNLOAD_PROGRESS_OFFSET = 50;
const MODEL_DOWNLOAD_PROGRESS_SCALE = 40;

// Import Transformers.js for local Whisper
let pipeline;
let env;
let localTranscriber = null;
let modelLoadingPromise = null;

/**
 * Lazily loads and initializes the local Whisper transcriber.
 * Downloads the model on first use (~465 MB).
 * Uses promise caching to prevent race conditions.
 *
 * @param {Function} progressCallback - Called with progress updates during download
 * @returns {Promise<Object>} The initialized transcriber pipeline
 * @throws {Error} If library or model fails to load
 */
async function getLocalTranscriber(progressCallback) {
  // Return existing transcriber if already loaded
  if (localTranscriber) {
    return localTranscriber;
  }

  // If loading is in progress, return the existing promise
  if (modelLoadingPromise) {
    return modelLoadingPromise;
  }

  // Start new loading process
  modelLoadingPromise = (async () => {
    try {
      if (!pipeline) {
        if (progressCallback) {
          progressCallback({ status: 'loading_library', progress: 0 });
        }

        // Use dynamic import with proper error handling
        const transformers = await import('@xenova/transformers').catch(err => {
          throw new Error(`Failed to load transformers library: ${err.message}`);
        });
        pipeline = transformers.pipeline;
        env = transformers.env;

        // Configure the cache directory for Electron
        const cacheDir = path.join(app.getPath('userData'), 'models');
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
        }
        env.cacheDir = cacheDir;

        // Set thread count based on system capabilities
        // Use half of available cores, with a minimum of 1 and maximum of 4
        const cpuCount = os.cpus().length;
        const threadCount = Math.max(1, Math.min(4, Math.floor(cpuCount / 2)));
        env.backends.onnx.wasm.numThreads = threadCount;

        // Allow local models and remote loading
        env.allowRemoteModels = true;
        env.allowLocalModels = true;

        if (progressCallback) {
          progressCallback({ status: 'downloading_model', progress: 25 });
        }
      }

      // Use Whisper small model for good balance of size and quality
      // First time this runs, it will download the model (~465MB)
      if (progressCallback) {
        progressCallback({ status: 'initializing_model', progress: MODEL_DOWNLOAD_PROGRESS_OFFSET });
      }

      localTranscriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small', {
        progress_callback: (progress) => {
          if (progressCallback && progress.status === 'progress') {
            const percentage = MODEL_DOWNLOAD_PROGRESS_OFFSET + (progress.progress * MODEL_DOWNLOAD_PROGRESS_SCALE);
            progressCallback({
              status: 'downloading_model',
              progress: percentage,
              ...progress
            });
          }
        }
      });

      if (progressCallback) {
        progressCallback({ status: 'ready', progress: 100 });
      }

      return localTranscriber;
    } catch (error) {
      // Reset state on error to allow retry
      modelLoadingPromise = null;
      localTranscriber = null;
      throw error;
    }
  })();

  return modelLoadingPromise;
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

  // Migrate old settings format if needed
  migrateSettings();

  // Check if settings exist, otherwise show setup
  const settings = store.get('settings');
  if (!settings || (settings.mode === 'api' && !settings.apiKey)) {
    mainWindow.loadFile('src/setup.html');
  } else {
    mainWindow.loadFile('src/upload.html');
  }

  // Only open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

/**
 * Migrates settings from old format (global.apiKey) to new format
 */
function migrateSettings() {
  const settings = store.get('settings');

  // Check for old global.apiKey format and migrate
  if (global.apiKey && !settings) {
    store.set('settings', { mode: 'api', apiKey: global.apiKey });
    delete global.apiKey;
  }
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
      // Sanitize error messages to avoid leaking sensitive information
      errorMessage = error.message.includes('API key')
        ? 'API key validation failed'
        : 'Connection error. Please check your internet connection.';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
});

// Handle settings storage with persistence
ipcMain.handle('save-settings', async (event, settings) => {
  store.set('settings', settings);
  return { success: true };
});

ipcMain.handle('get-settings', async () => {
  return store.get('settings') || null;
});

// Legacy support for old getApiKey calls
ipcMain.handle('get-api-key', async () => {
  const settings = store.get('settings');
  return settings?.apiKey || null;
});

// Navigate to different screens
ipcMain.handle('navigate', async (event, page) => {
  mainWindow.loadFile(`src/${page}.html`);
});

/**
 * Validates that a file path is safe to access
 * @param {string} filePath - The file path to validate
 * @returns {boolean} True if the path is valid and safe
 */
function isValidFilePath(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return false;
  }

  try {
    // Check if file exists and is a file (not a directory)
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return false;
    }

    // Validate it's within temp directory or user data directory
    const normalizedPath = path.normalize(filePath);
    const tempDir = os.tmpdir();
    const userDataDir = app.getPath('userData');

    return normalizedPath.startsWith(tempDir) || normalizedPath.startsWith(userDataDir);
  } catch (error) {
    return false;
  }
}

// Save recording to temporary file
ipcMain.handle('save-recording', async (event, arrayBuffer) => {
  try {
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `recording-${Date.now()}.webm`);
    const buffer = Buffer.from(arrayBuffer);

    await fs.promises.writeFile(tempFilePath, buffer);

    return {
      success: true,
      filePath: tempFilePath,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to save recording',
    };
  }
});

// Handle transcription
ipcMain.handle('transcribe-audio', async (event, filePath, mode) => {
  try {
    // Validate file path for security
    if (!isValidFilePath(filePath)) {
      return {
        success: false,
        error: 'Invalid file path',
      };
    }

    // Check file size with async file operations
    const stats = await fs.promises.stat(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);

    if (mode === 'api') {
      // API mode - use OpenAI Whisper API
      const settings = store.get('settings');
      const apiKey = settings?.apiKey;

      if (!apiKey) {
        return {
          success: false,
          error: 'API key not found. Please configure your API key.',
        };
      }

      if (fileSizeInMB > MAX_FILE_SIZE_API_MB) {
        return {
          success: false,
          error: `File size exceeds ${MAX_FILE_SIZE_API_MB}MB limit for API mode. Please use a smaller file.`,
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
      if (fileSizeInMB > MAX_FILE_SIZE_LOCAL_MB) {
        return {
          success: false,
          error: `File size exceeds ${MAX_FILE_SIZE_LOCAL_MB}MB limit for local mode. Please use a smaller file.`,
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

      if (!transcriber) {
        return {
          success: false,
          error: 'Failed to initialize local transcriber',
        };
      }

      // Send transcription start message
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('transcription-progress', { status: 'transcribing' });
      }

      // Transcribe the audio file
      const result = await transcriber(filePath, {
        return_timestamps: true,
        chunk_length_s: WHISPER_CHUNK_LENGTH_S,
      });

      // Convert result to VTT format to match API output
      const vttContent = convertToVTT(result);

      return {
        success: true,
        transcript: vttContent,
      };
    }
  } catch (error) {
    // Sanitize error messages
    let errorMessage = 'Transcription failed';

    if (error.status === 401) {
      errorMessage = 'Invalid API key';
    } else if (error.code === 'ENOENT') {
      errorMessage = 'File not found';
    } else if (error.message && !error.message.includes('path')) {
      // Only include error message if it doesn't contain path information
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
});

/**
 * Converts Transformers.js output to WebVTT format
 * @param {Object} result - The transcription result from Transformers.js
 * @returns {string} WebVTT formatted string
 */
function convertToVTT(result) {
  let vtt = 'WEBVTT\n\n';

  if (result.chunks && result.chunks.length > 0) {
    result.chunks.forEach((chunk, index) => {
      // Validate timestamps exist and are valid
      if (chunk.timestamp &&
          Array.isArray(chunk.timestamp) &&
          chunk.timestamp[0] !== null &&
          chunk.timestamp[0] !== undefined &&
          chunk.timestamp[1] !== null &&
          chunk.timestamp[1] !== undefined) {
        const start = formatTimestamp(chunk.timestamp[0]);
        const end = formatTimestamp(chunk.timestamp[1]);
        vtt += `${index + 1}\n`;
        vtt += `${start} --> ${end}\n`;
        vtt += `${chunk.text.trim()}\n\n`;
      }
    });
  }

  // If no valid chunks were added, output the full text
  if (vtt === 'WEBVTT\n\n' && result.text) {
    vtt += '1\n';
    vtt += '00:00:00.000 --> 00:00:10.000\n';
    vtt += `${result.text.trim()}\n\n`;
  }

  return vtt;
}

/**
 * Formats a timestamp in seconds to VTT format (HH:MM:SS.mmm)
 * @param {number} seconds - The timestamp in seconds
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) {
    return '00:00:00.000';
  }

  // Clamp to reasonable values
  seconds = Math.max(0, Math.min(seconds, 86400)); // Max 24 hours

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

    // Write file asynchronously
    await fs.promises.writeFile(result.filePath, content, 'utf8');

    return {
      success: true,
      filePath: result.filePath
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to save file'
    };
  }
});
