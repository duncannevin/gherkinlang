/**
 * Unit tests for ToolInvoker.
 * 
 * @module test/unit/mcp/tool-invoker
 */

const { ToolInvoker } = require('../../../src/mcp/tool-invoker');

describe('ToolInvoker', () => {
  let invoker;
  let mockMcpClient;
  let mockStdin;
  let mockPendingRequests;

  beforeEach(() => {
    mockPendingRequests = new Map();
    mockStdin = {
      write: jest.fn((message, callback) => {
        if (callback) callback();
      }),
    };

    mockMcpClient = {
      getTools: jest.fn(() => [
        {
          name: 'analyzer',
          description: 'Code analyzer',
          inputSchema: { type: 'object' },
          mcpName: 'analyzer',
          timeout: 5000,
          enabled: true,
        },
        {
          name: 'dependencies',
          description: 'Dependency checker',
          inputSchema: { type: 'object' },
          mcpName: 'deps-checker',
          timeout: 3000,
          enabled: true,
        },
      ]),
      _connection: {
        requestId: 1,
        pendingRequests: mockPendingRequests,
        serverProcess: {
          stdin: mockStdin,
        },
      },
    };

    invoker = new ToolInvoker(mockMcpClient);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should store MCP client reference', () => {
      expect(invoker._client).toBe(mockMcpClient);
    });
  });

  describe('invokeTool', () => {
    test('should return error when tool not found', async () => {
      const resultPromise = invoker.invokeTool('non-existent', {});
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tool not found: non-existent');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('should call getTools to find tool', async () => {
      const resultPromise = invoker.invokeTool('unknown', {});
      await resultPromise;

      expect(mockMcpClient.getTools).toHaveBeenCalled();
    });

    test('should create correct JSON-RPC request', async () => {
      // Set up to capture the request
      mockStdin.write.mockImplementation((message, callback) => {
        const parsed = JSON.parse(message.trim());
        expect(parsed.jsonrpc).toBe('2.0');
        expect(parsed.method).toBe('tools/call');
        expect(parsed.params.name).toBe('analyzer');
        expect(parsed.params.arguments).toEqual({ code: 'test' });
        
        // Simulate successful response
        const pendingRequest = mockPendingRequests.get(parsed.id);
        if (pendingRequest) {
          pendingRequest.resolve({ result: { valid: true } });
        }
        if (callback) callback();
      });

      await invoker.invokeTool('analyzer', { code: 'test' });

      expect(mockStdin.write).toHaveBeenCalled();
    });

    test('should use tool mcpName in request', async () => {
      mockStdin.write.mockImplementation((message, callback) => {
        const parsed = JSON.parse(message.trim());
        expect(parsed.params.name).toBe('deps-checker'); // mcpName, not name
        
        const pendingRequest = mockPendingRequests.get(parsed.id);
        if (pendingRequest) {
          pendingRequest.resolve({ result: {} });
        }
        if (callback) callback();
      });

      await invoker.invokeTool('dependencies', {});
    });

    test('should increment requestId', async () => {
      const initialId = mockMcpClient._connection.requestId;

      mockStdin.write.mockImplementation((message, callback) => {
        const parsed = JSON.parse(message.trim());
        const pendingRequest = mockPendingRequests.get(parsed.id);
        if (pendingRequest) {
          pendingRequest.resolve({ result: {} });
        }
        if (callback) callback();
      });

      await invoker.invokeTool('analyzer', {});

      expect(mockMcpClient._connection.requestId).toBe(initialId + 1);
    });

    test('should return successful result', async () => {
      mockStdin.write.mockImplementation((message, callback) => {
        const parsed = JSON.parse(message.trim());
        const pendingRequest = mockPendingRequests.get(parsed.id);
        if (pendingRequest) {
          pendingRequest.resolve({ result: { valid: true, errors: [] } });
        }
        if (callback) callback();
      });

      const result = await invoker.invokeTool('analyzer', { code: 'test' });

      expect(result.success).toBe(true);
      expect(result.content).toEqual({ valid: true, errors: [] });
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('should return error result on response error', async () => {
      mockStdin.write.mockImplementation((message, callback) => {
        const parsed = JSON.parse(message.trim());
        const pendingRequest = mockPendingRequests.get(parsed.id);
        if (pendingRequest) {
          pendingRequest.resolve({
            error: { code: -32000, message: 'Tool execution failed' },
          });
        }
        if (callback) callback();
      });

      const result = await invoker.invokeTool('analyzer', { code: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tool execution failed');
    });

    test('should handle error with no message', async () => {
      mockStdin.write.mockImplementation((message, callback) => {
        const parsed = JSON.parse(message.trim());
        const pendingRequest = mockPendingRequests.get(parsed.id);
        if (pendingRequest) {
          pendingRequest.resolve({ error: { code: -32000 } });
        }
        if (callback) callback();
      });

      const result = await invoker.invokeTool('analyzer', { code: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tool invocation failed');
    });

    test('should handle exception during invocation', async () => {
      mockStdin.write.mockImplementation((message, callback) => {
        const parsed = JSON.parse(message.trim());
        const pendingRequest = mockPendingRequests.get(parsed.id);
        if (pendingRequest) {
          pendingRequest.reject(new Error('Connection lost'));
        }
        if (callback) callback();
      });

      const result = await invoker.invokeTool('analyzer', { code: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection lost');
    });

    test('should handle stdin write error', async () => {
      mockStdin.write.mockImplementation((message, callback) => {
        if (callback) callback(new Error('Write failed'));
      });

      const result = await invoker.invokeTool('analyzer', { code: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Write failed');
    });
  });

  describe('_sendRequestWithTimeout', () => {
    test('should set up pending request', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'analyzer', arguments: {} },
      };

      mockStdin.write.mockImplementation((message, callback) => {
        // Verify pending request was added
        expect(mockPendingRequests.has(1)).toBe(true);
        const pending = mockPendingRequests.get(1);
        expect(pending.method).toBe('tools/call');
        pending.resolve({ result: {} });
        if (callback) callback();
      });

      await invoker._sendRequestWithTimeout(request, 5000);
    });

    test('should timeout after specified duration', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'analyzer', arguments: {} },
      };

      mockStdin.write.mockImplementation((message, callback) => {
        // Don't resolve - simulate timeout
        if (callback) callback();
      });

      const promise = invoker._sendRequestWithTimeout(request, 5000);

      // Fast-forward time
      jest.advanceTimersByTime(5001);

      await expect(promise).rejects.toThrow('Tool invocation timeout after 5000ms');
    });

    test('should remove pending request on timeout', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 42,
        method: 'tools/call',
        params: { name: 'analyzer', arguments: {} },
      };

      mockStdin.write.mockImplementation((message, callback) => {
        if (callback) callback();
      });

      const promise = invoker._sendRequestWithTimeout(request, 1000);

      jest.advanceTimersByTime(1001);

      try {
        await promise;
      } catch (e) {
        // Expected
      }

      expect(mockPendingRequests.has(42)).toBe(false);
    });

    test('should clear timeout on success', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'analyzer', arguments: {} },
      };

      mockStdin.write.mockImplementation((message, callback) => {
        const pending = mockPendingRequests.get(1);
        pending.resolve({ result: {} });
        if (callback) callback();
      });

      await invoker._sendRequestWithTimeout(request, 5000);

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    test('should send JSON message with newline', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'test', arguments: { foo: 'bar' } },
      };

      mockStdin.write.mockImplementation((message, callback) => {
        expect(message.endsWith('\n')).toBe(true);
        const parsed = JSON.parse(message.trim());
        expect(parsed).toEqual(request);
        
        const pending = mockPendingRequests.get(1);
        pending.resolve({ result: {} });
        if (callback) callback();
      });

      await invoker._sendRequestWithTimeout(request, 5000);
    });
  });

  describe('formatToolResult', () => {
    test('should format successful result', () => {
      const toolResult = {
        success: true,
        content: { valid: true, errors: [] },
        duration: 100,
      };

      const formatted = invoker.formatToolResult('tool-use-123', toolResult);

      expect(formatted).toEqual({
        type: 'tool_result',
        tool_use_id: 'tool-use-123',
        content: [
          {
            type: 'text',
            text: JSON.stringify({ valid: true, errors: [] }),
          },
        ],
      });
    });

    test('should format error result', () => {
      const toolResult = {
        success: false,
        error: 'Something went wrong',
        duration: 50,
      };

      const formatted = invoker.formatToolResult('tool-use-456', toolResult);

      expect(formatted).toEqual({
        type: 'tool_result',
        tool_use_id: 'tool-use-456',
        content: [
          {
            type: 'text',
            text: 'Error: Something went wrong',
          },
        ],
        is_error: true,
      });
    });

    test('should include is_error only for failures', () => {
      const successResult = {
        success: true,
        content: {},
        duration: 10,
      };

      const formatted = invoker.formatToolResult('id-1', successResult);

      expect(formatted).not.toHaveProperty('is_error');
    });

    test('should handle complex content', () => {
      const toolResult = {
        success: true,
        content: {
          valid: true,
          errors: [],
          warnings: [{ type: 'purity', message: 'Consider refactoring' }],
          metadata: { lines: 100, functions: 5 },
        },
        duration: 200,
      };

      const formatted = invoker.formatToolResult('id-2', toolResult);

      expect(formatted.content[0].type).toBe('text');
      const parsed = JSON.parse(formatted.content[0].text);
      expect(parsed).toEqual(toolResult.content);
    });

    test('should handle null content', () => {
      const toolResult = {
        success: true,
        content: null,
        duration: 5,
      };

      const formatted = invoker.formatToolResult('id-3', toolResult);

      expect(formatted.content[0].text).toBe('null');
    });

    test('should handle undefined error message', () => {
      const toolResult = {
        success: false,
        error: undefined,
        duration: 5,
      };

      const formatted = invoker.formatToolResult('id-4', toolResult);

      expect(formatted.content[0].text).toBe('Error: undefined');
      expect(formatted.is_error).toBe(true);
    });

    test('should set correct type field', () => {
      const toolResult = {
        success: true,
        content: {},
        duration: 10,
      };

      const formatted = invoker.formatToolResult('id-5', toolResult);

      expect(formatted.type).toBe('tool_result');
    });

    test('should preserve tool_use_id', () => {
      const toolResult = {
        success: true,
        content: {},
        duration: 10,
      };

      const formatted = invoker.formatToolResult('my-unique-id-123', toolResult);

      expect(formatted.tool_use_id).toBe('my-unique-id-123');
    });
  });

  describe('integration scenarios', () => {
    test('should handle multiple sequential invocations', async () => {
      mockStdin.write.mockImplementation((message, callback) => {
        const parsed = JSON.parse(message.trim());
        const pending = mockPendingRequests.get(parsed.id);
        if (pending) {
          pending.resolve({ result: { id: parsed.id } });
        }
        if (callback) callback();
      });

      const result1 = await invoker.invokeTool('analyzer', { code: 'a' });
      const result2 = await invoker.invokeTool('analyzer', { code: 'b' });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.content.id).not.toBe(result2.content.id);
    });

    test('should use correct timeout per tool', async () => {
      // Dependencies tool has 3000ms timeout
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'deps-checker', arguments: {} },
      };

      mockStdin.write.mockImplementation((message, callback) => {
        if (callback) callback();
      });

      const promise = invoker._sendRequestWithTimeout(request, 3000);

      // Should not timeout at 2999ms
      jest.advanceTimersByTime(2999);
      
      // Should timeout at 3001ms
      jest.advanceTimersByTime(2);

      await expect(promise).rejects.toThrow('Tool invocation timeout after 3000ms');
    });
  });
});
