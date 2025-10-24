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

  // Chat management state
  const [chatHistory, setChatHistory] = useState({}); // Object keyed by transcriptId
  const [selectedContextIds, setSelectedContextIds] = useState([]); // Array of transcript IDs
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(true);
  const [isChatStreaming, setIsChatStreaming] = useState(false);

  // Computed values
  const selectedTranscript = transcripts.find(t => t.id === selectedTranscriptId) || null;
  const currentChatMessages = selectedTranscriptId ? (chatHistory[selectedTranscriptId]?.messages || []) : [];

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
  };

  const toggleStarTranscript = async (transcriptId) => {
    const updatedTranscripts = transcripts.map(t =>
      t.id === transcriptId ? { ...t, starred: !t.starred, updatedAt: Date.now() } : t
    );
    setTranscripts(updatedTranscripts);
    await window.electron.saveTranscripts(updatedTranscripts);
  };

  // Multi-Selection Functions
  const MAX_SELECTED_TRANSCRIPTS = 10;

  const toggleTranscriptSelection = (transcriptId) => {
    const isCurrentlySelected = selectedContextIds.includes(transcriptId);

    if (isCurrentlySelected) {
      // Remove from selection
      setSelectedContextIds(selectedContextIds.filter(id => id !== transcriptId));
    } else {
      // Check max limit
      if (selectedContextIds.length >= MAX_SELECTED_TRANSCRIPTS) {
        alert(`You can select up to ${MAX_SELECTED_TRANSCRIPTS} transcripts at a time for optimal performance.`);
        return;
      }
      // Add to selection
      setSelectedContextIds([...selectedContextIds, transcriptId]);
    }
  };

  const selectAllVisibleTranscripts = (visibleTranscriptIds) => {
    // Only select up to the max limit from visible transcripts
    const transcriptsToAdd = visibleTranscriptIds.slice(0, MAX_SELECTED_TRANSCRIPTS);

    if (visibleTranscriptIds.length > MAX_SELECTED_TRANSCRIPTS) {
      alert(`Selecting first ${MAX_SELECTED_TRANSCRIPTS} transcripts. You can select up to ${MAX_SELECTED_TRANSCRIPTS} at a time for optimal performance.`);
    }

    setSelectedContextIds(transcriptsToAdd);
  };

  const clearAllSelections = () => {
    setSelectedContextIds([]);
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
    if (!selectedTranscriptId || isChatStreaming) return;

    const userMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: "user",
      content: messageContent,
      timestamp: Date.now(),
      contextUsed: []
    };

    // Add user message to chat
    const updatedMessages = [...currentChatMessages, userMessage];
    const updatedChatHistory = {
      ...chatHistory,
      [selectedTranscriptId]: {
        transcriptId: selectedTranscriptId,
        messages: updatedMessages,
        createdAt: chatHistory[selectedTranscriptId]?.createdAt || Date.now(),
        updatedAt: Date.now()
      }
    };
    setChatHistory(updatedChatHistory);

    // Build context from selected transcripts
    const contextIds = selectedContextIds.length > 0 ? selectedContextIds : [selectedTranscriptId];
    const contextTranscripts = transcripts.filter(t => contextIds.includes(t.id));

    // Build system prompt with transcripts
    const systemPrompt = buildSystemPrompt(contextTranscripts);

    // Call OpenAI API
    setIsChatStreaming(true);
    const result = await window.electron.chatWithAI(
      updatedMessages,
      systemPrompt,
      contextIds
    );

    if (result.success) {
      const assistantMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: "assistant",
        content: result.message,
        timestamp: Date.now(),
        contextUsed: contextIds
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      const finalChatHistory = {
        ...chatHistory,
        [selectedTranscriptId]: {
          transcriptId: selectedTranscriptId,
          messages: finalMessages,
          createdAt: chatHistory[selectedTranscriptId]?.createdAt || Date.now(),
          updatedAt: Date.now()
        }
      };
      setChatHistory(finalChatHistory);
      await window.electron.saveChatHistory(finalChatHistory);
    }

    setIsChatStreaming(false);
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
    // Trigger pulse animation on API key button
    setShouldPulseAPIButton(true);

    // Remove pulse after animation completes
    setTimeout(() => {
      setShouldPulseAPIButton(false);
    }, 3000);

    // Show a helpful message (could be toast, for now we'll rely on visual feedback)
    console.log('Please add your API key first');
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
    // Multi-selection
    toggleTranscriptSelection,
    selectAllVisibleTranscripts,
    clearAllSelections,
    isTranscriptSelected,
    // Chat management
    chatHistory,
    selectedContextIds,
    setSelectedContextIds,
    isChatPanelOpen,
    setIsChatPanelOpen,
    isChatStreaming,
    currentChatMessages,
    loadChatHistory,
    sendChatMessage,
    clearChatHistory,
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
