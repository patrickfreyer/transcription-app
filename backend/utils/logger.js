/**
 * Enhanced logging utility for backend services
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  constructor(module = 'App', level = 'INFO') {
    this.module = module;
    this.level = LOG_LEVELS[level] || LOG_LEVELS.INFO;
  }

  debug(...args) {
    if (this.level <= LOG_LEVELS.DEBUG) {
      console.log(`[${new Date().toISOString()}] [DEBUG] [${this.module}]`, ...args);
    }
  }

  info(...args) {
    if (this.level <= LOG_LEVELS.INFO) {
      console.log(`[${new Date().toISOString()}] [INFO] [${this.module}]`, ...args);
    }
  }

  warn(...args) {
    if (this.level <= LOG_LEVELS.WARN) {
      console.warn(`[${new Date().toISOString()}] [WARN] [${this.module}]`, ...args);
    }
  }

  error(...args) {
    if (this.level <= LOG_LEVELS.ERROR) {
      console.error(`[${new Date().toISOString()}] [ERROR] [${this.module}]`, ...args);
    }
  }

  success(...args) {
    console.log(`[${new Date().toISOString()}] [✓] [${this.module}]`, ...args);
  }
}

/**
 * Create a logger instance for a module
 * @param {string} module - Module name
 * @returns {Logger} Logger instance
 */
function createLogger(module) {
  return new Logger(module);
}

module.exports = {
  Logger,
  createLogger
};
