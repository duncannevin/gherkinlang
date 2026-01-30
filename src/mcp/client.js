/**
 * MCP (Model Context Protocol) client for GherkinLang compiler.
 * 
 * Manages connection to MCP server, tool invocation, result handling, and
 * error recovery. Provides the interface for AI transformer to use MCP tools
 * during compilation (file_system, analyzer, dependencies).
 * 
 * @module mcp/client
 */

const { spawn } = require('child_process');
const { EventEmitter } = require('events');

/**
 * @typedef {import('./types').MCPTool} MCPTool
 * @typedef {import('./types').MCPClientConnection} MCPClientConnection
 * @typedef {import('./types').PendingRequest} PendingRequest
 * @typedef {import('./types').JSONRPCRequest} JSONRPCRequest
 * @typedef {import('./types').JSONRPCResponse} JSONRPCResponse
 * @typedef {import('./types').MCPToolDefinition} MCPToolDefinition
 */

/**
 * MCP Client for connecting to MCP server and invoking tools.
 * 
 * @class MCPClient
 * @extends EventEmitter
 */
class MCPClient extends EventEmitter {
  /**
   * Creates a new MCPClient instance.
   * 
   * @param {Object} [options] - Client configuration options
   * @param {number} [options.connectionTimeout] - Connection timeout in milliseconds (default: 2000)
   * @param {number} [options.requestTimeout] - Request timeout in milliseconds (default: 10000)
   */
  constructor(options = {}) {
    super();
    /** @type {MCPClientConnection|null} */
    this._connection = null;
    /** @type {Object} */
    this._options = options;
  }

