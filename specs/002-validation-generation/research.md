# Research: Validation & Generation

**Feature**: 002-validation-generation  
**Date**: 2026-01-29

## JavaScript Parser Selection

**Decision**: Use `@babel/parser` for syntax validation and AST traversal

**Rationale**:
- Supports full ES2020+ syntax including optional chaining, nullish coalescing
- Provides detailed error messages with line/column information
- Same AST format used by ESLint, enabling consistent analysis
- Actively maintained with excellent TypeScript/JSDoc support
- Can parse both CommonJS and ES Module syntax

**Alternatives Considered**:
- `esprima`: Stable but slower ES2020+ support, fewer features
- `acorn`: Lightweight but requires plugins for modern syntax
- Node.js `vm.compileFunction`: No AST access, only validates syntax

## Purity Checking Strategy

**Decision**: AST-based static analysis using `@babel/traverse`

**Rationale**:
- Constitution requires detecting specific AST node types (AssignmentExpression, UpdateExpression, etc.)
- Static analysis is deterministic (no runtime required)
- Can provide precise error locations
- Works on code strings without execution

**Patterns to Detect**:

| Violation Type | AST Node(s) | Example |
|----------------|-------------|---------|
| Mutation | `AssignmentExpression` (non-init) | `obj.x = 1` |
| Update | `UpdateExpression` | `i++`, `--count` |
| Loop | `ForStatement`, `WhileStatement`, `DoWhileStatement` | `for (...)` |
| This | `ThisExpression` | `this.method()` |
| Class | `ClassDeclaration`, `ClassExpression` | `class Foo {}` |
| New (except Error) | `NewExpression` | `new Date()` |
| Forbidden calls | `CallExpression` with forbidden callee | `console.log()` |
| Forbidden access | `MemberExpression` with forbidden object | `window.location` |

**Forbidden Identifiers** (from constitution):
`console`, `window`, `global`, `process`, `eval`, `setTimeout`, `setInterval`, `Math.random`, `Date.now`, `fs`, `fetch`

**Allowed Patterns**:
- Closures (function inside function)
- Higher-order functions (functions as arguments/returns)
- Spread operator (`...obj`, `...arr`)
- Array methods (`.map`, `.filter`, `.reduce`, `.flatMap`)
- Const/let declarations with initialization

## ESLint Configuration

**Decision**: Use ESLint programmatic API with custom rule set

**Rationale**:
- Programmatic API allows validation without file I/O
- Can merge project config with required rules
- Returns structured results for aggregation

**Required Rules** (from constitution):
- `no-var`: error
- `prefer-const`: error
- `prefer-arrow-callback`: error
- `no-param-reassign`: error
- `functional/no-let`: warn (allow let for compatibility)
- `functional/immutable-data`: error
- `functional/no-loop-statement`: error
- `functional/no-this-expression`: error

**Dependencies**: `eslint`, `eslint-plugin-functional`

## Prettier Integration

**Decision**: Use Prettier programmatic API with fallback on failure

**Rationale**:
- Constitution requires deterministic formatting
- Programmatic API allows in-memory formatting
- Graceful fallback (write unformatted with warning) per clarification

**Configuration Strategy**:
1. Look for project `.prettierrc` or `prettier.config.js`
2. Fall back to locked default config if not found
3. On format error, emit warning and write unformatted code

**Default Config**:
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

## File Locking Strategy

**Decision**: Use `proper-lockfile` for file locking

**Rationale**:
- Cross-platform support (Windows, macOS, Linux)
- Handles stale locks automatically
- Simple API: `lock()`, `unlock()`, `check()`
- Supports retries with configurable timeout

**Implementation**:
```javascript
const lockfile = require('proper-lockfile');

async function writeWithLock(filepath, content) {
  const release = await lockfile.lock(filepath, { retries: 5 });
  try {
    await fs.writeFile(filepath, content);
  } finally {
    await release();
  }
}
```

## Test Generation Strategy

**Decision**: Template-based Jest test generation with type inference

**Rationale**:
- Jest is already the project's test framework
- Template approach ensures valid syntax
- Type inference from function names handles missing annotations

**Test Categories**:

| Category | Source | Example |
|----------|--------|---------|
| Example-based | Gherkin Examples table | `expect(add(2, 3)).toBe(5)` |
| Type validation | JSDoc @param types | `expect(() => add('x', 1)).toThrow()` |
| Edge cases | Common patterns | `expect(fn('')).toBe(...)` |
| Boundary | Numeric functions | `expect(fn(0)).toBe(...)` |

**Type Inference Heuristics**:
- Function name contains "add", "sum", "multiply", "divide" → numbers
- Function name contains "concat", "join", "split" → strings
- Function name contains "filter", "map", "find" → arrays
- Parameter name is "count", "num", "amount" → number
- Parameter name is "text", "str", "name" → string
- Parameter name is "items", "list", "arr" → array

## Module Format Detection

**Decision**: Read from project configuration (`.gherkinrc.json`)

**Rationale**:
- Project configuration already defines `moduleFormat` (from Phase 1)
- Consistent with existing compiler architecture

**Formats**:
- `cjs`: CommonJS (`module.exports`, `require`)
- `esm`: ES Modules (`export`, `import`)

**Detection Fallback**: If not configured, detect from `package.json` `"type"` field

## JSDoc Generation

**Decision**: Generate from Gherkin source + implementation analysis

**Rationale**:
- Gherkin source provides human-readable descriptions
- Implementation analysis provides type information
- Combination produces rich documentation

**JSDoc Template**:
```javascript
/**
 * @module {ModuleName}
 * @description {Feature description from Gherkin}
 */

/**
 * {Scenario description from Gherkin}
 * @param {type} name - {description}
 * @returns {type} {description}
 * @example
 * // From Gherkin Examples:
 * {functionName}({inputs}) // => {output}
 */
```

## Error Message Format

**Decision**: Structured error objects with location and context

**Rationale**:
- Constitution requires "clear, actionable error messages"
- Machine-readable for tooling integration
- Human-readable for CLI output

**Error Schema**:
```javascript
{
  type: 'syntax' | 'purity' | 'lint',
  severity: 'error' | 'warning',
  message: string,
  location: {
    file: string,
    line: number,
    column: number,
    endLine?: number,
    endColumn?: number
  },
  code: string,        // Source snippet
  rule?: string,       // For lint errors
  suggestion?: string  // How to fix
}
```
