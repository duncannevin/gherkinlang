/**
 * Progress indicator utility for GherkinLang CLI.
 *
 * Provides progress indicators for long-running CLI operations such as
 * compilation, file processing, and cache operations. Supports spinners
 * and progress counters.
 *
 * @module cli/utils/progress
 */

import ora from 'ora';
import { shouldUseSpinner } from '../constants.js';

/**
 * @typedef {Object} ProgressIndicator
 * @property {function(string): void} start - Start the progress indicator
 * @property {function(string): void} update - Update the progress message
 * @property {function(string): void} succeed - Mark as successful
 * @property {function(string): void} fail - Mark as failed
 * @property {function(string): void} warn - Mark as warning
 * @property {function(): void} stop - Stop the indicator
 * @property {function(number, number, string): void} progress - Update with count
 * @property {boolean} isSpinner - Whether using animated spinner
 */

/**
 * Create a progress indicator.
 *
 * @param {Object} [options] - Progress options
 * @param {boolean} [options.noColor=false] - Disable colored output
 * @returns {ProgressIndicator}
 */
export const createProgress = (options = {}) => {
  const { noColor = false } = options;
  const useSpinner = shouldUseSpinner(noColor);

  /** @type {import('ora').Ora | null} */
  let spinner = null;

  /** @type {string} */
  let currentMessage = '';

  /**
   * Log a message without spinner (for CI/non-TTY).
   * @param {string} prefix - Status prefix
   * @param {string} message - Message to display
   */
  const logPlain = (prefix, message) => {
    console.log(`${prefix} ${message}`);
  };

  return {
    isSpinner: useSpinner,

    /**
     * Start the progress indicator with a message.
     * @param {string} message - Initial message
     */
    start(message) {
      currentMessage = message;
      if (useSpinner) {
        spinner = ora({
          text: message,
          color: 'cyan',
        }).start();
      } else {
        logPlain('...', message);
      }
    },

    /**
     * Update the progress message.
     * @param {string} message - New message
     */
    update(message) {
      currentMessage = message;
      if (spinner) {
        spinner.text = message;
      }
      // In non-spinner mode, don't log updates (too noisy)
    },

    /**
     * Update with progress count (e.g., "Compiling [3/10] file.feature").
     * @param {number} current - Current item number
     * @param {number} total - Total items
     * @param {string} itemName - Name of current item
     */
    progress(current, total, itemName) {
      const message = `Compiling [${current}/${total}] ${itemName}`;
      this.update(message);
    },

    /**
     * Mark progress as successful.
     * @param {string} [message] - Success message (defaults to current)
     */
    succeed(message) {
      const finalMessage = message || currentMessage;
      if (spinner) {
        spinner.succeed(finalMessage);
        spinner = null;
      } else {
        logPlain('✔', finalMessage);
      }
    },

    /**
     * Mark progress as failed.
     * @param {string} [message] - Failure message (defaults to current)
     */
    fail(message) {
      const finalMessage = message || currentMessage;
      if (spinner) {
        spinner.fail(finalMessage);
        spinner = null;
      } else {
        logPlain('✖', finalMessage);
      }
    },

    /**
     * Mark progress as warning.
     * @param {string} [message] - Warning message (defaults to current)
     */
    warn(message) {
      const finalMessage = message || currentMessage;
      if (spinner) {
        spinner.warn(finalMessage);
        spinner = null;
      } else {
        logPlain('⚠', finalMessage);
      }
    },

    /**
     * Stop the progress indicator without status.
     */
    stop() {
      if (spinner) {
        spinner.stop();
        spinner = null;
      }
    },

    /**
     * Check if the spinner is currently active.
     * @returns {boolean}
     */
    isActive() {
      return spinner !== null && spinner.isSpinning;
    },
  };
};

/**
 * Format a duration in milliseconds to human-readable string.
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration (e.g., "1.2s", "45ms", "2m 30s")
 */
export const formatDuration = (ms) => {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};

/**
 * Format a file size in bytes to human-readable string.
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size (e.g., "1.2KB", "45MB")
 */
export const formatSize = (bytes) => {
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
};
