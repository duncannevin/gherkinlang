/**
 * Exponential backoff calculation utility for retry logic.
 * 
 * Implements exponential backoff with jitter for retrying failed API calls.
 * The jitter component helps prevent thundering herd problems by randomizing
 * retry delays across multiple concurrent requests.
 * 
 * @module ai/utils/backoff
 */

/**
 * Calculate exponential backoff delay with jitter.
 * 
 * Formula: `delay = (2^attempt) * baseDelay + jitter`
 * Where jitter is a random value between 0 and baseDelay.
 * 
 * @param {number} attempt - Current retry attempt (0 = first attempt, 1 = first retry, etc.)
 * @param {number} [baseDelay=2000] - Base delay in milliseconds (default: 2000)
 * @returns {number} Delay in milliseconds before next retry
 * 
 * @example
 * // First retry (attempt 1): delay = 2^1 * 2000 + random(0, 2000) = 4000-6000ms
 * // Second retry (attempt 2): delay = 2^2 * 2000 + random(0, 2000) = 8000-10000ms
 * // Third retry (attempt 3): delay = 2^3 * 2000 + random(0, 2000) = 16000-18000ms
 * const delay = calculateDelay(1, 2000);
 */
function calculateDelay(attempt, baseDelay = 2000) {
  if (attempt < 0) {
    throw new Error('Attempt must be non-negative');
  }
  if (baseDelay <= 0) {
    throw new Error('Base delay must be positive');
  }

  // Exponential component: 2^attempt * baseDelay
  const exponentialDelay = Math.pow(2, attempt) * baseDelay;

  // Jitter component: random value between 0 and baseDelay
  const jitter = Math.random() * baseDelay;

  return exponentialDelay + jitter;
}

/**
 * Create a delay promise that resolves after the calculated backoff delay.
 * 
 * @param {number} attempt - Current retry attempt
 * @param {number} [baseDelay=2000] - Base delay in milliseconds
 * @returns {Promise<void>} Promise that resolves after the delay
 * 
 * @example
 * // Wait before retrying
 * await delay(1, 2000); // Waits 4000-6000ms
 */
function delay(attempt, baseDelay = 2000) {
  const ms = calculateDelay(attempt, baseDelay);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a retry should be attempted based on attempt count and max retries.
 * 
 * @param {number} attempt - Current retry attempt
 * @param {number} [maxRetries=3] - Maximum number of retries
 * @returns {boolean} True if retry should be attempted, false otherwise
 */
function shouldRetry(attempt, maxRetries = 3) {
  return attempt < maxRetries;
}

module.exports = {
  calculateDelay,
  delay,
  shouldRetry,
};
