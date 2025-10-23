/**
 * Platform Detection & Utilities
 * Cross-platform helpers for macOS, Windows, and Linux
 */

export class Platform {
  static #platform = null;

  /**
   * Get current platform
   * @returns {'darwin'|'win32'|'linux'}
   */
  static get() {
    if (!this.#platform) {
      this.#platform = window.electron?.platform || 'darwin';
    }
    return this.#platform;
  }

  /**
   * Check if running on macOS
   */
  static isMac() {
    return this.get() === 'darwin';
  }

  /**
   * Check if running on Windows
   */
  static isWindows() {
    return this.get() === 'win32';
  }

  /**
   * Check if running on Linux
   */
  static isLinux() {
    return this.get() === 'linux';
  }

  /**
   * Get modifier key (Cmd on Mac, Ctrl on Windows/Linux)
   */
  static getModKey() {
    return this.isMac() ? 'Cmd' : 'Ctrl';
  }

  /**
   * Get modifier key symbol
   */
  static getModSymbol() {
    return this.isMac() ? '⌘' : 'Ctrl';
  }

  /**
   * Initialize platform-specific attributes on document
   */
  static initializeDOM() {
    document.documentElement.setAttribute('data-platform', this.get());

    // Add platform class for easier CSS targeting
    document.body.classList.add(`platform-${this.get()}`);

    // Update keyboard shortcut displays
    this.updateShortcutDisplays();
  }

  /**
   * Update all shortcut displays with platform-appropriate text
   */
  static updateShortcutDisplays() {
    const modKey = this.getModKey();
    const elements = document.querySelectorAll('[data-shortcut]');

    elements.forEach(el => {
      const shortcut = el.dataset.shortcut;
      el.textContent = shortcut.replace('Mod', modKey);
    });
  }

  /**
   * Check if a keyboard event matches a shortcut
   * @param {KeyboardEvent} event
   * @param {string} key - Key to match
   * @param {object} modifiers - {ctrl, shift, alt, meta}
   */
  static matchesShortcut(event, key, modifiers = {}) {
    const isMod = this.isMac() ? event.metaKey : event.ctrlKey;

    return (
      event.key.toLowerCase() === key.toLowerCase() &&
      isMod === (modifiers.mod ?? false) &&
      event.ctrlKey === (modifiers.ctrl ?? false) &&
      event.shiftKey === (modifiers.shift ?? false) &&
      event.altKey === (modifiers.alt ?? false)
    );
  }
}
