import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

// Default summary templates
const DEFAULT_TEMPLATES = [
  {
    id: 'default',
    name: 'Default',
    description: 'Full transcription without additional summarization',
    prompt: '',
    isDefault: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'detailed-summary',
    name: 'Detailed Summary',
    description: 'Comprehensive summary with all key points, decisions, and action items',
    prompt: 'Please provide a detailed summary of this transcription. Include:\n\n1. Main Topics: List all major topics discussed\n2. Key Points: Summarize the most important points for each topic\n3. Decisions Made: Highlight any decisions that were made\n4. Action Items: List any tasks or action items mentioned\n5. Next Steps: Note any planned next steps or follow-ups\n\nFormat the summary in a clear, structured way with bullet points.',
    isDefault: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'concise-notes',
    name: 'Concise Notes',
    description: 'Brief bullet-point summary of main topics and takeaways',
    prompt: 'Please provide a concise summary of this transcription in bullet-point format:\n\n• Keep it brief and to the point\n• Focus only on the most important information\n• Use clear, simple language\n• Limit to 5-7 key takeaways maximum\n\nFormat as a simple bulleted list.',
    isDefault: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

export function AppProvider({ children }) {
  const [currentTab, setCurrentTab] = useState('recording');
  const [apiKeyStatus, setApiKeyStatus] = useState('missing'); // 'missing', 'valid', 'loading'
  const [showAPIKeyModal, setShowAPIKeyModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(true); // Default true, will check on mount
  const [platform, setPlatform] = useState('darwin');
  const [shouldPulseAPIButton, setShouldPulseAPIButton] = useState(false);
  const [summaryTemplates, setSummaryTemplates] = useState(DEFAULT_TEMPLATES);
  const [selectedSummaryTemplate, setSelectedSummaryTemplate] = useState('detailed-summary');
  const [transcriptionResult, setTranscriptionResult] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Transcript management state
  const [transcripts, setTranscripts] = useState([]);
  const [selectedTranscriptId, setSelectedTranscriptId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'starred' | 'recent'

  // Left panel navigation state (for 2-column redesign)
  const [leftPanelView, setLeftPanelView] = useState('list'); // 'list' | 'detail'
  const [detailViewTranscriptId, setDetailViewTranscriptId] = useState(null);

  // Chat management state
  const [chatHistory, setChatHistory] = useState({}); // Object keyed by transcriptId
  const [selectedContextIds, setSelectedContextIds] = useState([]); // Array of transcript IDs
  // const [searchAllTranscripts, setSearchAllTranscripts] = useState(false); // RAG mode toggle - DISABLED
  const searchAllTranscripts = false; // Always false - just dump all into context
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(true);
  const [isChatStreaming, setIsChatStreaming] = useState(false);

  // Right panel view mode state
  const [rightPanelView, setRightPanelView] = useState('summary'); // 'transcript' | 'summary' | 'chat'

  // Computed values
  const selectedTranscript = transcripts.find(t => t.id === selectedTranscriptId) || null;
  const detailViewTranscript = transcripts.find(t => t.id === detailViewTranscriptId) || null;

  // Get current chat messages based on active chat key
  const chatKey = selectedTranscriptId || '__multi_transcript_chat__';
  const currentChatMessages = chatHistory[chatKey]?.messages || [];

  // Transcript Management Functions
  const loadTranscripts = async () => {
    const result = await window.electron.getTranscripts();
    if (result.success) {
      setTranscripts(result.transcripts || []);
    }
  };

  const saveTranscript = async (transcriptData) => {
    const newTranscript = {
      id: `transcript-${Date.now()}`,
      ...transcriptData,
      starred: false,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const updatedTranscripts = [newTranscript, ...transcripts];
    setTranscripts(updatedTranscripts);

    await window.electron.saveTranscripts(updatedTranscripts);
    return newTranscript.id;
  };

  // Left Panel Navigation Functions
  const openTranscriptDetail = (transcriptId) => {
    setDetailViewTranscriptId(transcriptId);
    setLeftPanelView('detail');
  };

  const closeTranscriptDetail = () => {
    setLeftPanelView('list');
    setDetailViewTranscriptId(null);
  };

  const deleteTranscript = async (transcriptId) => {
    const updatedTranscripts = transcripts.filter(t => t.id !== transcriptId);
    setTranscripts(updatedTranscripts);

    // Also delete associated chat history
    const updatedChatHistory = { ...chatHistory };
    delete updatedChatHistory[transcriptId];
    setChatHistory(updatedChatHistory);

    await window.electron.saveTranscripts(updatedTranscripts);
    await window.electron.saveChatHistory(updatedChatHistory);

    if (selectedTranscriptId === transcriptId) {
      setSelectedTranscriptId(null);
    }

    // If deleting the transcript in detail view, close detail view
    if (detailViewTranscriptId === transcriptId) {
      closeTranscriptDetail();
    }
  };

  const toggleStarTranscript = async (transcriptId) => {
    const updatedTranscripts = transcripts.map(t =>
      t.id === transcriptId ? { ...t, starred: !t.starred, updatedAt: Date.now() } : t
    );
    setTranscripts(updatedTranscripts);
    await window.electron.saveTranscripts(updatedTranscripts);
  };

  const renameTranscript = async (transcriptId, newName) => {
    if (!newName || !newName.trim()) {
      return false;
    }

    const trimmedName = newName.trim();
    const updatedTranscripts = transcripts.map(t =>
      t.id === transcriptId ? { ...t, fileName: trimmedName, updatedAt: Date.now() } : t
    );
    setTranscripts(updatedTranscripts);
    await window.electron.saveTranscripts(updatedTranscripts);
    return true;
  };

  // Multi-Selection Functions
  const MAX_SELECTED_TRANSCRIPTS = 10;

  const toggleTranscriptSelection = (transcriptId) => {
    const isCurrentlySelected = selectedContextIds.includes(transcriptId);

    if (isCurrentlySelected) {
      // Uncheck: remove from selection
      setSelectedContextIds(selectedContextIds.filter(id => id !== transcriptId));

      // RAG mode disabled - no need to update
      // if (searchAllTranscripts) {
      //   setSearchAllTranscripts(false);
      // }
    } else {
      // Check: add to selection
      // No limit - just dump everything into context
      // if (selectedContextIds.length >= MAX_SELECTED_TRANSCRIPTS) {
      //   alert(`You can select up to ${MAX_SELECTED_TRANSCRIPTS} transcripts individually. Use "Select All" for more.`);
      //   return;
      // }
      // Add to selection
      setSelectedContextIds([...selectedContextIds, transcriptId]);
    }
  };

  const selectAllVisibleTranscripts = (visibleTranscriptIds) => {
    // Just select all visible transcripts - dump into context
    setSelectedContextIds(visibleTranscriptIds);

    // RAG mode disabled
    // if (visibleTranscriptIds.length > MAX_SELECTED_TRANSCRIPTS) {
    //   setSearchAllTranscripts(true);
    // } else {
    //   setSearchAllTranscripts(false);
    // }
  };

  const clearAllSelections = () => {
    setSelectedContextIds([]);
    // setSearchAllTranscripts(false); // RAG mode disabled
  };

  const isTranscriptSelected = (transcriptId) => {
    return selectedContextIds.includes(transcriptId);
  };

  // Chat Management Functions
  const loadChatHistory = async () => {
    const result = await window.electron.getChatHistory();
    if (result.success) {
      setChatHistory(result.chatHistory || {});
    }
  };

  const sendChatMessage = async (messageContent) => {
    // Allow sending if we have context selected (selectedTranscriptId OR selectedContextIds)
    if ((!selectedTranscriptId && selectedContextIds.length === 0) || isChatStreaming) return;

    const userMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: "user",
      content: messageContent,
      timestamp: Date.now(),
      contextUsed: []
    };

    // Add user message to chat (but NOT the assistant message yet)
    const updatedMessages = [...currentChatMessages, userMessage];

    // Use special key when no specific transcript selected (multi-select)
    const chatKey = selectedTranscriptId || '__multi_transcript_chat__';

    // Update chat history with only user message
    let workingChatHistory = {
      ...chatHistory,
      [chatKey]: {
        transcriptId: chatKey,
        messages: updatedMessages,
        createdAt: chatHistory[chatKey]?.createdAt || Date.now(),
        updatedAt: Date.now()
      }
    };
    setChatHistory(workingChatHistory);

    // Create assistant message metadata (but don't add to chat yet)
    const assistantMessageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const contextIds = selectedContextIds.length > 0 ? selectedContextIds : (selectedTranscriptId ? [selectedTranscriptId] : []);

    const placeholderAssistantMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      contextUsed: contextIds
    };

    // Build context from selected transcripts
    const contextTranscripts = transcripts.filter(t => contextIds.includes(t.id));
    const systemPrompt = buildSystemPrompt(contextTranscripts);

    // Set up streaming listeners
    setIsChatStreaming(true);

    let streamedContent = "";
    let tokenCounter = 0;

    // Store cleanup functions to prevent memory leaks
    let cleanupToken = null;
    let cleanupComplete = null;
    let cleanupError = null;

    // Token callback
    const handleToken = (data) => {
      tokenCounter++;
      streamedContent += data.token;

      // Update the assistant message with accumulated content
      const updatedAssistantMessage = {
        ...placeholderAssistantMessage,
        content: streamedContent
      };

      const updatedMessagesWithStream = [...updatedMessages, updatedAssistantMessage];

      workingChatHistory = {
        ...chatHistory,
        [chatKey]: {
          transcriptId: chatKey,
          messages: updatedMessagesWithStream,
          createdAt: chatHistory[chatKey]?.createdAt || Date.now(),
          updatedAt: Date.now()
        }
      };
      setChatHistory(workingChatHistory);
    };

    // Complete callback with cleanup
    const handleComplete = async (data) => {
      console.log('[FRONTEND] Stream complete. Total tokens received:', tokenCounter);
      console.log('[FRONTEND] Final message length:', data.message?.length);
      setIsChatStreaming(false);

      // Final update with complete message
      const finalAssistantMessage = {
        ...placeholderAssistantMessage,
        content: data.message,
        contextUsed: data.metadata?.contextUsed || contextIds
      };

      const finalMessages = [...updatedMessages, finalAssistantMessage];
      const finalChatHistory = {
        ...chatHistory,
        [chatKey]: {
          transcriptId: chatKey,
          messages: finalMessages,
          createdAt: chatHistory[chatKey]?.createdAt || Date.now(),
          updatedAt: Date.now()
        }
      };

      setChatHistory(finalChatHistory);
      await window.electron.saveChatHistory(finalChatHistory);

      // Clean up listeners using cleanup functions
      if (cleanupToken) cleanupToken();
      if (cleanupComplete) cleanupComplete();
      if (cleanupError) cleanupError();
    };

    // Error callback with cleanup
    const handleError = (data) => {
      console.error('[FRONTEND] Chat stream error:', data.error);
      setIsChatStreaming(false);

      // Remove placeholder message on error
      const errorChatHistory = {
        ...chatHistory,
        [chatKey]: {
          transcriptId: chatKey,
          messages: updatedMessages,
          createdAt: chatHistory[chatKey]?.createdAt || Date.now(),
          updatedAt: Date.now()
        }
      };
      setChatHistory(errorChatHistory);

      // Clean up listeners using cleanup functions
      if (cleanupToken) cleanupToken();
      if (cleanupComplete) cleanupComplete();
      if (cleanupError) cleanupError();
    };

    console.log('[FRONTEND] Registering stream listeners...');

    // Register listeners and store cleanup functions
    cleanupToken = window.electron.onChatStreamToken(handleToken);
    cleanupComplete = window.electron.onChatStreamComplete(handleComplete);
    cleanupError = window.electron.onChatStreamError(handleError);

    console.log('[FRONTEND] Starting chat stream...');
    console.log('[FRONTEND] Context IDs:', contextIds);
    console.log('[FRONTEND] Search All Transcripts:', searchAllTranscripts);

    // Start streaming
    window.electron.chatWithAIStream(
      updatedMessages,
      systemPrompt,
      contextIds,
      searchAllTranscripts
    );
  };

  const clearChatHistory = async (transcriptId) => {
    const updatedChatHistory = { ...chatHistory };
    delete updatedChatHistory[transcriptId];
    setChatHistory(updatedChatHistory);
    await window.electron.saveChatHistory(updatedChatHistory);
  };

  const buildSystemPrompt = (contextTranscripts) => {
    let prompt = "You are an AI assistant helping to analyze audio transcripts.\n\n";

    if (contextTranscripts.length === 0) {
      prompt += "No transcripts are currently loaded. Ask the user to select transcripts to analyze.";
    } else {
      prompt += `You have access to ${contextTranscripts.length} transcript(s):\n\n`;

      contextTranscripts.forEach((transcript, index) => {
        prompt += `--- Transcript ${index + 1}: ${transcript.fileName} ---\n`;
        prompt += `Duration: ${Math.floor(transcript.duration / 60)}:${(transcript.duration % 60).toString().padStart(2, '0')}\n`;
        prompt += `Model: ${transcript.model}\n`;
        if (transcript.summary) {
          prompt += `Summary: ${transcript.summary}\n\n`;
        }
        prompt += `Full Transcript:\n${transcript.rawTranscript}\n\n`;
      });

      prompt += "Instructions:\n";
      prompt += "- Answer questions accurately based on the transcript content above.\n";
      prompt += "- If the answer isn't in the transcripts, say so clearly.\n";
      prompt += "- Cite specific speakers or sections when relevant.\n";
      prompt += "- Be concise but thorough.\n";
    }

    return prompt;
  };

  useEffect(() => {
    // Initialize platform detection
    if (window.electron?.platform) {
      setPlatform(window.electron.platform);
    }

    // Check disclaimer acceptance on startup
    checkDisclaimerStatus();

    // Check for existing API key on startup
    checkAPIKey();

    // Load summary templates
    loadTemplates();

    // Load transcripts and chat history
    loadTranscripts();
    loadChatHistory();

    // Listen for API key status updates from main process
    if (window.electron?.onApiKeyStatus) {
      window.electron.onApiKeyStatus((status) => {
        setApiKeyStatus(status);
      });
    }
  }, []);

  const checkDisclaimerStatus = async () => {
    try {
      const result = await window.electron.getDisclaimerStatus();
      if (result.success && result.accepted) {
        setHasAcceptedDisclaimer(true);
      } else {
        setHasAcceptedDisclaimer(false);
        setShowDisclaimerModal(true);
      }
    } catch (error) {
      console.error('Error checking disclaimer status:', error);
      // If error, show disclaimer to be safe
      setHasAcceptedDisclaimer(false);
      setShowDisclaimerModal(true);
    }
  };

  const acceptDisclaimer = async () => {
    try {
      await window.electron.setDisclaimerAccepted();
      setHasAcceptedDisclaimer(true);
      setShowDisclaimerModal(false);
    } catch (error) {
      console.error('Error accepting disclaimer:', error);
    }
  };

  const openDisclaimerModal = () => {
    setShowDisclaimerModal(true);
  };

  const closeDisclaimerModal = () => {
    // Only allow closing if already accepted (for review mode)
    if (hasAcceptedDisclaimer) {
      setShowDisclaimerModal(false);
    }
  };

  const checkAPIKey = async () => {
    try {
      setApiKeyStatus('loading');
      const result = await window.electron.getApiKeySecure();

      if (result.success && result.apiKey) {
        // Validate the key
        const validation = await window.electron.validateApiKey(result.apiKey);

        if (validation.success) {
          setApiKeyStatus('valid');
        } else {
          setApiKeyStatus('missing');
        }
      } else {
        setApiKeyStatus('missing');
      }
    } catch (error) {
      console.error('Error checking API key:', error);
      setApiKeyStatus('missing');
    }
  };

  const switchTab = (tabName) => {
    if (currentTab !== tabName) {
      setCurrentTab(tabName);
    }
  };

  const openAPIKeyModal = () => {
    setShowAPIKeyModal(true);
  };

  const closeAPIKeyModal = () => {
    setShowAPIKeyModal(false);
  };

  const updateAPIKeyStatus = (status) => {
    setApiKeyStatus(status);
  };

  const handleInteractionWithoutKey = () => {
    // Open the API key modal directly so user can configure their key
    openAPIKeyModal();
  };

  // Settings Modal functions
  const openSettingsModal = () => {
    setShowSettingsModal(true);
  };

  const closeSettingsModal = () => {
    setShowSettingsModal(false);
  };

  // Template Management functions
  const loadTemplates = async () => {
    try {
      // Load custom templates from electron-store
      const result = await window.electron.getTemplates();

      if (result.success && result.templates && result.templates.length > 0) {
        // Merge default templates with custom templates
        const customTemplates = result.templates.filter(t => !t.isDefault);
        setSummaryTemplates([...DEFAULT_TEMPLATES, ...customTemplates]);
      } else {
        // No custom templates, use defaults
        setSummaryTemplates(DEFAULT_TEMPLATES);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      // Fall back to defaults
      setSummaryTemplates(DEFAULT_TEMPLATES);
    }
  };

  const saveTemplates = async (templates) => {
    try {
      // Only save custom templates (not default ones)
      const customTemplates = templates.filter(t => !t.isDefault);
      await window.electron.saveTemplates(customTemplates);
    } catch (error) {
      console.error('Error saving templates:', error);
    }
  };

  const addTemplate = (templateData) => {
    const newTemplate = {
      id: `custom-${Date.now()}`,
      name: templateData.name,
      description: templateData.description,
      prompt: templateData.prompt,
      isDefault: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const updatedTemplates = [...summaryTemplates, newTemplate];
    setSummaryTemplates(updatedTemplates);
    saveTemplates(updatedTemplates);
  };

  const updateTemplate = (id, updates) => {
    const updatedTemplates = summaryTemplates.map(template => {
      if (template.id === id && !template.isDefault) {
        return {
          ...template,
          ...updates,
          updatedAt: Date.now()
        };
      }
      return template;
    });

    setSummaryTemplates(updatedTemplates);
    saveTemplates(updatedTemplates);
  };

  const deleteTemplate = (id) => {
    const template = summaryTemplates.find(t => t.id === id);

    // Don't allow deletion of default templates
    if (template?.isDefault) {
      return;
    }

    const updatedTemplates = summaryTemplates.filter(t => t.id !== id);
    setSummaryTemplates(updatedTemplates);
    saveTemplates(updatedTemplates);

    // If the deleted template was selected, switch to default
    if (selectedSummaryTemplate === id) {
      setSelectedSummaryTemplate('default');
    }
  };

  // Transcription Management
  const setTranscription = (result) => {
    setTranscriptionResult(result);
  };

  const clearTranscription = () => {
    setTranscriptionResult(null);
  };

  const value = {
    currentTab,
    switchTab,
    apiKeyStatus,
    updateAPIKeyStatus,
    showAPIKeyModal,
    openAPIKeyModal,
    closeAPIKeyModal,
    showSettingsModal,
    openSettingsModal,
    closeSettingsModal,
    showDisclaimerModal,
    hasAcceptedDisclaimer,
    openDisclaimerModal,
    closeDisclaimerModal,
    acceptDisclaimer,
    platform,
    checkAPIKey,
    shouldPulseAPIButton,
    handleInteractionWithoutKey,
    summaryTemplates,
    selectedSummaryTemplate,
    setSelectedSummaryTemplate,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    transcriptionResult,
    isTranscribing,
    setIsTranscribing,
    setTranscription,
    clearTranscription,
    // Transcript management
    transcripts,
    selectedTranscriptId,
    setSelectedTranscriptId,
    searchQuery,
    setSearchQuery,
    filterMode,
    setFilterMode,
    selectedTranscript,
    loadTranscripts,
    saveTranscript,
    deleteTranscript,
    toggleStarTranscript,
    renameTranscript,
    // Left panel navigation
    leftPanelView,
    detailViewTranscriptId,
    detailViewTranscript,
    openTranscriptDetail,
    closeTranscriptDetail,
    // Multi-selection
    toggleTranscriptSelection,
    selectAllVisibleTranscripts,
    clearAllSelections,
    isTranscriptSelected,
    // Chat management
    chatHistory,
    selectedContextIds,
    setSelectedContextIds,
    searchAllTranscripts, // Always false - RAG disabled
    isChatPanelOpen,
    setIsChatPanelOpen,
    isChatStreaming,
    currentChatMessages,
    loadChatHistory,
    sendChatMessage,
    clearChatHistory,
    // Right panel view mode
    rightPanelView,
    setRightPanelView,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
