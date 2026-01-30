/**
 * Unit tests for CodeAnalyzer MCP tool.
 * 
 * @module test/unit/mcp/tools/analyzer
 */

const { CodeAnalyzer } = require('../../../../src/mcp/tools/analyzer');

describe('CodeAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new CodeAnalyzer();
  });

  describe('constructor', () => {
    test('should have correct name', () => {
      expect(analyzer.name).toBe('analyzer');
    });

    test('should have description', () => {
      expect(analyzer.description).toBeDefined();
      expect(typeof analyzer.description).toBe('string');
    });

    test('should have valid inputSchema', () => {
      expect(analyzer.inputSchema).toEqual({
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'JavaScript code to analyze',
          },
          checks: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['syntax', 'purity'],
            },
            description: 'Types of checks to perform',
          },
        },
        required: ['code', 'checks'],
      });
    });
  });

  describe('execute - input validation', () => {
    test('should return error when code is missing', async () => {
      const result = await analyzer.execute({ checks: ['syntax'] });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Code parameter is required and must be a string');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('should return error when code is not a string', async () => {
      const result = await analyzer.execute({ code: 123, checks: ['syntax'] });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Code parameter is required and must be a string');
    });

    test('should return error when checks is missing', async () => {
      const result = await analyzer.execute({ code: 'const x = 1;' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Checks parameter is required and must be an array');
    });

    test('should return error when checks is not an array', async () => {
      const result = await analyzer.execute({ code: 'const x = 1;', checks: 'syntax' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Checks parameter is required and must be an array');
    });
  });

  describe('execute - syntax check', () => {
    test('should pass valid JavaScript code', async () => {
      const result = await analyzer.execute({
        code: 'const x = 1;\nconst y = x + 2;',
        checks: ['syntax'],
      });

      expect(result.success).toBe(true);
      expect(result.content.valid).toBe(true);
      expect(result.content.errors).toEqual([]);
    });

    test('should detect syntax errors', async () => {
      const result = await analyzer.execute({
        code: 'const x = ;',
        checks: ['syntax'],
      });

      expect(result.success).toBe(true);
      expect(result.content.valid).toBe(false);
      expect(result.content.errors.length).toBeGreaterThan(0);
      expect(result.content.errors[0].type).toBe('syntax');
    });

    test('should detect missing closing brace', async () => {
      const result = await analyzer.execute({
        code: 'function foo() { return 1;',
        checks: ['syntax'],
      });

      expect(result.success).toBe(true);
      expect(result.content.valid).toBe(false);
      expect(result.content.errors.length).toBeGreaterThan(0);
    });

    test('should detect invalid token', async () => {
      const result = await analyzer.execute({
        code: 'const @ = 1;',
        checks: ['syntax'],
      });

      expect(result.success).toBe(true);
      expect(result.content.valid).toBe(false);
    });

    test('should validate arrow functions', async () => {
      const result = await analyzer.execute({
        code: 'const add = (a, b) => a + b;',
        checks: ['syntax'],
      });

      expect(result.success).toBe(true);
      expect(result.content.valid).toBe(true);
    });

    test('should validate complex valid code', async () => {
      const code = `
        const compose = (...fns) => x => fns.reduceRight((acc, fn) => fn(acc), x);
        const add = a => b => a + b;
        const multiply = a => b => a * b;
        const result = compose(add(1), multiply(2))(5);
      `;
      const result = await analyzer.execute({ code, checks: ['syntax'] });

      expect(result.success).toBe(true);
      expect(result.content.valid).toBe(true);
    });
  });

  describe('execute - purity check', () => {
    test('should pass pure code', async () => {
      const result = await analyzer.execute({
        code: 'const add = (a, b) => a + b;',
        checks: ['purity'],
      });

      expect(result.success).toBe(true);
      expect(result.content.valid).toBe(true);
      expect(result.content.errors).toEqual([]);
    });

    test('should detect console.log', async () => {
      const result = await analyzer.execute({
        code: 'console.log("hello");',
        checks: ['purity'],
      });

      expect(result.success).toBe(true);
      expect(result.content.valid).toBe(false);
      expect(result.content.errors).toContainEqual(
        expect.objectContaining({
          type: 'purity',
          message: expect.stringContaining('Console operations'),
        })
      );
    });

    test('should detect process.env access', async () => {
      const result = await analyzer.execute({
        code: 'const key = process.env.API_KEY;',
        checks: ['purity'],
      });

      expect(result.success).toBe(true);
      expect(result.content.valid).toBe(false);
      expect(result.content.errors).toContainEqual(
        expect.objectContaining({
          type: 'purity',
          message: expect.stringContaining('Process operations'),
        })
      );
    });

    test('should detect Date.now()', async () => {
      const result = await analyzer.execute({
        code: 'const now = Date.now();',
        checks: ['purity'],
      });

      expect(result.success).toBe(true);
      expect(result.content.valid).toBe(false);
      expect(result.content.errors).toContainEqual(
        expect.objectContaining({
          type: 'purity',
          message: expect.stringContaining('Non-deterministic'),
        })
      );
    });

    test('should detect Math.random()', async () => {
      const result = await analyzer.execute({
        code: 'const rand = Math.random();',
        checks: ['purity'],
      });

      expect(result.success).toBe(true);
      expect(result.content.valid).toBe(false);
      expect(result.content.errors).toContainEqual(
        expect.objectContaining({
          type: 'purity',
          message: expect.stringContaining('Non-deterministic'),
        })
      );
    });

    test('should detect array mutations', async () => {
      const result = await analyzer.execute({
        code: 'const arr = [1, 2]; arr.push(3);',
        checks: ['purity'],
      });

      expect(result.success).toBe(true);
      expect(result.content.valid).toBe(false);
      expect(result.content.errors).toContainEqual(
        expect.objectContaining({
          type: 'purity',
          message: expect.stringContaining('Array mutations'),
        })
      );
    });

    test('should detect increment/decrement operators', async () => {
      const result = await analyzer.execute({
        code: 'let x = 1; x++;',
        checks: ['purity'],
      });

      expect(result.success).toBe(true);
      expect(result.content.valid).toBe(false);
      expect(result.content.errors).toContainEqual(
        expect.objectContaining({
          type: 'purity',
          message: expect.stringContaining('Increment/decrement'),
        })
      );
    });

    test('should detect loops', async () => {
      const result = await analyzer.execute({
        code: 'for (let i = 0; i < 10; i++) {}',
        checks: ['purity'],
      });

      expect(result.success).toBe(true);
      expect(result.content.valid).toBe(false);
      expect(result.content.errors).toContainEqual(
        expect.objectContaining({
          type: 'purity',
          message: expect.stringContaining('Loops are not allowed'),
        })
      );
    });

    test('should detect this keyword', async () => {
      const result = await analyzer.execute({
        code: 'function foo() { return this.value; }',
        checks: ['purity'],
      });

      expect(result.success).toBe(true);
      expect(result.content.valid).toBe(false);
      expect(result.content.errors).toContainEqual(
        expect.objectContaining({
          type: 'purity',
          message: expect.stringContaining('this keyword'),
        })
      );
    });

    test('should detect class declarations', async () => {
      const result = await analyzer.execute({
        code: 'class MyClass {}',
        checks: ['purity'],
      });

      expect(result.success).toBe(true);
      expect(result.content.valid).toBe(false);
      expect(result.content.errors).toContainEqual(
        expect.objectContaining({
          type: 'purity',
          message: expect.stringContaining('Class declarations'),
        })
      );
    });

    test('should allow new Error()', async () => {
      const result = await analyzer.execute({
        code: 'const err = new Error("oops");',
        checks: ['purity'],
      });

      expect(result.success).toBe(true);
      expect(result.content.valid).toBe(true);
    });

    test('should detect new expressions for non-Error', async () => {
      const result = await analyzer.execute({
        code: 'const map = new Map();',
        checks: ['purity'],
      });

      expect(result.success).toBe(true);
      expect(result.content.valid).toBe(false);
      expect(result.content.errors).toContainEqual(
        expect.objectContaining({
          type: 'purity',
          message: expect.stringContaining('new expressions'),
        })
      );
    });
  });

  describe('execute - combined checks', () => {
    test('should run both syntax and purity checks', async () => {
      const result = await analyzer.execute({
        code: 'const x = 1; console.log(x);',
        checks: ['syntax', 'purity'],
      });

      expect(result.success).toBe(true);
      // Syntax is valid, but purity fails
      expect(result.content.valid).toBe(false);
      expect(result.content.errors.some(e => e.type === 'purity')).toBe(true);
    });

    test('should report all errors from multiple checks', async () => {
      const result = await analyzer.execute({
        code: 'console.log("hi"); let x = 1; x++;',
        checks: ['syntax', 'purity'],
      });

      expect(result.success).toBe(true);
      expect(result.content.valid).toBe(false);
      expect(result.content.errors.length).toBeGreaterThanOrEqual(2);
    });

    test('should pass code that is both syntactically and functionally pure', async () => {
      const code = `
        const add = (a, b) => a + b;
        const multiply = (a, b) => a * b;
        const compose = (f, g) => x => f(g(x));
      `;
      const result = await analyzer.execute({ code, checks: ['syntax', 'purity'] });

      expect(result.success).toBe(true);
      expect(result.content.valid).toBe(true);
      expect(result.content.errors).toEqual([]);
    });
  });

  describe('execute - duration tracking', () => {
    test('should include duration in successful result', async () => {
      const result = await analyzer.execute({
        code: 'const x = 1;',
        checks: ['syntax'],
      });

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('should include duration in error result', async () => {
      const result = await analyzer.execute({});

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
    });
  });

  describe('execute - empty checks array', () => {
    test('should return valid when no checks are requested', async () => {
      const result = await analyzer.execute({
        code: 'console.log("hello");',
        checks: [],
      });

      expect(result.success).toBe(true);
      expect(result.content.valid).toBe(true);
      expect(result.content.errors).toEqual([]);
      expect(result.content.warnings).toEqual([]);
    });
  });
});
