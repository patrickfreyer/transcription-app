"use strict";
const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const OpenAI = require("openai");
const fs = require("fs");
const os = require("os");
const keytar = require("keytar");
const Store = require("electron-store");
const { registerAllHandlers } = require("./backend/handlers");
const TranscriptionService = require("./backend/services/TranscriptionService");
const SERVICE_NAME = "Audio Transcription App";
const ACCOUNT_NAME = "openai-api-key";
const store = new Store({
  defaults: {
    transcripts: [],
    chatHistory: {},
    "summary-templates": []
  }
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  dialog.showErrorBox("Application Error", `An error occurred during startup:

${error.message}

Stack: ${error.stack}`);
});
let ffmpeg, ffmpegPath, ffprobePath;
let ffmpegAvailable = false;
try {
  console.log("=== FFmpeg Loading Debug Info ===");
  console.log("Platform:", process.platform);
  console.log("Architecture:", process.arch);
  console.log("App path:", app.getAppPath());
  console.log("Resource path:", process.resourcesPath);
  ffmpeg = require("fluent-ffmpeg");
  console.log("✓ fluent-ffmpeg loaded");
  try {
    const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
    ffmpegPath = ffmpegInstaller.path;
    if (ffmpegPath.includes("app.asar") && !ffmpegPath.includes(".asar.unpacked")) {
      ffmpegPath = ffmpegPath.replace("app.asar", "app.asar.unpacked");
    }
    console.log("✓ ffmpeg-installer loaded");
    console.log("FFmpeg path:", ffmpegPath);
    console.log("FFmpeg exists:", fs.existsSync(ffmpegPath));
    if (fs.existsSync(ffmpegPath)) {
      const stat = fs.statSync(ffmpegPath);
      console.log("FFmpeg is file:", stat.isFile());
      console.log("FFmpeg is directory:", stat.isDirectory());
    }
  } catch (e) {
    console.error("✗ Error loading ffmpeg-installer:", e.message);
    throw e;
  }
  try {
    const ffprobeInstaller = require("@ffprobe-installer/ffprobe");
    ffprobePath = ffprobeInstaller.path;
    if (ffprobePath.includes("app.asar") && !ffprobePath.includes(".asar.unpacked")) {
      ffprobePath = ffprobePath.replace("app.asar", "app.asar.unpacked");
    }
    console.log("✓ ffprobe-installer loaded");
    console.log("FFprobe path:", ffprobePath);
    console.log("FFprobe exists:", fs.existsSync(ffprobePath));
    if (fs.existsSync(ffprobePath)) {
      const stat = fs.statSync(ffprobePath);
      console.log("FFprobe is file:", stat.isFile());
      console.log("FFprobe is directory:", stat.isDirectory());
    }
  } catch (e) {
    console.error("✗ Error loading ffprobe-installer:", e.message);
    throw e;
  }
  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);
  ffmpegAvailable = true;
  console.log("✓ FFmpeg fully configured and available");
  console.log("=================================");
} catch (error) {
  console.error("=== FFmpeg Loading Failed ===");
  console.error("Error:", error.message);
  console.error("Stack:", error.stack);
  console.error("============================");
  if (process.platform === "win32") {
    dialog.showErrorBox(
      "Large File Support Unavailable",
      `FFmpeg could not be loaded. Large file support (>25MB) will not work.

Error: ${error.message}

Files under 25MB will still work normally.`
    );
  }
}
app.setName("Audio Transcription");
let transcriptionService = null;
if (ffmpegAvailable) {
  transcriptionService = new TranscriptionService(ffmpeg, ffmpegAvailable);
  console.log("✓ TranscriptionService initialized with optimizations enabled");
}
let mainWindow;
function createWindow() {
  const isWindows = process.platform === "win32";
  process.platform === "darwin";
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    title: "Audio Transcription",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    },
    // Platform-specific title bar configuration
    titleBarStyle: isWindows ? "hidden" : "hiddenInset",
    frame: !isWindows,
    // Remove frame on Windows (using custom title bar)
    backgroundColor: "#ffffff"
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "dist/index.html"));
  }
  mainWindow.webContents.on("did-finish-load", async () => {
    try {
      const apiKey = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
      if (apiKey) {
        mainWindow.webContents.send("api-key-status", "valid");
      } else {
        mainWindow.webContents.send("api-key-status", "missing");
      }
    } catch (error) {
      console.error("Error checking API key on startup:", error);
      mainWindow.webContents.send("api-key-status", "missing");
    }
  });
}
app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
ipcMain.handle("validate-api-key", async (event, apiKey) => {
  try {
    const openai = new OpenAI({ apiKey });
    await openai.models.list();
    return {
      success: true,
      message: "API key is valid"
    };
  } catch (error) {
    let errorMessage = "Invalid API key";
    if (error.status === 401) {
      errorMessage = "Invalid API key. Please check your key and try again.";
    } else if (error.status === 429) {
      errorMessage = "Rate limit exceeded. Please try again later.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    return {
      success: false,
      error: errorMessage
    };
  }
});
ipcMain.handle("save-api-key", async (event, apiKey) => {
  global.apiKey = apiKey;
  return { success: true };
});
ipcMain.handle("get-api-key", async () => {
  return global.apiKey || null;
});
ipcMain.handle("save-api-key-secure", async (event, apiKey) => {
  try {
    await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, apiKey);
    console.log("✓ API key saved to secure storage");
    return { success: true };
  } catch (error) {
    console.error("Failed to save API key:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("get-api-key-secure", async () => {
  try {
    const apiKey = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
    return { success: true, apiKey };
  } catch (error) {
    console.error("Failed to retrieve API key:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("delete-api-key-secure", async () => {
  try {
    const deleted = await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
    console.log("✓ API key deleted from secure storage");
    return { success: deleted };
  } catch (error) {
    console.error("Failed to delete API key:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("get-disclaimer-status", async () => {
  try {
    const accepted = store.get("disclaimer-accepted", false);
    console.log("✓ Disclaimer status:", accepted ? "accepted" : "not accepted");
    return { success: true, accepted };
  } catch (error) {
    console.error("Failed to get disclaimer status:", error);
    return { success: false, accepted: false };
  }
});
ipcMain.handle("set-disclaimer-accepted", async () => {
  try {
    store.set("disclaimer-accepted", true);
    console.log("✓ Disclaimer accepted and saved");
    return { success: true };
  } catch (error) {
    console.error("Failed to save disclaimer acceptance:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("get-templates", async () => {
  try {
    const templates = store.get("summary-templates", []);
    console.log("✓ Loaded summary templates from storage");
    return { success: true, templates };
  } catch (error) {
    console.error("Failed to load templates:", error);
    return { success: false, error: error.message, templates: [] };
  }
});
ipcMain.handle("save-templates", async (event, templates) => {
  try {
    store.set("summary-templates", templates);
    console.log("✓ Saved summary templates to storage");
    return { success: true };
  } catch (error) {
    console.error("Failed to save templates:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("save-file-to-temp", async (event, arrayBuffer, fileName) => {
  try {
    const tempDir = os.tmpdir();
    const sanitizedFileName = path.basename(fileName);
    const tempFilePath = path.join(tempDir, `upload-${Date.now()}-${sanitizedFileName}`);
    console.log("Saving file to temp:", tempFilePath);
    fs.writeFileSync(tempFilePath, Buffer.from(arrayBuffer));
    return {
      success: true,
      filePath: tempFilePath
    };
  } catch (error) {
    console.error("Failed to save file to temp:", error);
    return {
      success: false,
      error: error.message
    };
  }
});
ipcMain.on("window-minimize", () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});
ipcMain.on("window-maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});
ipcMain.on("window-close", () => {
  if (mainWindow) {
    mainWindow.close();
  }
});
ipcMain.handle("navigate", async (event, page) => {
  mainWindow.loadFile(`src/${page}.html`);
});
ipcMain.handle("save-recording", async (event, arrayBuffer) => {
  try {
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `recording-${Date.now()}.webm`);
    const buffer = Buffer.from(arrayBuffer);
    if (!buffer || buffer.length === 0) {
      throw new Error("Recording is empty - no audio data captured");
    }
    if (buffer.length < 1e3) {
      throw new Error(`Recording file is too small (${buffer.length} bytes) - likely corrupted or empty`);
    }
    const hasValidWebMHeader = buffer[0] === 26 && buffer[1] === 69 && buffer[2] === 223 && buffer[3] === 163;
    if (!hasValidWebMHeader) {
      throw new Error("Recording file is not a valid WebM format - header signature missing");
    }
    fs.writeFileSync(tempFilePath, buffer);
    console.log(`✓ Recording saved: ${tempFilePath} (${(buffer.length / 1024).toFixed(2)} KB)`);
    return {
      success: true,
      filePath: tempFilePath
    };
  } catch (error) {
    console.error("✗ Failed to save recording:", error.message);
    return {
      success: false,
      error: error.message || "Failed to save recording"
    };
  }
});
ipcMain.handle("transcribe-audio", async (event, filePath, apiKey, options) => {
  if (!transcriptionService) {
    return {
      success: false,
      error: "Transcription service is not available. FFmpeg may not be loaded correctly."
    };
  }
  let chunkPaths = [];
  let convertedFilePath = null;
  let optimizedFilePath = null;
  let compressedFilePath = null;
  const isLegacyCall = typeof options === "string";
  const model = isLegacyCall ? "whisper-1" : options?.model || "gpt-4o-transcribe";
  const prompt = isLegacyCall ? options : options?.prompt || null;
  const speakers = isLegacyCall ? null : options?.speakers || null;
  const speedMultiplier = options?.speedMultiplier || 1;
  const useCompression = options?.useCompression || false;
  const sendProgress = (progressData) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("transcription-progress", progressData);
    }
  };
  try {
    const openai = new OpenAI({ apiKey });
    let processFilePath = filePath;
    const fileExt = filePath.toLowerCase();
    const needsConversion = fileExt.endsWith(".webm") || fileExt.endsWith(".ogg") || fileExt.endsWith(".flac") || fileExt.endsWith(".aac") || fileExt.endsWith(".wma");
    if (needsConversion) {
      if (!ffmpegAvailable) {
        const formatName = path.extname(filePath).toUpperCase().replace(".", "");
        return {
          success: false,
          error: `${formatName} files require FFmpeg for conversion to MP3, which could not be loaded on this system.

Please try uploading an MP3, WAV, or M4A file instead, or try re-downloading the application.`
        };
      }
      sendProgress({
        status: "converting",
        message: `Converting ${path.extname(filePath).toUpperCase().replace(".", "")} to MP3 format...`
      });
      console.log(`Converting ${path.extname(filePath)} file to MP3 for compatibility...`);
      convertedFilePath = await transcriptionService.convertToMP3(filePath);
      processFilePath = convertedFilePath;
    } else {
      console.log(`Using ${path.extname(filePath)} file directly (OpenAI native support)`);
    }
    if (speedMultiplier > 1 && speedMultiplier <= 3) {
      sendProgress({
        status: "optimizing",
        message: `Optimizing audio speed (${speedMultiplier}x)...`
      });
      optimizedFilePath = await transcriptionService.optimizeAudioSpeed(processFilePath, speedMultiplier);
      processFilePath = optimizedFilePath;
    }
    if (useCompression) {
      sendProgress({
        status: "compressing",
        message: "Compressing audio..."
      });
      try {
        compressedFilePath = await transcriptionService.compressAudio(processFilePath);
        processFilePath = compressedFilePath;
      } catch (compressionError) {
        console.warn("Compression failed, continuing without compression:", compressionError.message);
      }
    }
    const stats = fs.statSync(processFilePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    if (fileSizeInMB > 25) {
      if (!ffmpegAvailable) {
        transcriptionService.cleanupTempFile(convertedFilePath);
        transcriptionService.cleanupTempFile(optimizedFilePath);
        transcriptionService.cleanupTempFile(compressedFilePath);
        return {
          success: false,
          error: `File size is ${fileSizeInMB.toFixed(1)}MB, which exceeds the 25MB API limit.

Large file support requires FFmpeg, which could not be loaded on this system.

Please use a file smaller than 25MB, or try re-downloading the application.`
        };
      }
      sendProgress({
        status: "splitting",
        message: "Splitting large audio file into chunks..."
      });
      chunkPaths = await transcriptionService.splitAudioIntoChunks(processFilePath, 20);
      const chunkDurations = [];
      for (const chunkPath of chunkPaths) {
        const duration = await transcriptionService.getAudioDuration(chunkPath);
        chunkDurations.push(duration);
      }
      const { results, failedChunks } = await transcriptionService.transcribeChunksParallel(
        openai,
        chunkPaths,
        chunkDurations,
        { model, prompt, speakers },
        sendProgress
      );
      const transcripts = results.map((result) => result.transcription);
      let warningMessage = null;
      if (failedChunks.length > 0) {
        const totalDuration = chunkDurations.reduce((sum, d) => sum + d, 0);
        const missingDuration = failedChunks.reduce((sum, chunk) => sum + chunk.duration, 0);
        const missingPercent = (missingDuration / totalDuration * 100).toFixed(1);
        warningMessage = `⚠️ PARTIAL TRANSCRIPTION: ${failedChunks.length} of ${chunkPaths.length} chunks failed after multiple retries.

Missing approximately ${Math.floor(missingDuration / 60)} minutes (${missingPercent}% of total audio).

Failed chunks: ${failedChunks.map((c) => `#${c.index}`).join(", ")}

This may be due to:
• OpenAI API rate limits
• Network connectivity issues
• Temporary API service issues

The partial transcription is shown below. You may want to re-transcribe the full file later.`;
        console.warn("⚠️ Proceeding with partial transcription despite chunk failures");
      }
      sendProgress({
        status: "combining",
        message: "Combining transcripts..."
      });
      let combinedTranscript;
      let isDiarized = false;
      if (model === "whisper-1") {
        combinedTranscript = transcriptionService.combineVTTTranscripts(transcripts, chunkDurations);
      } else if (model === "gpt-4o-transcribe") {
        const combinedText = transcripts.map((t) => t.text || "").join(" ");
        combinedTranscript = transcriptionService.jsonToVTT({ text: combinedText });
      } else if (model === "gpt-4o-transcribe-diarize") {
        let allSegments = [];
        let timeOffset = 0;
        for (let i = 0; i < transcripts.length; i++) {
          const transcript = transcripts[i];
          if (transcript.segments) {
            const offsetSegments = transcript.segments.map((seg) => ({
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
        isDiarized,
        warning: warningMessage,
        failedChunks: failedChunks.length > 0 ? failedChunks : void 0
      };
    } else {
      sendProgress({
        status: "transcribing",
        message: "Transcribing audio..."
      });
      const transcriptionParams = {
        file: fs.createReadStream(processFilePath),
        model
      };
      if (model === "whisper-1") {
        transcriptionParams.response_format = "vtt";
        if (prompt) {
          transcriptionParams.prompt = prompt;
        }
      } else if (model === "gpt-4o-transcribe") {
        transcriptionParams.response_format = "json";
        if (prompt) {
          transcriptionParams.prompt = prompt;
        }
      } else if (model === "gpt-4o-transcribe-diarize") {
        transcriptionParams.response_format = "diarized_json";
        transcriptionParams.chunking_strategy = "auto";
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
      let finalTranscript;
      let isDiarized = false;
      if (model === "whisper-1") {
        finalTranscript = transcription;
      } else if (model === "gpt-4o-transcribe") {
        finalTranscript = transcriptionService.jsonToVTT(transcription);
      } else if (model === "gpt-4o-transcribe-diarize") {
        finalTranscript = transcriptionService.diarizedJsonToVTT(transcription);
        isDiarized = true;
      }
      transcriptionService.cleanupTempFile(convertedFilePath);
      transcriptionService.cleanupTempFile(optimizedFilePath);
      transcriptionService.cleanupTempFile(compressedFilePath);
      return {
        success: true,
        text: transcriptionService.vttToPlainText(finalTranscript),
        transcript: finalTranscript,
        chunked: false,
        isDiarized
      };
    }
  } catch (error) {
    transcriptionService.cleanupChunks(chunkPaths);
    transcriptionService.cleanupTempFile(convertedFilePath);
    transcriptionService.cleanupTempFile(optimizedFilePath);
    transcriptionService.cleanupTempFile(compressedFilePath);
    return {
      success: false,
      error: error.message || "Transcription failed"
    };
  }
});
ipcMain.handle("generate-summary", async (event, transcript, templatePrompt, apiKey) => {
  try {
    const openai = new OpenAI({ apiKey });
    console.log("Generating summary with OpenAI...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that creates summaries of transcriptions based on user instructions."
        },
        {
          role: "user",
          content: `Here is a transcription:

${transcript}

${templatePrompt}`
        }
      ],
      temperature: 0.3
    });
    const summary = response.choices[0]?.message?.content;
    if (!summary) {
      throw new Error("No summary generated");
    }
    console.log("✓ Summary generated successfully");
    return {
      success: true,
      summary: summary.trim()
    };
  } catch (error) {
    console.error("Summary generation error:", error);
    return {
      success: false,
      error: error.message || "Summary generation failed"
    };
  }
});
registerAllHandlers();
ipcMain.handle("open-external", async (event, url) => {
  try {
    const validUrl = new URL(url);
    if (validUrl.protocol === "http:" || validUrl.protocol === "https:") {
      await shell.openExternal(url);
      return { success: true };
    } else {
      console.error("Invalid protocol:", validUrl.protocol);
      return { success: false, error: "Only HTTP and HTTPS URLs are allowed" };
    }
  } catch (error) {
    console.error("Error opening external URL:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("save-transcript", async (event, content, format, fileName) => {
  try {
    const formatConfig = {
      txt: { name: "Text File", extensions: ["txt"] },
      vtt: { name: "WebVTT Subtitle", extensions: ["vtt"] },
      md: { name: "Markdown", extensions: ["md"] },
      pdf: { name: "PDF Document", extensions: ["pdf"] }
    };
    const config = formatConfig[format] || formatConfig.txt;
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Save Transcript",
      defaultPath: path.join(app.getPath("documents"), `${fileName}.${config.extensions[0]}`),
      filters: [
        { name: config.name, extensions: config.extensions },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    if (result.canceled) {
      return { success: false, cancelled: true };
    }
    if (format === "pdf") {
      throw new Error("PDF export not yet implemented. Please use TXT, VTT, or Markdown format.");
    }
    let finalContent = content;
    if (format === "md") {
      finalContent = `# Transcript

${content}`;
    }
    fs.writeFileSync(result.filePath, finalContent, "utf8");
    console.log(`✓ Transcript saved as ${format.toUpperCase()}: ${result.filePath}`);
    return {
      success: true,
      filePath: result.filePath
    };
  } catch (error) {
    console.error("Save transcript error:", error);
    return {
      success: false,
      error: error.message || "Failed to save file"
    };
  }
});
