/**
 * AI transformation engine for GherkinLang compiler.
 * 
 * Main entry point for AI-powered compilation. Transforms GherkinLang source
 * code into JavaScript using Claude API. Handles prompt construction, API
 * calls, response parsing, error handling, and metadata tracking.
 * 
 * @module ai/transformer
 */

const Anthropic = require('@anthropic-ai/sdk');
const { PromptBuilder } = require('./prompt-builder');
const { ResponseParser } = require('./response-parser');
const { RetryHandler } = require('./retry-handler');
const {
	TransformationError,
	APIError,
	RateLimitError,
	InvalidCodeError,
} = require('./errors');

/**
 * @typedef {import('./types').TransformResult} TransformResult
 * @typedef {import('./types').TransformMetadata} TransformMetadata
 * @typedef {import('./types').TokenUsage} TokenUsage
 * @typedef {import('./types').ToolCall} ToolCall
 * @typedef {import('./types').CompilationPrompt} CompilationPrompt
 * @typedef {import('../mcp/client').MCPClient} MCPClient
 * @typedef {import('../mcp/tool-invoker').ToolInvoker} ToolInvoker
 */

class AITransformer {
	/**
	 * Creates a new AITransformer instance.
	 * 
	 * @param {Object} [options] - Transformer configuration
	 * @param {string} [options.apiKey] - Claude API key (default: process.env.ANTHROPIC_API_KEY)
	 * @param {string} [options.model] - Claude model identifier (default: 'claude-sonnet-4-5')
	 * @param {number} [options.maxRetries] - Maximum retries for API calls (default: 3)
	 * @param {number} [options.maxTokens] - Maximum tokens in response (default: 4096)
	 * @param {boolean} [options.retryInvalidCode] - Retry on invalid code responses (default: true)
	 * @param {MCPClient|null} [options.mcpClient] - MCP client for tool-assisted compilation (default: null)
	 */
	constructor(options = {}) {
		const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;

		if (!apiKey) {
			throw new TransformationError('ANTHROPIC_API_KEY environment variable is required');
		}

		this._client = new Anthropic({ apiKey });
		this._model = options.model || 'claude-sonnet-4-5';
		this._maxRetries = options.maxRetries || 3;
		this._maxTokens = options.maxTokens || 4096;
		this._retryInvalidCode = options.retryInvalidCode !== false;

		this._promptBuilder = new PromptBuilder();
		this._responseParser = new ResponseParser();
		this._retryHandler = new RetryHandler({
			maxRetries: this._maxRetries,
			baseDelay: 2000,
		});

		// MCP Client for tool-assisted compilation
		/** @type {MCPClient|null} */
		this._mcpClient = options.mcpClient || null;
		/** @type {ToolInvoker|null} */
		this._toolInvoker = null;

		if (this._mcpClient) {
			const { ToolInvoker } = require('../mcp/tool-invoker');
			this._toolInvoker = new ToolInvoker(this._mcpClient);
		}
	}

