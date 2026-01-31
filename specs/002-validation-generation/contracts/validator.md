# Contract: Validator

**Module**: `src/validation/validator.js`  
**Purpose**: Orchestrate validation pipeline (syntax → purity → lint)

## Public API

### validate(code, options)

Validates JavaScript code through the full validation pipeline.

```javascript
/**
 * Validates JavaScript code for syntax, purity, and lint compliance.
 * 
 * @param {string} code - JavaScript code to validate
 * @param {ValidateOptions} [options] - Validation options
 * @returns {Promise<ValidationResult>} Validation result
 * 
 * @example
 * const result = await validate('const add = (a, b) => a + b;');
 * if (result.valid) {
 *   console.log('Code is valid and pure');
 * } else {
 *   console.log('Errors:', result.errors);
 * }
 */
async function validate(code, options = {}) {}
```

**Parameters**:

| Name | Type | Required | Description |
|------|------|----------|-------------|
| code | string | Yes | JavaScript code to validate |
| options | ValidateOptions | No | Validation options |

**Options**:

```javascript
/**
 * @typedef {Object} ValidateOptions
 * @property {string} [filename] - Virtual filename for error reporting
 * @property {'cjs' | 'esm'} [moduleFormat='cjs'] - Module format to validate
 * @property {boolean} [skipLint=false] - Skip lint validation
 * @property {Object} [eslintConfig] - Custom ESLint config to merge
 * @property {number} [maxErrors=10] - Maximum syntax errors to report
 */
```

**Returns**: `Promise<ValidationResult>`

**Behavior**:
1. Run syntax check first
2. If syntax fails, return immediately with syntax errors (fail-fast)
3. If syntax passes, run purity check on the AST
4. Run lint check (even if purity fails, to collect all issues)
5. Aggregate results and return

**Error Handling**:
- Parser exceptions → wrapped as syntax errors
- ESLint exceptions → wrapped as lint errors
- Never throws; always returns ValidationResult

---

### validateSyntax(code, options)

Validates JavaScript syntax only.

```javascript
/**
 * Validates JavaScript syntax using @babel/parser.
 * 
 * @param {string} code - JavaScript code to validate
 * @param {SyntaxOptions} [options] - Syntax validation options
 * @returns {SyntaxCheckResult} Syntax check result with AST if valid
 */
function validateSyntax(code, options = {}) {}
```

**Exported from**: `src/validation/syntax.js`

---

### validatePurity(ast, code, options)

Validates code purity via AST analysis.

```javascript
/**
 * Validates JavaScript code is pure (no side effects).
 * 
 * @param {Object} ast - Babel AST from syntax validation
 * @param {string} code - Original code for error snippets
 * @param {PurityOptions} [options] - Purity validation options
 * @returns {PurityCheckResult} Purity check result
 */
function validatePurity(ast, code, options = {}) {}
```

**Exported from**: `src/validation/purity.js`

---

### validateLint(code, options)

Validates code against ESLint rules.

```javascript
/**
 * Validates JavaScript code against ESLint rules.
 * 
 * @param {string} code - JavaScript code to validate
 * @param {LintOptions} [options] - Lint validation options
 * @returns {Promise<LintCheckResult>} Lint check result
 */
async function validateLint(code, options = {}) {}
```

**Exported from**: `src/validation/eslint-config.js`

## Internal Functions

### aggregateErrors(syntaxResult, purityResult, lintResult)

Combines errors from all validation phases into unified list.

### createValidationError(type, message, location, code)

Factory function for creating ValidationError objects.

## Dependencies

- `@babel/parser` - JavaScript parsing
- `@babel/traverse` - AST traversal for purity checking
- `eslint` - Lint validation
- `eslint-plugin-functional` - Functional programming rules

## Constants

```javascript
const MAX_SYNTAX_ERRORS = 10;

const FORBIDDEN_IDENTIFIERS = [
  'console', 'window', 'global', 'process', 'eval',
  'setTimeout', 'setInterval', 'fetch', 'fs'
];

const FORBIDDEN_MEMBER_EXPRESSIONS = [
  'Math.random', 'Date.now'
];
```

## Acceptance Criteria

1. ✅ Syntax errors include line, column, and descriptive message
2. ✅ Maximum 10 syntax errors reported per validation
3. ✅ Purity checker detects all patterns in constitution
4. ✅ Lint uses configurable ESLint rules
5. ✅ Pipeline fails fast on syntax errors
6. ✅ All errors aggregated into unified result
7. ✅ Never auto-fixes; returns errors for AI retry
