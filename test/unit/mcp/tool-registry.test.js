/**
 * Unit tests for ToolRegistry.
 * 
 * @module test/unit/mcp/tool-registry
 */

const { ToolRegistry } = require('../../../src/mcp/tool-registry');

// Mock the tools/index module
jest.mock('../../../src/mcp/tools', () => ({
  getAllTools: jest.fn(() => [
    {
      name: 'analyzer',
      description: 'Code analyzer tool',
      inputSchema: { type: 'object' },
      mcpName: 'analyzer',
      timeout: 5000,
      enabled: true,
    },
    {
      name: 'dependencies',
      description: 'Dependency checker tool',
      inputSchema: { type: 'object' },
      mcpName: 'dependencies',
      timeout: 5000,
      enabled: true,
    },
    {
      name: 'filesystem',
      description: 'File system tool',
      inputSchema: { type: 'object' },
      mcpName: 'filesystem',
      timeout: 5000,
      enabled: false, // Disabled for testing
    },
  ]),
}));

const { getAllTools } = require('../../../src/mcp/tools');

describe('ToolRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new ToolRegistry();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should create empty registry', () => {
      expect(registry.getAllTools()).toEqual([]);
    });

    test('should have internal _tools Map', () => {
      expect(registry._tools).toBeInstanceOf(Map);
      expect(registry._tools.size).toBe(0);
    });
  });

  describe('register', () => {
    test('should register a valid tool', () => {
      const tool = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: { type: 'object' },
        mcpName: 'test-tool',
        timeout: 5000,
        enabled: true,
      };

      registry.register(tool);

      expect(registry.hasTool('test-tool')).toBe(true);
      expect(registry.getTool('test-tool')).toBe(tool);
    });

    test('should throw error when name is missing', () => {
      const tool = {
        description: 'A test tool',
        inputSchema: { type: 'object' },
      };

      expect(() => registry.register(tool)).toThrow(
        'Tool must have name, description, and inputSchema'
      );
    });

    test('should throw error when description is missing', () => {
      const tool = {
        name: 'test-tool',
        inputSchema: { type: 'object' },
      };

      expect(() => registry.register(tool)).toThrow(
        'Tool must have name, description, and inputSchema'
      );
    });

    test('should throw error when inputSchema is missing', () => {
      const tool = {
        name: 'test-tool',
        description: 'A test tool',
      };

      expect(() => registry.register(tool)).toThrow(
        'Tool must have name, description, and inputSchema'
      );
    });

    test('should overwrite existing tool with same name', () => {
      const tool1 = {
        name: 'test-tool',
        description: 'First version',
        inputSchema: { type: 'object' },
      };
      const tool2 = {
        name: 'test-tool',
        description: 'Second version',
        inputSchema: { type: 'object' },
      };

      registry.register(tool1);
      registry.register(tool2);

      expect(registry.getTool('test-tool').description).toBe('Second version');
      expect(registry.getAllTools().length).toBe(1);
    });

    test('should register multiple tools', () => {
      const tool1 = {
        name: 'tool-1',
        description: 'Tool 1',
        inputSchema: { type: 'object' },
      };
      const tool2 = {
        name: 'tool-2',
        description: 'Tool 2',
        inputSchema: { type: 'object' },
      };

      registry.register(tool1);
      registry.register(tool2);

      expect(registry.getAllTools().length).toBe(2);
      expect(registry.hasTool('tool-1')).toBe(true);
      expect(registry.hasTool('tool-2')).toBe(true);
    });
  });

  describe('getTool', () => {
    test('should return tool by name', () => {
      const tool = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: { type: 'object' },
      };

      registry.register(tool);

      expect(registry.getTool('test-tool')).toBe(tool);
    });

    test('should return null for non-existent tool', () => {
      expect(registry.getTool('non-existent')).toBeNull();
    });

    test('should return null for empty string', () => {
      expect(registry.getTool('')).toBeNull();
    });
  });

  describe('getAllTools', () => {
    test('should return empty array when no tools registered', () => {
      expect(registry.getAllTools()).toEqual([]);
    });

    test('should return array of all registered tools', () => {
      const tool1 = {
        name: 'tool-1',
        description: 'Tool 1',
        inputSchema: { type: 'object' },
      };
      const tool2 = {
        name: 'tool-2',
        description: 'Tool 2',
        inputSchema: { type: 'object' },
      };

      registry.register(tool1);
      registry.register(tool2);

      const tools = registry.getAllTools();
      expect(tools.length).toBe(2);
      expect(tools).toContainEqual(tool1);
      expect(tools).toContainEqual(tool2);
    });

    test('should return new array each time', () => {
      const tool = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: { type: 'object' },
      };

      registry.register(tool);

      const tools1 = registry.getAllTools();
      const tools2 = registry.getAllTools();

      expect(tools1).not.toBe(tools2);
      expect(tools1).toEqual(tools2);
    });
  });

  describe('hasTool', () => {
    test('should return true for existing tool', () => {
      const tool = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: { type: 'object' },
      };

      registry.register(tool);

      expect(registry.hasTool('test-tool')).toBe(true);
    });

    test('should return false for non-existent tool', () => {
      expect(registry.hasTool('non-existent')).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(registry.hasTool('')).toBe(false);
    });
  });

  describe('toClaudeTools', () => {
    test('should convert enabled tools to Claude format', () => {
      const tool = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: { type: 'object', properties: { foo: { type: 'string' } } },
        mcpName: 'test-tool',
        timeout: 5000,
        enabled: true,
      };

      registry.register(tool);

      const claudeTools = registry.toClaudeTools();
      expect(claudeTools.length).toBe(1);
      expect(claudeTools[0]).toEqual({
        name: 'test-tool',
        description: 'A test tool',
        input_schema: { type: 'object', properties: { foo: { type: 'string' } } },
      });
    });

    test('should filter out disabled tools', () => {
      const enabledTool = {
        name: 'enabled-tool',
        description: 'Enabled tool',
        inputSchema: { type: 'object' },
        enabled: true,
      };
      const disabledTool = {
        name: 'disabled-tool',
        description: 'Disabled tool',
        inputSchema: { type: 'object' },
        enabled: false,
      };

      registry.register(enabledTool);
      registry.register(disabledTool);

      const claudeTools = registry.toClaudeTools();
      expect(claudeTools.length).toBe(1);
      expect(claudeTools[0].name).toBe('enabled-tool');
    });

    test('should return empty array when no tools', () => {
      expect(registry.toClaudeTools()).toEqual([]);
    });

    test('should return empty array when all tools disabled', () => {
      const tool = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: { type: 'object' },
        enabled: false,
      };

      registry.register(tool);

      expect(registry.toClaudeTools()).toEqual([]);
    });

    test('should use input_schema instead of inputSchema', () => {
      const tool = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: { type: 'object' },
        enabled: true,
      };

      registry.register(tool);

      const claudeTools = registry.toClaudeTools();
      expect(claudeTools[0]).toHaveProperty('input_schema');
      expect(claudeTools[0]).not.toHaveProperty('inputSchema');
    });

    test('should not include extra properties', () => {
      const tool = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: { type: 'object' },
        mcpName: 'test-tool',
        timeout: 5000,
        enabled: true,
      };

      registry.register(tool);

      const claudeTools = registry.toClaudeTools();
      expect(claudeTools[0]).toEqual({
        name: 'test-tool',
        description: 'A test tool',
        input_schema: { type: 'object' },
      });
      expect(claudeTools[0]).not.toHaveProperty('mcpName');
      expect(claudeTools[0]).not.toHaveProperty('timeout');
      expect(claudeTools[0]).not.toHaveProperty('enabled');
    });
  });

  describe('registerAllTools', () => {
    test('should register all tools from getAllTools()', () => {
      registry.registerAllTools();

      expect(getAllTools).toHaveBeenCalled();
      expect(registry.getAllTools().length).toBe(3);
      expect(registry.hasTool('analyzer')).toBe(true);
      expect(registry.hasTool('dependencies')).toBe(true);
      expect(registry.hasTool('filesystem')).toBe(true);
    });

    test('should call getAllTools() from tools/index', () => {
      registry.registerAllTools();

      expect(getAllTools).toHaveBeenCalledTimes(1);
    });

    test('should preserve tool properties', () => {
      registry.registerAllTools();

      const analyzer = registry.getTool('analyzer');
      expect(analyzer.description).toBe('Code analyzer tool');
      expect(analyzer.mcpName).toBe('analyzer');
      expect(analyzer.timeout).toBe(5000);
      expect(analyzer.enabled).toBe(true);
    });

    test('should handle disabled tools correctly', () => {
      registry.registerAllTools();

      const filesystem = registry.getTool('filesystem');
      expect(filesystem.enabled).toBe(false);

      // toClaudeTools should filter it out
      const claudeTools = registry.toClaudeTools();
      expect(claudeTools.map(t => t.name)).not.toContain('filesystem');
    });
  });

  describe('edge cases', () => {
    test('should handle tool with empty name', () => {
      const tool = {
        name: '',
        description: 'A test tool',
        inputSchema: { type: 'object' },
      };

      expect(() => registry.register(tool)).toThrow();
    });

    test('should handle tool with empty description', () => {
      const tool = {
        name: 'test-tool',
        description: '',
        inputSchema: { type: 'object' },
      };

      expect(() => registry.register(tool)).toThrow();
    });

    test('should handle complex inputSchema', () => {
      const tool = {
        name: 'complex-tool',
        description: 'A complex tool',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            checks: {
              type: 'array',
              items: { type: 'string', enum: ['syntax', 'purity'] },
            },
          },
          required: ['code', 'checks'],
        },
        enabled: true,
      };

      registry.register(tool);

      const claudeTools = registry.toClaudeTools();
      expect(claudeTools[0].input_schema).toEqual(tool.inputSchema);
    });
  });
});
