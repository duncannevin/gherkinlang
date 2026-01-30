/**
 * Unit tests for prompt builder module.
 * 
 * @module test/unit/ai/prompt-builder
 */

const path = require('path');
const { PromptBuilder } = require('../../../src/ai/prompt-builder');
const { readFile } = require('../../../src/compiler/utils/fs');

// Mock fs utility
jest.mock('../../../src/compiler/utils/fs', () => ({
  readFile: jest.fn(),
}));

describe('PromptBuilder', () => {
  let builder;

  beforeEach(() => {
    jest.clearAllMocks();
    builder = new PromptBuilder();
  });

  describe('constructor', () => {
    it('should create a new PromptBuilder instance', () => {
      const instance = new PromptBuilder();
      expect(instance).toBeInstanceOf(PromptBuilder);
    });
  });

  describe('build', () => {
    const mockRulesContent = 'Sample rules content';
    const mockTargetPrompt = 'Sample target prompt';

    beforeEach(() => {
      readFile
        .mockResolvedValueOnce(mockRulesContent) // For rules.md
        .mockResolvedValueOnce(mockTargetPrompt); // For target prompt
    });

    it('should build a complete compilation prompt with all required fields', async () => {
      const source = 'Feature: Test\nScenario: Test';
      const result = await builder.build({
        source,
        target: 'javascript',
      });

      expect(result).toHaveProperty('systemMessage');
      expect(result).toHaveProperty('userMessage');
      expect(result).toHaveProperty('tools');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('temperature');
      expect(result).toHaveProperty('maxTokens');
      expect(result.temperature).toBe(0.0);
      expect(result.maxTokens).toBe(4096);
      expect(result.model).toBe('claude-sonnet-4-5');
      expect(result.tools).toEqual([]);
    });

    it('should include rules content in system message', async () => {
      const source = 'Feature: Test';
      const result = await builder.build({
        source,
        target: 'javascript',
      });

      expect(result.systemMessage).toContain('GherkinLang Compilation Rules');
      expect(result.systemMessage).toContain(mockRulesContent);
    });

    it('should include target-specific prompt in system message', async () => {
      const source = 'Feature: Test';
      const result = await builder.build({
        source,
        target: 'javascript',
      });

      expect(result.systemMessage).toContain(mockTargetPrompt);
    });

    it('should build user message with source code', async () => {
      const source = 'Feature: Test\nScenario: Example';
      const result = await builder.build({
        source,
        target: 'javascript',
      });

      expect(result.userMessage).toContain(source);
      expect(result.userMessage).toContain('```gherkin');
    });

    it('should include module name in user message when provided', async () => {
      const source = 'Feature: Test';
      const context = { moduleName: 'test-module' };
      const result = await builder.build({
        source,
        target: 'javascript',
        context,
      });

      expect(result.userMessage).toContain('Module: test-module');
    });

    it('should include dependencies in user message when provided', async () => {
      const source = 'Feature: Test';
      const context = {
        dependencies: ['dep1', 'dep2'],
      };
      const result = await builder.build({
        source,
        target: 'javascript',
        context,
      });

      expect(result.userMessage).toContain('Dependencies: dep1, dep2');
    });

    it('should include imports in user message when provided', async () => {
      const source = 'Feature: Test';
      const context = {
        imports: ['import1', 'import2'],
      };
      const result = await builder.build({
        source,
        target: 'javascript',
        context,
      });

      expect(result.userMessage).toContain('Imports: import1, import2');
    });

    it('should accept custom model', async () => {
      const source = 'Feature: Test';
      const result = await builder.build({
        source,
        target: 'javascript',
        model: 'claude-opus-4',
      });

      expect(result.model).toBe('claude-opus-4');
    });

    it('should accept custom maxTokens', async () => {
      const source = 'Feature: Test';
      const result = await builder.build({
        source,
        target: 'javascript',
        maxTokens: 8192,
      });

      expect(result.model).toBe('claude-sonnet-4-5');
      expect(result.maxTokens).toBe(8192);
    });

    it('should accept custom tools', async () => {
      const source = 'Feature: Test';
      const tools = [
        { name: 'tool1', description: 'Test tool' },
      ];
      const result = await builder.build({
        source,
        target: 'javascript',
        tools,
      });

      expect(result.tools).toEqual(tools);
    });

    it('should work with elixir target', async () => {
      const source = 'Feature: Test';
      const result = await builder.build({
        source,
        target: 'elixir',
      });

      expect(result.systemMessage).toContain('elixir');
      expect(result.userMessage).toContain('elixir');
    });

    it('should throw error when source is missing', async () => {
      await expect(
        builder.build({
          target: 'javascript',
        })
      ).rejects.toThrow('Source code is required');
    });

    it('should throw error when source is not a string', async () => {
      await expect(
        builder.build({
          source: null,
          target: 'javascript',
        })
      ).rejects.toThrow('Source code is required');

      await expect(
        builder.build({
          source: 123,
          target: 'javascript',
        })
      ).rejects.toThrow('Source code is required');
    });

    it('should throw error when target is invalid', async () => {
      await expect(
        builder.build({
          source: 'Feature: Test',
          target: 'python',
        })
      ).rejects.toThrow('Invalid target: python');
    });

    it('should throw error when rules file cannot be read', async () => {
      readFile.mockReset();
      readFile.mockRejectedValueOnce(new Error('File not found'));

      await expect(
        builder.build({
          source: 'Feature: Test',
          target: 'javascript',
        })
      ).rejects.toThrow('Failed to read rules file');
    });

    it('should handle missing target-specific prompt gracefully', async () => {
      readFile.mockReset();
      readFile
        .mockResolvedValueOnce(mockRulesContent) // rules.md
        .mockRejectedValueOnce(new Error('File not found')); // target prompt

      const source = 'Feature: Test';
      const result = await builder.build({
        source,
        target: 'javascript',
      });

      // Should still build successfully without target prompt
      expect(result.systemMessage).toContain(mockRulesContent);
      expect(result.systemMessage).not.toContain(mockTargetPrompt);
    });
  });

  describe('_buildSystemMessage', () => {
    it('should include role definition', async () => {
      readFile
        .mockResolvedValueOnce('Sample rules content')
        .mockResolvedValueOnce('Sample target prompt');

      const source = 'Feature: Test';
      const result = await builder.build({
        source,
        target: 'javascript',
      });

      expect(result.systemMessage).toContain('You are a compiler for GherkinLang');
    });

    it('should include compilation instructions', async () => {
      readFile
        .mockResolvedValueOnce('Sample rules content')
        .mockResolvedValueOnce('Sample target prompt');

      const source = 'Feature: Test';
      const result = await builder.build({
        source,
        target: 'javascript',
      });

      expect(result.systemMessage).toContain('Your job:');
      expect(result.systemMessage).toContain('Generate clean, idiomatic');
      expect(result.systemMessage).toContain('Ensure all functions are pure');
    });

    it('should mention target language in role', async () => {
      readFile
        .mockResolvedValueOnce('Sample rules content')
        .mockResolvedValueOnce('Sample target prompt')
        .mockResolvedValueOnce('Sample rules content')
        .mockResolvedValueOnce('Sample target prompt');

      const source = 'Feature: Test';
      const jsResult = await builder.build({
        source,
        target: 'javascript',
      });
      const elixirResult = await builder.build({
        source,
        target: 'elixir',
      });

      expect(jsResult.systemMessage).toContain('compiles to javascript');
      expect(elixirResult.systemMessage).toContain('compiles to elixir');
    });
  });

  describe('_buildUserMessage', () => {
    it('should format source code in code block', async () => {
      readFile
        .mockResolvedValueOnce('Sample rules content')
        .mockResolvedValueOnce('Sample target prompt');

      const source = 'Feature: Test\nScenario: Example';
      const result = await builder.build({
        source,
        target: 'javascript',
      });

      expect(result.userMessage).toContain('```gherkin');
      expect(result.userMessage).toContain(source);
      expect(result.userMessage).toContain('```');
    });

    it('should include all context information when provided', async () => {
      readFile
        .mockResolvedValueOnce('Sample rules content')
        .mockResolvedValueOnce('Sample target prompt');

      const source = 'Feature: Test';
      const context = {
        moduleName: 'test-module',
        dependencies: ['dep1', 'dep2'],
        imports: ['import1', 'import2'],
      };
      const result = await builder.build({
        source,
        target: 'javascript',
        context,
      });

      expect(result.userMessage).toContain('Module: test-module');
      expect(result.userMessage).toContain('Dependencies: dep1, dep2');
      expect(result.userMessage).toContain('Imports: import1, import2');
    });
  });
});