	/**
	 * Transform GherkinLang source code to JavaScript.
	 * 
	 * @param {string} source - GherkinLang source code
	 * @param {Object} context - Project context
	 * @param {Object} [options] - Transformation options
	 * @param {string} [options.target] - Target language (default: 'javascript')
	 * @param {Array} [options.tools] - Available tools for AI (default: [])
	 * @param {number} [options.maxTurns] - Maximum conversation turns for multi-turn tool invocations (default: 5)
	 * @returns {Promise<TransformResult>} Transformation result
	 * @throws {TransformationError|APIError|InvalidCodeError} If transformation fails
	 */
	async transform(source, context, options = {}) {
		const target = options.target || 'javascript';
		const startTime = Date.now();
		const maxTurns = options.maxTurns || 5;
		let turnCount = 0;

		try {
			// Get tools from MCP client if available
			let tools = options.tools || [];
			if (this._mcpClient && this._mcpClient.isConnected()) {
				const mcpTools = this._mcpClient.getTools();
				const { ToolRegistry } = require('../mcp/tool-registry');
				const registry = new ToolRegistry();
				mcpTools.forEach(tool => registry.register(tool));
				tools = registry.toClaudeTools();
			}

			// Build initial prompt
			const prompt = await this._promptBuilder.build({
				source,
				target,
				context: this._extractContext(context),
				model: this._model,
				maxTokens: this._maxTokens,
				tools,
			});

			// Multi-turn conversation loop
			const messages = [
				{
					role: 'user',
					content: prompt.userMessage,
				},
			];

			let finalCode = null;
			let toolCalls = [];
			let lastResponse = null;

			while (turnCount < maxTurns) {
				turnCount++;

				// Call API
				const response = await this._retryHandler.execute(
					() => this._callAPIWithMessages(prompt, messages),
					{ operation: `AI transformation (turn ${turnCount})` }
				);

				lastResponse = response;

				// Parse response
				const parsed = this._responseParser.parse(response, target);

				// Check for tool invocations
				if (parsed.toolCalls && parsed.toolCalls.length > 0) {
					// Invoke tools
					const toolResults = await this._invokeTools(parsed.toolCalls);
					toolCalls.push(...toolResults.calls);

					// Add assistant message with tool_use
					messages.push({
						role: 'assistant',
						content: response.content,
					});

					// Add tool results
					messages.push(...toolResults.formattedResults);

					// Continue conversation
					continue;
				}

				// Check for code
				if (parsed.code) {
					finalCode = parsed.code;
					break;
				}

				// No code and no tools
				messages.push({
					role: 'assistant',
					content: response.content,
				});

				if (turnCount >= maxTurns) {
					throw new InvalidCodeError('Max conversation turns reached without generating code');
				}
			}

			if (!finalCode) {
				throw new InvalidCodeError('No code generated after tool invocations');
			}

			const duration = Date.now() - startTime;
			const metadata = this._extractMetadata(lastResponse, duration, 0);

			return {
				success: true,
				code: finalCode,
				toolCalls,
				metadata,
			};
		} catch (error) {
			const duration = Date.now() - startTime;

			// Handle specific error types
			if (error instanceof InvalidCodeError) {
				throw error;
			}

			if (error instanceof APIError || error instanceof RateLimitError) {
				throw error;
			}

			// Wrap unexpected errors
			throw new TransformationError(`Transformation failed: ${error.message}`, {
				source: source.substring(0, 100), // First 100 chars
				model: this._model,
				retryCount: error.retryCount || 0,
			});
		}
	}

	/**
	 * Call Claude API with prompt.
	 * 
	 * @private
	 * @param {CompilationPrompt} prompt - Compilation prompt
	 * @returns {Promise<any>} API response
	 * @throws {APIError|RateLimitError} If API call fails
	 */
	async _callAPI(prompt) {
		try {
			const message = await this._client.messages.create({
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
				tools: prompt.tools.length > 0 ? prompt.tools : undefined,
			});

			return message;
		} catch (error) {
			// Map Anthropic SDK errors to our error types
			if (error.status === 429) {
				throw new RateLimitError('API rate limit exceeded', {
					statusCode: error.status,
					statusText: error.message,
					retryAfter: error.headers?.['retry-after'],
				});
			}

			if (error.status >= 400 && error.status < 500) {
				throw new APIError(`API client error: ${error.message}`, {
					statusCode: error.status,
					statusText: error.message,
					response: error,
				});
			}

			if (error.status >= 500) {
				throw new APIError(`API server error: ${error.message}`, {
					statusCode: error.status,
					statusText: error.message,
					response: error,
				});
			}

			// Network or other errors
			throw new APIError(`API call failed: ${error.message}`, {
				response: error,
			});
		}
	}

