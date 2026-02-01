/**
 * CLI logging utility for GherkinLang compiler.
 *
 * Provides structured logging for CLI operations with support for different
 * log levels (debug, info, warn, error), colored output, and formatted
 * error messages.
 *
 * @module cli/utils/logger
 */

import chalk from 'chalk';
import { shouldUseColor } from '../constants.js';

/**
 * Log levels for filtering output.
 * @enum {number}
 */
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 4,
};

/**
 * @typedef {Object} Logger
 * @property {function(string, ...any): void} debug - Log debug message
 * @property {function(string, ...any): void} info - Log info message
 * @property {function(string, ...any): void} warn - Log warning message
 * @property {function(string, ...any): void} error - Log error message
 * @property {function(string, ...any): void} success - Log success message
 * @property {function(import('../types.js').CompilationError): void} formatError - Format and log compilation error
 * @property {function(string): void} blank - Log empty line or plain text
 * @property {boolean} useColor - Whether colors are enabled
 * @property {number} level - Current log level
 */

/**
 * Create a logger instance with the given options.
 *
 * @param {Object} [options] - Logger options
 * @param {boolean} [options.noColor=false] - Disable colored output
 * @param {boolean} [options.verbose=false] - Enable debug output
 * @param {boolean} [options.quiet=false] - Suppress non-error output
 * @returns {Logger}
 */
export const createLogger = (options = {}) => {
  const { noColor = false, verbose = false, quiet = false } = options;

  const useColor = shouldUseColor(noColor);
  const level = quiet ? LogLevel.ERROR : verbose ? LogLevel.DEBUG : LogLevel.INFO;

  // For chalk v5+, we use a wrapper that strips colors when disabled
  const c = useColor
    ? chalk
    : {
        // No-color passthrough functions
        gray: (s) => s,
        blue: (s) => s,
        yellow: (s) => s,
        red: (s) => s,
        green: (s) => s,
        cyan: (s) => s,
        bold: (s) => s,
        underline: (s) => s,
      };

  /**
   * Format a message with optional prefix.
   * @param {string} prefix - Prefix symbol
   * @param {string} prefixColor - Chalk color function name
   * @param {string} message - Message to format
   * @returns {string}
   */
  const format = (prefix, prefixColor, message) => {
    const coloredPrefix = c[prefixColor] ? c[prefixColor](prefix) : prefix;
    return `${coloredPrefix} ${message}`;
  };

  /**
   * Log to stdout.
   * @param {string} message - Message to log
   * @param  {...any} args - Additional arguments
   */
  const stdout = (message, ...args) => {
    console.log(message, ...args);
  };

  /**
   * Log to stderr.
   * @param {string} message - Message to log
   * @param  {...any} args - Additional arguments
   */
  const stderr = (message, ...args) => {
    console.error(message, ...args);
  };

  return {
    useColor,
    level,

    /**
     * Log debug message (only in verbose mode).
     * @param {string} message - Debug message
     * @param  {...any} args - Additional arguments
     */
    debug(message, ...args) {
      if (level <= LogLevel.DEBUG) {
        stdout(format('●', 'gray', c.gray(message)), ...args);
      }
    },

    /**
     * Log info message.
     * @param {string} message - Info message
     * @param  {...any} args - Additional arguments
     */
    info(message, ...args) {
      if (level <= LogLevel.INFO) {
        stdout(format('ℹ', 'blue', message), ...args);
      }
    },

    /**
     * Log warning message.
     * @param {string} message - Warning message
     * @param  {...any} args - Additional arguments
     */
    warn(message, ...args) {
      if (level <= LogLevel.WARN) {
        stderr(format('⚠', 'yellow', c.yellow(message)), ...args);
      }
    },

    /**
     * Log error message.
     * @param {string} message - Error message
     * @param  {...any} args - Additional arguments
     */
    error(message, ...args) {
      if (level <= LogLevel.ERROR) {
        stderr(format('✖', 'red', c.red(message)), ...args);
      }
    },

    /**
     * Log success message.
     * @param {string} message - Success message
     * @param  {...any} args - Additional arguments
     */
    success(message, ...args) {
      if (level <= LogLevel.INFO) {
        stdout(format('✔', 'green', c.green(message)), ...args);
      }
    },

    /**
     * Log a blank line or plain text (no prefix).
     * @param {string} [message=''] - Optional message
     */
    blank(message = '') {
      if (level <= LogLevel.INFO) {
        stdout(message);
      }
    },

    /**
     * Format and display a compilation error with context.
     * @param {import('../types.js').CompilationError} error - Compilation error
     */
    formatError(error) {
      if (level > LogLevel.ERROR) return;

      const location = error.line ? `${error.file}:${error.line}:${error.column || 1}` : error.file;

      stderr('');
      stderr(format('✖', 'red', `Error: ${c.bold(location)}`));
      stderr(`  ${error.message}`);

      if (error.source) {
        stderr('');
        stderr(`  ${c.gray(error.source)}`);
      }

      if (error.suggestion) {
        stderr('');
        stderr(`  ${c.cyan('Suggestion:')} ${error.suggestion}`);
      }

      if (error.docsUrl) {
        stderr(`  ${c.gray('Documentation:')} ${c.underline(error.docsUrl)}`);
      }
    },

    /**
     * Get the chalk instance for custom formatting.
     * @returns {typeof chalk}
     */
    get chalk() {
      return c;
    },
  };
};