  /**
   * Connect to MCP server and discover available tools.
   * 
   * @param {string[]} serverCommand - Command to start MCP server (e.g., ['node', 'mcp-server.js'])
   * @returns {Promise<MCPTool[]>} Array of discovered tools
   * @throws {Error} If already connected or connection fails
   */
  async connect(serverCommand) {
    if (this.isConnected()) {
      throw new Error('Already connected to MCP server');
    }

    // Spawn MCP server subprocess
    const serverProcess = spawn(serverCommand[0], serverCommand.slice(1), {
      stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
      env: process.env,
    });

    // Initialize connection state
    this._connection = {
      serverProcess,
      connected: false,
      tools: new Map(),
      protocolVersion: '2025-06-18',
      requestId: 1,
      pendingRequests: new Map(),
    };

    // Set up stdout handler (responses from server)
    let buffer = '';
    serverProcess.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const messages = this._parseMessages(buffer);
      buffer = messages.remaining;
      messages.complete.forEach(msg => this._handleResponse(msg));
    });

    // Set up stderr handler
    serverProcess.stderr.on('data', (data) => {
      this.emit('error', new Error(`MCP server error: ${data.toString()}`));
    });

    // Handle process exit
    serverProcess.on('exit', (code) => {
      this._connection.connected = false;
      this.emit('disconnected', code);
    });

    await this._initialize();
    const tools = await this._discoverTools();
    
    return Array.from(this._connection.tools.values());
  }

  /**
   * Disconnect from MCP server and cleanup.
   * 
   * Sends shutdown request, closes stdin/stdout streams, kills subprocess,
   * and cleans up connection state.
   * 
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (!this._connection) {
      return;
    }

    try {
      // Send shutdown request if connected
      if (this._connection.connected) {
        /** @type {JSONRPCRequest} */
        const shutdownRequest = {
          jsonrpc: '2.0',
          id: this._connection.requestId++,
          method: 'shutdown',
        };

        // Try to send shutdown, but don't wait too long
        const shutdownPromise = this._sendRequest(shutdownRequest);
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1000));
        await Promise.race([shutdownPromise, timeoutPromise]);
      }
    } catch (error) {
      // Ignore errors during shutdown - we're disconnecting anyway
      this.emit('error', new Error(`Shutdown error: ${error.message}`));
    }

    // Cancel all pending requests
    for (const [id, pendingRequest] of this._connection.pendingRequests) {
      clearTimeout(pendingRequest.timeout);
      pendingRequest.reject(new Error('Connection closed'));
    }
    this._connection.pendingRequests.clear();

    // Close stdin stream
    if (this._connection.serverProcess?.stdin) {
      this._connection.serverProcess.stdin.end();
    }

    // Kill the server process
    if (this._connection.serverProcess) {
      this._connection.serverProcess.kill('SIGTERM');
    }

    // Clear connection state
    this._connection.connected = false;
    this._connection.tools.clear();
    this._connection = null;

    this.emit('disconnected', 0);
  }

  /**
   * Check if client is connected to MCP server.
   * 
   * @returns {boolean} True if connected, false otherwise
   */
  isConnected() {
    return this._connection?.connected === true;
  }

  /**
   * Get list of available tools.
   * 
   * @returns {MCPTool[]} Array of registered tools
   */
  getTools() {
    return Array.from(this._connection?.tools.values() || []);
  }

  /**
   * Initialize MCP protocol connection.
   * 
   * @private
   * @returns {Promise<void>}
   * @throws {Error} If initialization fails
   */
  async _initialize() {
    /** @type {JSONRPCRequest} */
    const request = {
      jsonrpc: '2.0',
      id: this._connection.requestId++,
      method: 'initialize',
      params: {
        protocolVersion: this._connection.protocolVersion,
        clientInfo: {
          name: 'gherkinlang-js',
          version: '1.0.0',
        },
        capabilities: {},
      },
    };
  
    const response = await this._sendRequest(request);
    
    if (response.error) {
      throw new Error(`MCP initialization failed: ${response.error.message}`);
    }
  
    this._connection.connected = true;
    this.emit('connected');
  }
  
  /**
   * Discover available tools from MCP server.
   * 
   * @private
   * @returns {Promise<MCPTool[]>} Array of discovered tools
   * @throws {Error} If tool discovery fails
   */
  async _discoverTools() {
    /** @type {JSONRPCRequest} */
    const request = {
      jsonrpc: '2.0',
      id: this._connection.requestId++,
      method: 'tools/list',
    };
  
    const response = await this._sendRequest(request);
  
    if (response.error) {
      throw new Error(`Tool discovery failed: ${response.error.message}`);
    }
  
    /** @type {MCPToolDefinition[]} */
    const tools = response.result?.tools || [];
    
    for (const toolDef of tools) {
      /** @type {MCPTool} */
      const tool = {
        name: toolDef.name,
        description: toolDef.description,
        inputSchema: toolDef.inputSchema,
        mcpName: toolDef.name,
        timeout: 5000,
        enabled: true,
      };
      
      this._connection.tools.set(tool.name, tool);
    }
  
    return Array.from(this._connection.tools.values());
  }
  
  /**
   * Send JSON-RPC request and wait for response.
   * 
   * @private
   * @param {JSONRPCRequest} request - JSON-RPC request object
   * @returns {Promise<JSONRPCResponse>} JSON-RPC response
   * @throws {Error} If request fails or times out
   */
  async _sendRequest(request) {
    return new Promise((resolve, reject) => {
      const id = request.id;
      
      /** @type {PendingRequest} */
      const pendingRequest = {
        id,
        method: request.method,
        resolve,
        reject,
        timeout: setTimeout(() => {
          this._connection.pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${request.method}`));
        }, 10000),
      };
      
      this._connection.pendingRequests.set(id, pendingRequest);
  
      const message = JSON.stringify(request) + '\n';
      this._connection.serverProcess.stdin.write(message, (err) => {
        if (err) {
          this._connection.pendingRequests.delete(id);
          clearTimeout(pendingRequest.timeout);
          reject(err);
        }
      });
    });
  }
  
  /**
   * Handle response from MCP server.
   * 
   * @private
   * @param {JSONRPCResponse} message - JSON-RPC response message
   */
  _handleResponse(message) {
    const { id, result, error } = message;
    const pendingRequest = this._connection.pendingRequests.get(id);
    
    if (!pendingRequest) return;
  
    clearTimeout(pendingRequest.timeout);
    this._connection.pendingRequests.delete(id);
  
    if (error) {
      pendingRequest.reject(new Error(`MCP error: ${error.message}`));
    } else {
      pendingRequest.resolve({ result, error });
    }
  }
  
  /**
   * Parse complete JSON-RPC messages from buffer.
   * 
   * Processes newline-delimited JSON messages from the MCP server stdout stream.
   * Returns complete messages and remaining buffer for next chunk.
   * 
   * @private
   * @param {string} buffer - Accumulated data buffer from stdout
   * @returns {{complete: JSONRPCResponse[], remaining: string}} Parsed messages and remaining buffer
   */
  _parseMessages(buffer) {
    /** @type {JSONRPCResponse[]} */
    const complete = [];
    let remaining = buffer;
    let start = 0;
  
    while (true) {
      const newlineIndex = remaining.indexOf('\n', start);
      if (newlineIndex === -1) break;
  
      const line = remaining.substring(start, newlineIndex).trim();
      if (line) {
        try {
          /** @type {JSONRPCResponse} */
          const message = JSON.parse(line);
          complete.push(message);
        } catch (err) {
          // Invalid JSON - skip
        }
      }
      start = newlineIndex + 1;
    }
  
    remaining = remaining.substring(start);
    return { complete, remaining };
  }
}

module.exports = { MCPClient };
