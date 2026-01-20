/**
 * Prompt builder for AI compilation requests.
 * 
 * Constructs structured prompts for the Claude API that include source code,
 * language rules, and project context. Formats prompts to guide the AI in
 * generating correct JavaScript code from GherkinLang source.
 * 
 * @module ai/prompt-builder
 */

const { readFile } = require('../compiler/utils/fs');
const path = require('path');

/**
 * @typedef {import('./types').CompilationPrompt} CompilationPrompt
 * @typedef {import('./types').ClaudeTool} ClaudeTool
 */

class PromptBuilder {
  /**
   * Creates a new PromptBuilder instance.
   * 
   * @constructor
   */
  constructor() {
    // Rules are loaded from rules.md file
  }

  /**
   * Build a compilation prompt for the AI API.
   * 
   * @param {Object} options - Prompt building options
   * @param {string} options.source - GherkinLang source code to compile
   * @param {string} options.target - Target language ('javascript' | 'elixir')
   * @param {Object} [options.context] - Project context (module info, dependencies)
   * @param {string} [options.model] - Claude model identifier (default: 'claude-sonnet-4-5')
   * @param {number} [options.maxTokens] - Maximum tokens in response (default: 4096)
   * @param {Array<ClaudeTool>} [options.tools] - Available tools for AI (default: [])
   * @returns {Promise<CompilationPrompt>} Structured compilation prompt
   */
  async build({
    source,
    target,
    context = {},
    model = 'claude-sonnet-4-5',
    maxTokens = 4096,
    tools = [],
  }) {
    if (!source || typeof source !== 'string') {
      throw new Error('Source code is required');
    }

    if (!target || !['javascript', 'elixir'].includes(target)) {
      throw new Error(`Invalid target: ${target}`);
    }

    // Get language rules from rules.md file
    const rulesContent = await this._getGherkinLangRules();
    
    // Load target-specific prompt if available
    const targetPrompt = await this._loadTargetPrompt(target);

    // Build system message with role and rules
    const systemMessage = this._buildSystemMessage(rulesContent, targetPrompt, target);

    // Build user message with source and context
    const userMessage = this._buildUserMessage(source, context, target);

    return {
      systemMessage,
      userMessage,
      tools,
      model,
      temperature: 0.0, // Deterministic output
      maxTokens,
    };
  }

  /**
   * Build system message with role definition and language rules.
   * 
   * @private
   * @param {string} rulesContent - Language rules content
   * @param {string} targetPrompt - Target-specific prompt
   * @param {string} target - Target language
   * @returns {string} System message
   */
  _buildSystemMessage(rulesContent, targetPrompt, target) {
    const role = `You are a compiler for GherkinLang, a purely functional programming language that compiles to ${target}.`;

    const instructions = [
      'Your job:',
      '1. Read the GherkinLang source code provided',
      '2. Apply the language rules exactly as specified',
      `3. Generate clean, idiomatic ${target} code`,
      '4. Ensure all functions are pure (no side effects)',
      '5. Output ONLY valid code - no explanations, no markdown code blocks, no preamble',
    ].join('\n');

    const targetSpecific = targetPrompt ? `\n\n${targetPrompt}` : '';

    return `${role}\n\n${instructions}\n\n# GherkinLang Compilation Rules\n\n${rulesContent}${targetSpecific}`;
  }

  /**
   * Build user message with source code and project context.
   * 
   * @private
   * @param {string} source - GherkinLang source code
   * @param {Object} context - Project context
   * @param {string} target - Target language
   * @returns {string} User message
   */
  _buildUserMessage(source, context, target) {
    const parts = [
      `Compile the following GherkinLang source code to ${target}:`,
      '',
      '```gherkin',
      source,
      '```',
    ];

    // Add context information if available
    if (context.moduleName) {
      parts.push('', `Module: ${context.moduleName}`);
    }

    if (context.dependencies && context.dependencies.length > 0) {
      parts.push('', `Dependencies: ${context.dependencies.join(', ')}`);
    }

    if (context.imports && context.imports.length > 0) {
      parts.push('', `Imports: ${context.imports.join(', ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Get GherkinLang compilation rules from rules.md file.
   * 
   * These rules define the syntax and semantics of GherkinLang, a purely
   * functional programming language that uses Gherkin syntax.
   * 
   * @private
   * @param {string} [rulesPath] - Optional path to rules.md (default: 'src/ai/rules.md')
   * @returns {Promise<string>} GherkinLang rules content
   */
  async _getGherkinLangRules() {
    try {
      // Resolve path relative to project root if relative path provided
      const resolvedPath = path.join(__dirname, 'prompts', 'rules.md');
      const content = await readFile(resolvedPath);
      return content.trim();
    } catch (error) {
      throw new Error(`Failed to read rules file: ${path.join(__dirname, 'prompts', 'rules.md')}. ${error.message}`);
    }
  }

  /**
   * Load target-specific prompt if available.
   * 
   * @private
   * @param {string} target - Target language
   * @returns {Promise<string>} Target-specific prompt content
   */
  async _loadTargetPrompt(target) {
    try {
      const promptPath = path.join(__dirname, 'prompts', `${target}.md`);
      const content = await readFile(promptPath);
      // Extract content after the first heading if it exists
      const lines = content.split('\n');
      return content.trim();
    } catch (error) {
      // Target-specific prompt is optional
      return '';
    }
  }
}

module.exports = { PromptBuilder };
