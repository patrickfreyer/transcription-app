import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

function APIKeyModal() {
  const { showAPIKeyModal, closeAPIKeyModal, updateAPIKeyStatus, platform } = useApp();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [validationStatus, setValidationStatus] = useState(null); // null, 'validating', 'success', 'error'
  const [validationMessage, setValidationMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingKey, setIsLoadingKey] = useState(false);

  // Load existing API key when modal opens
  useEffect(() => {
    const loadExistingKey = async () => {
      if (showAPIKeyModal) {
        setIsLoadingKey(true);
        try {
          const result = await window.electron.getApiKey();
          if (result.success && result.apiKey) {
            setApiKeyInput(result.apiKey);
          }
        } catch (error) {
          console.error('Failed to load API key:', error);
        } finally {
          setIsLoadingKey(false);
        }
      }
    };

    loadExistingKey();
  }, [showAPIKeyModal]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showAPIKeyModal) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showAPIKeyModal]);

  const handleClose = () => {
    if (!isSaving) {
      setApiKeyInput('');
      setValidationStatus(null);
      setValidationMessage('');
      closeAPIKeyModal();
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setApiKeyInput(text.trim());
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  };

  const handleSave = async () => {
    const apiKey = apiKeyInput.trim();

    // Basic format validation
    if (!apiKey.startsWith('sk-') && !apiKey.startsWith('sk-proj-')) {
      setValidationStatus('error');
      setValidationMessage('Invalid API key format. OpenAI API keys start with "sk-"');
      return;
    }

    setIsSaving(true);
    setValidationStatus('validating');
    setValidationMessage('Validating API key with OpenAI...');

    try {
      // Validate with OpenAI
      const validation = await window.electron.validateApiKey(apiKey);

      if (validation.success) {
        // Save to secure storage
        const saveResult = await window.electron.saveApiKeySecure(apiKey);

        if (saveResult.success) {
          setValidationStatus('success');
          setValidationMessage('✓ API key validated and saved successfully!');
          updateAPIKeyStatus('valid');

          // Close modal after short delay
          setTimeout(() => {
            handleClose();
          }, 1000);
        } else {
          throw new Error('Failed to save API key');
        }
      } else {
        throw new Error(validation.error || 'API key validation failed');
      }
    } catch (error) {
      console.error('API key validation error:', error);
      setValidationStatus('error');
      setValidationMessage(error.message || 'Failed to validate API key');
    } finally {
      setIsSaving(false);
    }
  };

  if (!showAPIKeyModal) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-300 ${
        showAPIKeyModal ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="bg-surface rounded-2xl shadow-2xl max-w-lg w-full animate-scale-in">
        {/* Modal Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary shadow-sm">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground">OpenAI API Key</h2>
          </div>
          <button
            className="p-2 hover:bg-surface-secondary rounded-lg transition-colors text-foreground-secondary hover:text-foreground"
            onClick={handleClose}
            aria-label="Close"
            disabled={isSaving}
          >
            <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8"/>
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              API Key
            </label>
            <div className="relative">
              <input
                type={isPasswordVisible ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full px-4 py-3 pr-24 bg-surface border border-strong rounded-xl text-foreground placeholder:text-foreground-tertiary focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                placeholder={isLoadingKey ? 'Loading...' : 'sk-proj-...'}
                autoComplete="off"
                spellCheck="false"
                disabled={isSaving || isLoadingKey}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  className="p-2 hover:bg-surface-secondary rounded-lg transition-colors text-foreground-secondary hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  type="button"
                  aria-label={isPasswordVisible ? 'Hide API key' : 'Show API key'}
                  disabled={isSaving || isLoadingKey || !apiKeyInput}
                >
                  {isPasswordVisible ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
                <button
                  className="p-2 hover:bg-surface-secondary rounded-lg transition-colors text-foreground-secondary hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handlePaste}
                  type="button"
                  aria-label="Paste from clipboard"
                  disabled={isSaving || isLoadingKey}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <p className="text-sm text-foreground leading-relaxed">
              Your API key is stored securely in your system{' '}
              <strong className="text-foreground">{platform === 'darwin' ? 'keychain' : 'Credential Manager'}</strong> and never leaves your device.
            </p>
          </div>

          {/* Help Link */}
          <div className="text-center py-2">
            <p className="text-foreground-secondary text-sm mb-2">Don't have an API key?</p>
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:text-primary-hover transition-colors font-medium"
            >
              Get API Key from OpenAI
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          </div>

          {/* Validation Status */}
          {validationStatus && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
                validationStatus === 'success'
                  ? 'bg-success/10 border border-success/30 text-success'
                  : validationStatus === 'error'
                  ? 'bg-error/10 border border-error/30 text-error'
                  : 'bg-primary/10 border border-primary/30 text-primary'
              }`}
            >
              {validationMessage}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-surface">
          <button
            className="px-6 py-2.5 rounded-xl bg-surface-secondary hover:bg-surface-tertiary border border-strong transition-all font-medium text-foreground"
            onClick={handleClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className="px-6 py-2.5 rounded-xl bg-primary text-white hover:shadow-lg hover:scale-105 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            onClick={handleSave}
            disabled={!apiKeyInput.trim() || apiKeyInput.trim().length < 10 || isSaving}
          >
            {isSaving ? 'Validating...' : 'Save & Validate'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default APIKeyModal;
