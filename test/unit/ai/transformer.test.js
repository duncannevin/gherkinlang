/**
 * Unit tests for AI transformer module.
 * 
 * @module test/unit/ai/transformer
 */

const Anthropic = require('@anthropic-ai/sdk');
const { AITransformer } = require('../../../src/ai/transformer');
const { PromptBuilder } = require('../../../src/ai/prompt-builder');
const { ResponseParser } = require('../../../src/ai/response-parser');
const { RetryHandler } = require('../../../src/ai/retry-handler');
const {
  TransformationError,
  APIError,
  RateLimitError,
  InvalidCodeError,
} = require('../../../src/ai/errors');

// Mock dependencies
jest.mock('@anthropic-ai/sdk');
jest.mock('../../../src/ai/prompt-builder');
jest.mock('../../../src/ai/response-parser');
jest.mock('../../../src/ai/retry-handler');

describe('AITransformer', () => {
  let transformer;
  let mockClient;
  let mockPromptBuilder;
  let mockResponseParser;
  let mockRetryHandler;

  const mockAPIKey = 'test-api-key';
  const mockSource = 'Feature: Test\nScenario: Example';
  const mockContext = { moduleName: 'test-module' };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = mockAPIKey;

    // Mock Anthropic client
    mockClient = {
      messages: {
        create: jest.fn(),
      },
    };
    Anthropic.mockImplementation(() => mockClient);

    // Mock PromptBuilder
    mockPromptBuilder = {
      build: jest.fn(),
    };
    PromptBuilder.mockImplementation(() => mockPromptBuilder);

    // Mock ResponseParser
    mockResponseParser = {
      parse: jest.fn(),
    };
    ResponseParser.mockImplementation(() => mockResponseParser);

    // Mock RetryHandler
    mockRetryHandler = {
      execute: jest.fn(),
    };
    RetryHandler.mockImplementation(() => mockRetryHandler);

    transformer = new AITransformer({ apiKey: mockAPIKey });
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe('constructor', () => {
    it('should create AITransformer with API key', () => {
      const instance = new AITransformer({ apiKey: mockAPIKey });
      expect(instance).toBeInstanceOf(AITransformer);
      expect(Anthropic).toHaveBeenCalledWith({ apiKey: mockAPIKey });
    });

    it('should use ANTHROPIC_API_KEY env var if apiKey not provided', () => {
      process.env.ANTHROPIC_API_KEY = 'env-api-key';
      const instance = new AITransformer();
      expect(Anthropic).toHaveBeenCalledWith({ apiKey: 'env-api-key' });
    });

    it('should throw error when API key is missing', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(() => new AITransformer()).toThrow(TransformationError);
      expect(() => new AITransformer()).toThrow('ANTHROPIC_API_KEY');
    });

    it('should accept custom model', () => {
      const instance = new AITransformer({
        apiKey: mockAPIKey,
        model: 'claude-opus-4',
      });
      expect(instance).toBeInstanceOf(AITransformer);
    });

    it('should accept custom maxRetries', () => {
      const instance = new AITransformer({
        apiKey: mockAPIKey,
        maxRetries: 5,
      });
      expect(instance).toBeInstanceOf(AITransformer);
      expect(RetryHandler).toHaveBeenCalledWith({
        maxRetries: 5,
        baseDelay: 2000,
      });
    });

    it('should accept custom maxTokens', () => {
      const instance = new AITransformer({
        apiKey: mockAPIKey,
        maxTokens: 8192,
      });
      expect(instance).toBeInstanceOf(AITransformer);
    });

    it('should accept custom retryInvalidCode option', () => {
      const instance = new AITransformer({
        apiKey: mockAPIKey,
        retryInvalidCode: false,
      });
      expect(instance).toBeInstanceOf(AITransformer);
    });
  });

  describe('transform', () => {
    const mockPrompt = {
      systemMessage: 'System message',
      userMessage: 'User message',
      model: 'claude-sonnet-4-5',
      temperature: 0.0,
      maxTokens: 4096,
      tools: [],
    };

    const mockAPIResponse = {
      id: 'msg_123',
      model: 'claude-sonnet-4-5',
      content: [
        {
          type: 'text',
          text: '```javascript\nconst x = 1;\n```',
        },
      ],
      usage: {
        input_tokens: 100,
        output_tokens: 50,
      },
    };

    const mockParsedResponse = {
      code: 'const x = 1;',
      toolCalls: [],
      hasCode: true,
    };

    it('should transform source code successfully', async () => {
      mockPromptBuilder.build.mockResolvedValue(mockPrompt);
      mockRetryHandler.execute.mockResolvedValue(mockAPIResponse);
      mockResponseParser.parse.mockReturnValue(mockParsedResponse);

      const result = await transformer.transform(mockSource, mockContext);

      expect(result.success).toBe(true);
      expect(result.code).toBe('const x = 1;');
      expect(result.toolCalls).toEqual([]);
      expect(result.metadata).toHaveProperty('model');
      expect(result.metadata).toHaveProperty('tokens');
      expect(result.metadata).toHaveProperty('duration');
    });

    it('should build prompt with correct parameters', async () => {
      mockPromptBuilder.build.mockResolvedValue(mockPrompt);
      mockRetryHandler.execute.mockResolvedValue(mockAPIResponse);
      mockResponseParser.parse.mockReturnValue(mockParsedResponse);

      await transformer.transform(mockSource, mockContext);

      expect(mockPromptBuilder.build).toHaveBeenCalledWith({
        source: mockSource,
        target: 'javascript',
        context: expect.objectContaining({
          moduleName: 'test-module',
        }),
        model: 'claude-sonnet-4-5',
        maxTokens: 4096,
        tools: [],
      });
    });

    it('should use custom target language', async () => {
      mockPromptBuilder.build.mockResolvedValue(mockPrompt);
      mockRetryHandler.execute.mockResolvedValue(mockAPIResponse);
      mockResponseParser.parse.mockReturnValue(mockParsedResponse);

      await transformer.transform(mockSource, mockContext, { target: 'elixir' });

      expect(mockPromptBuilder.build).toHaveBeenCalledWith(
        expect.objectContaining({
          target: 'elixir',
        })
      );
      expect(mockResponseParser.parse).toHaveBeenCalledWith(
        mockAPIResponse,
        'elixir'
      );
    });

    it('should pass tools to prompt builder', async () => {
      const tools = [{ name: 'tool1', description: 'Test tool' }];
      mockPromptBuilder.build.mockResolvedValue(mockPrompt);
      mockRetryHandler.execute.mockResolvedValue(mockAPIResponse);
      mockResponseParser.parse.mockReturnValue(mockParsedResponse);

      await transformer.transform(mockSource, mockContext, { tools });

      expect(mockPromptBuilder.build).toHaveBeenCalledWith(
        expect.objectContaining({
          tools,
        })
      );
    });

    it('should extract metadata from API response', async () => {
      mockPromptBuilder.build.mockResolvedValue(mockPrompt);
      mockRetryHandler.execute.mockResolvedValue(mockAPIResponse);
      mockResponseParser.parse.mockReturnValue(mockParsedResponse);

      const result = await transformer.transform(mockSource, mockContext);

      expect(result.metadata.model).toBe('claude-sonnet-4-5');
      expect(result.metadata.tokens.input).toBe(100);
      expect(result.metadata.tokens.output).toBe(50);
      expect(result.metadata.tokens.total).toBe(150);
      expect(result.metadata.cacheHit).toBe(false);
      expect(result.metadata.retryCount).toBe(0);
    });

    it('should calculate transformation duration', async () => {
      mockPromptBuilder.build.mockResolvedValue(mockPrompt);
      mockRetryHandler.execute.mockResolvedValue(mockAPIResponse);
      mockResponseParser.parse.mockReturnValue(mockParsedResponse);

      const startTime = Date.now();
      const result = await transformer.transform(mockSource, mockContext);
      const endTime = Date.now();

      expect(result.metadata.duration).toBeGreaterThanOrEqual(0);
      expect(result.metadata.duration).toBeLessThanOrEqual(endTime - startTime + 10);
    });

    it('should handle tool calls in response', async () => {
      const toolCalls = [
        {
          id: 'tool_1',
          name: 'file_system',
          input: { path: '/path/to/file' },
        },
      ];

      mockPromptBuilder.build.mockResolvedValue(mockPrompt);
      mockRetryHandler.execute.mockResolvedValue(mockAPIResponse);
      mockResponseParser.parse.mockReturnValue({
        code: 'const x = 1;',
        toolCalls,
        hasCode: true,
      });

      const result = await transformer.transform(mockSource, mockContext);

      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0]).toEqual({
        toolName: 'file_system',
        arguments: { path: '/path/to/file' },
        duration: 0,
        success: false,
      });
    });

    it('should retry with clarification when code is missing', async () => {
      const clarificationResponse = {
        ...mockAPIResponse,
        id: 'msg_124',
      };

      mockPromptBuilder.build.mockResolvedValue(mockPrompt);
      mockRetryHandler.execute
        .mockResolvedValueOnce(mockAPIResponse) // First call - no code
        .mockResolvedValueOnce(clarificationResponse); // Clarification retry
      mockResponseParser.parse
        .mockReturnValueOnce({
          code: null,
          toolCalls: [],
          hasCode: false,
        })
        .mockReturnValueOnce({
          code: 'const x = 1;',
          toolCalls: [],
          hasCode: true,
        });

      const result = await transformer.transform(mockSource, mockContext);

      expect(result.code).toBe('const x = 1;');
      expect(mockRetryHandler.execute).toHaveBeenCalledTimes(2);
    });

    it('should throw InvalidCodeError when code is missing and retryInvalidCode is false', async () => {
      transformer = new AITransformer({
        apiKey: mockAPIKey,
        retryInvalidCode: false,
      });
      transformer._promptBuilder = mockPromptBuilder;
      transformer._responseParser = mockResponseParser;
      transformer._retryHandler = mockRetryHandler;

      mockPromptBuilder.build.mockResolvedValue(mockPrompt);
      mockRetryHandler.execute.mockResolvedValue(mockAPIResponse);
      mockResponseParser.parse.mockReturnValue({
        code: null,
        toolCalls: [],
        hasCode: false,
      });

      await expect(
        transformer.transform(mockSource, mockContext)
      ).rejects.toThrow(InvalidCodeError);
    });

    it('should throw InvalidCodeError when clarification retry also fails', async () => {
      mockPromptBuilder.build.mockResolvedValue(mockPrompt);
      mockRetryHandler.execute
        .mockResolvedValueOnce(mockAPIResponse)
        .mockResolvedValueOnce(mockAPIResponse);
      mockResponseParser.parse.mockReturnValue({
        code: null,
        toolCalls: [],
        hasCode: false,
      });

      await expect(
        transformer.transform(mockSource, mockContext)
      ).rejects.toThrow(InvalidCodeError);
    });

    it('should propagate APIError', async () => {
      const apiError = new APIError('API error', { statusCode: 500 });
      mockPromptBuilder.build.mockResolvedValue(mockPrompt);
      mockRetryHandler.execute.mockRejectedValue(apiError);

      await expect(
        transformer.transform(mockSource, mockContext)
      ).rejects.toThrow(APIError);
    });

    it('should propagate RateLimitError', async () => {
      const rateLimitError = new RateLimitError('Rate limited');
      mockPromptBuilder.build.mockResolvedValue(mockPrompt);
      mockRetryHandler.execute.mockRejectedValue(rateLimitError);

      await expect(
        transformer.transform(mockSource, mockContext)
      ).rejects.toThrow(RateLimitError);
    });

    it('should propagate InvalidCodeError', async () => {
      const invalidCodeError = new InvalidCodeError('Invalid code');
      mockPromptBuilder.build.mockResolvedValue(mockPrompt);
      mockRetryHandler.execute.mockResolvedValue(mockAPIResponse);
      mockResponseParser.parse.mockImplementation(() => {
        throw invalidCodeError;
      });

      await expect(
        transformer.transform(mockSource, mockContext)
      ).rejects.toThrow(InvalidCodeError);
    });

    it('should wrap unexpected errors in TransformationError', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockPromptBuilder.build.mockResolvedValue(mockPrompt);
      mockRetryHandler.execute.mockRejectedValue(unexpectedError);

      await expect(
        transformer.transform(mockSource, mockContext)
      ).rejects.toThrow(TransformationError);

      try {
        await transformer.transform(mockSource, mockContext);
        fail('Should have thrown');
      } catch (error) {
        expect(error.message).toContain('Transformation failed');
        expect(error.source).toBeDefined();
        expect(error.model).toBe('claude-sonnet-4-5');
      }
    });
  });

  describe('_callAPI', () => {
    it('should call Anthropic API with correct parameters', async () => {
      const prompt = {
        systemMessage: 'System message',
        userMessage: 'User message',
        model: 'claude-sonnet-4-5',
        temperature: 0.0,
        maxTokens: 4096,
        tools: [],
      };

      mockClient.messages.create.mockResolvedValue({
        id: 'msg_123',
        content: [],
      });

      const result = await transformer._callAPI(prompt);

      expect(mockClient.messages.create).toHaveBeenCalledWith({
        model: prompt.model,
        max_tokens: prompt.maxTokens,
        temperature: prompt.temperature,
        system: prompt.systemMessage,
        messages: [
          {
            role: 'user',
            content: prompt.userMessage,
          },
        ],
        tools: undefined,
      });
      expect(result.id).toBe('msg_123');
    });

    it('should include tools when provided', async () => {
      const prompt = {
        systemMessage: 'System message',
        userMessage: 'User message',
        model: 'claude-sonnet-4-5',
        temperature: 0.0,
        maxTokens: 4096,
        tools: [{ name: 'tool1' }],
      };

      mockClient.messages.create.mockResolvedValue({
        id: 'msg_123',
        content: [],
      });

      await transformer._callAPI(prompt);

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: prompt.tools,
        })
      );
    });

    it('should map 429 status to RateLimitError', async () => {
      const prompt = {
        systemMessage: 'System message',
        userMessage: 'User message',
        model: 'claude-sonnet-4-5',
        temperature: 0.0,
        maxTokens: 4096,
        tools: [],
      };

      const error = new Error('Rate limit');
      error.status = 429;
      error.headers = { 'retry-after': '60' };
      mockClient.messages.create.mockRejectedValue(error);

      await expect(transformer._callAPI(prompt)).rejects.toThrow(RateLimitError);
    });

    it('should map 4xx status to APIError', async () => {
      const prompt = {
        systemMessage: 'System message',
        userMessage: 'User message',
        model: 'claude-sonnet-4-5',
        temperature: 0.0,
        maxTokens: 4096,
        tools: [],
      };

      const error = new Error('Client error');
      error.status = 400;
      mockClient.messages.create.mockRejectedValue(error);

      await expect(transformer._callAPI(prompt)).rejects.toThrow(APIError);
    });

    it('should map 5xx status to APIError', async () => {
      const prompt = {
        systemMessage: 'System message',
        userMessage: 'User message',
        model: 'claude-sonnet-4-5',
        temperature: 0.0,
        maxTokens: 4096,
        tools: [],
      };

      const error = new Error('Server error');
      error.status = 500;
      mockClient.messages.create.mockRejectedValue(error);

      await expect(transformer._callAPI(prompt)).rejects.toThrow(APIError);
    });

    it('should map network errors to APIError', async () => {
      const prompt = {
        systemMessage: 'System message',
        userMessage: 'User message',
        model: 'claude-sonnet-4-5',
        temperature: 0.0,
        maxTokens: 4096,
        tools: [],
      };

      const error = new Error('Network error');
      mockClient.messages.create.mockRejectedValue(error);

      await expect(transformer._callAPI(prompt)).rejects.toThrow(APIError);
    });
  });

  describe('_extractContext', () => {
    it('should extract context with moduleName', () => {
      const context = { moduleName: 'test-module' };
      const extracted = transformer._extractContext(context);

      expect(extracted.moduleName).toBe('test-module');
    });

    it('should extract context with featureName as moduleName', () => {
      const context = { featureName: 'test-feature' };
      const extracted = transformer._extractContext(context);

      expect(extracted.moduleName).toBe('test-feature');
    });

    it('should extract dependencies', () => {
      const context = {
        moduleName: 'test-module',
        dependencies: ['dep1', 'dep2'],
      };
      const extracted = transformer._extractContext(context);

      expect(extracted.dependencies).toEqual(['dep1', 'dep2']);
    });

    it('should extract imports', () => {
      const context = {
        moduleName: 'test-module',
        imports: ['import1', 'import2'],
      };
      const extracted = transformer._extractContext(context);

      expect(extracted.imports).toEqual(['import1', 'import2']);
    });

    it('should extract from ProjectContext with getModule method', () => {
      const mockModule = {
        name: 'module-name',
        dependencies: ['dep1'],
      };
      const context = {
        moduleName: 'test-module',
        getModule: jest.fn().mockReturnValue(mockModule),
        imports: ['import1'],
      };
      const extracted = transformer._extractContext(context);

      expect(context.getModule).toHaveBeenCalledWith('test-module');
      expect(extracted.moduleName).toBe('module-name');
      expect(extracted.dependencies).toEqual(['dep1']);
      expect(extracted.imports).toEqual(['import1']);
    });

    it('should return empty object for null context', () => {
      const extracted = transformer._extractContext(null);
      expect(extracted).toEqual({});
    });

    it('should return empty object for undefined context', () => {
      const extracted = transformer._extractContext(undefined);
      expect(extracted).toEqual({});
    });

    it('should handle context without moduleName or featureName', () => {
      const context = { other: 'data' };
      const extracted = transformer._extractContext(context);

      // When there's no moduleName or featureName, the method returns empty object
      expect(extracted).toEqual({});
    });
  });

  describe('_extractMetadata', () => {
    it('should extract token usage', () => {
      const response = {
        model: 'claude-sonnet-4-5',
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
      };

      const metadata = transformer._extractMetadata(response, 1234, 0);

      expect(metadata.model).toBe('claude-sonnet-4-5');
      expect(metadata.tokens.input).toBe(100);
      expect(metadata.tokens.output).toBe(50);
      expect(metadata.tokens.total).toBe(150);
      expect(metadata.duration).toBe(1234);
      expect(metadata.retryCount).toBe(0);
      expect(metadata.cacheHit).toBe(false);
    });

    it('should handle missing usage data', () => {
      const response = {
        model: 'claude-sonnet-4-5',
      };

      const metadata = transformer._extractMetadata(response, 5678, 2);

      expect(metadata.tokens.input).toBe(0);
      expect(metadata.tokens.output).toBe(0);
      expect(metadata.tokens.total).toBe(0);
      expect(metadata.retryCount).toBe(2);
    });

    it('should use model from response', () => {
      const response = {
        model: 'claude-opus-4',
        usage: {},
      };

      const metadata = transformer._extractMetadata(response, 0, 0);

      expect(metadata.model).toBe('claude-opus-4');
    });

    it('should use default model when not in response', () => {
      const response = {
        usage: {},
      };

      const metadata = transformer._extractMetadata(response, 0, 0);

      expect(metadata.model).toBe('claude-sonnet-4-5');
    });
  });
});
