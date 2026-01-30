# Data Model: Validation & Generation

**Feature**: 002-validation-generation  
**Date**: 2026-01-29

## Entities

### ValidationResult

The aggregate result from the validation pipeline.

```javascript
/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether all validations passed
 * @property {ValidationError[]} errors - List of validation errors
 * @property {ValidationError[]} warnings - List of validation warnings
 * @property {SyntaxCheckResult} syntax - Syntax validation result
 * @property {PurityCheckResult} purity - Purity validation result
 * @property {LintCheckResult} lint - Lint validation result
 * @property {number} duration - Total validation time in ms
 */
```

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| valid | boolean | Yes | True if all checks passed |
| errors | ValidationError[] | Yes | All errors (empty if valid) |
| warnings | ValidationError[] | Yes | Non-blocking warnings |
| syntax | SyntaxCheckResult | Yes | Syntax check details |
| purity | PurityCheckResult | Yes | Purity check details (null if syntax failed) |
| lint | LintCheckResult | Yes | Lint check details (null if syntax failed) |
| duration | number | Yes | Total validation time in milliseconds |

**Validation Rules**:
- If `syntax.valid` is false, `purity` and `lint` are null (fail-fast)
- `errors` is aggregated from all check results
- `valid` is true only if all individual checks pass

---

### ValidationError

A specific validation error with location information.

```javascript
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
```

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | enum | Yes | 'syntax', 'purity', or 'lint' |
| severity | enum | Yes | 'error' or 'warning' |
| message | string | Yes | Human-readable description |
| location | ErrorLocation | Yes | File, line, column |
| code | string | Yes | Source snippet (context) |
| rule | string | No | ESLint rule name (lint only) |
| suggestion | string | No | Fix suggestion if available |

---

### ErrorLocation

Location information for an error.

```javascript
/**
 * @typedef {Object} ErrorLocation
 * @property {string} [file] - File path (if applicable)
 * @property {number} line - Line number (1-indexed)
 * @property {number} column - Column number (0-indexed)
 * @property {number} [endLine] - End line for ranges
 * @property {number} [endColumn] - End column for ranges
 */
```

---

### SyntaxCheckResult

Result from syntax validation.

```javascript
/**
 * @typedef {Object} SyntaxCheckResult
 * @property {boolean} valid - Whether syntax is valid
 * @property {ValidationError[]} errors - Syntax errors (max 10)
 * @property {Object} [ast] - Parsed AST if valid
 */
```

**Validation Rules**:
- Maximum 10 errors reported per run (per clarification)
- AST is only populated when valid is true

---

### PurityCheckResult

Result from purity validation.

```javascript
/**
 * @typedef {Object} PurityCheckResult
 * @property {boolean} valid - Whether code is pure
 * @property {PurityViolation[]} violations - List of impure patterns found
 */
```

---

### PurityViolation

A specific purity violation.

```javascript
/**
 * @typedef {Object} PurityViolation
 * @property {'mutation' | 'side_effect' | 'global_access' | 'forbidden_construct'} violationType
 * @property {string} pattern - The forbidden pattern detected
 * @property {ErrorLocation} location - Location in source
 * @property {string} code - Source snippet
 * @property {string} message - Human-readable description
 */
```

**Violation Types**:
| Type | Examples |
|------|----------|
| mutation | `obj.x = 1`, `arr.push()`, `arr[0] = x` |
| side_effect | `console.log()`, `fs.readFile()`, `fetch()` |
| global_access | `window.location`, `process.env`, `global.x` |
| forbidden_construct | `class Foo {}`, `new Date()`, `for (...)` |

---

### LintCheckResult

Result from ESLint validation.

```javascript
/**
 * @typedef {Object} LintCheckResult
 * @property {boolean} valid - Whether lint passed (no errors, warnings OK)
 * @property {LintViolation[]} violations - All lint violations
 * @property {number} errorCount - Number of errors
 * @property {number} warningCount - Number of warnings
 */
```

