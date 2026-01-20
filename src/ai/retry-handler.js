/**
 * Retry handler for AI API calls with exponential backoff.
 * 
 * Implements retry logic with exponential backoff and jitter for handling
 * transient API failures, rate limits, and network errors. Uses the backoff
 * utility for delay calculation.
 * 
 * @module ai/retry-handler
 */

const { calculateDelay, delay, shouldRetry } = require('./utils/backoff');
const { APIError, RateLimitError, TransformationError } = require('./errors');

/**
 * @typedef {Function} APICallFunction
 * @returns {Promise<any>} API response
 */

class RetryHandler {
  /**
   * Creates a new RetryHandler instance.
   * 
   * @param {Object} [options] - Retry configuration
   * @param {number} [options.maxRetries=3] - Maximum number of retries
   * @param {number} [options.baseDelay=2000] - Base delay in milliseconds
   */
  constructor(options = {}) {
    this._maxRetries = options.maxRetries || 3;
    this._baseDelay = options.baseDelay || 2000;
  }

  /**
   * Execute API call with retry logic.
   * 
   * @param {APICallFunction} apiCall - Function that makes the API call
   * @param {Object} [options] - Retry options
   * @param {string} [options.operation] - Operation name for error messages
   * @returns {Promise<any>} API response
   * @throws {APIError|RateLimitError|TransformationError} If all retries fail
   */
  async execute(apiCall, options = {}) {
    const operation = options.operation || 'API call';
    let lastError;
    let attempt = 0;

    while (attempt <= this._maxRetries) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        if (!this._isRetryable(error, attempt)) {
          throw error;
        }

        // Check if we should retry
        if (!shouldRetry(attempt, this._maxRetries)) {
          break;
        }

        // Calculate delay and wait
        const waitTime = calculateDelay(attempt, this._baseDelay);
        
        // For rate limit errors, use retryAfter if available
        if (error instanceof RateLimitError && error.retryAfter) {
          await delay(0, error.retryAfter * 1000);
        } else {
          await delay(attempt, this._baseDelay);
        }

        attempt++;
      }
    }

    // All retries exhausted
    throw this._createRetryExhaustedError(lastError, attempt, operation);
  }

  /**
   * Check if error is retryable.
   * 
   * @private
   * @param {Error} error - Error to check
   * @param {number} attempt - Current attempt number
   * @returns {boolean} True if error is retryable
   */
  _isRetryable(error, attempt) {
    // Rate limit errors are always retryable
    if (error instanceof RateLimitError) {
      return true;
    }

    // API errors with 5xx status codes are retryable
    if (error instanceof APIError) {
      const statusCode = error.statusCode;
      if (statusCode >= 500 && statusCode < 600) {
        return true;
      }
      // 429 is rate limit (handled above)
      if (statusCode === 429) {
        return true;
      }
      // 408 is timeout (retryable)
      if (statusCode === 408) {
        return true;
      }
    }

    // Network errors (ECONNRESET, ETIMEDOUT, etc.) are retryable
    if (error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED') {
      return true;
    }

    // Timeout errors are retryable
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return true;
    }

    return false;
  }

  /**
   * Create error for exhausted retries.
   * 
   * @private
   * @param {Error} lastError - Last error encountered
   * @param {number} attempts - Number of attempts made
   * @param {string} operation - Operation name
   * @returns {Error} Error indicating retries exhausted
   */
  _createRetryExhaustedError(lastError, attempts, operation) {
    const message = `${operation} failed after ${attempts} ${attempts === 1 ? 'attempt' : 'attempts'}: ${lastError.message}`;

    if (lastError instanceof APIError) {
      return new APIError(message, {
        statusCode: lastError.statusCode,
        statusText: lastError.statusText,
        response: lastError.response,
        retryCount: attempts - 1,
      });
    }

    if (lastError instanceof RateLimitError) {
      return new RateLimitError(message, {
        retryAfter: lastError.retryAfter,
        retryAt: lastError.retryAt,
        retryCount: attempts - 1,
      });
    }

    return new TransformationError(message, {
      retryCount: attempts - 1,
    });
  }
}

module.exports = { RetryHandler };
