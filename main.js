const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const OpenAI = require('openai');
const fs = require('fs');
const os = require('os');

// Import service modules
const audioProcessing = require('./src/services/audioProcessing');
const transcriptionService = require('./src/services/transcription');

// App data directory for persistent storage
const APP_DATA_DIR = path.join(app.getPath('userData'), 'transcriptions');
const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');

// Ensure app data directory exists
if (!fs.existsSync(APP_DATA_DIR)) {
  fs.mkdirSync(APP_DATA_DIR, { recursive: true });
}

// Helper functions for config management
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(configData);
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  return {};
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

// Load API key from config on startup
const config = loadConfig();
global.apiKey = config.apiKey || null;

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

  // Initialize audio processing service with FFmpeg paths
  audioProcessing.initializeFFmpeg({ ffmpegPath, ffprobePath });

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

  // Persist to config file
  const currentConfig = loadConfig();
  currentConfig.apiKey = apiKey;
  const saved = saveConfig(currentConfig);

  return { success: saved };
});

ipcMain.handle('get-api-key', async () => {
  // Return from memory if available, otherwise load from config
  if (global.apiKey) {
    return global.apiKey;
  }

  const currentConfig = loadConfig();
  global.apiKey = currentConfig.apiKey || null;
  return global.apiKey;
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
ipcMain.handle('transcribe-audio', async (event, filePath, apiKey, options) => {
  // Progress callback to send updates to renderer
  const progressCallback = (progressData) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('transcription-progress', progressData);
    }
  };

  // Call transcription service
  return await transcriptionService.transcribeAudio(filePath, apiKey, options, progressCallback);
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
    const { id, fileName, transcript, summary, isDiarized, model } = data;

    // Use existing ID or create new one
    const transcriptionId = id || `${Date.now()}`;
    const transcriptionDir = path.join(APP_DATA_DIR, transcriptionId);

    // Create directory if it doesn't exist
    if (!fs.existsSync(transcriptionDir)) {
      fs.mkdirSync(transcriptionDir, { recursive: true });
    }

    // Load existing metadata if updating, otherwise create new
    let metadata;
    const metadataPath = path.join(transcriptionDir, 'metadata.json');

    if (fs.existsSync(metadataPath)) {
      // Updating existing transcription
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      // Update fields that may have changed
      if (summary !== undefined) {
        metadata.hasSummary = true;
      }
    } else {
      // Creating new transcription
      const timestamp = Date.now();
      metadata = {
        id: transcriptionId,
        fileName,
        timestamp,
        date: new Date(timestamp).toISOString(),
        isDiarized,
        model,
        transcriptPreview: transcript.substring(0, 200),
        hasSummary: !!summary,
      };
    }

    fs.writeFileSync(
      metadataPath,
      JSON.stringify(metadata, null, 2),
      'utf8'
    );

    // Save transcript if provided
    if (transcript) {
      fs.writeFileSync(
        path.join(transcriptionDir, 'transcript.txt'),
        transcript,
        'utf8'
      );
    }

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
      id: transcriptionId,
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
