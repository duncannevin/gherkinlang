/**
 * MCP tool registry for GherkinLang compiler.
 * 
 * Registers and manages all available MCP tools (file_system, analyzer,
 * dependencies, test-generator) that can be used during AI transformation.
 * Provides tool discovery and invocation interface.
 * 
 * @module mcp/tools
 */

const { CodeAnalyzer } = require('./analyzer');
const { DependencyChecker } = require('./dependencies');
const { FileSystem } = require('./filesystem');
const { TestGenerator } = require('./test-generator');

/**
 * @typedef {import('../types').MCPTool} MCPTool
 */

/**
 * Get all available MCP tools.
 * 
 * Creates instances of all tools and returns them as an array of MCPTool
 * objects that can be registered with the MCP client tool registry.
 * 
 * @returns {MCPTool[]} Array of MCP tool definitions
 */
function getAllTools() {
  const analyzer = new CodeAnalyzer();
  const dependencies = new DependencyChecker();
  const filesystem = new FileSystem();
  const testGenerator = new TestGenerator();

  return [
    {
      name: analyzer.name,
      description: analyzer.description,
      inputSchema: analyzer.inputSchema,
      mcpName: analyzer.name,
      timeout: 5000, // 5 seconds default
      enabled: true,
    },
    {
      name: dependencies.name,
      description: dependencies.description,
      inputSchema: dependencies.inputSchema,
      mcpName: dependencies.name,
      timeout: 5000, // 5 seconds default (network call may take longer)
      enabled: true,
    },
    {
      name: filesystem.name,
      description: filesystem.description,
      inputSchema: filesystem.inputSchema,
      mcpName: filesystem.name,
      timeout: 5000, // 5 seconds default
      enabled: true,
    },
    {
      name: testGenerator.name,
      description: testGenerator.description,
      inputSchema: testGenerator.inputSchema,
      mcpName: testGenerator.name,
      timeout: 5000, // 5 seconds default
      enabled: true,
    },
  ];
}

/**
 * Get tool instance by name.
 * 
 * @param {string} toolName - Tool name
 * @returns {CodeAnalyzer|DependencyChecker|FileSystem|TestGenerator|null} Tool instance or null
 */
function getToolInstance(toolName) {
  switch (toolName) {
    case 'analyzer':
      return new CodeAnalyzer();
    case 'dependencies':
      return new DependencyChecker();
    case 'filesystem':
      return new FileSystem();
    case 'test-generator':
      return new TestGenerator();
    default:
      return null;
  }
}

module.exports = {
  getAllTools,
  getToolInstance,
  CodeAnalyzer,
  DependencyChecker,
  FileSystem,
  TestGenerator,
};
