/**
 * Utility module for SHA256 hashing.
 * 
 * Provides functions for computing SHA256 hashes of strings and buffers.
 * Used for content-addressed caching and cache key generation.
 * 
 * @module compiler/utils/hash
 */

const crypto = require('crypto');

/**
 * Compute SHA256 hash of a string.
 * 
 * @param {string} input - Input string to hash
 * @returns {string} Hexadecimal hash string (64 characters)
 */
function sha256(input) {
  if (typeof input !== 'string') {
    throw new TypeError('Input must be a string');
  }
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Compute SHA256 hash of a buffer.
 * 
 * @param {Buffer} input - Input buffer to hash
 * @returns {string} Hexadecimal hash string (64 characters)
 */
function sha256Buffer(input) {
  if (!Buffer.isBuffer(input)) {
    throw new TypeError('Input must be a Buffer');
  }
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Compute SHA256 hash of multiple strings concatenated together.
 * Useful for generating cache keys from multiple inputs.
 * 
 * @param {...string} inputs - Variable number of strings to hash
 * @returns {string} Hexadecimal hash string (64 characters)
 */
function sha256Concat(...inputs) {
  if (inputs.length === 0) {
    throw new TypeError('At least one input string is required');
  }
  const concatenated = inputs.join('');
  return sha256(concatenated);
}

module.exports = {
  sha256,
  sha256Buffer,
  sha256Concat,
};
