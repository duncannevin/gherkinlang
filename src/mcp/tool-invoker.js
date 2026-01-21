/**
 * Tool invoker for executing MCP tool calls.
 * 
 * Handles tool invocation via MCP protocol, timeout management, and result
 * formatting for Claude API. Provides the interface for AI transformer to
 * execute tools during compilation.
 * 
 * @module mcp/tool-invoker
 */

/**
 * @typedef {import('./types').ToolResult} ToolResult
 * @typedef {import('./types').JSONRPCRequest} JSONRPCRequest
 * @typedef {import('./types').JSONRPCResponse} JSONRPCResponse
 * @typedef {import('./types').PendingRequest} PendingRequest
 */

/**
 * @typedef {import('./client').MCPClient} MCPClient
 */

/**
 * Claude API tool_result content block format.
 * 
 * @typedef {Object} ClaudeToolResult
 * @property {string} type - Always "tool_result"
 * @property {string} tool_use_id - Tool use ID from Claude tool_use request
 * @property {Array<{type: string, text: string}>} content - Tool result content
 * @property {boolean} [is_error] - Whether this is an error result
 */

/**
 * Tool invoker for executing MCP tool calls.
 * 
 * @class ToolInvoker
 */
class ToolInvoker {
  /**
   * Creates a new ToolInvoker instance.
   * 
   * @param {MCPClient} mcpClient - MCP client instance for tool invocation
   */
  constructor(mcpClient) {
    /** @type {MCPClient} */
    this._client = mcpClient;
  }

  /**
   * Invoke a tool with parameters.
   * 
   * @param {string} toolName - Name of tool to invoke
   * @param {Object} arguments - Tool invocation parameters
   * @returns {Promise<ToolResult>} Tool execution result
   */
  async invokeTool(toolName, arguments) {
    const startTime = Date.now();
    
    const tool = this._client.getTools().find(t => t.name === toolName);
    if (!tool) {
      /** @type {ToolResult} */
      return {
        success: false,
        error: `Tool not found: ${toolName}`,
        duration: Date.now() - startTime,
      };
    }

    try {
      /** @type {JSONRPCRequest} */
      const request = {
        jsonrpc: '2.0',
        id: this._client._connection.requestId++,
        method: 'tools/call',
        params: {
          name: tool.mcpName,
          arguments,
        },
      };

      const response = await this._sendRequestWithTimeout(request, tool.timeout);

      if (response.error) {
        /** @type {ToolResult} */
        return {
          success: false,
          error: response.error.message || 'Tool invocation failed',
          duration: Date.now() - startTime,
        };
      }

      /** @type {ToolResult} */
      return {
        success: true,
        content: response.result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      /** @type {ToolResult} */
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Send JSON-RPC request with timeout.
   * 
   * @private
   * @param {JSONRPCRequest} request - JSON-RPC request object
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<JSONRPCResponse>} JSON-RPC response
   * @throws {Error} If request fails or times out
   */
  async _sendRequestWithTimeout(request, timeout) {
    return new Promise((resolve, reject) => {
      const id = request.id;
      /** @type {NodeJS.Timeout} */
      let timeoutId;

      /** @type {PendingRequest} */
      const pendingRequest = {
        id,
        method: request.method,
        resolve: (response) => {
          clearTimeout(timeoutId);
          resolve(response);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        timeout: timeoutId = setTimeout(() => {
          this._client._connection.pendingRequests.delete(id);
          reject(new Error(`Tool invocation timeout after ${timeout}ms`));
        }, timeout),
      };

      this._client._connection.pendingRequests.set(id, pendingRequest);

      const message = JSON.stringify(request) + '\n';
      this._client._connection.serverProcess.stdin.write(message, (err) => {
        if (err) {
          this._client._connection.pendingRequests.delete(id);
          clearTimeout(timeoutId);
          reject(err);
        }
      });
    });
  }

  /**
   * Format tool result for Claude API tool_result format.
   * 
   * Converts ToolResult to the format expected by Claude API in multi-turn
   * conversations. Includes error handling for failed tool invocations.
   * 
   * @param {string} toolUseId - Tool use ID from Claude tool_use request
   * @param {ToolResult} toolResult - Tool execution result
   * @returns {ClaudeToolResult} Claude tool_result format
   */
  formatToolResult(toolUseId, toolResult) {
    if (toolResult.success) {
      /** @type {ClaudeToolResult} */
      return {
        type: 'tool_result',
        tool_use_id: toolUseId,
        content: [
          {
            type: 'text',
            text: JSON.stringify(toolResult.content),
          },
        ],
      };
    } else {
      /** @type {ClaudeToolResult} */
      return {
        type: 'tool_result',
        tool_use_id: toolUseId,
        content: [
          {
            type: 'text',
            text: `Error: ${toolResult.error}`,
          },
        ],
        is_error: true,
      };
    }
  }
}

module.exports = { ToolInvoker };