	/**
	 * Retry transformation with clarification prompt.
	 * 
	 * @private
	 * @param {CompilationPrompt} originalPrompt - Original prompt
	 * @param {string} source - Original source code
	 * @param {string} target - Target language
	 * @returns {Promise<string>} Validated code
	 * @throws {InvalidCodeError} If retry also fails
	 */
	async _retryWithClarification(originalPrompt, source, target) {
		const clarificationPrompt = {
			...originalPrompt,
			userMessage: `${originalPrompt.userMessage}\n\nIMPORTANT: Your previous response did not contain valid ${target} code. Please provide ONLY valid ${target} code without any explanations, markdown formatting, or preamble. The code should be ready to use directly.`,
		};

		try {
			const response = await this._retryHandler.execute(
				() => this._callAPI(clarificationPrompt),
				{ operation: 'AI transformation (clarification retry)' }
			);

			const parsed = this._responseParser.parse(response, target);

			if (!parsed.code) {
				throw new InvalidCodeError('AI response still does not contain valid code after clarification', {
					response: JSON.stringify(response),
					validationError: 'No code found in retry response',
					retryable: false,
				});
			}

			return parsed.code;
		} catch (error) {
			if (error instanceof InvalidCodeError) {
				throw error;
			}

			throw new InvalidCodeError(`Clarification retry failed: ${error.message}`, {
				validationError: error.message,
				retryable: false,
			});
		}
	}

	/**
	 * Extract metadata from API response.
	 * 
	 * @private
	 * @param {any} response - API response
	 * @param {number} duration - Transformation duration in milliseconds
	 * @param {number} retryCount - Number of retries attempted
	 * @returns {TransformMetadata} Transformation metadata
	 */
	_extractMetadata(response, duration, retryCount) {
		const usage = response.usage || {};

		return {
			model: response.model || this._model,
			tokens: {
				input: usage.input_tokens || 0,
				output: usage.output_tokens || 0,
				total: (usage.input_tokens || 0) + (usage.output_tokens || 0),
			},
			duration: Math.round(duration),
			retryCount,
			cacheHit: false, // Will be set by cache system in Phase 1
		};
	}

	/**
	 * Extract context information from ProjectContext object.
	 * 
	 * @private
	 * @param {Object} context - Project context
	 * @returns {Object} Extracted context data
	 */
	_extractContext(context) {
		if (!context) {
			return {};
		}

		const extracted = {};

		// Extract module name if available
		if (context.getModule) {
			// Assume context has getModule method (ProjectContext instance)
			// We need to get the module for the current feature being compiled
			// For now, we'll check if context has moduleName property
			if (context.moduleName) {
				const module = context.getModule(context.moduleName);
				if (module) {
					extracted.moduleName = module.name || context.moduleName;
					extracted.dependencies = module.dependencies || [];
					extracted.imports = context.imports || module.imports || [];
				}
			}
		} else if (context.moduleName || context.featureName) {
			extracted.moduleName = context.moduleName || context.featureName;
			extracted.dependencies = context.dependencies || [];
			extracted.imports = context.imports || [];
		}

		return extracted;
	}

	async _callAPIWithMessages(prompt, messages) {
		return this._client.messages.create({
			model: prompt.model,
			max_tokens: prompt.maxTokens,
			temperature: prompt.temperature,
			system: prompt.systemMessage,
			messages,
			tools: prompt.tools.length > 0 ? prompt.tools : undefined,
		});
	}

	async _invokeTools(toolCalls) {
		if (!this._toolInvoker) {
			throw new Error('MCP client not available for tool invocations');
		}

		const calls = [];
		const formattedResults = [];

		for (const toolUse of toolCalls) {
			const startTime = Date.now();

			const result = await this._toolInvoker.invokeTool(
				toolUse.name,
				toolUse.input
			);

			const duration = Date.now() - startTime;

			calls.push({
				toolName: toolUse.name,
				arguments: toolUse.input,
				result: result.content,
				duration,
				success: result.success,
			});

			const formatted = this._toolInvoker.formatToolResult(toolUse.id, result);
			formattedResults.push(formatted);
		}

		return { calls, formattedResults };
	}
}

module.exports = { AITransformer };
