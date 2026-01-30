/**
 * File system MCP tool for GherkinLang compiler.
 * 
 * Enables cross-module awareness during compilation by allowing the AI
 * transformer to read other .feature files, list directories, and check
 * file existence. Supports dependency resolution and cross-module references.
 * 
 * @module mcp/tools/filesystem
 */

const path = require('path');
const { readFile, exists } = require('../../compiler/utils/fs');

/**
 * @typedef {import('../types').ToolResult} ToolResult
 */

/**
 * File system tool for reading project files.
 */
class FileSystem {
  constructor() {
    this.name = 'filesystem';
    this.description = 'Reads project files for cross-module references during compilation. Supports reading .feature files and other project files.';
    this.inputSchema = {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['read'],
          description: 'File system action',
        },
        path: {
          type: 'string',
          description: 'File path to read (relative to project root)',
        },
      },
      required: ['action', 'path'],
    };
    this._projectRoot = process.cwd();
  }

  /**
   * Execute the file system tool.
   * 
   * @param {Object} args - Tool invocation parameters
   * @param {string} args.action - File system action ('read')
   * @param {string} args.path - File path to read
   * @returns {Promise<ToolResult>} File operation result
   */
  async execute(args) {
    const startTime = Date.now();

    try {
      // Validate input
      if (!args.action || typeof args.action !== 'string') {
        return {
          success: false,
          error: 'action parameter is required and must be a string',
          duration: Date.now() - startTime,
        };
      }

      if (!args.path || typeof args.path !== 'string') {
        return {
          success: false,
          error: 'path parameter is required and must be a string',
          duration: Date.now() - startTime,
        };
      }

      const { action, path: filePath } = args;

      if (action !== 'read') {
        return {
          success: false,
          error: `Unsupported action: ${action}. Only 'read' is supported.`,
          duration: Date.now() - startTime,
        };
      }

      // Validate and resolve path
      const resolvedPath = this._resolvePath(filePath);
      if (!resolvedPath) {
        return {
          success: false,
          error: `Path is outside project root: ${filePath}`,
          duration: Date.now() - startTime,
        };
      }

      // Check if file exists
      if (!(await exists(resolvedPath))) {
        return {
          success: false,
          error: `File not found: ${filePath}`,
          duration: Date.now() - startTime,
        };
      }

      // Read file
      const content = await readFile(resolvedPath);

      return {
        success: true,
        content: {
          content,
          path: filePath,
        },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: `File system operation failed: ${error.message}`,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Resolve and validate file path.
   * 
   * @private
   * @param {string} filePath - File path (relative to project root)
   * @returns {string|null} Resolved absolute path or null if invalid
   */
  _resolvePath(filePath) {
    try {
      // Resolve to absolute path
      const resolved = path.resolve(this._projectRoot, filePath);
      
      // Normalize to handle .. and . segments
      const normalized = path.normalize(resolved);
      
      // Check if path is within project root (security)
      const projectRootNormalized = path.normalize(this._projectRoot);
      
      if (!normalized.startsWith(projectRootNormalized)) {
        return null; // Path outside project root
      }

      return normalized;
    } catch (error) {
      return null;
    }
  }
}

module.exports = { FileSystem };
