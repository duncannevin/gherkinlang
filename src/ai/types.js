/**
 * Type definitions for AI transformation engine.
 * 
 * Defines the structure of data flowing through the AI compilation pipeline.
 * These types represent the interfaces and data structures used by the
 * AI transformer and related components.
 * 
 * @module ai/types
 */

/**
 * Structured input sent to the AI API for compilation.
 * 
 * @typedef {Object} CompilationPrompt
 * @property {string} systemMessage - System prompt with role definition and language rules
 * @property {string} userMessage - User prompt with source code and compilation context
 * @property {Array<ClaudeTool>} tools - Available tools for AI to use during compilation
 * @property {string} model - Claude model identifier (e.g., 'claude-sonnet-4-5')
 * @property {number} temperature - Temperature setting (always 0.0 for deterministic)
 * @property {number} maxTokens - Maximum tokens in response
 */

/**
 * Tool definition for Claude API.
 * 
 * @typedef {Object} ClaudeTool
 * @property {string} name - Tool name
 * @property {string} description - Tool description for AI
 * @property {Object} input_schema - JSON Schema for tool parameters
 */

/**
 * Output from AI transformation containing generated code and metadata.
 * 
 * @typedef {Object} TransformResult
 * @property {boolean} success - Whether transformation succeeded
 * @property {string} [code] - Generated JavaScript code (required if success is true)
 * @property {string} [error] - Error message if transformation failed (required if success is false)
 * @property {Array<ToolCall>} [toolCalls] - Tool invocations made during compilation
 * @property {TransformMetadata} metadata - Transformation metadata
 */

/**
 * Tool invocation made during compilation.
 * 
 * @typedef {Object} ToolCall
 * @property {string} toolName - Name of tool invoked
 * @property {Object} arguments - Tool invocation arguments
 * @property {Object} [result] - Tool result (if available)
 * @property {number} duration - Tool invocation duration in milliseconds
 * @property {boolean} success - Whether tool invocation succeeded
 */

/**
 * Transformation metadata tracking model, tokens, duration, and other metrics.
 * 
 * @typedef {Object} TransformMetadata
 * @property {string} model - AI model used
 * @property {TokenUsage} tokens - Token consumption
 * @property {number} duration - Total transformation duration in milliseconds
 * @property {number} retryCount - Number of retries attempted
 * @property {boolean} cacheHit - Whether result came from cache
 */

/**
 * Token usage statistics from AI API response.
 * 
 * @typedef {Object} TokenUsage
 * @property {number} input - Input tokens consumed
 * @property {number} output - Output tokens consumed
 * @property {number} total - Total tokens consumed
 */

/**
 * AI API response containing generated code or tool requests.
 * 
 * @typedef {Object} AIAPIResponse
 * @property {Array<ContentBlock>} content - Response content blocks
 * @property {TokenUsage} usage - Token consumption
 * @property {string} model - Model used
 * @property {string} stopReason - Why generation stopped ('end_turn' | 'max_tokens' | 'stop_sequence')
 * @property {string} id - Response ID
 */

/**
 * Content block in AI API response.
 * 
 * @typedef {Object} ContentBlock
 * @property {string} type - Content type ('text' | 'tool_use')
 * @property {string} [text] - Text content (if type is 'text')
 * @property {ToolUse} [tool_use] - Tool use request (if type is 'tool_use')
 */

/**
 * Tool use request from AI.
 * 
 * @typedef {Object} ToolUse
 * @property {string} id - Tool use ID
 * @property {string} name - Tool name
 * @property {Object} input - Tool arguments
 */

module.exports = {
  // Types are exported for JSDoc reference
  // Actual validation and construction is done in implementation files
};
