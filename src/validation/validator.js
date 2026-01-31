/**
 * Main code validator for GherkinLang compiler.
 *
 * Orchestrates the full validation pipeline: syntax checking, purity checking,
 * linting, and output validation. Ensures generated JavaScript is syntactically
 * correct, pure (no side effects), and follows best practices.
 *
 * @module validation/validator
 */

const { validateSyntax } = require('./syntax');
const { validatePurity } = require('./purity');
const { validateLint } = require('./eslint-config');
const { createValidationError, createEmptyValidationResult } = require('./types');

/**
 * @typedef {import('./types').ValidationResult} ValidationResult
 * @typedef {import('./types').ValidationError} ValidationError
 * @typedef {import('./types').SyntaxCheckResult} SyntaxCheckResult
 * @typedef {import('./types').PurityCheckResult} PurityCheckResult
 * @typedef {import('./types').LintCheckResult} LintCheckResult
 */

/**
 * @typedef {Object} ValidateOptions
 * @property {string} [filename] - Virtual filename for error reporting
 * @property {'cjs' | 'esm'} [moduleFormat='cjs'] - Module format to validate
 * @property {boolean} [skipLint=false] - Skip lint validation
 * @property {Object} [eslintConfig] - Custom ESLint config to merge
 * @property {number} [maxErrors=10] - Maximum syntax errors to report
 * @property {string[]} [allowedGlobals] - Additional allowed global identifiers
 * @property {string[]} [allowedMethods] - Additional allowed member expressions
 */

/**
 * Converts a purity violation to a validation error.
 *
 * @param {import('./types').PurityViolation} violation - Purity violation
 * @returns {ValidationError} Validation error
 */
const purityViolationToValidationError = (violation) => {
  return createValidationError({
    type: 'purity',
    severity: 'error',
    message: violation.message,
    location: violation.location,
    code: violation.code,
    suggestion: getSuggestionForPurityViolation(violation),
  });
};

/**
 * Provides suggestions for purity violations.
 *
 * @param {import('./types').PurityViolation} violation - Purity violation
 * @returns {string|undefined} Suggestion or undefined
 */
const getSuggestionForPurityViolation = (violation) => {
  const { violationType, pattern } = violation;

  switch (violationType) {
    case 'mutation':
      if (pattern.includes('push') || pattern.includes('pop')) {
        return "Use spread operator [...arr, newItem] or concat() instead of mutating array methods";
      }
      if (pattern.includes('sort') || pattern.includes('reverse')) {
        return "Use toSorted() or toReversed() for non-mutating alternatives";
      }
      if (pattern === 'property assignment') {
        return "Use spread operator { ...obj, prop: value } to create a new object instead";
      }
      return "Create a new value instead of mutating the existing one";

    case 'side_effect':
      if (pattern.startsWith('console')) {
        return "Remove console statements for pure functions";
      }
      if (pattern === 'Math.random') {
        return "Pass random values as parameters for deterministic behavior";
      }
      return "Remove side effects to make the function pure";

    case 'global_access':
      return "Pass required values as function parameters instead of accessing globals";

    case 'forbidden_construct':
      if (pattern.includes('For') || pattern.includes('While')) {
        return "Use map(), filter(), reduce(), or recursion instead of loops";
      }
      if (pattern.includes('Class')) {
        return "Use factory functions or plain objects instead of classes";
      }
      if (pattern === 'ThisExpression') {
        return "Use closures or pass context explicitly instead of 'this'";
      }
      return "Refactor to use functional patterns";

    default:
      return undefined;
  }
};

/**
 * Converts a lint violation to a validation error.
 *
 * @param {import('./types').LintViolation} violation - Lint violation
 * @returns {ValidationError} Validation error
 */
const lintViolationToValidationError = (violation) => {
  return createValidationError({
    type: 'lint',
    severity: violation.severity,
    message: violation.message,
    location: violation.location,
    code: violation.code || '',
    rule: violation.rule,
    suggestion: violation.fix,
  });
};

/**
 * Aggregates errors from all validation phases into a unified list.
 *
 * Converts syntax errors, purity violations, and lint violations into
 * a consistent ValidationError format. Separates errors and warnings.
 *
 * @param {SyntaxCheckResult} syntaxResult - Syntax validation result
 * @param {PurityCheckResult|null} purityResult - Purity validation result (null if syntax failed)
 * @param {LintCheckResult|null} lintResult - Lint validation result (null if syntax failed or skipLint)
 * @returns {{ errors: ValidationError[], warnings: ValidationError[] }} Aggregated errors and warnings
 */
const aggregateErrors = (syntaxResult, purityResult, lintResult) => {
  /** @type {ValidationError[]} */
  const errors = [];
  /** @type {ValidationError[]} */
  const warnings = [];

  // Add syntax errors (always errors, never warnings)
  if (syntaxResult && !syntaxResult.valid) {
    errors.push(...syntaxResult.errors);
  }

  // Add purity violations (always errors)
  if (purityResult && !purityResult.valid) {
    for (const violation of purityResult.violations) {
      errors.push(purityViolationToValidationError(violation));
    }
  }

  // Add lint violations (can be errors or warnings)
  if (lintResult) {
    for (const violation of lintResult.violations) {
      const error = lintViolationToValidationError(violation);
      if (violation.severity === 'warning') {
        warnings.push(error);
      } else {
        errors.push(error);
      }
    }
  }

  return { errors, warnings };
};

