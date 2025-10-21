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

// Re-encode audio file to reduce size
function reencodeAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo() // Remove video stream if present
      .audioCodec('libopus') // Use Opus codec for voice
      .audioBitrate('12k') // 12kbps for voice quality
      .audioChannels(1) // Mono audio
      .audioFrequency(16000) // 16kHz sample rate (sufficient for speech)
      .outputOptions([
        '-application voip', // Optimize for voice
        '-map_metadata -1' // Remove metadata to reduce size
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .on('progress', (progress) => {
        // Send progress updates to the renderer process
        if (mainWindow && progress.percent) {
          mainWindow.webContents.send('reencode-progress', Math.round(progress.percent));
        }
      })
      .run();
  });
}

// Handle transcription
ipcMain.handle('transcribe-audio', async (event, filePath, apiKey) => {
  let reencodedFilePath = null;

  try {
    const openai = new OpenAI({ apiKey });

    // Check file size
    const stats = fs.statSync(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);

    let fileToTranscribe = filePath;

    // If file is larger than 25MB, re-encode it
    if (fileSizeInMB > 25) {
      // Notify the renderer that we're re-encoding
      if (mainWindow) {
        mainWindow.webContents.send('reencode-start', fileSizeInMB);
      }

      // Create temp file for re-encoded audio
      const tempDir = os.tmpdir();
      const ext = path.extname(filePath);
      reencodedFilePath = path.join(tempDir, `reencoded-${Date.now()}.ogg`);

      // Re-encode the audio file
      await reencodeAudio(filePath, reencodedFilePath);

      // Check if re-encoded file is small enough
      const recodedStats = fs.statSync(reencodedFilePath);
      const recodedSizeInMB = recodedStats.size / (1024 * 1024);

      if (recodedSizeInMB > 25) {
        // Clean up
        if (fs.existsSync(reencodedFilePath)) {
          fs.unlinkSync(reencodedFilePath);
        }

        return {
          success: false,
          error: `File is too large even after re-encoding (${recodedSizeInMB.toFixed(2)}MB). The audio may be exceptionally long or high quality.`,
        };
      }

      fileToTranscribe = reencodedFilePath;

      // Notify renderer that re-encoding is complete
      if (mainWindow) {
        mainWindow.webContents.send('reencode-complete', recodedSizeInMB);
      }
    }

    // Create transcription with VTT format for timestamps
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(fileToTranscribe),
      model: 'whisper-1',
      response_format: 'vtt',
    });

    // Clean up re-encoded file if it was created
    if (reencodedFilePath && fs.existsSync(reencodedFilePath)) {
      fs.unlinkSync(reencodedFilePath);
    }

    return {
      success: true,
      transcript: transcription,
    };
  } catch (error) {
    // Clean up re-encoded file on error
    if (reencodedFilePath && fs.existsSync(reencodedFilePath)) {
      try {
        fs.unlinkSync(reencodedFilePath);
      } catch (cleanupError) {
        console.error('Failed to clean up re-encoded file:', cleanupError);
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
