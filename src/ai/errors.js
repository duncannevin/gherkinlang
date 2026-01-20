/**
 * Error classes for AI transformation engine.
 * 
 * Provides custom error types for different failure scenarios in the AI
 * transformation process. Each error class extends Error and includes
 * additional context information.
 * 
 * @module ai/errors
 */

/**
 * Base error for AI transformation failures.
 */
class TransformationError extends Error {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Additional error options
   * @param {string} [options.source] - Source code that failed to transform
   * @param {string} [options.model] - AI model that was used
   * @param {number} [options.retryCount] - Number of retries attempted
   */
  constructor(message, options = {}) {
    super(message);
    this.name = 'TransformationError';
    this.source = options.source;
    this.model = options.model;
    this.retryCount = options.retryCount;
    Error.captureStackTrace(this, TransformationError);
  }
}

/**
 * Error thrown when Claude API calls fail.
 */
class APIError extends TransformationError {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Additional error options
   * @param {number} [options.statusCode] - HTTP status code from API
   * @param {string} [options.statusText] - HTTP status text
   * @param {string} [options.apiKey] - API key used (redacted in message)
   * @param {Object} [options.response] - Full API response object
   */
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'APIError';
    this.statusCode = options.statusCode;
    this.statusText = options.statusText;
    this.response = options.response;
    Error.captureStackTrace(this, APIError);
  }
}

/**
 * Error thrown when Claude API rate limit is exceeded.
 * This is a recoverable error that should trigger retry logic.
 */
class RateLimitError extends APIError {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Additional error options
   * @param {number} [options.retryAfter] - Seconds to wait before retry (if provided by API)
   * @param {Date} [options.retryAt] - Recommended time to retry
   */
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'RateLimitError';
    this.retryAfter = options.retryAfter;
    this.retryAt = options.retryAt;
    Error.captureStackTrace(this, RateLimitError);
  }
}

/**
 * Error thrown when AI response does not contain valid JavaScript code.
 * This may be retried once with a clarification prompt.
 */
class InvalidCodeError extends TransformationError {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Additional error options
   * @param {string} [options.response] - AI response that failed validation
   * @param {string} [options.validationError] - Specific validation error message
   * @param {boolean} [options.retryable] - Whether this error is retryable (default: true)
   */
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'InvalidCodeError';
    this.response = options.response;
    this.validationError = options.validationError;
    this.retryable = options.retryable !== false;
    Error.captureStackTrace(this, InvalidCodeError);
  }
}

/**
 * Error thrown when tool invocation exceeds timeout (5 seconds).
 * This fails the entire compilation.
 */
class ToolTimeoutError extends TransformationError {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Additional error options
   * @param {string} [options.toolName] - Name of tool that timed out
   * @param {number} [options.timeout] - Timeout duration in milliseconds (default: 5000)
   * @param {number} [options.duration] - Actual duration before timeout
   */
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'ToolTimeoutError';
    this.toolName = options.toolName;
    this.timeout = options.timeout || 5000;
    this.duration = options.duration;
    Error.captureStackTrace(this, ToolTimeoutError);
  }
}

module.exports = {
  TransformationError,
  APIError,
  RateLimitError,
  InvalidCodeError,
  ToolTimeoutError,
};
