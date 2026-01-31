/**
 * Syntax checker for GherkinLang compiler.
 *
 * Validates that generated JavaScript code is syntactically correct using
 * @babel/parser. Detects syntax errors, validates ES2020+ features,
 * and reports line/column information for errors.
 *
 * @module validation/syntax
 */

const { parse } = require('@babel/parser');
const { MAX_SYNTAX_ERRORS } = require('./constants');
const { createValidationError, getCodeSnippet } = require('./types');

/**
 * @typedef {import('./types').SyntaxCheckResult} SyntaxCheckResult
 * @typedef {import('./types').ValidationError} ValidationError
 * @typedef {import('./types').ErrorLocation} ErrorLocation
 */

/**
 * @typedef {Object} SyntaxOptions
 * @property {string} [filename] - Virtual filename for error reporting
 * @property {'cjs' | 'esm' | 'unambiguous'} [moduleFormat='unambiguous'] - Module format
 * @property {number} [maxErrors=10] - Maximum syntax errors to report
 */

/**
 * Default Babel parser plugins for ES2020+ support.
 * @type {string[]}
 */
const DEFAULT_PLUGINS = [
  // ES2020+ features
  'optionalChaining', // obj?.prop
  'nullishCoalescingOperator', // a ?? b
  'bigInt', // 123n
  'classProperties', // class { prop = value }
  'classPrivateProperties', // class { #prop = value }
  'classPrivateMethods', // class { #method() {} }
  'numericSeparator', // 1_000_000
  'dynamicImport', // import()
  'exportDefaultFrom', // export v from 'mod'
  'exportNamespaceFrom', // export * as ns from 'mod'
  'optionalCatchBinding', // try {} catch {}
  'objectRestSpread', // { ...obj }
  'asyncGenerators', // async function* gen() {}
  'logicalAssignment', // a ||= b, a &&= b, a ??= b
];

/**
 * Maps Babel sourceType values to our module format options.
 * @param {'cjs' | 'esm' | 'unambiguous'} moduleFormat - Our module format
 * @returns {'script' | 'module' | 'unambiguous'} Babel sourceType
 */
const mapModuleFormatToSourceType = (moduleFormat) => {
  switch (moduleFormat) {
    case 'cjs':
      return 'script';
    case 'esm':
      return 'module';
    case 'unambiguous':
    default:
      return 'unambiguous';
  }
};

/**
 * Creates Babel parser options with ES2020+ plugin configuration.
 *
 * @param {SyntaxOptions} options - Syntax validation options
 * @returns {Object} Babel parser options
 */
const createParserOptions = (options = {}) => {
  const { filename, moduleFormat = 'unambiguous' } = options;

  return {
    sourceType: mapModuleFormatToSourceType(moduleFormat),
    sourceFilename: filename,
    plugins: DEFAULT_PLUGINS,
    errorRecovery: true, // Enable error recovery to collect multiple errors
    allowReturnOutsideFunction: true, // More permissive parsing
    allowSuperOutsideMethod: false,
    allowUndeclaredExports: true,
    tokens: false, // Don't need tokens
    ranges: false, // Don't need range info
  };
};

/**
 * Converts a Babel parsing error to a ValidationError.
 *
 * @param {Error} error - Babel parser error
 * @param {string} code - Original source code
 * @param {string} [filename] - Virtual filename
 * @returns {ValidationError} Validation error object
 */
const babelErrorToValidationError = (error, code, filename) => {
  // Babel errors have loc property with line/column
  const loc = error.loc || { line: 1, column: 0 };

  const location = {
    line: loc.line,
    column: loc.column,
    ...(filename && { file: filename }),
  };

  const snippet = getCodeSnippet(code, location);

  return createValidationError({
    type: 'syntax',
    severity: 'error',
    message: error.message.replace(/\s*\(\d+:\d+\)\s*$/, ''), // Remove position suffix
    location,
    code: snippet,
    suggestion: getSyntaxErrorSuggestion(error.message),
  });
};

/**
 * Provides suggestions for common syntax errors.
 *
 * @param {string} message - Error message
 * @returns {string|undefined} Suggestion or undefined
 */
