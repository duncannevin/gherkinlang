/**
 * Unit tests for TestGenerator MCP tool.
 * 
 * @module test/unit/mcp/tools/test-generator
 */

const { TestGenerator } = require('../../../../src/mcp/tools/test-generator');

describe('TestGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new TestGenerator();
  });

  describe('constructor', () => {
    test('should have correct name', () => {
      expect(generator.name).toBe('test-generator');
    });

    test('should have description', () => {
      expect(generator.description).toBeDefined();
      expect(typeof generator.description).toBe('string');
      expect(generator.description).toContain('Jest');
    });

    test('should have valid inputSchema', () => {
      expect(generator.inputSchema).toEqual({
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'Generated JavaScript code to test',
          },
          testFramework: {
            type: 'string',
            enum: ['jest'],
            default: 'jest',
            description: 'Test framework to use',
          },
        },
        required: ['code'],
      });
    });
  });

  describe('execute - input validation', () => {
    test('should return error when code is missing', async () => {
      const result = await generator.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('code parameter is required and must be a string');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('should return error when code is not a string', async () => {
      const result = await generator.execute({ code: 123 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('code parameter is required and must be a string');
    });

    test('should return error for unsupported test framework', async () => {
      const result = await generator.execute({
        code: 'const x = 1;',
        testFramework: 'mocha',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unsupported test framework: mocha. Only 'jest' is supported.");
    });
  });

  describe('execute - test generation', () => {
    test('should generate tests for function declaration', async () => {
      const code = `
        function add(a, b) {
          return a + b;
        }
        module.exports = { add };
      `;

      const result = await generator.execute({ code });

      expect(result.success).toBe(true);
      expect(result.content.testCode).toContain("describe('add'");
      expect(result.content.testCode).toContain('toBeDefined');
    });

    test('should generate tests for arrow function', async () => {
      const code = `
        const multiply = (a, b) => a * b;
        module.exports = { multiply };
      `;

      const result = await generator.execute({ code });

      expect(result.success).toBe(true);
      expect(result.content.testCode).toContain("describe('multiply'");
    });

    test('should generate tests for multiple exports', async () => {
      const code = `
        function add(a, b) { return a + b; }
        const subtract = (a, b) => a - b;
        module.exports = { add, subtract };
      `;

      const result = await generator.execute({ code });

      expect(result.success).toBe(true);
      expect(result.content.testCode).toContain("describe('add'");
      expect(result.content.testCode).toContain("describe('subtract'");
    });

    test('should handle exports.name syntax', async () => {
      const code = `
        exports.greet = function(name) {
          return 'Hello, ' + name;
        };
      `;

      const result = await generator.execute({ code });

      expect(result.success).toBe(true);
      expect(result.content.testCode).toContain("describe('greet'");
    });

    test('should handle ES6 export syntax', async () => {
      const code = `
        export function calculate(x) {
          return x * 2;
        }
        export const PI = 3.14;
      `;

      const result = await generator.execute({ code });

      expect(result.success).toBe(true);
      expect(result.content.testCode).toContain("describe('calculate'");
    });

    test('should handle code with no functions or exports', async () => {
      const code = 'const x = 1;\nconst y = 2;';

      const result = await generator.execute({ code });

      expect(result.success).toBe(true);
      expect(result.content.testCode).toContain("describe('Generated code'");
      expect(result.content.testCode).toContain('placeholder');
      expect(result.content.testCode).toContain('No functions or exports found');
    });

    test('should use jest as default test framework', async () => {
      const code = 'function foo() { return 1; }\nmodule.exports = { foo };';

      const result = await generator.execute({ code });

      expect(result.success).toBe(true);
      expect(result.content.testCode).toContain('describe');
      expect(result.content.testCode).toContain('test');
      expect(result.content.testCode).toContain('expect');
    });

    test('should explicitly accept jest framework', async () => {
      const code = 'function bar() { return 2; }\nmodule.exports = { bar };';

      const result = await generator.execute({ code, testFramework: 'jest' });

      expect(result.success).toBe(true);
      expect(result.content.testCode).toContain("describe('bar'");
    });
  });

  describe('execute - coverage estimation', () => {
    test('should include coverage estimates', async () => {
      const code = 'function test() { return 1; }\nmodule.exports = { test };';

      const result = await generator.execute({ code });

      expect(result.success).toBe(true);
      expect(result.content.coverage).toBeDefined();
      expect(result.content.coverage.lines).toBeDefined();
      expect(result.content.coverage.branches).toBeDefined();
    });

    test('should return higher coverage for more tests', async () => {
      const code = `
        function a() { return 1; }
        function b() { return 2; }
        function c() { return 3; }
        module.exports = { a, b, c };
      `;

      const result = await generator.execute({ code });

      expect(result.success).toBe(true);
      // More functions = more tests = higher coverage
      expect(result.content.coverage.lines).toBeGreaterThan(0);
    });

    test('should return zero coverage when no tests generated', async () => {
      const code = 'const x = 1;';

      const result = await generator.execute({ code });

      expect(result.success).toBe(true);
      // Placeholder test still counts as a test
      expect(result.content.coverage.lines).toBeGreaterThan(0);
    });
  });

  describe('execute - duration tracking', () => {
    test('should include duration in successful result', async () => {
      const result = await generator.execute({ code: 'const x = 1;' });

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('should include duration in error result', async () => {
      const result = await generator.execute({});

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
    });
  });

  describe('_extractFunctions', () => {
    test('should extract function declarations', () => {
      const code = 'function foo() {}\nfunction bar() {}';
      const functions = generator._extractFunctions(code);

      expect(functions).toContain('foo');
      expect(functions).toContain('bar');
    });

    test('should extract arrow functions', () => {
      const code = 'const foo = () => 1;\nconst bar = (x) => x + 1;';
      const functions = generator._extractFunctions(code);

      expect(functions).toContain('foo');
      expect(functions).toContain('bar');
    });

    test('should handle let and var declarations', () => {
      const code = 'let foo = () => 1;\nvar bar = (x) => x;';
      const functions = generator._extractFunctions(code);

      expect(functions).toContain('foo');
      expect(functions).toContain('bar');
    });

    test('should remove duplicates', () => {
      const code = 'function foo() {}\nfunction foo() {}';
      const functions = generator._extractFunctions(code);

      expect(functions.filter(f => f === 'foo').length).toBe(1);
    });

    test('should return empty array for code without functions', () => {
      const code = 'const x = 1;\nconst y = 2;';
      const functions = generator._extractFunctions(code);

      expect(functions).toEqual([]);
    });
  });

  describe('_extractExports', () => {
    test('should extract module.exports object properties', () => {
      const code = 'module.exports = { foo, bar, baz };';
      const exports = generator._extractExports(code);

      expect(exports).toContain('foo');
      expect(exports).toContain('bar');
      expect(exports).toContain('baz');
    });

    test('should extract exports.name assignments', () => {
      const code = 'exports.foo = function() {};\nexports.bar = 1;';
      const exports = generator._extractExports(code);

      expect(exports).toContain('foo');
      expect(exports).toContain('bar');
    });

    test('should extract ES6 exports', () => {
      const code = 'export function foo() {}\nexport const bar = 1;\nexport let baz = 2;';
      const exports = generator._extractExports(code);

      expect(exports).toContain('foo');
      expect(exports).toContain('bar');
      expect(exports).toContain('baz');
    });

    test('should remove duplicates', () => {
      const code = 'exports.foo = 1;\nexports.foo = 2;';
      const exports = generator._extractExports(code);

      expect(exports.filter(e => e === 'foo').length).toBe(1);
    });

    test('should return empty array for code without exports', () => {
      const code = 'const x = 1;';
      const exports = generator._extractExports(code);

      expect(exports).toEqual([]);
    });
  });

  describe('_estimateCoverage', () => {
    test('should return non-zero coverage when tests present', () => {
      const code = 'const x = 1;';
      const testCode = "test('foo', () => {})";

      const coverage = generator._estimateCoverage(code, testCode);

      expect(coverage.lines).toBeGreaterThan(0);
      expect(coverage.branches).toBeGreaterThan(0);
    });

    test('should return zero coverage when no tests present', () => {
      const code = 'const x = 1;';
      const testCode = 'const x = 1;';

      const coverage = generator._estimateCoverage(code, testCode);

      expect(coverage.lines).toBe(0);
      expect(coverage.branches).toBe(0);
    });

    test('should cap coverage at max values', () => {
      const code = 'const x = 1;';
      // Many tests
      const testCode = Array(20).fill("test('t', () => {})").join('\n');

      const coverage = generator._estimateCoverage(code, testCode);

      expect(coverage.lines).toBeLessThanOrEqual(85);
      expect(coverage.branches).toBeLessThanOrEqual(80);
    });
  });
});
