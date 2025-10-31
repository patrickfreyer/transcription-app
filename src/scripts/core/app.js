/**
 * Main Application Controller
 * Initializes and coordinates all app functionality
 */

import { Platform } from '../utils/platform.js';
import { $, $$, on, show, hide } from '../utils/dom.js';
import { showToast } from '../utils/helpers.js';

class App {
  constructor() {
    this.currentTab = 'recording';
    this.apiKeyStatus = 'missing'; // 'missing', 'valid', 'loading'

    this.initializeApp();
  }

  /**
   * Initialize the application
   */
  async initializeApp() {
    console.log('🚀 Initializing Audio Transcription App v2.0.0');

    // Initialize platform
    Platform.initializeDOM();
    console.log('✓ Platform initialized:', Platform.get());

    // Set up window controls (Windows)
    if (Platform.isWindows()) {
      this.setupWindowControls();
    }

    // Set up tab navigation
    this.setupTabNavigation();

    // Set up API key management
    this.setupAPIKeyManagement();

    // Check for existing API key
    await this.checkAPIKey();

    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();

    console.log('✓ App initialized successfully');
  }

  /**
   * Set up window controls for Windows
   */
  setupWindowControls() {
    const minimizeBtn = $('#btn-minimize');
    const maximizeBtn = $('#btn-maximize');
    const closeBtn = $('#btn-close');

    if (minimizeBtn) {
      on(minimizeBtn, 'click', () => {
        window.electron.minimizeWindow();
      });
    }

    if (maximizeBtn) {
      on(maximizeBtn, 'click', () => {
        window.electron.maximizeWindow();
      });
    }

    if (closeBtn) {
      on(closeBtn, 'click', () => {
        window.electron.closeWindow();
      });
    }

    console.log('✓ Window controls initialized');
  }

  /**
   * Set up tab navigation
   */
  setupTabNavigation() {
    const tabButtons = $$('[data-tab]');
    const panels = $$('.tab-panel');

    tabButtons.forEach(button => {
      on(button, 'click', () => {
        const tabName = button.dataset.tab;
        this.switchTab(tabName);
      });
    });

    console.log('✓ Tab navigation initialized');
  }

  /**
   * Switch between tabs
   */
  switchTab(tabName) {
    if (this.currentTab === tabName) return;

    // Update tab buttons with Tailwind classes
    $$('[data-tab]').forEach(btn => {
      const isActive = btn.dataset.tab === tabName;
      btn.setAttribute('aria-selected', isActive);

      if (isActive) {
        btn.className = 'tab-btn px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 bg-white/20 text-white shadow-lg';
      } else {
        btn.className = 'tab-btn px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 text-white/60 hover:text-white/80 hover:bg-white/5';
      }
    });

    // Update panels with Tailwind opacity/pointer-events
    $$('#panel-recording, #panel-analysis').forEach(panel => {
      const panelId = `panel-${tabName}`;
      const isActive = panel.id === panelId;

      if (isActive) {
        panel.classList.remove('opacity-0', 'pointer-events-none');
        panel.classList.add('opacity-100');
      } else {
        panel.classList.remove('opacity-100');
        panel.classList.add('opacity-0', 'pointer-events-none');
      }
    });

    this.currentTab = tabName;
    console.log('→ Switched to tab:', tabName);
  }

  /**
   * Set up API key management
   */
  setupAPIKeyManagement() {
    const apiKeyBtn = $('#api-key-btn');
    const addApiKeyBtn = $('#add-api-key-btn');
    const modal = $('#api-key-modal');
    const modalClose = $('#modal-close');
    const cancelBtn = $('#cancel-api-key');
    const saveBtn = $('#save-api-key');
    const input = $('#api-key-input');
    const toggleVisibility = $('#toggle-visibility');
    const pasteBtn = $('#paste-btn');

    // Open modal
    const openModal = () => {
      modal.classList.remove('opacity-0', 'pointer-events-none');
      modal.classList.add('opacity-100');
      setTimeout(() => input.focus(), 100);
    };

    // Close modal
    const closeModal = () => {
      modal.classList.remove('opacity-100');
      modal.classList.add('opacity-0', 'pointer-events-none');
      setTimeout(() => {
        input.value = '';
        const statusDiv = $('#validation-status');
        if (statusDiv) {
          statusDiv.classList.add('hidden');
        }
        saveBtn.disabled = true;
      }, 300);
    };

    // Event listeners
    if (apiKeyBtn) on(apiKeyBtn, 'click', openModal);
    if (addApiKeyBtn) on(addApiKeyBtn, 'click', openModal);
    if (modalClose) on(modalClose, 'click', closeModal);
    if (cancelBtn) on(cancelBtn, 'click', closeModal);

    // Close on overlay click
    on(modal, 'click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Close on Escape
    on(document, 'keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('opacity-100')) {
        closeModal();
      }
    });

    // Enable save button when input has value
    on(input, 'input', () => {
      const value = input.value.trim();
      saveBtn.disabled = !value || value.length < 10;
    });

