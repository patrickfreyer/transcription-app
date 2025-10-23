// ==================== SIDEBAR NAVIGATION ====================

const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarItems = document.querySelectorAll('.sidebar-item');
const views = document.querySelectorAll('.view');

// Sidebar collapse/expand
sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

// View switching
function switchView(viewName) {
  // Update active sidebar item
  sidebarItems.forEach(item => {
    if (item.dataset.view === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update active view
  views.forEach(view => {
    if (view.id === `${viewName}-view`) {
      view.classList.add('active');
    } else {
      view.classList.remove('active');
    }
  });

  // Load specific view data
  if (viewName === 'history') {
    loadHistory();
  } else if (viewName === 'settings') {
    loadSettings();
  }
}

// Add click handlers to sidebar items
sidebarItems.forEach(item => {
  item.addEventListener('click', () => {
    const viewName = item.dataset.view;
    switchView(viewName);
  });
});

// ==================== TRANSCRIBE VIEW ====================

// UI Elements
const uploadTab = document.getElementById('upload-tab');
const recordTab = document.getElementById('record-tab');
const uploadMode = document.getElementById('upload-mode');
const recordMode = document.getElementById('record-mode');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const fileSize = document.getElementById('file-size');
const recordingInfo = document.getElementById('recording-info');
const recordingName = document.getElementById('recording-name');
const recordingSize = document.getElementById('recording-size');
const startRecordBtn = document.getElementById('start-record-btn');
const stopRecordBtn = document.getElementById('stop-record-btn');
const recordStatus = document.getElementById('record-status');
const recordTimer = document.getElementById('record-timer');
const transcribeBtn = document.getElementById('transcribe-btn');
const errorMessage = document.getElementById('error-message');
const progressContainer = document.getElementById('progress-container');
const modelSelection = document.getElementById('model-selection');
const modelFast = document.getElementById('model-fast');
const modelDiarize = document.getElementById('model-diarize');
const speakerSection = document.getElementById('speaker-section');
const speakerHeader = document.getElementById('speaker-header');
const speakerBody = document.getElementById('speaker-body');
const speakerChevron = document.getElementById('speaker-chevron');
const speakerList = document.getElementById('speaker-list');
const addSpeakerBtn = document.getElementById('add-speaker-btn');
const speakerInput = document.getElementById('speaker-input');

let selectedFile = null;
let isSpeakerExpanded = false;
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = null;
let timerInterval = null;
let currentMode = 'upload';
let speakerReferences = [];
let currentSpeakerIndex = null;

// Tab Switching
uploadTab.addEventListener('click', () => switchMode('upload'));
recordTab.addEventListener('click', () => switchMode('record'));

function switchMode(mode) {
  currentMode = mode;

  uploadTab.classList.toggle('active', mode === 'upload');
  recordTab.classList.toggle('active', mode === 'record');

  uploadMode.style.display = mode === 'upload' ? 'block' : 'none';
  recordMode.style.display = mode === 'record' ? 'block' : 'none';

  selectedFile = null;
  transcribeBtn.style.display = 'none';
  fileInfo.classList.remove('show');
  recordingInfo.style.display = 'none';
  errorMessage.classList.remove('show');
  speakerSection.style.display = 'none';
  speakerReferences = [];
  updateSpeakerList();
  modelSelection.style.display = 'none';
}

// Model Selection
function updateModelDisplay() {
  const isDiarizeSelected = modelDiarize.checked;
  speakerSection.style.display = isDiarizeSelected ? 'block' : 'none';

  if (!isDiarizeSelected) {
    speakerReferences = [];
    updateSpeakerList();
  }
}

modelFast.addEventListener('change', updateModelDisplay);
modelDiarize.addEventListener('change', updateModelDisplay);

// Speaker Section
speakerHeader.addEventListener('click', () => {
  isSpeakerExpanded = !isSpeakerExpanded;
  speakerBody.classList.toggle('expanded', isSpeakerExpanded);
  speakerChevron.classList.toggle('expanded', isSpeakerExpanded);
});

addSpeakerBtn.addEventListener('click', () => {
  if (speakerReferences.length >= 4) {
    errorMessage.textContent = 'Maximum 4 speaker references allowed';
    errorMessage.classList.add('show');
    return;
  }
  speakerInput.click();
});

speakerInput.addEventListener('change', async (e) => {
  if (e.target.files.length > 0) {
    const file = e.target.files[0];

    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > 5) {
      errorMessage.textContent = 'Speaker reference files should be short (2-10 seconds)';
      errorMessage.classList.add('show');
      speakerInput.value = '';
      return;
    }

    const speakerName = await promptSpeakerName();
    if (!speakerName) {
      speakerInput.value = '';
      return;
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await window.electron.saveRecording(arrayBuffer);

    if (result.success) {
      speakerReferences.push({
        name: speakerName,
        path: result.filePath,
        originalName: file.name
      });
      updateSpeakerList();
      speakerInput.value = '';
      errorMessage.classList.remove('show');
    }
  }
});

function promptSpeakerName() {
  return new Promise((resolve) => {
    const name = prompt('Enter speaker name:');
    resolve(name ? name.trim() : null);
  });
}

function updateSpeakerList() {
  speakerList.innerHTML = '';

  speakerReferences.forEach((speaker, index) => {
    const item = document.createElement('div');
    item.className = 'speaker-item';
    item.innerHTML = `
      <div class="speaker-item-content">
        <div class="speaker-item-name">${speaker.name}</div>
        <div class="speaker-item-file">${speaker.originalName}</div>
      </div>
      <button class="speaker-item-remove" data-index="${index}">×</button>
    `;
    speakerList.appendChild(item);
  });

  document.querySelectorAll('.speaker-item-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.getAttribute('data-index'));
      speakerReferences.splice(index, 1);
      updateSpeakerList();
    });
  });

  addSpeakerBtn.disabled = speakerReferences.length >= 4;
}

