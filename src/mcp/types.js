/**
 * Type definitions for MCP (Model Context Protocol) client.
 * 
 * Defines the structure of data flowing through the MCP client pipeline.
 * These types represent the interfaces and data structures used by the
 * MCP client and tool registry.
 * 
 * @module mcp/types
 */

/**
 * Registered capability available during compilation.
 * 
 * @typedef {Object} MCPTool
 * @property {string} name - Tool name (unique identifier)
 * @property {string} description - Tool description for AI
 * @property {Object} inputSchema - JSON Schema for tool parameters
 * @property {string} mcpName - MCP tool name (may differ from name)
 * @property {number} timeout - Timeout in milliseconds (default: 5000)
 * @property {boolean} enabled - Whether tool is enabled
 */

/**
 * Result from tool invocation.
 * 
 * @typedef {Object} ToolResult
 * @property {boolean} success - Whether tool invocation succeeded
 * @property {Object} [content] - Tool result content
 * @property {string} [error] - Error message if invocation failed
 * @property {number} duration - Execution duration in milliseconds
 */

/**
 * Connection state for MCP client-server communication.
 * 
 * @typedef {Object} MCPClientConnection
 * @property {import('child_process').ChildProcess} serverProcess - MCP server subprocess
 * @property {boolean} connected - Whether connection is established
 * @property {Map<string, MCPTool>} tools - Discovered tools
 * @property {string} protocolVersion - MCP protocol version
 * @property {number} requestId - Next request ID for JSON-RPC
 * @property {Map<number, PendingRequest>} pendingRequests - Outstanding requests
 */

/**
 * Pending JSON-RPC request waiting for response.
 * 
 * @typedef {Object} PendingRequest
 * @property {number} id - Request ID
 * @property {string} method - MCP method name
 * @property {Function} resolve - Promise resolve function
 * @property {Function} reject - Promise reject function
 * @property {NodeJS.Timeout} [timeout] - Timeout timer
 */

/**
 * Tool invocation request from AI to execute a specific tool.
 * 
 * @typedef {Object} ToolInvocation
 * @property {string} id - Unique invocation ID (from Claude tool_use)
 * @property {string} toolName - Name of tool to invoke
 * @property {Object} arguments - Tool invocation parameters
 * @property {string} status - Invocation status ('pending' | 'executing' | 'completed' | 'failed' | 'timeout')
 * @property {Object} [result] - Tool execution result
 * @property {string} [error] - Error message if invocation failed
 * @property {Date} startedAt - When invocation started
 * @property {Date} [completedAt] - When invocation completed
 * @property {number} [duration] - Invocation duration in milliseconds
 */

/**
 * JSON-RPC 2.0 request message.
 * 
 * @typedef {Object} JSONRPCRequest
 * @property {string} jsonrpc - Always "2.0"
 * @property {number|string} id - Request ID
 * @property {string} method - Method name
 * @property {Object} [params] - Method parameters
 */

/**
 * JSON-RPC 2.0 response message.
 * 
 * @typedef {Object} JSONRPCResponse
 * @property {string} jsonrpc - Always "2.0"
 * @property {number|string} id - Request ID (matches request)
 * @property {*} [result] - Response result (if success)
 * @property {Object} [error] - Error object (if failure)
 */

/**
 * MCP tool definition from server (tools/list response).
 * 
 * @typedef {Object} MCPToolDefinition
 * @property {string} name - Tool name
 * @property {string} description - Tool description
 * @property {Object} inputSchema - JSON Schema for parameters
 */

module.exports = {
  // Types are exported for JSDoc reference
  // Actual validation and construction is done in implementation files
};