    // Toggle visibility
    if (toggleVisibility) {
      on(toggleVisibility, 'click', () => {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';

        // Update icon
        const svg = isPassword
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
               <line x1="1" y1="1" x2="23" y2="23"/>
             </svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
               <circle cx="12" cy="12" r="3"/>
             </svg>`;
        toggleVisibility.innerHTML = svg;
      });
    }

    // Paste from clipboard
    if (pasteBtn) {
      on(pasteBtn, 'click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          input.value = text.trim();
          input.dispatchEvent(new Event('input'));
        } catch (err) {
          console.error('Failed to read clipboard:', err);
          showToast('Failed to read clipboard', 'error');
        }
      });
    }

    // Save and validate
    if (saveBtn) {
      on(saveBtn, 'click', async () => {
        const apiKey = input.value.trim();
        await this.saveAndValidateAPIKey(apiKey);
      });
    }

    console.log('✓ API key management initialized');
  }

  /**
   * Check for existing API key on startup
   */
  async checkAPIKey() {
    try {
      const result = await window.electron.getApiKeySecure();

      if (result.success && result.apiKey) {
        // Validate the key
        this.setAPIKeyStatus('loading');
        const validation = await window.electron.validateApiKey(result.apiKey);

        if (validation.success) {
          this.setAPIKeyStatus('valid');
          console.log('✓ API key found and validated');
        } else {
          this.setAPIKeyStatus('missing');
          console.warn('⚠ API key found but invalid');
        }
      } else {
        this.setAPIKeyStatus('missing');
        console.log('⚠ No API key found');
      }
    } catch (error) {
      console.error('Error checking API key:', error);
      this.setAPIKeyStatus('missing');
    }
  }

  /**
   * Save and validate API key
   */
  async saveAndValidateAPIKey(apiKey) {
    const saveBtn = $('#save-api-key');
    const statusDiv = $('#validation-status');
    const originalText = saveBtn.textContent;

    // Basic format validation
    if (!apiKey.startsWith('sk-') && !apiKey.startsWith('sk-proj-')) {
      this.showValidationStatus('error', 'Invalid API key format. OpenAI API keys start with "sk-"');
      return;
    }

    // Show loading state
    saveBtn.textContent = 'Validating...';
    saveBtn.disabled = true;
    this.showValidationStatus('validating', 'Validating API key with OpenAI...');

    try {
      // Validate with OpenAI
      const validation = await window.electron.validateApiKey(apiKey);

      if (validation.success) {
        // Save to secure storage
        const saveResult = await window.electron.saveApiKeySecure(apiKey);

        if (saveResult.success) {
          this.showValidationStatus('success', '✓ API key validated and saved successfully!');
          this.setAPIKeyStatus('valid');

          // Close modal after short delay
          setTimeout(() => {
            const modal = $('#api-key-modal');
            modal.classList.remove('opacity-100');
            modal.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => {
              $('#api-key-input').value = '';
              statusDiv.classList.add('hidden');
            }, 300);
          }, 1000);

          showToast('API key saved successfully', 'success');
        } else {
          throw new Error('Failed to save API key');
        }
      } else {
        throw new Error(validation.error || 'API key validation failed');
      }
    } catch (error) {
      console.error('API key validation error:', error);
      this.showValidationStatus('error', error.message || 'Failed to validate API key');
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }
  }

  /**
   * Show validation status in modal
   */
  showValidationStatus(type, message) {
    const statusDiv = $('#validation-status');
    statusDiv.classList.remove('hidden');
    statusDiv.textContent = message;

    // Apply styling based on type
    const baseClasses = 'p-4 rounded-xl flex items-center gap-3 text-sm font-medium';
    if (type === 'success') {
      statusDiv.className = `${baseClasses} bg-success/10 border border-success/20 text-success`;
    } else if (type === 'error') {
      statusDiv.className = `${baseClasses} bg-error/10 border border-error/20 text-error`;
    } else if (type === 'validating') {
      statusDiv.className = `${baseClasses} bg-accent/10 border border-accent/20 text-accent`;
    }
  }

  /**
   * Set API key status and update UI
   */
  setAPIKeyStatus(status) {
    this.apiKeyStatus = status;
    const apiKeyBtn = $('#api-key-btn');
    const recordingBlocked = $('#recording-blocked');
    const recordingInterface = $('#recording-interface');

    if (apiKeyBtn) {
      apiKeyBtn.setAttribute('data-status', status);
    }

    // Show/hide blocking overlay with Tailwind classes
    if (status === 'valid') {
      if (recordingBlocked) {
        recordingBlocked.classList.remove('opacity-100');
        recordingBlocked.classList.add('opacity-0', 'pointer-events-none');
      }
      if (recordingInterface) {
        recordingInterface.classList.remove('hidden');
      }
    } else {
      if (recordingBlocked) {
        recordingBlocked.classList.remove('opacity-0', 'pointer-events-none');
        recordingBlocked.classList.add('opacity-100');
      }
      if (recordingInterface) {
        recordingInterface.classList.add('hidden');
      }
    }
  }

  /**
   * Set up keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    on(document, 'keydown', (e) => {
      // Cmd/Ctrl + K: Open API key modal
      if (Platform.matchesShortcut(e, 'k', { mod: true })) {
        e.preventDefault();
        $('#api-key-btn')?.click();
      }

      // Cmd/Ctrl + 1: Switch to Recording tab
      if (Platform.matchesShortcut(e, '1', { mod: true })) {
        e.preventDefault();
        this.switchTab('recording');
      }

      // Cmd/Ctrl + 2: Switch to Analysis tab
      if (Platform.matchesShortcut(e, '2', { mod: true })) {
        e.preventDefault();
        this.switchTab('analysis');
      }

      // Cmd/Ctrl + ,: Open settings (placeholder)
      if (Platform.matchesShortcut(e, ',', { mod: true })) {
        e.preventDefault();
        showToast('Settings coming soon...', 'info');
      }
    });

    console.log('✓ Keyboard shortcuts initialized');
  }
}

// Initialize app when DOM is ready
if (document.readyState !== 'loading') {
  new App();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    new App();
  });
}

// Export for debugging
window.__app = App;
