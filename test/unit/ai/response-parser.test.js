/**
 * Unit tests for response parser module.
 * 
 * @module test/unit/ai/response-parser
 */

const { ResponseParser } = require('../../../src/ai/response-parser');
const { InvalidCodeError } = require('../../../src/ai/errors');

describe('ResponseParser', () => {
  let parser;

  beforeEach(() => {
    parser = new ResponseParser();
  });

  describe('constructor', () => {
    it('should create a new ResponseParser instance', () => {
      const instance = new ResponseParser();
      expect(instance).toBeInstanceOf(ResponseParser);
    });
  });

  describe('parse', () => {
    it('should extract code from markdown code block', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: 'Here is the code:\n```javascript\nconst x = 1;\n```',
          },
        ],
      };

      const result = parser.parse(response, 'javascript');

      expect(result.code).toBe('const x = 1;');
      expect(result.hasCode).toBe(true);
      expect(result.toolCalls).toEqual([]);
    });

    it('should extract code from code block without language identifier', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: '```\nconst x = 1;\n```',
          },
        ],
      };

      const result = parser.parse(response, 'javascript');

      expect(result.code).toBe('const x = 1;');
      expect(result.hasCode).toBe(true);
    });

    it('should select longest code block when multiple are present', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: '```\nconst x = 1;\n```\nSome text\n```\nfunction test() {\n  return 42;\n}\n```',
          },
        ],
      };

      const result = parser.parse(response, 'javascript');

      expect(result.code).toContain('function test');
      expect(result.code.length).toBeGreaterThan('const x = 1;'.length);
    });

    it('should extract plain code without markdown when it looks like code', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: 'const x = 1;\nfunction test() { return 42; }',
          },
        ],
      };

      const result = parser.parse(response, 'javascript');

      expect(result.code).toContain('const x = 1');
      expect(result.hasCode).toBe(true);
    });

    it('should return null code when text does not look like code', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: 'This is just plain text with no code indicators.',
          },
        ],
      };

      const result = parser.parse(response, 'javascript');

      expect(result.code).toBeNull();
      expect(result.hasCode).toBe(false);
    });

    it('should extract tool calls from response', () => {
      const toolUse = {
        id: 'tool_123',
        name: 'file_system',
        input: { path: '/path/to/file' },
      };

      const response = {
        content: [
          {
            type: 'text',
            text: 'Some text',
          },
          {
            type: 'tool_use',
            tool_use: toolUse,
          },
        ],
      };

      const result = parser.parse(response, 'javascript');

      expect(result.toolCalls).toEqual([toolUse]);
    });

    it('should extract multiple tool calls', () => {
      const toolUse1 = { id: 'tool_1', name: 'tool1', input: {} };
      const toolUse2 = { id: 'tool_2', name: 'tool2', input: {} };

      const response = {
        content: [
          {
            type: 'tool_use',
            tool_use: toolUse1,
          },
          {
            type: 'tool_use',
            tool_use: toolUse2,
          },
        ],
      };

      const result = parser.parse(response, 'javascript');

      expect(result.toolCalls).toEqual([toolUse1, toolUse2]);
    });

    it('should combine multiple text blocks', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: 'First block',
          },
          {
            type: 'text',
            text: 'Second block\n```javascript\nconst x = 1;\n```',
          },
        ],
      };

      const result = parser.parse(response, 'javascript');

      expect(result.code).toBe('const x = 1;');
      expect(result.hasCode).toBe(true);
    });

    it('should validate code and throw error for empty code', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: '```javascript\n   \n```',
          },
        ],
      };

      expect(() => parser.parse(response, 'javascript')).toThrow(InvalidCodeError);
    });

    it('should validate code and throw error for unbalanced braces', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: '```javascript\nfunction test() {\n  return 42;\n```',
          },
        ],
      };

      expect(() => parser.parse(response, 'javascript')).toThrow(InvalidCodeError);
      expect(() => parser.parse(response, 'javascript')).toThrow('unbalanced braces');
    });

    it('should validate code and throw error for unbalanced parentheses', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: '```javascript\nconst x = test(1, 2;\n```',
          },
        ],
      };

      expect(() => parser.parse(response, 'javascript')).toThrow(InvalidCodeError);
      expect(() => parser.parse(response, 'javascript')).toThrow('unbalanced parentheses');
    });

    it('should throw error when response is missing', () => {
      expect(() => parser.parse(null, 'javascript')).toThrow(InvalidCodeError);
      expect(() => parser.parse(undefined, 'javascript')).toThrow(InvalidCodeError);
    });

    it('should throw error when response content is missing', () => {
      expect(() => parser.parse({}, 'javascript')).toThrow(InvalidCodeError);
    });

    it('should handle empty content array', () => {
      const response = {
        content: [],
      };

      const result = parser.parse(response, 'javascript');

      expect(result.code).toBeNull();
      expect(result.hasCode).toBe(false);
      expect(result.toolCalls).toEqual([]);
    });

    it('should work with elixir target', () => {
      // Note: The regex only matches javascript/js/typescript/ts or no language tag
      // So we test with a code block without language tag (which will match)
      const response = {
        content: [
          {
            type: 'text',
            text: '```\ndefmodule Test do\n  def hello do\n    "world"\n  end\nend\n```',
          },
        ],
      };

      const result = parser.parse(response, 'elixir');

      // Code should be extracted from markdown code block (without language tag)
      expect(result.code).not.toBeNull();
      expect(result.code).toContain('defmodule');
      expect(result.hasCode).toBe(true);
    });
  });

  describe('hasToolCalls', () => {
    it('should return true when response contains tool calls', () => {
      const response = {
        content: [
          {
            type: 'tool_use',
            tool_use: { id: 'tool_1', name: 'test', input: {} },
          },
        ],
      };

      expect(parser.hasToolCalls(response)).toBe(true);
    });

    it('should return false when response does not contain tool calls', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: 'Some text',
          },
        ],
      };

      expect(parser.hasToolCalls(response)).toBe(false);
    });

    it('should return false when response is missing', () => {
      expect(parser.hasToolCalls(null)).toBe(false);
      expect(parser.hasToolCalls(undefined)).toBe(false);
    });

    it('should return false when response content is missing', () => {
      expect(parser.hasToolCalls({})).toBe(false);
    });

    it('should return false when content array is empty', () => {
      expect(parser.hasToolCalls({ content: [] })).toBe(false);
    });
  });

  describe('_looksLikeCode', () => {
    it('should detect function definitions', () => {
      const text = 'function test() { return 42; }';
      const response = {
        content: [{ type: 'text', text }],
      };

      const result = parser.parse(response, 'javascript');
      expect(result.hasCode).toBe(true);
    });

    it('should detect const declarations', () => {
      const text = 'const x = 1;';
      const response = {
        content: [{ type: 'text', text }],
      };

      const result = parser.parse(response, 'javascript');
      expect(result.hasCode).toBe(true);
    });

    it('should detect let declarations', () => {
      const text = 'let x = 1;';
      const response = {
        content: [{ type: 'text', text }],
      };

      const result = parser.parse(response, 'javascript');
      expect(result.hasCode).toBe(true);
    });

    it('should detect arrow functions', () => {
      const text = 'const test = () => 42;';
      const response = {
        content: [{ type: 'text', text }],
      };

      const result = parser.parse(response, 'javascript');
      expect(result.hasCode).toBe(true);
    });

    it('should detect return statements', () => {
      const text = 'return 42;';
      const response = {
        content: [{ type: 'text', text }],
      };

      const result = parser.parse(response, 'javascript');
      expect(result.hasCode).toBe(true);
    });

    it('should detect curly braces', () => {
      const text = '{ x: 1 }';
      const response = {
        content: [{ type: 'text', text }],
      };

      const result = parser.parse(response, 'javascript');
      expect(result.hasCode).toBe(true);
    });

    it('should detect parentheses', () => {
      const text = '(x + y)';
      const response = {
        content: [{ type: 'text', text }],
      };

      const result = parser.parse(response, 'javascript');
      expect(result.hasCode).toBe(true);
    });

    it('should return false for plain text', () => {
      const text = 'This is just regular text with no code indicators.';
      const response = {
        content: [{ type: 'text', text }],
      };

      const result = parser.parse(response, 'javascript');
      expect(result.hasCode).toBe(false);
    });
  });

  describe('_validateCode', () => {
    it('should accept valid code with balanced braces', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: '```javascript\nfunction test() {\n  return { x: 1 };\n}\n```',
          },
        ],
      };

      const result = parser.parse(response, 'javascript');
      expect(result.code).toContain('function test');
    });

    it('should accept valid code with balanced parentheses', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: '```javascript\nconst x = (a + b) * (c + d);\n```',
          },
        ],
      };

      const result = parser.parse(response, 'javascript');
      expect(result.code).toContain('const x');
    });

    it('should throw error for whitespace-only code', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: '```javascript\n   \n\t\n```',
          },
        ],
      };

      expect(() => parser.parse(response, 'javascript')).toThrow(InvalidCodeError);
    });

    it('should handle complex nested structures', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: '```javascript\nfunction test() {\n  if (x) {\n    return { a: (1 + 2) };\n  }\n}\n```',
          },
        ],
      };

      const result = parser.parse(response, 'javascript');
      expect(result.hasCode).toBe(true);
    });
  });
});
