import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import ModeSwitcher from './ModeSwitcher';
import DropZone from './DropZone';
import FileInfo from './FileInfo';
import Dropdown from '../Common/Dropdown';
import CollapsibleSection from './CollapsibleSection';
import RecordingInterface from './RecordingInterface';
import TranscribeButton from './TranscribeButton';
import RecentRecordingsSection from './RecentRecordingsSection';
import TranscriptViewer from '../Analysis/TranscriptViewer';
import MicrophoneSelector from './MicrophoneSelector';

const MODELS = [
  {
    id: 'whisper-1',
    name: 'Whisper',
    description: 'Fast and accurate transcription for general use cases',
  },
  {
    id: 'gpt-4o-transcribe',
    name: 'GPT-4o Transcribe',
    badge: 'Recommended',
    description: 'Enhanced accuracy with better context understanding',
  },
  {
    id: 'gpt-4o-transcribe-diarize',
    name: 'GPT-4o Transcribe (Diarized)',
    description: 'Auto-detects and labels different speakers (Speaker 1, Speaker 2, etc.)',
  },
];

function RecordingPanel({ isActive }) {
  const {
    apiKeyStatus,
    handleInteractionWithoutKey,
    summaryTemplates,
    selectedSummaryTemplate,
    setSelectedSummaryTemplate,
    setTranscription,
    switchTab,
    isTranscribing,
    setIsTranscribing,
    loadTranscripts,
    transcripts,
    setSelectedTranscriptId,
    toggleTranscriptSelection,
    isTranscriptSelected
  } = useApp();

  // State
  const [mode, setMode] = useState('record'); // 'record' or 'upload'
  const [selectedFile, setSelectedFile] = useState(null);
  const [hasRecording, setHasRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [selectedModel, setSelectedModel] = useState('gpt-4o-transcribe');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [transcriptionProgress, setTranscriptionProgress] = useState(null);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState(null);

  // Recording state
  const [recordingFilePath, setRecordingFilePath] = useState(null);
  const [mediaRecorderRef, setMediaRecorderRef] = useState(null);
  const [audioChunksRef, setAudioChunksRef] = useState([]);
  const [mediaStreamRef, setMediaStreamRef] = useState(null);
  const [recordingStartTime, setRecordingStartTime] = useState(null);

  // Local transcription results (for displaying on this tab)
  const [localTranscriptionResult, setLocalTranscriptionResult] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const isDisabled = apiKeyStatus !== 'valid';

  // Listen to transcription progress events
  useEffect(() => {
    const handleProgress = (progressData) => {
      console.log('Transcription progress:', progressData);
      setTranscriptionProgress(progressData);
    };

    if (window.electron?.onTranscriptionProgress) {
      window.electron.onTranscriptionProgress(handleProgress);
    }

    // Cleanup
    return () => {
      setTranscriptionProgress(null);
    };
  }, []);

  // Determine if audio is ready for transcription
  const audioReady = (mode === 'upload' && selectedFile) || (mode === 'record' && hasRecording);

  const handleDisabledClick = (e) => {
    if (isDisabled) {
      e.preventDefault();
      e.stopPropagation();
      handleInteractionWithoutKey();
    }
  };

  const handleFileSelect = (file) => {
    if (isDisabled) {
      handleInteractionWithoutKey();
      return;
    }
    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleModeChange = (newMode) => {
    if (isDisabled) {
      handleInteractionWithoutKey();
      return;
    }
    setMode(newMode);
    setSelectedFile(null);
    setHasRecording(false);
    setRecordingDuration(0);
    setIsRecording(false);
    setIsPaused(false);
    setRecordingFilePath(null);

    // Clean up any active recording
    if (mediaRecorderRef && mediaRecorderRef.state !== 'inactive') {
      mediaRecorderRef.stop();
    }
    if (mediaStreamRef) {
      mediaStreamRef.getTracks().forEach(track => track.stop());
    }
  };

  const handleStartRecording = async () => {
    if (isDisabled) {
      handleInteractionWithoutKey();
      return;
    }

    try {
      // Request microphone access with specific device if selected
      const audioConstraints = selectedMicrophoneId
        ? { deviceId: { exact: selectedMicrophoneId } }
        : true;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });

      // Capture start time in local variable to avoid closure issues
      const startTime = Date.now();

      // Create MediaRecorder
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks = [];

      // Set up data handler
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      // Set up stop handler
      recorder.onstop = async () => {
        // Create blob from chunks
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });

        // Stop all media tracks
        stream.getTracks().forEach(track => track.stop());

        try {
          // Convert to ArrayBuffer and save
          const arrayBuffer = await audioBlob.arrayBuffer();
          const result = await window.electron.saveRecording(arrayBuffer);

          if (result.success) {
            // Store file path and duration
            setRecordingFilePath(result.filePath);

            // Calculate duration using local startTime variable
            const duration = Math.floor((Date.now() - startTime) / 1000);
            setRecordingDuration(duration);
            setHasRecording(true);

            console.log('Recording saved:', result.filePath, 'Duration:', duration + 's');
          } else {
            throw new Error(result.error || 'Failed to save recording');
          }
        } catch (error) {
          console.error('Error saving recording:', error);
          alert(`Failed to save recording: ${error.message}`);
          setIsRecording(false);
          setIsPaused(false);
          setHasRecording(false);
        }
      };

      // Start recording
      recorder.start();
      setMediaRecorderRef(recorder);
      setAudioChunksRef(chunks);
      setMediaStreamRef(stream);
      setRecordingStartTime(startTime);
      setIsRecording(true);
      setIsPaused(false);
      setHasRecording(false);

      console.log('Started recording from microphone');
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Microphone access denied. Please enable microphone permissions.');
    }
  };

  const handlePauseRecording = () => {
    if (mediaRecorderRef && mediaRecorderRef.state === 'recording') {
      mediaRecorderRef.pause();
      setIsPaused(true);
      console.log('Recording paused');
    }
  };

  const handleResumeRecording = () => {
    if (mediaRecorderRef && mediaRecorderRef.state === 'paused') {
      mediaRecorderRef.resume();
      setIsPaused(false);
      console.log('Recording resumed');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef && mediaRecorderRef.state !== 'inactive') {
      mediaRecorderRef.stop();
      setIsRecording(false);
      setIsPaused(false);
      console.log('Recording stopped');
      // Note: hasRecording will be set in recorder.onstop after save completes
    }
  };

  const handleRecordAgain = () => {
    setHasRecording(false);
    setRecordingDuration(0);
    setIsPaused(false);
    setRecordingFilePath(null);
  };

  const handleTranscribeAnother = () => {
    // Clear results and return to recording interface
    setShowResults(false);
    setLocalTranscriptionResult(null);
    setHasRecording(false);
    setSelectedFile(null);
    setRecordingDuration(0);
    setRecordingFilePath(null);
    setIsRecording(false);
    setIsPaused(false);
  };

  const handleTranscribe = async () => {
    if (isDisabled) {
      handleInteractionWithoutKey();
      return;
    }

    setIsProcessing(true);
    setIsTranscribing(true);

    try {
      // Get API key
      const apiKeyResult = await window.electron.getApiKeySecure();
      if (!apiKeyResult.success || !apiKeyResult.apiKey) {
        throw new Error('API key not found');
      }

      const apiKey = apiKeyResult.apiKey;

      // Get file path based on mode
      let filePath;
      if (mode === 'upload') {
        filePath = selectedFile?.path;
      } else if (mode === 'record') {
        filePath = recordingFilePath;
      }

      if (!filePath) {
        throw new Error('No audio file selected');
      }

      // Build transcription options
      const transcriptionOptions = {
        model: selectedModel,
        prompt: prompt || undefined,
        language: undefined // Could add language selection later
      };

      // Step 1: Transcribe audio
      console.log('Starting transcription...');
      const transcriptionResult = await window.electron.transcribeAudio(
        filePath,
        apiKey,
        transcriptionOptions
      );

      if (!transcriptionResult.success) {
        throw new Error(transcriptionResult.error || 'Transcription failed');
      }

      // Backend now returns both 'text' (plain text) and 'transcript' (VTT format)
      const rawTranscript = transcriptionResult.text;
      let summary = null;
      let summaryTemplateName = null;

      // Step 2: Generate summary if template has a prompt (skip only "Default" template with no prompt)
      const template = summaryTemplates.find(t => t.id === selectedSummaryTemplate);

      if (template && template.prompt && template.prompt.trim().length > 0) {
        console.log('Generating summary using template:', template.name);

        try {
          // Call OpenAI Chat API to generate summary
          const summaryResult = await window.electron.generateSummary(
            rawTranscript,
            template.prompt,
            apiKey
          );

          if (summaryResult.success) {
            summary = summaryResult.summary;
            summaryTemplateName = template.name;
            console.log('✓ Summary generated successfully');
          } else {
            console.error('Summary generation failed:', summaryResult.error);
            alert(`Summary generation failed: ${summaryResult.error || 'Unknown error'}`);
            // Continue with just the raw transcript
          }
        } catch (summaryError) {
          console.error('Error generating summary:', summaryError);
          alert(`Error generating summary: ${summaryError.message}`);
          // Continue with just the raw transcript
        }
      } else {
        console.log('No summary template selected or template has no prompt');
      }

      // Step 3: Generate smart name for recordings (not uploads)
      let fileName = selectedFile?.name || 'Recording';

      if (!selectedFile && rawTranscript) {
        // This is a recording (not an upload), generate smart name
        console.log('🎯 Recording detected - generating AI-powered name...');
        console.log('Transcript preview:', rawTranscript.substring(0, 100) + '...');

        if (window.electron && window.electron.generateTranscriptName) {
          try {
            console.log('Calling generateTranscriptName API...');
            const nameResult = await window.electron.generateTranscriptName(rawTranscript, apiKey);
            console.log('Name generation result:', nameResult);

            if (nameResult.success && nameResult.name) {
              fileName = nameResult.name;
              console.log(`✅ Generated name: "${fileName}"${nameResult.fallback ? ' (fallback)' : ''}`);
            } else {
              console.warn('Name generation succeeded but no name returned');
            }
          } catch (nameError) {
            console.error('❌ Failed to generate name:', nameError);
            // Keep default "Recording"
          }
        } else {
          console.error('❌ generateTranscriptName method not available on window.electron');
          console.log('Available methods:', Object.keys(window.electron || {}));
        }
      } else {
        console.log('Skipping auto-naming:', selectedFile ? 'Upload file detected' : 'No transcript');
      }

      // Step 4: Store the transcription result
      const result = {
        rawTranscript,
        summary,
        summaryTemplate: summaryTemplateName,
        model: selectedModel,
        fileName,
        duration: recordingDuration || 0,
        timestamp: Date.now(),
        vttTranscript: transcriptionResult.transcript, // VTT format
        isDiarized: transcriptionResult.isDiarized || false,
        fileSize: selectedFile ? selectedFile.size / (1024 * 1024) : null // Size in MB
      };

      // Store in global context for Analysis tab
      setTranscription(result);

      // Store locally and show results on this tab
      setLocalTranscriptionResult(result);
      setShowResults(true);

      // ✅ AUTO-SAVE: Save transcript to Analysis tab storage
      try {
        const autoSaveResult = await window.electron.saveTranscriptToAnalysis(result);
        if (autoSaveResult.success) {
          console.log('✓ Transcript auto-saved to Analysis:', autoSaveResult.transcriptId);

          // Reload transcripts in Analysis tab so it appears immediately
          await loadTranscripts();
          console.log('✓ Transcripts reloaded in Analysis tab');
        } else {
          console.warn('Failed to auto-save transcript:', autoSaveResult.error);
        }
      } catch (autoSaveError) {
        console.error('Error auto-saving transcript:', autoSaveError);
        // Don't block - user can still view in Recording tab
      }

      console.log('Transcription complete!');

    } catch (error) {
      console.error('Transcription error:', error);
      alert(`Transcription failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setIsTranscribing(false);
    }
  };

  const canTranscribe = !isDisabled && audioReady && !isRecording;

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-300 flex flex-col ${
        isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      role="tabpanel"
      aria-labelledby="tab-recording"
    >
      {/* Scrollable Main Content */}
      <div className="flex-1 overflow-auto min-h-0">
        {showResults && localTranscriptionResult ? (
          /* Results View */
          <TranscriptViewer
            transcription={localTranscriptionResult}
            onTranscribeAnother={handleTranscribeAnother}
            showTranscribeAnotherButton={true}
          />
        ) : (
        <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-8 lg:py-10 pb-12 space-y-8">
          {/* Mode Switcher */}
          <ModeSwitcher
            activeMode={mode}
            onModeChange={handleModeChange}
            disabled={isDisabled}
          />

          {/* Record Mode */}
          {mode === 'record' && (
            <RecordingInterface
              isRecording={isRecording}
              isPaused={isPaused}
              hasRecording={hasRecording}
              recordingDuration={recordingDuration}
              onStartRecording={handleStartRecording}
              onPauseRecording={handlePauseRecording}
              onResumeRecording={handleResumeRecording}
              onStopRecording={handleStopRecording}
              onRecordAgain={handleRecordAgain}
              disabled={isDisabled}
              selectedMicrophoneId={selectedMicrophoneId}
              onMicrophoneChange={setSelectedMicrophoneId}
            />
          )}

          {/* Upload Mode */}
          {mode === 'upload' && (
            <>
              {/* Drop Zone or File Info */}
              {!selectedFile ? (
                <DropZone onFileSelect={handleFileSelect} disabled={isDisabled} />
              ) : (
                <FileInfo
                  file={selectedFile}
                  onRemove={handleRemoveFile}
                  disabled={isDisabled}
                />
              )}
            </>
          )}

          {/* Model Selection & Advanced Options - Only show when audio is ready */}
          {audioReady && (
            <div className="animate-slide-down space-y-8">
              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm uppercase">
                  <span className="bg-surface-tertiary px-6 text-primary font-bold tracking-wide">Configure Transcription</span>
                </div>
              </div>

              {/* Model Selection */}
              <div className="space-y-3">
                <label className="block">
                  <span className="text-lg font-bold text-text-dark mb-3 block flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v20M2 12h20"/>
                      <circle cx="12" cy="12" r="9"/>
                    </svg>
                    Transcription Model
                  </span>
                  <Dropdown
                    options={MODELS}
                    value={selectedModel}
                    onChange={setSelectedModel}
                    disabled={isDisabled}
                    placeholder="Select a transcription model"
                  />
                </label>
              </div>

              {/* Summary Type Selection */}
              <div className="space-y-3">
                <label className="block">
                  <span className="text-lg font-bold text-text-dark mb-3 block flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                    Summary Type
                  </span>
                  <Dropdown
                    options={summaryTemplates.map(template => ({
                      id: template.id,
                      name: template.name,
                      description: template.description,
                      badge: template.id === 'default' ? null : undefined
                    }))}
                    value={selectedSummaryTemplate}
                    onChange={setSelectedSummaryTemplate}
                    disabled={isDisabled}
                    placeholder="Select summary type"
                  />
                </label>
              </div>

              {/* Advanced Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-text-dark flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
                  </svg>
                  Advanced Options
                </h3>

                {/* Prompt Section */}
                <CollapsibleSection
                  title="Custom Prompt (Optional)"
                  isOpen={promptOpen}
                  onToggle={() => !isDisabled && setPromptOpen(!promptOpen)}
                  disabled={isDisabled}
                >
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isDisabled}
                    placeholder="Provide context or specific terms to improve accuracy..."
                    className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-surface text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none transition-all"
                    rows={4}
                  />
                  <p className="mt-3 text-xs text-text-gray leading-relaxed">
                    Help the model understand industry-specific terms, names, or context to improve transcription accuracy
                  </p>
                </CollapsibleSection>

                {/* Diarization Info (only for diarized model) */}
                {selectedModel === 'gpt-4o-transcribe-diarize' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4" />
                        <path d="M12 8h.01" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-bold text-blue-900 mb-1">Speaker Diarization Enabled</h4>
                        <p className="text-xs text-blue-700 leading-relaxed">
                          This model will automatically detect and label different speakers in your audio as "Speaker 1", "Speaker 2", etc. Each speaker's dialogue will be clearly identified in the transcript.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Transcribe Button */}
              <div className="pt-4">
                <TranscribeButton
                  onClick={handleTranscribe}
                  disabled={!canTranscribe}
                  isProcessing={isProcessing}
                />
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Recent Recordings Section - Fixed at Bottom (hide when showing results) */}
      {!showResults && (
      <div className="flex-shrink-0 border-t border-border bg-gradient-to-b from-surface to-surface-tertiary">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 py-4 sm:py-5">
          <RecentRecordingsSection
            transcripts={transcripts.slice(0, 4)}
            onTranscriptClick={(transcriptId) => {
              setSelectedTranscriptId(transcriptId);
              if (!isTranscriptSelected(transcriptId)) {
                toggleTranscriptSelection(transcriptId);
              }
              switchTab('analysis');
            }}
          />
        </div>
      </div>
      )}

      {/* Disabled State Helper */}
      {isDisabled && (
        <div
          className="absolute inset-0 bg-transparent cursor-pointer"
          onClick={handleDisabledClick}
        />
      )}
    </div>
  );
}

export default RecordingPanel;
