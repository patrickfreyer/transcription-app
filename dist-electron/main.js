"use strict";
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const OpenAI = require("openai");
const fs = require("fs");
const os = require("os");
const keytar = require("keytar");
const Store = require("electron-store");
const { registerAllHandlers } = require("./backend/handlers");
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
let mainWindow;
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
async function convertToMP3(filePath) {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const outputPath = path.join(tempDir, `converted-${Date.now()}.mp3`);
    ffmpeg(filePath).output(outputPath).audioCodec("libmp3lame").audioBitrate("192k").audioFrequency(44100).on("end", () => resolve(outputPath)).on("error", (err) => reject(new Error(`Audio conversion failed: ${err.message}`))).run();
  });
}
async function splitAudioIntoChunks(filePath, chunkSizeInMB = 20) {
  try {
    const stats = fs.statSync(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    if (fileSizeInMB <= 25) {
      return [filePath];
    }
    const duration = await getAudioDuration(filePath);
    const tempDir = os.tmpdir();
    const chunksDir = path.join(tempDir, `chunks-${Date.now()}`);
    fs.mkdirSync(chunksDir, { recursive: true });
    const chunkDuration = Math.floor(duration * chunkSizeInMB / fileSizeInMB);
    const numChunks = Math.ceil(duration / chunkDuration);
    const chunkPaths = [];
    for (let i = 0; i < numChunks; i++) {
      const startTime = i * chunkDuration;
      const chunkPath = path.join(chunksDir, `chunk-${i}.mp3`);
      await new Promise((resolve, reject) => {
        ffmpeg(filePath).setStartTime(startTime).setDuration(chunkDuration).output(chunkPath).audioCodec("libmp3lame").audioBitrate("128k").on("end", () => resolve()).on("error", (err) => reject(err)).run();
      });
      chunkPaths.push(chunkPath);
    }
    return chunkPaths;
  } catch (error) {
    throw new Error(`Failed to split audio: ${error.message}`);
  }
}
function parseVTTTimestamp(timestamp) {
  const parts = timestamp.split(":");
  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  const secondsParts = parts[2].split(".");
  const seconds = parseInt(secondsParts[0]);
  const milliseconds = parseInt(secondsParts[1]);
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1e3;
}
function formatVTTTimestamp(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor(totalSeconds % 1 * 1e3);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}
function combineVTTTranscripts(vttTranscripts, chunkDurations) {
  let combinedVTT = "WEBVTT\n\n";
  let cueNumber = 1;
  let timeOffset = 0;
  for (let i = 0; i < vttTranscripts.length; i++) {
    const vtt = vttTranscripts[i];
    const lines = vtt.split("\n");
    let skipHeader = true;
    let currentCue = [];
    for (let j = 0; j < lines.length; j++) {
      const line = lines[j];
      if (skipHeader) {
        if (line.trim() === "" || line.startsWith("WEBVTT")) {
          continue;
        }
        skipHeader = false;
      }
      if (line.includes("-->")) {
        const [start, end] = line.split("-->").map((s) => s.trim());
        const startSeconds = parseVTTTimestamp(start) + timeOffset;
        const endSeconds = parseVTTTimestamp(end) + timeOffset;
        currentCue.push(`${cueNumber}`);
        currentCue.push(`${formatVTTTimestamp(startSeconds)} --> ${formatVTTTimestamp(endSeconds)}`);
        cueNumber++;
      } else if (line.trim() === "") {
        if (currentCue.length > 0) {
          combinedVTT += currentCue.join("\n") + "\n\n";
          currentCue = [];
        }
      } else if (!line.match(/^\d+$/)) {
        currentCue.push(line);
      }
    }
    if (currentCue.length > 0) {
      combinedVTT += currentCue.join("\n") + "\n\n";
    }
    if (i < chunkDurations.length) {
      timeOffset += chunkDurations[i];
    }
  }
  return combinedVTT;
}
function cleanupChunks(chunkPaths) {
  try {
    if (chunkPaths.length > 0) {
      const chunksDir = path.dirname(chunkPaths[0]);
      chunkPaths.forEach((chunkPath) => {
        if (fs.existsSync(chunkPath)) {
          fs.unlinkSync(chunkPath);
        }
      });
      if (fs.existsSync(chunksDir)) {
        fs.rmdirSync(chunksDir);
      }
    }
  } catch (error) {
    console.error("Error cleaning up chunks:", error);
  }
}
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
    fs.writeFileSync(tempFilePath, buffer);
    return {
      success: true,
      filePath: tempFilePath
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to save recording"
    };
  }
});
function fileToDataURL(filePath) {
  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString("base64");
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".webm": "audio/webm",
    ".mp4": "audio/mp4",
    ".mpeg": "audio/mpeg",
    ".mpga": "audio/mpeg"
  };
  const mimeType = mimeTypes[ext] || "audio/mpeg";
  return `data:${mimeType};base64,${base64}`;
}
function jsonToVTT(jsonTranscript) {
  if (!jsonTranscript || !jsonTranscript.text) {
    return "WEBVTT\n\n" + (jsonTranscript?.text || "");
  }
  return "WEBVTT\n\n" + jsonTranscript.text;
}
function diarizedJsonToVTT(diarizedTranscript) {
  if (!diarizedTranscript || !diarizedTranscript.segments) {
    return "WEBVTT\n\n";
  }
  let vtt = "WEBVTT\n\n";
  let cueNumber = 1;
  for (const segment of diarizedTranscript.segments) {
    const start = formatVTTTimestamp(segment.start);
    const end = formatVTTTimestamp(segment.end);
    const speaker = segment.speaker || "Unknown";
    const text = segment.text || "";
    vtt += `${cueNumber}
`;
    vtt += `${start} --> ${end}
`;
    vtt += `[${speaker}] ${text}

`;
    cueNumber++;
  }
  return vtt;
}
function vttToPlainText(vtt) {
  if (!vtt) return "";
  return vtt.split("\n").filter((line) => {
    const trimmed = line.trim();
    return trimmed !== "" && !trimmed.startsWith("WEBVTT") && !trimmed.includes("-->") && !/^\d+$/.test(trimmed);
  }).join("\n").trim();
}
ipcMain.handle("transcribe-audio", async (event, filePath, apiKey, options) => {
  let chunkPaths = [];
  let convertedFilePath = null;
  const isLegacyCall = typeof options === "string";
  const model = isLegacyCall ? "whisper-1" : options?.model || "gpt-4o-transcribe";
  const prompt = isLegacyCall ? options : options?.prompt || null;
  const speakers = isLegacyCall ? null : options?.speakers || null;
  try {
    const openai = new OpenAI({ apiKey });
    let processFilePath = filePath;
    if (filePath.toLowerCase().endsWith(".webm")) {
      if (!ffmpegAvailable) {
        return {
          success: false,
          error: "WebM recordings require FFmpeg for conversion, which could not be loaded on this system.\n\nPlease try uploading an MP3 or WAV file instead, or try re-downloading the application."
        };
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("transcription-progress", {
          status: "converting",
          message: "Converting recording to MP3 format..."
        });
      }
      convertedFilePath = await convertToMP3(filePath);
      processFilePath = convertedFilePath;
    }
    const stats = fs.statSync(processFilePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    if (fileSizeInMB > 25) {
      if (!ffmpegAvailable) {
        if (convertedFilePath && fs.existsSync(convertedFilePath)) {
          fs.unlinkSync(convertedFilePath);
        }
        return {
          success: false,
          error: `File size is ${fileSizeInMB.toFixed(1)}MB, which exceeds the 25MB API limit.

Large file support requires FFmpeg, which could not be loaded on this system.

Please use a file smaller than 25MB, or try re-downloading the application.`
        };
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("transcription-progress", {
          status: "splitting",
          message: "Splitting large audio file into chunks..."
        });
      }
      chunkPaths = await splitAudioIntoChunks(processFilePath, 20);
      const chunkDurations = [];
      for (const chunkPath of chunkPaths) {
        const duration = await getAudioDuration(chunkPath);
        chunkDurations.push(duration);
      }
      const transcripts = [];
      for (let i = 0; i < chunkPaths.length; i++) {
        const chunkPath = chunkPaths[i];
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("transcription-progress", {
            status: "transcribing",
            message: `Transcribing chunk ${i + 1} of ${chunkPaths.length}...`,
            current: i + 1,
            total: chunkPaths.length
          });
        }
        let chunkPrompt = null;
        if (i === 0 && prompt) {
          chunkPrompt = prompt;
        } else if (i > 0 && transcripts[i - 1]) {
          const prevTranscript = transcripts[i - 1];
          const plainText = prevTranscript.split("\n").filter((line) => !line.includes("-->") && !line.startsWith("WEBVTT") && line.trim() !== "" && !/^\d+$/.test(line.trim())).join(" ").trim();
          const contextLength = 200;
          const contextText = plainText.slice(-contextLength);
          if (prompt) {
            chunkPrompt = `${prompt}

Previous context: ${contextText}`;
          } else {
            chunkPrompt = contextText;
          }
        }
        try {
          const transcriptionParams = {
            file: fs.createReadStream(chunkPath),
            model
          };
          if (model === "whisper-1") {
            transcriptionParams.response_format = "vtt";
            if (chunkPrompt) {
              transcriptionParams.prompt = chunkPrompt;
            }
          } else if (model === "gpt-4o-transcribe") {
            transcriptionParams.response_format = "json";
            if (chunkPrompt) {
              transcriptionParams.prompt = chunkPrompt;
            }
          } else if (model === "gpt-4o-transcribe-diarize") {
            transcriptionParams.response_format = "diarized_json";
            transcriptionParams.chunking_strategy = "auto";
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
          }
          const transcription = await openai.audio.transcriptions.create(transcriptionParams);
          transcripts.push(transcription);
        } catch (error) {
          console.error(`Error transcribing chunk ${i + 1}:`, error);
          transcripts.push(model === "whisper-1" ? "" : { text: "" });
        }
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("transcription-progress", {
          status: "combining",
          message: "Combining transcripts..."
        });
      }
      let combinedTranscript;
      let isDiarized = false;
      if (model === "whisper-1") {
        combinedTranscript = combineVTTTranscripts(transcripts, chunkDurations);
      } else if (model === "gpt-4o-transcribe") {
        const combinedText = transcripts.map((t) => t.text || "").join(" ");
        combinedTranscript = jsonToVTT({ text: combinedText });
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
        combinedTranscript = diarizedJsonToVTT({ segments: allSegments });
        isDiarized = true;
      }
      cleanupChunks(chunkPaths);
      if (convertedFilePath && fs.existsSync(convertedFilePath)) {
        fs.unlinkSync(convertedFilePath);
      }
      return {
        success: true,
        text: vttToPlainText(combinedTranscript),
        // Plain text for display
        transcript: combinedTranscript,
        // VTT format for download
        chunked: true,
        totalChunks: chunkPaths.length,
        isDiarized
      };
    } else {
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
            const dataURL = fileToDataURL(speaker.path);
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
        finalTranscript = jsonToVTT(transcription);
      } else if (model === "gpt-4o-transcribe-diarize") {
        finalTranscript = diarizedJsonToVTT(transcription);
        isDiarized = true;
      }
      if (convertedFilePath && fs.existsSync(convertedFilePath)) {
        fs.unlinkSync(convertedFilePath);
      }
      return {
        success: true,
        text: vttToPlainText(finalTranscript),
        // Plain text for display
        transcript: finalTranscript,
        // VTT format for download
        chunked: false,
        isDiarized
      };
    }
  } catch (error) {
    if (chunkPaths.length > 0) {
      cleanupChunks(chunkPaths);
    }
    if (convertedFilePath && fs.existsSync(convertedFilePath)) {
      try {
        fs.unlinkSync(convertedFilePath);
      } catch (cleanupError) {
        console.error("Error cleaning up converted file:", cleanupError);
      }
    }
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