/**
 * Validates JavaScript code through the full validation pipeline.
 *
 * Runs validation in order:
 * 1. Syntax check (using @babel/parser)
 * 2. Purity check (AST analysis for side effects) - skipped if syntax fails (fail-fast)
 * 3. Lint check (ESLint rules) - skipped if syntax fails (fail-fast)
 *
 * This function NEVER auto-fixes code. All errors are returned for the AI
 * to retry with corrected code.
 *
 * @param {string} code - JavaScript code to validate
 * @param {ValidateOptions} [options={}] - Validation options
 * @returns {Promise<ValidationResult>} Validation result
 *
 * @example
 * // Valid code
 * const result = await validate('const add = (a, b) => a + b;');
 * if (result.valid) {
 *   console.log('Code is valid and pure');
 * } else {
 *   console.log('Errors:', result.errors);
 * }
 *
 * @example
 * // Invalid code with multiple error types
 * const result = await validate('var x = 1; console.log(x);');
 * // result.errors will contain both purity and lint violations
 *
 * @example
 * // Skip lint validation
 * const result = await validate(code, { skipLint: true });
 *
 * @example
 * // With ES Module format
 * const result = await validate('export default () => 42;', { moduleFormat: 'esm' });
 */
const validate = async (code, options = {}) => {
  const startTime = Date.now();

  const {
    filename,
    moduleFormat = 'cjs',
    skipLint = false,
    eslintConfig,
    maxErrors = 10,
    allowedGlobals,
    allowedMethods,
  } = options;

  // Initialize result structure
  /** @type {ValidationResult} */
  const result = createEmptyValidationResult();

  // Step 1: Syntax validation (always runs first)
  const syntaxResult = validateSyntax(code, {
    filename,
    moduleFormat,
    maxErrors,
  });

  result.syntax = syntaxResult;

  // T025: Fail-fast - if syntax fails, skip purity and lint
  if (!syntaxResult.valid) {
    const { errors, warnings } = aggregateErrors(syntaxResult, null, null);
    result.valid = false;
    result.errors = errors;
    result.warnings = warnings;
    result.purity = null;
    result.lint = null;
    result.duration = Date.now() - startTime;
    return result;
  }

  // Step 2: Purity validation (requires valid AST)
  const purityResult = validatePurity(syntaxResult.ast, code, {
    filename,
    allowedGlobals,
    allowedMethods,
  });

  result.purity = purityResult;

  // Step 3: Lint validation (even if purity fails, to collect all issues)
  // T028: Note - we never auto-fix; validateLint has fix: false
  let lintResult = null;
  if (!skipLint) {
    lintResult = await validateLint(code, {
      filename,
      eslintConfig,
    });
    result.lint = lintResult;
  }

  // T026: Aggregate all errors from all phases
  const { errors, warnings } = aggregateErrors(syntaxResult, purityResult, lintResult);

  // Determine overall validity
  // Valid only if all checks pass (purity valid AND lint valid or skipped)
  const purityValid = purityResult.valid;
  const lintValid = skipLint || (lintResult && lintResult.valid);

  result.valid = purityValid && lintValid;
  result.errors = errors;
  result.warnings = warnings;

  // T027: Track duration
  result.duration = Date.now() - startTime;

  return result;
};

/**
 * Validates multiple code strings in sequence.
 *
 * @param {Array<{code: string, options?: ValidateOptions}>} items - Items to validate
 * @returns {Promise<ValidationResult[]>} Array of validation results
 */
const validateBatch = async (items) => {
  const results = [];
  for (const item of items) {
    const result = await validate(item.code, item.options);
    results.push(result);
  }
  return results;
};

/**
 * Performs a quick syntax-only validation.
 *
 * Useful for rapid feedback during code generation before running
 * the full validation pipeline.
 *
 * @param {string} code - JavaScript code to validate
 * @param {Object} [options] - Validation options
 * @param {string} [options.filename] - Virtual filename for error reporting
 * @param {'cjs' | 'esm'} [options.moduleFormat] - Module format
 * @returns {SyntaxCheckResult} Syntax check result
 */
const validateSyntaxOnly = (code, options = {}) => {
  return validateSyntax(code, options);
};

/**
 * Checks if code is valid without returning detailed results.
 *
 * Useful for quick validation checks where only the boolean result matters.
 *
 * @param {string} code - JavaScript code to validate
 * @param {ValidateOptions} [options] - Validation options
 * @returns {Promise<boolean>} True if code is valid
 */
const isValid = async (code, options = {}) => {
  const result = await validate(code, options);
  return result.valid;
};

module.exports = {
  validate,
  validateBatch,
  validateSyntaxOnly,
  isValid,
  // Export for testing
  aggregateErrors,
  purityViolationToValidationError,
  lintViolationToValidationError,
  getSuggestionForPurityViolation,
};
