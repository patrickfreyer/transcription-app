const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const OpenAI = require('openai');
const fs = require('fs');
const os = require('os');
const keytar = require('keytar');
const Store = require('electron-store');

// Import new backend handlers
const { registerAllHandlers } = require('./backend/handlers');
const TranscriptionService = require('./backend/services/TranscriptionService');

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

// Initialize TranscriptionService
let transcriptionService = null;
if (ffmpegAvailable) {
  transcriptionService = new TranscriptionService(ffmpeg, ffmpegAvailable);
  console.log('✓ TranscriptionService initialized with optimizations enabled');
}

let mainWindow;

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

    // Validate that buffer has content
    if (!buffer || buffer.length === 0) {
      throw new Error('Recording is empty - no audio data captured');
    }

    // Check for minimum viable WebM file size (headers + minimal data)
    if (buffer.length < 1000) {
      throw new Error(`Recording file is too small (${buffer.length} bytes) - likely corrupted or empty`);
    }

    // Verify WebM header signature (0x1A 0x45 0xDF 0xA3)
    const hasValidWebMHeader = buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3;
    if (!hasValidWebMHeader) {
      throw new Error('Recording file is not a valid WebM format - header signature missing');
    }

    fs.writeFileSync(tempFilePath, buffer);

    console.log(`✓ Recording saved: ${tempFilePath} (${(buffer.length / 1024).toFixed(2)} KB)`);

    return {
      success: true,
      filePath: tempFilePath,
    };
  } catch (error) {
    console.error('✗ Failed to save recording:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to save recording',
    };
  }
});

/**
 * Handle transcription with optimizations:
 * - Parallel chunk processing (5 chunks at a time)
 * - Dynamic rate limiting (respects 80 RPM limit)
 * - Audio speed-up (optional, 1x-3x)
 * - Opus compression (optional)
 * - Format conversion (WebM, OGG, FLAC → MP3)
 * - Automatic chunking for large files (>25MB)
 */
