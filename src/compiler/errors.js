/**
 * Error classes for GherkinLang compiler.
 * 
 * Provides custom error types for different failure scenarios in the compiler.
 * Each error class extends Error and includes additional context information.
 * 
 * @module compiler/errors
 */

/**
 * Error thrown when language rules cannot be loaded.
 */
class RulesLoadError extends Error {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Additional error options
   * @param {string} [options.filePath] - Path to rules file that failed to load
   * @param {string} [options.target] - Target language that was requested
   * @param {string} [options.code] - System error code (e.g., 'ENOENT', 'EACCES')
   */
  constructor(message, options = {}) {
    super(message);
    this.name = 'RulesLoadError';
    this.filePath = options.filePath;
    this.target = options.target;
    this.code = options.code;
    Error.captureStackTrace(this, RulesLoadError);
  }
}

/**
 * Error thrown when parsing a .feature file fails.
 * Note: This is different from ParseError (which is a data structure).
 * This error is thrown when parsing cannot proceed at all.
 */
class ParseError extends Error {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Additional error options
   * @param {string} [options.filePath] - Path to file that failed to parse
   * @param {number} [options.line] - Line number where error occurred
   * @param {number} [options.column] - Column number where error occurred
   * @param {string} [options.type] - Type of parse error ('syntax' | 'structure' | 'missing_feature' | 'system')
   */
  constructor(message, options = {}) {
    super(message);
    this.name = 'ParseError';
    this.filePath = options.filePath;
    this.line = options.line;
    this.column = options.column;
    Error.captureStackTrace(this, ParseError);
  }
}

/**
 * Error thrown when project context cannot be built.
 */
class ContextBuildError extends Error {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Additional error options
   * @param {string} [options.rootDir] - Root directory that failed to build
   * @param {string} [options.featureName] - Feature name that caused the error (e.g., duplicate)
   * @param {Array<string>} [options.cycle] - Module names in circular dependency cycle
   */
  constructor(message, options = {}) {
    super(message);
    this.name = 'ContextBuildError';
    this.rootDir = options.rootDir;
    this.featureName = options.featureName;
    this.cycle = options.cycle;
    Error.captureStackTrace(this, ContextBuildError);
  }
}

/**
 * Error thrown when cache operations fail.
 */
class CacheError extends Error {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Additional error options
   * @param {string} [options.key] - Cache key that caused the error
   * @param {string} [options.operation] - Operation that failed ('get', 'set', 'clear', 'evict')
   * @param {string} [options.code] - System error code (e.g., 'ENOSPC', 'EACCES')
   */
  constructor(message, options = {}) {
    super(message);
    this.name = 'CacheError';
    this.key = options.key;
    this.operation = options.operation;
    this.code = options.code;
    Error.captureStackTrace(this, CacheError);
  }
}

module.exports = {
  RulesLoadError,
  ParseError,
  ContextBuildError,
  CacheError,
};
