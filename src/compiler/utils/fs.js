/**
 * Utility module for file system operations.
 * 
 * Provides helper functions for common file system operations used by the compiler.
 * Wraps Node.js fs module with error handling and convenience functions.
 * 
 * @module compiler/utils/fs
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Read a file as UTF-8 string.
 * 
 * @param {string} filePath - Path to file
 * @returns {Promise<string>} File contents as string
 * @throws {Error} If file cannot be read
 */
async function readFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    if (error.code === 'EACCES') {
      throw new Error(`Permission denied reading file: ${filePath}`);
    }
    throw error;
  }
}

/**
 * Write a string to a file.
 * Creates parent directories if they don't exist.
 * 
 * @param {string} filePath - Path to file
 * @param {string} content - Content to write
 * @returns {Promise<void>}
 * @throws {Error} If file cannot be written
 */
async function writeFile(filePath, content) {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');
  } catch (error) {
    if (error.code === 'EACCES') {
      throw new Error(`Permission denied writing file: ${filePath}`);
    }
    if (error.code === 'ENOSPC') {
      throw new Error(`No space left on device: ${filePath}`);
    }
    throw error;
  }
}

/**
 * Check if a file or directory exists.
 * 
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>} True if exists, false otherwise
 */
async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file statistics (size, mtime, etc.).
 * 
 * @param {string} filePath - Path to file
 * @returns {Promise<fs.Stats>} File statistics
 * @throws {Error} If file cannot be accessed
 */
async function stat(filePath) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    if (error.code === 'EACCES') {
      throw new Error(`Permission denied accessing file: ${filePath}`);
    }
    throw error;
  }
}

/**
 * Create a directory recursively.
 * 
 * @param {string} dirPath - Path to directory
 * @returns {Promise<void>}
 * @throws {Error} If directory cannot be created
 */
async function mkdir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code === 'EACCES') {
      throw new Error(`Permission denied creating directory: ${dirPath}`);
    }
    throw error;
  }
}

/**
 * Remove a file or directory recursively.
 * 
 * @param {string} filePath - Path to file or directory
 * @returns {Promise<void>}
 * @throws {Error} If file cannot be removed
 */
async function rm(filePath) {
  try {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      await fs.rmdir(filePath, { recursive: true });
    } else {
      await fs.unlink(filePath);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, which is fine for removal
      return;
    }
    if (error.code === 'EACCES') {
      throw new Error(`Permission denied removing: ${filePath}`);
    }
    throw error;
  }
}

/**
 * Find all files matching a pattern in a directory recursively.
 * 
 * @param {string} dirPath - Path to directory to search
 * @param {string} [pattern='*.feature'] - File pattern to match (default: '*.feature')
 * @returns {Promise<string[]>} Array of absolute file paths
 * @throws {Error} If directory cannot be accessed
 */
async function findFiles(dirPath, pattern = '*.feature') {
  const files = [];
  const patternRegex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\./g, '\\.') + '$');
  
  async function walk(currentPath) {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile() && patternRegex.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      if (error.code === 'EACCES') {
        throw new Error(`Permission denied accessing directory: ${currentPath}`);
      }
      throw error;
    }
  }
  
  const stats = await fs.stat(dirPath);
  if (!stats.isDirectory()) {
    throw new Error(`Path is not a directory: ${dirPath}`);
  }
  
  await walk(dirPath);
  return files;
}

module.exports = {
  readFile,
  writeFile,
  exists,
  stat,
  mkdir,
  rm,
  findFiles,
};