const getSyntaxErrorSuggestion = (message) => {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('unexpected token')) {
    if (lowerMessage.includes('}')) {
      return 'Check for missing opening brace or extra closing brace';
    }
    if (lowerMessage.includes(')')) {
      return 'Check for missing opening parenthesis or extra closing parenthesis';
    }
    if (lowerMessage.includes(']')) {
      return 'Check for missing opening bracket or extra closing bracket';
    }
    return 'Check for typos or missing punctuation';
  }

  if (lowerMessage.includes('unterminated string')) {
    return 'Add the closing quote to terminate the string';
  }

  if (lowerMessage.includes('missing semicolon')) {
    return 'Add a semicolon at the end of the statement';
  }

  if (lowerMessage.includes('unexpected reserved word')) {
    return 'This word is reserved and cannot be used as an identifier';
  }

  if (lowerMessage.includes('duplicate') && lowerMessage.includes('export')) {
    return 'Remove the duplicate export or rename one of them';
  }

  return undefined;
};

/**
 * Validates JavaScript syntax using @babel/parser.
 *
 * Parses the provided JavaScript code and returns any syntax errors found.
 * Supports ES2020+ features including optional chaining and nullish coalescing.
 * Uses error recovery mode to collect up to maxErrors (default 10) syntax errors
 * before stopping.
 *
 * @param {string} code - JavaScript code to validate
 * @param {SyntaxOptions} [options={}] - Syntax validation options
 * @returns {SyntaxCheckResult} Syntax check result with AST if valid
 *
 * @example
 * // Valid code returns AST
 * const result = validateSyntax('const add = (a, b) => a + b;');
 * console.log(result.valid); // true
 * console.log(result.ast); // Babel AST
 *
 * @example
 * // Invalid code returns errors
 * const result = validateSyntax('const x = ;');
 * console.log(result.valid); // false
 * console.log(result.errors[0].message); // Syntax error details
 *
 * @example
 * // ES Module syntax
 * const result = validateSyntax('export default () => 42;', { moduleFormat: 'esm' });
 *
 * @example
 * // CommonJS syntax
 * const result = validateSyntax('module.exports = {};', { moduleFormat: 'cjs' });
 */
const validateSyntax = (code, options = {}) => {
  const { filename, maxErrors = MAX_SYNTAX_ERRORS } = options;
  const parserOptions = createParserOptions(options);

  /** @type {ValidationError[]} */
  const errors = [];

  try {
    const ast = parse(code, parserOptions);

    // Check for errors collected during error recovery
    if (ast.errors && ast.errors.length > 0) {
      const errorsToReport = ast.errors.slice(0, maxErrors);

      for (const error of errorsToReport) {
        errors.push(babelErrorToValidationError(error, code, filename));
      }

      return {
        valid: false,
        errors,
        ast: null,
      };
    }

    // No errors - return valid result with AST
    return {
      valid: true,
      errors: [],
      ast,
    };
  } catch (error) {
    // Fatal parsing error (even with error recovery enabled)
    errors.push(babelErrorToValidationError(error, code, filename));

    return {
      valid: false,
      errors,
      ast: null,
    };
  }
};

/**
 * Checks if the provided code uses ES Module syntax.
 *
 * @param {string} code - JavaScript code to check
 * @returns {boolean} True if code contains import/export statements
 */
const isESModuleSyntax = (code) => {
  // Quick heuristic check for ES module keywords
  // This is used before parsing when moduleFormat is 'unambiguous'
  const esmPatterns = [
    /\bimport\s+(?:[\w{*]|['"])/,
    /\bimport\s*\(/,
    /\bexport\s+(?:default|const|let|var|function|class|async|\*|{)/,
  ];

  return esmPatterns.some((pattern) => pattern.test(code));
};

/**
 * Checks if the provided code uses CommonJS syntax.
 *
 * @param {string} code - JavaScript code to check
 * @returns {boolean} True if code contains require/module.exports
 */
const isCommonJSSyntax = (code) => {
  const cjsPatterns = [/\brequire\s*\(/, /\bmodule\.exports\b/, /\bexports\./];

  return cjsPatterns.some((pattern) => pattern.test(code));
};

/**
 * Detects the likely module format of the provided code.
 *
 * @param {string} code - JavaScript code to analyze
 * @returns {'esm' | 'cjs' | 'unambiguous'} Detected module format
 */
const detectModuleFormat = (code) => {
  if (isESModuleSyntax(code)) {
    return 'esm';
  }
  if (isCommonJSSyntax(code)) {
    return 'cjs';
  }
  return 'unambiguous';
};

module.exports = {
  validateSyntax,
  isESModuleSyntax,
  isCommonJSSyntax,
  detectModuleFormat,
  // Export for testing
  DEFAULT_PLUGINS,
  createParserOptions,
  babelErrorToValidationError,
  getSyntaxErrorSuggestion,
};
