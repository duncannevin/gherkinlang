/**
 * Response parser for AI API responses.
 * 
 * Extracts JavaScript code from Claude API responses, handles tool invocation
 * requests, and validates extracted code. Parses various response formats
 * including markdown code blocks and plain text.
 * 
 * @module ai/response-parser
 */

const { InvalidCodeError } = require('./errors');

/**
 * @typedef {import('./types').AIAPIResponse} AIAPIResponse
 * @typedef {import('./types').ContentBlock} ContentBlock
 * @typedef {import('./types').ToolUse} ToolUse
 */

class ResponseParser {
  /**
   * Creates a new ResponseParser instance.
   * 
   * @constructor
   */
  constructor() {
    // Code block patterns
    this._codeBlockRegex = /```(?:javascript|js|typescript|ts)?\s*\n([\s\S]*?)```/g;
    this._inlineCodeRegex = /`([^`]+)`/g;
  }

  /**
   * Parse AI API response and extract code.
   * 
   * @param {AIAPIResponse} response - API response object
   * @param {string} target - Target language ('javascript' | 'elixir')
   * @returns {Object} Parsed result with code and tool calls
   * @property {string|null} code - Extracted code (null if not found)
   * @property {Array<ToolUse>} toolCalls - Tool invocation requests
   * @property {boolean} hasCode - Whether code was found
   * @throws {InvalidCodeError} If code cannot be extracted and validated
   */
  parse(response, target = 'javascript') {
    if (!response || !response.content) {
      throw new InvalidCodeError('Invalid API response: missing content', {
        response: JSON.stringify(response),
      });
    }

    const toolCalls = [];
    const textBlocks = [];

    // Process content blocks
    for (const block of response.content) {
      if (block.type === 'text') {
        textBlocks.push(block.text);
      } else if (block.type === 'tool_use') {
        toolCalls.push(block.tool_use);
      }
    }

    // Extract code from text blocks
    const code = this._extractCode(textBlocks.join('\n'), target);

    return {
      code,
      toolCalls,
      hasCode: code !== null,
    };
  }

  /**
   * Extract code from text content.
   * 
   * @private
   * @param {string} text - Text content from API
   * @param {string} target - Target language
   * @returns {string|null} Extracted code or null if not found
   */
  _extractCode(text, target) {
    if (!text || typeof text !== 'string') {
      return null;
    }

    // Try to find code blocks first (markdown format)
    const codeBlocks = [];
    let match;
    
    // Reset regex
    this._codeBlockRegex.lastIndex = 0;
    
    while ((match = this._codeBlockRegex.exec(text)) !== null) {
      codeBlocks.push(match[1].trim());
    }

    // If multiple code blocks, prefer the longest one (likely the main code)
    if (codeBlocks.length > 0) {
      const longest = codeBlocks.reduce((a, b) => a.length > b.length ? a : b);
      return this._validateCode(longest, target);
    }

    // If no code blocks, check if entire text is code (no markdown)
    const trimmed = text.trim();
    if (this._looksLikeCode(trimmed)) {
      return this._validateCode(trimmed, target);
    }

    return null;
  }

  /**
   * Check if text looks like code (heuristic).
   * 
   * @private
   * @param {string} text - Text to check
   * @returns {boolean} True if text looks like code
   */
  _looksLikeCode(text) {
    // Heuristics: code usually has
    // - Function definitions
    // - Variable assignments
    // - Curly braces or parentheses
    // - Semicolons (for JavaScript)
    const codeIndicators = [
      /function\s+\w+\s*\(/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /return\s+/,
      /=>\s*/,
      /\{[\s\S]*\}/,
      /\([\s\S]*\)/,
    ];

    return codeIndicators.some(pattern => pattern.test(text));
  }

  /**
   * Validate extracted code.
   * 
   * @private
   * @param {string} code - Code to validate
   * @param {string} target - Target language
   * @returns {string} Validated code
   * @throws {InvalidCodeError} If code is invalid
   */
  _validateCode(code, target) {
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      throw new InvalidCodeError('Extracted code is empty', {
        validationError: 'Code is empty or whitespace only',
      });
    }

    // Basic validation: check for common issues
    if (target === 'javascript') {
      // Check for balanced braces
      const openBraces = (code.match(/{/g) || []).length;
      const closeBraces = (code.match(/}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        throw new InvalidCodeError('Extracted code has unbalanced braces', {
          validationError: `Unbalanced braces: ${openBraces} open, ${closeBraces} close`,
          response: code,
        });
      }

      // Check for balanced parentheses
      const openParens = (code.match(/\(/g) || []).length;
      const closeParens = (code.match(/\)/g) || []).length;
      
      if (openParens !== closeParens) {
        throw new InvalidCodeError('Extracted code has unbalanced parentheses', {
          validationError: `Unbalanced parentheses: ${openParens} open, ${closeParens} close`,
          response: code,
        });
      }
    }

    return code;
  }

  /**
   * Check if response contains tool use requests.
   * 
   * @param {AIAPIResponse} response - API response
   * @returns {boolean} True if response contains tool calls
   */
  hasToolCalls(response) {
    if (!response || !response.content) {
      return false;
    }

    return response.content.some(block => block.type === 'tool_use');
  }
}

module.exports = { ResponseParser };
