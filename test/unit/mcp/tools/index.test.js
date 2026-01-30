/**
 * Unit tests for MCP tools index/registry.
 * 
 * @module test/unit/mcp/tools/index
 */

const {
  getAllTools,
  getToolInstance,
  CodeAnalyzer,
  DependencyChecker,
  FileSystem,
  TestGenerator,
} = require('../../../../src/mcp/tools/index');

describe('MCP Tools Index', () => {
  describe('getAllTools', () => {
    test('should return array of tools', () => {
      const tools = getAllTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBe(4);
    });

    test('should include analyzer tool', () => {
      const tools = getAllTools();
      const analyzer = tools.find(t => t.name === 'analyzer');

      expect(analyzer).toBeDefined();
      expect(analyzer.description).toBeDefined();
      expect(analyzer.inputSchema).toBeDefined();
      expect(analyzer.mcpName).toBe('analyzer');
      expect(analyzer.timeout).toBe(5000);
      expect(analyzer.enabled).toBe(true);
    });

    test('should include dependencies tool', () => {
      const tools = getAllTools();
      const dependencies = tools.find(t => t.name === 'dependencies');

      expect(dependencies).toBeDefined();
      expect(dependencies.description).toContain('npm');
      expect(dependencies.inputSchema).toBeDefined();
      expect(dependencies.mcpName).toBe('dependencies');
      expect(dependencies.timeout).toBe(5000);
      expect(dependencies.enabled).toBe(true);
    });

    test('should include filesystem tool', () => {
      const tools = getAllTools();
      const filesystem = tools.find(t => t.name === 'filesystem');

      expect(filesystem).toBeDefined();
      expect(filesystem.description).toContain('file');
      expect(filesystem.inputSchema).toBeDefined();
      expect(filesystem.mcpName).toBe('filesystem');
      expect(filesystem.timeout).toBe(5000);
      expect(filesystem.enabled).toBe(true);
    });

    test('should include test-generator tool', () => {
      const tools = getAllTools();
      const testGenerator = tools.find(t => t.name === 'test-generator');

      expect(testGenerator).toBeDefined();
      expect(testGenerator.description).toContain('Jest');
      expect(testGenerator.inputSchema).toBeDefined();
      expect(testGenerator.mcpName).toBe('test-generator');
      expect(testGenerator.timeout).toBe(5000);
      expect(testGenerator.enabled).toBe(true);
    });

    test('should return new instances each time', () => {
      const tools1 = getAllTools();
      const tools2 = getAllTools();

      // They should have same content but be different objects
      expect(tools1).not.toBe(tools2);
      expect(tools1[0]).not.toBe(tools2[0]);
    });

    test('each tool should have required MCPTool properties', () => {
      const tools = getAllTools();

      for (const tool of tools) {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool).toHaveProperty('mcpName');
        expect(tool).toHaveProperty('timeout');
        expect(tool).toHaveProperty('enabled');

        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.inputSchema).toBe('object');
        expect(typeof tool.mcpName).toBe('string');
        expect(typeof tool.timeout).toBe('number');
        expect(typeof tool.enabled).toBe('boolean');
      }
    });
  });

  describe('getToolInstance', () => {
    test('should return CodeAnalyzer for "analyzer"', () => {
      const instance = getToolInstance('analyzer');

      expect(instance).toBeInstanceOf(CodeAnalyzer);
      expect(instance.name).toBe('analyzer');
    });

    test('should return DependencyChecker for "dependencies"', () => {
      const instance = getToolInstance('dependencies');

      expect(instance).toBeInstanceOf(DependencyChecker);
      expect(instance.name).toBe('dependencies');
    });

    test('should return FileSystem for "filesystem"', () => {
      const instance = getToolInstance('filesystem');

      expect(instance).toBeInstanceOf(FileSystem);
      expect(instance.name).toBe('filesystem');
    });

    test('should return TestGenerator for "test-generator"', () => {
      const instance = getToolInstance('test-generator');

      expect(instance).toBeInstanceOf(TestGenerator);
      expect(instance.name).toBe('test-generator');
    });

    test('should return null for unknown tool', () => {
      const instance = getToolInstance('unknown-tool');

      expect(instance).toBeNull();
    });

    test('should return null for empty string', () => {
      const instance = getToolInstance('');

      expect(instance).toBeNull();
    });

    test('should return new instance each time', () => {
      const instance1 = getToolInstance('analyzer');
      const instance2 = getToolInstance('analyzer');

      expect(instance1).not.toBe(instance2);
      expect(instance1.name).toBe(instance2.name);
    });
  });

  describe('exports', () => {
    test('should export CodeAnalyzer class', () => {
      expect(CodeAnalyzer).toBeDefined();
      expect(typeof CodeAnalyzer).toBe('function');

      const instance = new CodeAnalyzer();
      expect(instance.name).toBe('analyzer');
    });

    test('should export DependencyChecker class', () => {
      expect(DependencyChecker).toBeDefined();
      expect(typeof DependencyChecker).toBe('function');

      const instance = new DependencyChecker();
      expect(instance.name).toBe('dependencies');
    });

    test('should export FileSystem class', () => {
      expect(FileSystem).toBeDefined();
      expect(typeof FileSystem).toBe('function');

      const instance = new FileSystem();
      expect(instance.name).toBe('filesystem');
    });

    test('should export TestGenerator class', () => {
      expect(TestGenerator).toBeDefined();
      expect(typeof TestGenerator).toBe('function');

      const instance = new TestGenerator();
      expect(instance.name).toBe('test-generator');
    });
  });

  describe('tool execute methods', () => {
    test('CodeAnalyzer should have execute method', async () => {
      const instance = getToolInstance('analyzer');
      expect(typeof instance.execute).toBe('function');

      const result = await instance.execute({ code: 'const x = 1;', checks: ['syntax'] });
      expect(result.success).toBe(true);
    });

    test('DependencyChecker should have execute method', () => {
      const instance = getToolInstance('dependencies');
      expect(typeof instance.execute).toBe('function');
    });

    test('FileSystem should have execute method', () => {
      const instance = getToolInstance('filesystem');
      expect(typeof instance.execute).toBe('function');
    });

    test('TestGenerator should have execute method', async () => {
      const instance = getToolInstance('test-generator');
      expect(typeof instance.execute).toBe('function');

      const result = await instance.execute({ code: 'const x = 1;' });
      expect(result.success).toBe(true);
    });
  });
});
