# API Contract: MCP Client

**Component**: MCP (Model Context Protocol) Client  
**File**: `src/mcp/client.js`  
**Phase**: 1 - Design & Contracts

## Interface

```typescript
interface MCPClient {
  /**
   * Connect to MCP server and discover available tools
   * @param serverCommand - Command to start MCP server (e.g., ['node', 'mcp-server.js'])
   * @returns Array of discovered tools
   */
  connect(serverCommand: string[]): Promise<MCPTool[]>;

  /**
   * Disconnect from MCP server and cleanup
   */
  disconnect(): Promise<void>;

  /**
   * Invoke a tool with parameters
   * @param toolName - Name of tool to invoke
   * @param arguments - Tool invocation parameters
   * @returns Tool execution result
   */
  invokeTool(toolName: string, arguments: object): Promise<ToolResult>;

  /**
   * Check if client is connected
   * @returns true if connected, false otherwise
   */
  isConnected(): boolean;

  /**
   * Get list of available tools
   * @returns Array of registered tools
   */
  getTools(): MCPTool[];
}
```

## Types

```typescript
interface MCPTool {
  name: string; // Tool name (unique)
  description: string; // Tool description
  inputSchema: object; // JSON Schema for parameters
  mcpName: string; // MCP server tool name
  timeout: number; // Timeout in milliseconds (default: 5000)
  enabled: boolean; // Whether tool is enabled
}

interface ToolResult {
  success: boolean;
  content?: object; // Tool result content
  error?: string; // Error message if failed
  duration: number; // Execution duration in milliseconds
}

interface MCPClientConnection {
  serverProcess: ChildProcess;
  connected: boolean;
  tools: Map<string, MCPTool>;
  protocolVersion: string;
  requestId: number;
  pendingRequests: Map<number, PendingRequest>;
}
```

## Connection Behavior

1. **Spawn Server**: Start MCP server as subprocess with stdin/stdout pipes
2. **Initialize**: Send `initialize` request with protocol version and client info
3. **List Tools**: Send `tools/list` request to discover available tools
4. **Register Tools**: Convert MCP tool schemas to internal MCPTool format
5. **Ready**: Client is ready for tool invocations

## Tool Invocation Behavior

1. **Validate**: Check tool exists and arguments match schema
2. **Send Request**: Send `tools/call` JSON-RPC request to server
3. **Wait Response**: Wait for response (timeout: 5 seconds)
4. **Handle Result**: Parse response and return ToolResult
5. **Error Handling**: Return error if timeout or invocation fails

## MCP Protocol Messages

### Initialize
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-06-18",
    "clientInfo": { "name": "gherkinlang-js", "version": "1.0.0" },
    "capabilities": {}
  }
}
```

### List Tools
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

### Call Tool
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "analyzer",
    "arguments": { "code": "...", "checks": ["syntax", "purity"] }
  }
}
```

### Shutdown
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "shutdown"
}
```

## Error Handling

- **Connection Failures**: Fail with clear error about MCP server not available
- **Tool Timeout**: Fail after 5 seconds with timeout error
- **Invalid Tool**: Return error if tool doesn't exist
- **Invalid Arguments**: Return error if arguments don't match schema
- **Server Crash**: Detect subprocess exit, fail with error

## Performance Requirements

- **Connection**: <2 seconds to connect and discover tools
- **Tool Invocation**: <5 seconds for standard operations
- **Message Parsing**: <10ms per message

## Configuration

- **Server Command**: From environment variable `MCP_SERVER_URL` or config
- **Protocol Version**: '2025-06-18' (or latest supported)
- **Timeout**: 5 seconds per tool (configurable)

## Usage Example

```javascript
const client = new MCPClient();

// Connect to MCP server
const tools = await client.connect(['node', 'mcp-server.js']);
console.log('Discovered tools:', tools.map(t => t.name));

// Invoke a tool
const result = await client.invokeTool('analyzer', {
  code: 'const x = 1;',
  checks: ['syntax', 'purity']
});

if (result.success) {
  console.log('Analysis result:', result.content);
} else {
  console.error('Tool failed:', result.error);
}

// Disconnect
await client.disconnect();
```
