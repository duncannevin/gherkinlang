/**
 * Test generator MCP tool for GherkinLang compiler.
 * 
 * Generates test code for generated JavaScript implementations. Analyzes
 * code structure, extracts function signatures, and generates Jest test cases
 * with coverage estimates.
 * 
 * @module mcp/tools/test-generator
 */

/**
 * @typedef {import('../types').ToolResult} ToolResult
 */

/**
 * Test generator tool for creating Jest test code.
 */
class TestGenerator {
  constructor() {
    this.name = 'test-generator';
    this.description = 'Generates Jest test code for generated JavaScript implementations. Analyzes code structure and creates test cases with coverage estimates.';
    this.inputSchema = {
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
    };
  }

  /**
   * Execute the test generator tool.
   * 
   * @param {Object} args - Tool invocation parameters
   * @param {string} args.code - JavaScript code to test
   * @param {string} [args.testFramework] - Test framework (default: 'jest')
   * @returns {Promise<ToolResult>} Test generation result
   */
  async execute(args) {
    const startTime = Date.now();

    try {
      // Validate input
      if (!args.code || typeof args.code !== 'string') {
        return {
          success: false,
          error: 'code parameter is required and must be a string',
          duration: Date.now() - startTime,
        };
      }

      const { code, testFramework = 'jest' } = args;

      if (testFramework !== 'jest') {
        return {
          success: false,
          error: `Unsupported test framework: ${testFramework}. Only 'jest' is supported.`,
          duration: Date.now() - startTime,
        };
      }

      // Generate test code
      const testCode = this._generateJestTests(code);
      const coverage = this._estimateCoverage(code, testCode);

      return {
        success: true,
        content: {
          testCode,
          coverage,
        },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: `Test generation failed: ${error.message}`,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate Jest test code from JavaScript code.
   * 
   * @private
   * @param {string} code - JavaScript code to test
   * @returns {string} Generated Jest test code
   */
  _generateJestTests(code) {
    // Extract function names and exports
    const functionNames = this._extractFunctions(code);
    const exports = this._extractExports(code);

    if (functionNames.length === 0 && exports.length === 0) {
      return `describe('Generated code', () => {
  // No functions or exports found to test
  test('placeholder', () => {
    expect(true).toBe(true);
  });
});`;
    }

    // Generate test suite
    const testCases = [];
    
    // Test each exported function
    for (const exportName of exports) {
      testCases.push(`  describe('${exportName}', () => {
    test('should be defined', () => {
      expect(${exportName}).toBeDefined();
      expect(typeof ${exportName}).toBe('function');
    });

    test('should handle basic input', () => {
      // TODO: Add specific test cases based on function signature
      // Example: expect(${exportName}(input)).toBe(expectedOutput);
    });

    test('should handle edge cases', () => {
      // TODO: Add edge case tests
      // Example: expect(${exportName}(null)).toBe(expectedOutput);
    });
  });`);
    }

    // Test each function (if not already exported)
    for (const funcName of functionNames) {
      if (!exports.includes(funcName)) {
        testCases.push(`  describe('${funcName}', () => {
    test('should be defined', () => {
      expect(${funcName}).toBeDefined();
    });
  });`);
      }
    }

    return `describe('Generated code', () => {
${testCases.join('\n\n')}
});`;
  }

  /**
   * Extract function names from code.
   * 
   * @private
   * @param {string} code - JavaScript code
   * @returns {Array<string>} Array of function names
   */
  _extractFunctions(code) {
    const functions = [];
    
    // Match function declarations: function name(...)
    const funcDeclRegex = /function\s+(\w+)\s*\(/g;
    let match;
    while ((match = funcDeclRegex.exec(code)) !== null) {
      functions.push(match[1]);
    }

    // Match arrow function assignments: const name = (...) => ...
    const arrowFuncRegex = /(?:const|let|var)\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g;
    while ((match = arrowFuncRegex.exec(code)) !== null) {
      functions.push(match[1]);
    }

    return [...new Set(functions)]; // Remove duplicates
  }

  /**
   * Extract export names from code.
   * 
   * @private
   * @param {string} code - JavaScript code
   * @returns {Array<string>} Array of export names
   */
  _extractExports(code) {
    const exports = [];

    // Match module.exports = { name, ... }
    const moduleExportsRegex = /module\.exports\s*=\s*\{([^}]+)\}/s;
    const moduleExportsMatch = code.match(moduleExportsRegex);
    if (moduleExportsMatch) {
      const exportList = moduleExportsMatch[1];
      const exportNames = exportList.match(/(\w+)/g);
      if (exportNames) {
        exports.push(...exportNames);
      }
    }

    // Match exports.name = ...
    const namedExportsRegex = /exports\.(\w+)\s*=/g;
    let match;
    while ((match = namedExportsRegex.exec(code)) !== null) {
      exports.push(match[1]);
    }

    // Match export const/function name
    const es6ExportsRegex = /export\s+(?:const|function|let|var)\s+(\w+)/g;
    while ((match = es6ExportsRegex.exec(code)) !== null) {
      exports.push(match[1]);
    }

    return [...new Set(exports)]; // Remove duplicates
  }

  /**
   * Estimate test coverage.
   * 
   * @private
   * @param {string} code - Original code
   * @param {string} testCode - Generated test code
   * @returns {{lines: number, branches: number}} Coverage estimates
   */
  _estimateCoverage(code, testCode) {
    // Simple estimation based on test code presence
    const codeLines = code.split('\n').length;
    const testLines = testCode.split('\n').length;
    
    // Estimate: if we have tests, assume some coverage
    // This is a rough estimate - real coverage would require running tests
    const hasTests = testCode.includes('test(') || testCode.includes('it(');
    const testCount = (testCode.match(/test\(|it\(/g) || []).length;

    // Rough estimate: more tests = better coverage
    const estimatedLines = hasTests ? Math.min(85, 50 + (testCount * 5)) : 0;
    const estimatedBranches = hasTests ? Math.min(80, 40 + (testCount * 5)) : 0;

    return {
      lines: estimatedLines,
      branches: estimatedBranches,
    };
  }
}

module.exports = { TestGenerator };