// Upload Mode
dropZone.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleFile(e.target.files[0]);
  }
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');

  if (e.dataTransfer.files.length > 0) {
    handleFile(e.dataTransfer.files[0]);
  }
});

function handleFile(file) {
  errorMessage.classList.remove('show');

  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
  const acceptedExtensions = [
    '.mp3', '.wav', '.m4a', '.webm', '.mp4', '.mpeg', '.mpga',
  ];

  if (!acceptedExtensions.includes(fileExtension)) {
    errorMessage.textContent = 'Unsupported file type. Please use MP3, WAV, M4A, WEBM, or MP4.';
    errorMessage.classList.add('show');
    return;
  }

  selectedFile = file;

  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);
  fileInfo.classList.add('show');
  modelSelection.style.display = 'flex';
  updateModelDisplay();
  transcribeBtn.style.display = 'block';
}

// Record Mode
startRecordBtn.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

      stream.getTracks().forEach(track => track.stop());
      clearInterval(timerInterval);

      try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const result = await window.electron.saveRecording(arrayBuffer);

        if (result.success) {
          selectedFile = {
            path: result.filePath,
            name: 'recording.webm',
            size: audioBlob.size,
          };

          recordingSize.textContent = formatFileSize(audioBlob.size);
          recordingInfo.style.display = 'block';
          modelSelection.style.display = 'flex';
          updateModelDisplay();
          transcribeBtn.style.display = 'block';

          recordStatus.textContent = 'Recording complete';
          startRecordBtn.style.display = 'block';
          stopRecordBtn.style.display = 'none';
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        errorMessage.textContent = 'Failed to save recording: ' + error.message;
        errorMessage.classList.add('show');
        recordStatus.textContent = 'Ready to record';
        startRecordBtn.style.display = 'block';
        stopRecordBtn.style.display = 'none';
      }
    };

    mediaRecorder.start();
    recordingStartTime = Date.now();

    recordStatus.textContent = 'Recording...';
    startRecordBtn.style.display = 'none';
    stopRecordBtn.style.display = 'block';
    recordingInfo.style.display = 'none';
    transcribeBtn.style.display = 'none';

    timerInterval = setInterval(updateTimer, 1000);

  } catch (error) {
    errorMessage.textContent = 'Microphone access denied. Please enable microphone permissions.';
    errorMessage.classList.add('show');
  }
});

stopRecordBtn.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
});

function updateTimer() {
  const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');
  recordTimer.textContent = `${minutes}:${seconds}`;
}

// Utility function
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Transcription
const progressText = document.querySelector('.progress-text');
window.electron.onTranscriptionProgress((data) => {
  if (data.status === 'converting') {
    progressText.textContent = data.message || 'Converting audio format...';
  } else if (data.status === 'splitting') {
    progressText.textContent = data.message || 'Splitting large audio file...';
  } else if (data.status === 'transcribing') {
    if (data.current && data.total) {
      progressText.textContent = `${data.message} (${data.current}/${data.total})`;
    } else {
      progressText.textContent = data.message || 'Transcribing...';
    }
  } else if (data.status === 'combining') {
    progressText.textContent = data.message || 'Combining transcripts...';
  }
});

transcribeBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  errorMessage.classList.remove('show');
  progressContainer.classList.add('show');
  progressText.textContent = 'Transcribing your audio... This may take a moment.';
  transcribeBtn.disabled = true;
  transcribeBtn.textContent = 'Transcribing...';

  try {
    const apiKey = await window.electron.getApiKey();

    if (!apiKey) {
      throw new Error('API key not found. Please set up your API key first.');
    }

    const model = modelDiarize.checked ? 'gpt-4o-transcribe-diarize' : 'gpt-4o-transcribe';

    const result = await window.electron.transcribeAudio(
      selectedFile.path,
      apiKey,
      {
        model: model,
        speakers: speakerReferences.length > 0 ? speakerReferences : null
      }
    );

    if (result.success) {
      localStorage.setItem('transcript', result.transcript);
      localStorage.setItem('fileName', selectedFile.name);
      localStorage.setItem('transcriptModel', model);
      if (result.chunked) {
        localStorage.setItem('transcriptInfo', `Processed in ${result.totalChunks} chunks`);
      }
      if (result.isDiarized) {
        localStorage.setItem('isDiarized', 'true');
      }

      window.electron.navigate('results');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    errorMessage.textContent = error.message || 'Transcription failed';
    errorMessage.classList.add('show');
    progressContainer.classList.remove('show');
    transcribeBtn.disabled = false;
    transcribeBtn.textContent = 'Transcribe';
  }
});

// ==================== HISTORY VIEW ====================

async function loadHistory() {
  try {
    const result = await window.electron.getTranscriptionHistory();
    const historyGallery = document.getElementById('history-gallery-main');
    const historyEmpty = document.getElementById('history-empty-main');

    if (result.success && result.items.length > 0) {
      historyEmpty.style.display = 'none';
      historyGallery.style.display = 'grid';

      historyGallery.innerHTML = '';
      result.items.forEach(item => {
        const card = createHistoryCard(item);
        historyGallery.appendChild(card);
      });
    } else {
      historyEmpty.style.display = 'block';
      historyGallery.style.display = 'none';
    }
  } catch (error) {
    console.error('Failed to load history:', error);
  }
}

function createHistoryCard(item) {
  const card = document.createElement('div');
  card.className = 'history-card';

  const date = new Date(item.timestamp);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const modelLabel = item.model === 'gpt-4o-transcribe-diarize' ? 'Speaker ID' : 'Standard';

  card.innerHTML = `
    <div class="history-card-header">
      <div class="history-card-info">
        <div class="history-card-filename">${item.fileName}</div>
        <div class="history-card-date">${formattedDate}</div>
      </div>
      <button class="history-card-delete" onclick="event.stopPropagation();" data-id="${item.id}">×</button>
    </div>
    <div class="history-card-preview">${item.transcriptPreview}...</div>
    <div class="history-card-model">${modelLabel}</div>
  `;

  card.addEventListener('click', () => {
    localStorage.setItem('loadTranscriptionId', item.id);
    window.electron.navigate('results');
  });

  const deleteBtn = card.querySelector('.history-card-delete');
  deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (confirm(`Delete transcription "${item.fileName}"?`)) {
      try {
        await window.electron.deleteTranscription(item.id);
        await loadHistory();
      } catch (error) {
        console.error('Failed to delete:', error);
      }
    }
  });

  return card;
}

// ==================== SETTINGS VIEW ====================

const settingsForm = document.getElementById('settings-form');
const settingsApiKeyInput = document.getElementById('settings-api-key');
const settingsErrorMessage = document.getElementById('settings-error-message');
const settingsLoading = document.getElementById('settings-loading');
const settingsSubmitBtn = document.getElementById('settings-submit-btn');

async function loadSettings() {
  const apiKey = await window.electron.getApiKey();
  if (apiKey) {
    settingsApiKeyInput.value = apiKey;
  }
}

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const apiKey = settingsApiKeyInput.value.trim();

  if (!apiKey.startsWith('sk-')) {
    settingsErrorMessage.textContent = 'Invalid API key format. OpenAI API keys start with "sk-"';
    settingsErrorMessage.classList.add('show');
    return;
  }

  settingsErrorMessage.classList.remove('show');
  settingsLoading.classList.add('show');
  settingsSubmitBtn.disabled = true;
  settingsSubmitBtn.textContent = 'Validating...';

  try {
    const validationResult = await window.electron.validateApiKey(apiKey);

    if (validationResult.success) {
      await window.electron.saveApiKey(apiKey);

      settingsSubmitBtn.textContent = '✓ Saved!';
      settingsSubmitBtn.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';

      setTimeout(() => {
        settingsSubmitBtn.textContent = 'Save Changes';
        settingsSubmitBtn.style.background = '';
        settingsSubmitBtn.disabled = false;
        settingsLoading.classList.remove('show');
      }, 1500);
    } else {
      throw new Error(validationResult.error);
    }
  } catch (error) {
    settingsErrorMessage.textContent = error.message || 'Failed to validate API key';
    settingsErrorMessage.classList.add('show');
    settingsLoading.classList.remove('show');
    settingsSubmitBtn.disabled = false;
    settingsSubmitBtn.textContent = 'Save Changes';
  }
});

// ==================== INITIALIZATION ====================

// Check if API key exists on startup
async function initializeApp() {
  const apiKey = await window.electron.getApiKey();

  if (!apiKey) {
    // No API key, show settings view
    switchView('settings');
  } else {
    // Has API key, show transcribe view
    switchView('transcribe');
  }
}

// Initialize the app
initializeApp();