---

### LintViolation

A specific lint violation.

```javascript
/**
 * @typedef {Object} LintViolation
 * @property {string} rule - ESLint rule name
 * @property {'error' | 'warning'} severity - Violation severity
 * @property {string} message - Rule violation message
 * @property {ErrorLocation} location - Location in source
 * @property {string} [fix] - Auto-fix suggestion (not applied)
 */
```

---

### GeneratedModule

Output from code generation.

```javascript
/**
 * @typedef {Object} GeneratedModule
 * @property {string} sourcePath - Original .feature file path
 * @property {string} outputPath - Generated .js file path
 * @property {string} code - Generated JavaScript code
 * @property {string} formattedCode - Prettier-formatted code
 * @property {boolean} formatted - Whether formatting succeeded
 * @property {string} [formatWarning] - Warning if formatting failed
 * @property {ModuleExport[]} exports - Exported functions
 * @property {ModuleImport[]} imports - Required imports
 */
```

---

### ModuleExport

An exported function from a generated module.

```javascript
/**
 * @typedef {Object} ModuleExport
 * @property {string} name - Function name
 * @property {'default' | 'named'} exportType - Export type
 * @property {string} jsdoc - Generated JSDoc comment
 * @property {ParamInfo[]} params - Parameter information
 * @property {string} returnType - Return type
 */
```

---

### GeneratedTestSuite

Output from test generation.

```javascript
/**
 * @typedef {Object} GeneratedTestSuite
 * @property {string} sourcePath - Path to module being tested
 * @property {string} testPath - Path to generated test file
 * @property {string} code - Generated test code
 * @property {TestCase[]} testCases - Individual test cases
 * @property {number} expectedCoverage - Estimated coverage percentage
 */
```

---

### TestCase

A single test case in a generated test suite.

```javascript
/**
 * @typedef {Object} TestCase
 * @property {string} name - Test case name
 * @property {'example' | 'type_validation' | 'edge_case' | 'boundary'} category
 * @property {string} functionName - Function being tested
 * @property {any[]} inputs - Test inputs
 * @property {any} expected - Expected output or error
 * @property {boolean} expectsError - Whether test expects an error
 */
```

**Test Categories**:
| Category | Source | Purpose |
|----------|--------|---------|
| example | Gherkin Examples table | Verify documented behavior |
| type_validation | JSDoc @param types | Verify type handling |
| edge_case | Common patterns | Verify edge behavior |
| boundary | Numeric ranges | Verify limits |

## Relationships

```text
ValidationResult
├── contains[] ValidationError
├── has SyntaxCheckResult
│   └── contains[] ValidationError
├── has PurityCheckResult
│   └── contains[] PurityViolation
└── has LintCheckResult
    └── contains[] LintViolation

GeneratedModule
├── contains[] ModuleExport
└── contains[] ModuleImport

GeneratedTestSuite
└── contains[] TestCase
```

## State Transitions

### Validation Pipeline States

```text
[Code Received] 
    │
    ▼
[Syntax Check]
    │
    ├── FAIL ──► [Return Errors] ──► END
    │
    ▼ PASS
[Purity Check]
    │
    ├── FAIL ──► [Aggregate Errors] ──► END
    │
    ▼ PASS
[Lint Check]
    │
    ├── FAIL (errors) ──► [Aggregate Errors] ──► END
    │
    ▼ PASS (may have warnings)
[Return Valid Result] ──► END
```

### Generation Pipeline States

```text
[Validated Code]
    │
    ▼
[Generate JSDoc]
    │
    ▼
[Wrap with Exports]
    │
    ▼
[Format with Prettier]
    │
    ├── FAIL ──► [Write Unformatted + Warning]
    │
    ▼ PASS
[Acquire File Lock]
    │
    ▼
[Write to Output]
    │
    ▼
[Release Lock] ──► END
```
