/**
 * Tool registry for managing MCP tools.
 * 
 * Provides registration, lookup, and conversion of MCP tools to Claude API
 * tool format. Maintains a registry of available tools that can be used
 * during AI compilation.
 * 
 * @module mcp/tool-registry
 */

const { getAllTools } = require('./tools');

/**
 * @typedef {import('./types').MCPTool} MCPTool
 * @typedef {import('../ai/types').ClaudeTool} ClaudeTool
 */

/**
 * Tool registry for managing MCP tools.
 * 
 * @class ToolRegistry
 */
class ToolRegistry {
  /**
   * Creates a new ToolRegistry instance.
   * 
   * @constructor
   */
  constructor() {
    /** @type {Map<string, MCPTool>} */
    this._tools = new Map();
  }

  /**
   * Register a tool in the registry.
   * 
   * @param {MCPTool} tool - Tool to register
   * @throws {Error} If tool is missing required properties (name, description, inputSchema)
   */
  register(tool) {
    if (!tool.name || !tool.description || !tool.inputSchema) {
      throw new Error('Tool must have name, description, and inputSchema');
    }
    this._tools.set(tool.name, tool);
  }

  /**
   * Get tool by name.
   * 
   * @param {string} name - Tool name
   * @returns {MCPTool|null} Tool or null if not found
   */
  getTool(name) {
    return this._tools.get(name) || null;
  }

  /**
   * Get all registered tools.
   * 
   * @returns {MCPTool[]} Array of all registered tools
   */
  getAllTools() {
    return Array.from(this._tools.values());
  }

  /**
   * Convert tools to Claude API tool format.
   * 
   * Filters enabled tools and converts them to the format expected by
   * the Claude API (with input_schema instead of inputSchema).
   * 
   * @returns {ClaudeTool[]} Array of Claude tools
   */
  toClaudeTools() {
    return Array.from(this._tools.values())
      .filter(tool => tool.enabled)
      .map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      }));
  }

  /**
   * Check if tool exists in registry.
   * 
   * @param {string} name - Tool name
   * @returns {boolean} True if tool exists, false otherwise
   */
  hasTool(name) {
    return this._tools.has(name);
  }

  /**
   * Register all available MCP tools from tools/index.js.
   * 
   * Convenience method to register all built-in tools (analyzer, dependencies,
   * filesystem, test-generator) in one call.
   */
  registerAllTools() {
    const tools = getAllTools();
    for (const tool of tools) {
      this.register(tool);
    }
  }
}

module.exports = { ToolRegistry };