/**
 * Type definitions for GherkinLang validation pipeline.
 *
 * Provides JSDoc type definitions for validation results, errors, and
 * location information used across the validation system.
 *
 * @module validation/types
 */

/**
 * @typedef {Object} ErrorLocation
 * @property {string} [file] - File path (if applicable)
 * @property {number} line - Line number (1-indexed)
 * @property {number} column - Column number (0-indexed)
 * @property {number} [endLine] - End line for ranges
 * @property {number} [endColumn] - End column for ranges
 */

/**
 * @typedef {Object} ValidationError
 * @property {'syntax' | 'purity' | 'lint'} type - Error category
 * @property {'error' | 'warning'} severity - Error severity
 * @property {string} message - Human-readable error message
 * @property {ErrorLocation} location - Error location in source
 * @property {string} code - Source code snippet at error
 * @property {string} [rule] - Lint rule name (for lint errors)
 * @property {string} [suggestion] - How to fix the error
 */

/**
 * @typedef {Object} SyntaxCheckResult
 * @property {boolean} valid - Whether syntax is valid
 * @property {ValidationError[]} errors - Syntax errors (max 10)
 * @property {Object} [ast] - Parsed AST if valid
 */

/**
 * @typedef {Object} PurityViolation
 * @property {'mutation' | 'side_effect' | 'global_access' | 'forbidden_construct'} violationType
 * @property {string} pattern - The forbidden pattern detected
 * @property {ErrorLocation} location - Location in source
 * @property {string} code - Source snippet
 * @property {string} message - Human-readable description
 */

/**
 * @typedef {Object} PurityCheckResult
 * @property {boolean} valid - Whether code is pure
 * @property {PurityViolation[]} violations - List of impure patterns found
 */

/**
 * @typedef {Object} LintViolation
 * @property {string} rule - ESLint rule name
 * @property {'error' | 'warning'} severity - Violation severity
 * @property {string} message - Rule violation message
 * @property {ErrorLocation} location - Location in source
 * @property {string} [fix] - Auto-fix suggestion (not applied)
 */

/**
 * @typedef {Object} LintCheckResult
 * @property {boolean} valid - Whether lint passed (no errors, warnings OK)
 * @property {LintViolation[]} violations - All lint violations
 * @property {number} errorCount - Number of errors
 * @property {number} warningCount - Number of warnings
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether all validations passed
 * @property {ValidationError[]} errors - List of validation errors
 * @property {ValidationError[]} warnings - List of validation warnings
 * @property {SyntaxCheckResult} syntax - Syntax validation result
 * @property {PurityCheckResult} [purity] - Purity validation result (null if syntax failed)
 * @property {LintCheckResult} [lint] - Lint validation result (null if syntax failed)
 * @property {number} duration - Total validation time in ms
 */

/**
 * Valid error types for validation errors.
 * @type {readonly ['syntax', 'purity', 'lint']}
 */
const ERROR_TYPES = Object.freeze(['syntax', 'purity', 'lint']);

/**
 * Valid severity levels for validation errors.
 * @type {readonly ['error', 'warning']}
 */
const SEVERITY_LEVELS = Object.freeze(['error', 'warning']);

/**
 * Valid purity violation types.
 * @type {readonly ['mutation', 'side_effect', 'global_access', 'forbidden_construct']}
 */
const VIOLATION_TYPES = Object.freeze([
  'mutation',
  'side_effect',
  'global_access',
  'forbidden_construct',
]);

/**
 * Creates a validation error object with consistent structure.
 *
 * @param {Object} options - Error options
 * @param {'syntax' | 'purity' | 'lint'} options.type - Error category
 * @param {'error' | 'warning'} [options.severity='error'] - Error severity
 * @param {string} options.message - Human-readable error message
 * @param {ErrorLocation} options.location - Error location in source
 * @param {string} [options.code=''] - Source code snippet at error
 * @param {string} [options.rule] - Lint rule name (for lint errors)
 * @param {string} [options.suggestion] - How to fix the error
 * @returns {ValidationError} The validation error object
 * @throws {Error} If required fields are missing or invalid
 */
const createValidationError = ({
  type,
  severity = 'error',
  message,
  location,
  code = '',
  rule,
  suggestion,
}) => {
  if (!ERROR_TYPES.includes(type)) {
    throw new Error(`Invalid error type: ${type}. Must be one of: ${ERROR_TYPES.join(', ')}`);
  }

  if (!SEVERITY_LEVELS.includes(severity)) {
    throw new Error(
      `Invalid severity: ${severity}. Must be one of: ${SEVERITY_LEVELS.join(', ')}`
    );
  }

  if (!message || typeof message !== 'string') {
    throw new Error('Message is required and must be a string');
  }

  if (!location || typeof location.line !== 'number') {
    throw new Error('Location with line number is required');
  }

  const error = {
    type,
    severity,
    message,
    location: {
      line: location.line,
      column: location.column ?? 0,
      ...(location.file && { file: location.file }),
      ...(location.endLine !== undefined && { endLine: location.endLine }),
      ...(location.endColumn !== undefined && { endColumn: location.endColumn }),
    },
    code,
  };

  if (rule !== undefined) {
    error.rule = rule;
  }

  if (suggestion !== undefined) {
    error.suggestion = suggestion;
  }

  return error;
};

/**
 * Extracts a code snippet from source code around a specific location.
 *
 * @param {string} source - The full source code
 * @param {ErrorLocation} location - The location to extract around
 * @param {Object} [options] - Extraction options
 * @param {number} [options.contextLines=2] - Number of lines before and after to include
 * @param {number} [options.maxLineLength=80] - Maximum line length before truncation
 * @returns {string} The extracted code snippet
 */
const getCodeSnippet = (source, location, options = {}) => {
  const { contextLines = 2, maxLineLength = 80 } = options;

  if (!source || typeof source !== 'string') {
    return '';
  }

  if (!location || typeof location.line !== 'number') {
    return '';
  }

  const lines = source.split('\n');
  const lineIndex = location.line - 1; // Convert to 0-indexed

  if (lineIndex < 0 || lineIndex >= lines.length) {
    return '';
  }

  const startLine = Math.max(0, lineIndex - contextLines);
  const endLine = Math.min(lines.length - 1, lineIndex + contextLines);

  const snippetLines = [];

  for (let i = startLine; i <= endLine; i++) {
    let line = lines[i];

    // Truncate long lines
    if (line.length > maxLineLength) {
      line = line.substring(0, maxLineLength - 3) + '...';
    }

    // Add line number prefix and marker for the error line
    const lineNum = String(i + 1).padStart(4, ' ');
    const marker = i === lineIndex ? '>' : ' ';
    snippetLines.push(`${marker} ${lineNum} | ${line}`);

    // Add column indicator for the error line
    if (i === lineIndex && typeof location.column === 'number') {
      const columnIndicator = ' '.repeat(8 + location.column) + '^';
      snippetLines.push(columnIndicator);
    }
  }

  return snippetLines.join('\n');
};

/**
 * Creates an empty validation result structure.
 *
 * @returns {ValidationResult} An empty validation result
 */
const createEmptyValidationResult = () => ({
  valid: true,
  errors: [],
  warnings: [],
  syntax: { valid: true, errors: [] },
  purity: null,
  lint: null,
  duration: 0,
});

module.exports = {
  ERROR_TYPES,
  SEVERITY_LEVELS,
  VIOLATION_TYPES,
  createValidationError,
  getCodeSnippet,
  createEmptyValidationResult,
};
