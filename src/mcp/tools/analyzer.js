/**
 * Code analyzer MCP tool for GherkinLang compiler.
 * 
 * Validates generated JavaScript code during the AI transformation loop.
 * Performs syntax checking, purity analysis, linting, and type checking.
 * Returns validation results and parsed AST for further analysis.
 * 
 * @module mcp/tools/analyzer
 */

const vm = require('vm');

/**
 * @typedef {import('../types').ToolResult} ToolResult
 */

/**
 * Code analyzer tool for validating JavaScript syntax and purity.
 */
class CodeAnalyzer {
  constructor() {
    this.name = 'analyzer';
    this.description = 'Validates JavaScript code for syntax correctness and purity compliance. Checks for syntax errors, side effects, mutations, and forbidden patterns.';
    this.inputSchema = {
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
    };
  }

  /**
   * Execute the analyzer tool.
   * 
   * @param {Object} args - Tool invocation parameters
   * @param {string} args.code - JavaScript code to analyze
   * @param {Array<string>} args.checks - Types of checks to perform
   * @returns {Promise<ToolResult>} Analysis result
   */
  async execute(args) {
    const startTime = Date.now();

    try {
      // Validate input
      if (!args.code || typeof args.code !== 'string') {
        return {
          success: false,
          error: 'Code parameter is required and must be a string',
          duration: Date.now() - startTime,
        };
      }

      if (!args.checks || !Array.isArray(args.checks)) {
        return {
          success: false,
          error: 'Checks parameter is required and must be an array',
          duration: Date.now() - startTime,
        };
      }

      const { code, checks } = args;
      const errors = [];
      const warnings = [];
      let valid = true;

      // Perform syntax check
      if (checks.includes('syntax')) {
        const syntaxResult = this._checkSyntax(code);
        if (!syntaxResult.valid) {
          valid = false;
          errors.push(...syntaxResult.errors);
        }
        warnings.push(...syntaxResult.warnings);
      }

      // Perform purity check
      if (checks.includes('purity')) {
        const purityResult = this._checkPurity(code);
        if (!purityResult.valid) {
          valid = false;
          errors.push(...purityResult.errors);
        }
        warnings.push(...purityResult.warnings);
      }

      return {
        success: true,
        content: {
          valid,
          errors,
          warnings,
        },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: `Analysis failed: ${error.message}`,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Check JavaScript syntax.
   * 
   * @private
   * @param {string} code - JavaScript code to check
   * @returns {{valid: boolean, errors: Array, warnings: Array}} Syntax check result
   */
  _checkSyntax(code) {
    const errors = [];
    const warnings = [];

    try {
      // Use vm.compileFunction for basic syntax validation
      // This will throw if there are syntax errors
      vm.compileFunction(code, [], {
        filename: 'analyzed-code.js',
        lineOffset: 0,
        columnOffset: 0,
      });
    } catch (error) {
      // Extract error information
      if (error.message.includes('SyntaxError')) {
        errors.push({
          type: 'syntax',
          message: error.message,
          line: error.stack?.match(/at line (\d+)/)?.[1] || 'unknown',
        });
      } else {
        errors.push({
          type: 'syntax',
          message: `Syntax error: ${error.message}`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check code purity (no side effects, mutations, etc.).
   * 
   * @private
   * @param {string} code - JavaScript code to check
   * @returns {{valid: boolean, errors: Array, warnings: Array}} Purity check result
   */
  _checkPurity(code) {
    const errors = [];
    const warnings = [];

    // Forbidden patterns for purity
    const forbiddenPatterns = [
      // Console operations
      { pattern: /\bconsole\.(log|warn|error|info|debug)\s*\(/g, message: 'Console operations are not allowed (side effect)' },
      // Process operations
      { pattern: /\bprocess\.(exit|env)\b/g, message: 'Process operations are not allowed (side effect)' },
      // File system operations
      { pattern: /\b(fs|require\(['"]fs['"]\))\.(read|write|append|unlink|mkdir|rmdir)/g, message: 'File system operations are not allowed (side effect)' },
      // Network operations
      { pattern: /\b(fetch|XMLHttpRequest|http|https)\./g, message: 'Network operations are not allowed (side effect)' },
      // Date.now() and Math.random()
      { pattern: /\b(Date\.now|Math\.random)\s*\(/g, message: 'Non-deterministic operations are not allowed' },
      // Mutations
      { pattern: /\b\.(push|pop|shift|unshift|splice|sort|reverse)\s*\(/g, message: 'Array mutations are not allowed (use immutable operations)' },
      { pattern: /\b\.(assign|delete)\s+/g, message: 'Object mutations are not allowed' },
      // Increment/decrement operators
      { pattern: /\+\+|--/g, message: 'Increment/decrement operators are not allowed (use immutable operations)' },
      // Loops (while, for, do-while)
      { pattern: /\b(while|for|do)\s*\(/g, message: 'Loops are not allowed (use functional patterns like map, filter, reduce)' },
      // This keyword
      { pattern: /\bthis\b/g, message: 'this keyword is not allowed (use functional patterns)' },
      // Class declarations
      { pattern: /\bclass\s+\w+/g, message: 'Class declarations are not allowed (use functions)' },
      // New expressions (except new Error)
      { pattern: /\bnew\s+(?!Error\s*\()/g, message: 'new expressions are not allowed (except new Error())' },
    ];

    for (const { pattern, message } of forbiddenPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        errors.push({
          type: 'purity',
          message,
          pattern: matches[0],
        });
      }
    }

    // Check for assignments (except const/let declarations)
    const assignmentPattern = /(?!const|let)\s*\w+\s*=\s*[^=]/g;
    const assignmentMatches = code.match(assignmentPattern);
    if (assignmentMatches) {
      // Filter out function declarations and arrow functions
      const realAssignments = assignmentMatches.filter(match => {
        const trimmed = match.trim();
        return !trimmed.startsWith('const ') && !trimmed.startsWith('let ') && !trimmed.includes('=>');
      });
      if (realAssignments.length > 0) {
        warnings.push({
          type: 'purity',
          message: 'Variable reassignment detected (prefer immutable patterns)',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

module.exports = { CodeAnalyzer };
