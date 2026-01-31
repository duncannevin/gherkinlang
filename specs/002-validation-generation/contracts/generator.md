# Contract: Generator

**Module**: `src/generation/generator.js`  
**Purpose**: Write validated JavaScript to output with formatting and JSDoc

## Public API

### generate(validatedCode, context, options)

Generates output JavaScript module from validated code.

```javascript
/**
 * Generates a JavaScript module from validated code.
 * 
 * @param {string} validatedCode - Validated JavaScript code (from validator)
 * @param {GenerationContext} context - Generation context with metadata
 * @param {GenerateOptions} [options] - Generation options
 * @returns {Promise<GeneratedModule>} Generated module result
 * 
 * @example
 * const result = await generate(validatedCode, {
 *   sourcePath: 'features/math.feature',
 *   featureName: 'Math',
 *   scenarios: [...],
 *   examples: [...]
 * });
 */
async function generate(validatedCode, context, options = {}) {}
```

**Parameters**:

| Name | Type | Required | Description |
|------|------|----------|-------------|
| validatedCode | string | Yes | Validated JavaScript code |
| context | GenerationContext | Yes | Metadata from compiler |
| options | GenerateOptions | No | Generation options |

**Context**:

```javascript
/**
 * @typedef {Object} GenerationContext
 * @property {string} sourcePath - Original .feature file path
 * @property {string} featureName - Feature name (becomes module name)
 * @property {Scenario[]} scenarios - Parsed scenarios from Gherkin
 * @property {Example[]} [examples] - Gherkin Examples tables
 * @property {Dependency[]} [dependencies] - Cross-module dependencies
 * @property {ProjectConfig} config - Project configuration
 */
```

**Options**:

```javascript
/**
 * @typedef {Object} GenerateOptions
 * @property {string} [outputDir] - Output directory (default from config)
 * @property {'cjs' | 'esm'} [moduleFormat] - Module format (default from config)
 * @property {boolean} [dryRun=false] - Generate without writing to disk
 * @property {boolean} [skipFormat=false] - Skip Prettier formatting
 */
```

**Returns**: `Promise<GeneratedModule>`

**Behavior**:
1. Generate JSDoc comments from context
2. Wrap code with appropriate module exports
3. Resolve and add import statements
4. Format with Prettier (with fallback on failure)
5. Acquire file lock
6. Write to output directory
7. Release lock and return result

---

### generateJSDoc(functionName, scenario, examples)

Generates JSDoc comment for a function.

```javascript
/**
 * Generates JSDoc comment from Gherkin source.
 * 
 * @param {string} functionName - Function name
 * @param {Scenario} scenario - Gherkin scenario
 * @param {Example[]} [examples] - Gherkin examples
 * @returns {string} JSDoc comment block
 */
function generateJSDoc(functionName, scenario, examples) {}
```

**Exported from**: `src/generation/formatters/jsdoc.js`

---

### formatCode(code, options)

Formats JavaScript code with Prettier.

```javascript
/**
 * Formats JavaScript code using Prettier.
 * 
 * @param {string} code - JavaScript code to format
 * @param {FormatOptions} [options] - Formatting options
 * @returns {Promise<FormatResult>} Format result
 * 
 * @typedef {Object} FormatResult
 * @property {string} code - Formatted code (or original if failed)
 * @property {boolean} formatted - Whether formatting succeeded
 * @property {string} [warning] - Warning message if failed
 */
async function formatCode(code, options = {}) {}
```

**Exported from**: `src/generation/formatters/javascript.js`

---

### wrapWithExports(code, exports, moduleFormat)

Wraps code with appropriate module exports.

```javascript
/**
 * Wraps code with module exports.
 * 
 * @param {string} code - JavaScript code
 * @param {ModuleExport[]} exports - Functions to export
 * @param {'cjs' | 'esm'} moduleFormat - Module format
 * @returns {string} Code with exports
 */
function wrapWithExports(code, exports, moduleFormat) {}
```

---

### resolveImports(dependencies, moduleFormat)

Generates import statements for dependencies.

```javascript
/**
 * Generates import statements for cross-module dependencies.
 * 
 * @param {Dependency[]} dependencies - Module dependencies
 * @param {'cjs' | 'esm'} moduleFormat - Module format
 * @returns {string} Import statements
 */
function resolveImports(dependencies, moduleFormat) {}
```

## Internal Functions

### acquireLock(filepath)

Acquires file lock for concurrent write protection.

### releaseLock(filepath)

Releases file lock after write.

### computeOutputPath(sourcePath, outputDir)

Computes output path from source path (.feature → .js).

### ensureOutputDir(outputDir)

Creates output directory if it doesn't exist.

## Dependencies

- `prettier` - Code formatting
- `proper-lockfile` - File locking
- `fs/promises` - File system operations

## Constants

```javascript
const DEFAULT_PRETTIER_CONFIG = {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 100,
  parser: 'babel'
};

const LOCK_OPTIONS = {
  retries: 5,
  stale: 10000 // 10 seconds
};
```

## Module Format Templates

### CommonJS

```javascript
// Imports
const { depFunction } = require('./dependency');

// Code
const add = (a, b) => a + b;

// Exports
module.exports = { add };
```

### ES Modules

```javascript
// Imports
import { depFunction } from './dependency.js';

// Code
const add = (a, b) => a + b;

// Exports
export { add };
export default add;
```

## Acceptance Criteria

1. ✅ Output file created in correct directory
2. ✅ CommonJS exports use module.exports syntax
3. ✅ ES Module exports use export syntax
4. ✅ JSDoc comments include @param, @returns, @description
5. ✅ Code formatted with Prettier (or warning on failure)
6. ✅ File locking prevents concurrent write conflicts
7. ✅ Cross-module imports correctly resolved
8. ✅ Output directory created if missing