ipcMain.handle('transcribe-audio', async (event, filePath, apiKey, options) => {
  // Check if TranscriptionService is available
  if (!transcriptionService) {
    return {
      success: false,
      error: 'Transcription service is not available. FFmpeg may not be loaded correctly.',
    };
  }

  let chunkPaths = [];
  let convertedFilePath = null;
  let optimizedFilePath = null;
  let compressedFilePath = null;

  // Parse options (backward compatibility: if options is a string, treat it as prompt)
  const isLegacyCall = typeof options === 'string';
  const model = isLegacyCall ? 'whisper-1' : (options?.model || 'gpt-4o-transcribe');
  const prompt = isLegacyCall ? options : (options?.prompt || null);
  const speakers = isLegacyCall ? null : (options?.speakers || null);
  const speedMultiplier = options?.speedMultiplier || 1.0;
  const useCompression = options?.useCompression || false;

  // Progress callback
  const sendProgress = (progressData) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('transcription-progress', progressData);
    }
  };

  try {
    const openai = new OpenAI({ apiKey });
    let processFilePath = filePath;

    // Step 1: Convert format if needed
    const fileExt = filePath.toLowerCase();
    const needsConversion = fileExt.endsWith('.webm') ||
                           fileExt.endsWith('.ogg') ||
                           fileExt.endsWith('.flac') ||
                           fileExt.endsWith('.aac') ||
                           fileExt.endsWith('.wma');

    if (needsConversion) {
      if (!ffmpegAvailable) {
        const formatName = path.extname(filePath).toUpperCase().replace('.', '');
        return {
          success: false,
          error: `${formatName} files require FFmpeg for conversion to MP3, which could not be loaded on this system.\n\nPlease try uploading an MP3, WAV, or M4A file instead, or try re-downloading the application.`,
        };
      }

      sendProgress({
        status: 'converting',
        message: `Converting ${path.extname(filePath).toUpperCase().replace('.', '')} to MP3 format...`,
      });

      console.log(`Converting ${path.extname(filePath)} file to MP3 for compatibility...`);
      convertedFilePath = await transcriptionService.convertToMP3(filePath);
      processFilePath = convertedFilePath;
    } else {
      console.log(`Using ${path.extname(filePath)} file directly (OpenAI native support)`);
    }

    // Step 2: Apply audio optimizations (speed-up)
    if (speedMultiplier > 1.0 && speedMultiplier <= 3.0) {
      sendProgress({
        status: 'optimizing',
        message: `Optimizing audio speed (${speedMultiplier}x)...`,
      });

      optimizedFilePath = await transcriptionService.optimizeAudioSpeed(processFilePath, speedMultiplier);
      processFilePath = optimizedFilePath;
    }

    // Step 3: Apply compression if requested (optional, for bandwidth savings)
    if (useCompression) {
      sendProgress({
        status: 'compressing',
        message: 'Compressing audio...',
      });

      try {
        compressedFilePath = await transcriptionService.compressAudio(processFilePath);
        processFilePath = compressedFilePath;
      } catch (compressionError) {
        console.warn('Compression failed, continuing without compression:', compressionError.message);
        // Continue without compression
      }
    }

    // Step 4: Check file size and split if needed
    const stats = fs.statSync(processFilePath);
    const fileSizeInMB = stats.size / (1024 * 1024);

    if (fileSizeInMB > 25) {
      if (!ffmpegAvailable) {
        transcriptionService.cleanupTempFile(convertedFilePath);
        transcriptionService.cleanupTempFile(optimizedFilePath);
        transcriptionService.cleanupTempFile(compressedFilePath);

        return {
          success: false,
          error: `File size is ${fileSizeInMB.toFixed(1)}MB, which exceeds the 25MB API limit.\n\nLarge file support requires FFmpeg, which could not be loaded on this system.\n\nPlease use a file smaller than 25MB, or try re-downloading the application.`,
        };
      }

      sendProgress({
        status: 'splitting',
        message: 'Splitting large audio file into chunks...',
      });

      chunkPaths = await transcriptionService.splitAudioIntoChunks(processFilePath, 20);

      // Get duration of each chunk
      const chunkDurations = [];
      for (const chunkPath of chunkPaths) {
        const duration = await transcriptionService.getAudioDuration(chunkPath);
        chunkDurations.push(duration);
      }

      // Step 5: Transcribe chunks in parallel with controlled concurrency
      const { results, failedChunks } = await transcriptionService.transcribeChunksParallel(
        openai,
        chunkPaths,
        chunkDurations,
        { model, prompt, speakers },
        sendProgress
      );

      // Extract transcriptions from results
      const transcripts = results.map(result => result.transcription);

      // Track if any chunks failed for warning message
      let warningMessage = null;
      if (failedChunks.length > 0) {
        // Calculate how much content is missing
        const totalDuration = chunkDurations.reduce((sum, d) => sum + d, 0);
        const missingDuration = failedChunks.reduce((sum, chunk) => sum + chunk.duration, 0);
        const missingPercent = ((missingDuration / totalDuration) * 100).toFixed(1);

        warningMessage = `⚠️ PARTIAL TRANSCRIPTION: ${failedChunks.length} of ${chunkPaths.length} chunks failed after multiple retries.\n\n` +
          `Missing approximately ${Math.floor(missingDuration / 60)} minutes (${missingPercent}% of total audio).\n\n` +
          `Failed chunks: ${failedChunks.map(c => `#${c.index}`).join(', ')}\n\n` +
          `This may be due to:\n` +
          `• OpenAI API rate limits\n` +
          `• Network connectivity issues\n` +
          `• Temporary API service issues\n\n` +
          `The partial transcription is shown below. You may want to re-transcribe the full file later.`;

        console.warn('⚠️ Proceeding with partial transcription despite chunk failures');
      }

      // Step 6: Combine transcripts
      sendProgress({
        status: 'combining',
        message: 'Combining transcripts...',
      });

      let combinedTranscript;
      let isDiarized = false;

      if (model === 'whisper-1') {
        combinedTranscript = transcriptionService.combineVTTTranscripts(transcripts, chunkDurations);
      } else if (model === 'gpt-4o-transcribe') {
        const combinedText = transcripts.map(t => t.text || '').join(' ');
        combinedTranscript = transcriptionService.jsonToVTT({ text: combinedText });
      } else if (model === 'gpt-4o-transcribe-diarize') {
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

        combinedTranscript = transcriptionService.diarizedJsonToVTT({ segments: allSegments });
        isDiarized = true;
      }

      // Clean up temporary files
      transcriptionService.cleanupChunks(chunkPaths);
      transcriptionService.cleanupTempFile(convertedFilePath);
      transcriptionService.cleanupTempFile(optimizedFilePath);
      transcriptionService.cleanupTempFile(compressedFilePath);

      return {
        success: true,
        text: transcriptionService.vttToPlainText(combinedTranscript),
        transcript: combinedTranscript,
        chunked: true,
        totalChunks: chunkPaths.length,
        isDiarized: isDiarized,
        warning: warningMessage,
        failedChunks: failedChunks.length > 0 ? failedChunks : undefined,
      };
    } else {
      // Step 5 (small file): Single transcription request
      sendProgress({
        status: 'transcribing',
        message: 'Transcribing audio...',
      });

      const transcriptionParams = {
        file: fs.createReadStream(processFilePath),
        model: model,
      };

      // Set response format based on model
      if (model === 'whisper-1') {
        transcriptionParams.response_format = 'vtt';
        if (prompt) {
          transcriptionParams.prompt = prompt;
        }
      } else if (model === 'gpt-4o-transcribe') {
        transcriptionParams.response_format = 'json';
        if (prompt) {
          transcriptionParams.prompt = prompt;
        }
      } else if (model === 'gpt-4o-transcribe-diarize') {
        transcriptionParams.response_format = 'diarized_json';
        transcriptionParams.chunking_strategy = 'auto';

        if (speakers && speakers.length > 0) {
          const speakerNames = [];
          const speakerReferences = [];

          for (const speaker of speakers) {
            speakerNames.push(speaker.name);
            const dataURL = transcriptionService.fileToDataURL(speaker.path);
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
        finalTranscript = transcriptionService.jsonToVTT(transcription);
      } else if (model === 'gpt-4o-transcribe-diarize') {
        finalTranscript = transcriptionService.diarizedJsonToVTT(transcription);
        isDiarized = true;
      }

      // Clean up temporary files
      transcriptionService.cleanupTempFile(convertedFilePath);
      transcriptionService.cleanupTempFile(optimizedFilePath);
      transcriptionService.cleanupTempFile(compressedFilePath);

      return {
        success: true,
        text: transcriptionService.vttToPlainText(finalTranscript),
        transcript: finalTranscript,
        chunked: false,
        isDiarized: isDiarized,
      };
    }
  } catch (error) {
    // Clean up on error
    transcriptionService.cleanupChunks(chunkPaths);
    transcriptionService.cleanupTempFile(convertedFilePath);
    transcriptionService.cleanupTempFile(optimizedFilePath);
    transcriptionService.cleanupTempFile(compressedFilePath);

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
