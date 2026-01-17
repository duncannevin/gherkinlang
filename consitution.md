# GherkinLang JavaScript Target Constitution

*A foundational document establishing the principles, governance, and guidelines for the GherkinLang compiler targeting JavaScript.*

---

## Preamble

GherkinLang emerges from a radical premise: that compilation can be *learned* rather than *programmed*. We reject the notion that programming languages must be defined by rigid parsers and opaque abstract syntax trees. Instead, we embrace natural language as both specification and implementation.

This constitution governs the JavaScript target of GherkinLang—ensuring that generated JavaScript code is pure, idiomatic, and trustworthy.

---

## Article I: Core Identity

### Section 1.1 — Definition

GherkinLang-JS is the JavaScript compilation target where:

1. **The AST is human-readable.** The language specification exists as natural language rules that both humans and AI can interpret.
2. **Compilation is AI-native.** An artificial intelligence transforms source code by understanding intent, not by executing deterministic parsing algorithms.
3. **Output is modern JavaScript.** Generated code uses ES6+ features, functional patterns, and Node.js conventions.

### Section 1.2 — The Fundamental Equation

```
GherkinLang Source + Rules (natural language) → AI → JavaScript (ES6+)
```

This equation is the heart of GherkinLang-JS. Any change to the project must preserve this fundamental relationship.

### Section 1.3 — The Rules Paradox

The `rules.md` file simultaneously serves as:
- Human-readable documentation
- The formal language specification
- The compiler's "brain"
- The AST in natural language form

**Every change to rules.md changes the language itself.** This is not a bug—it is the defining feature.

---

## Article II: Immutable Principles

*These principles cannot be changed. They define what GherkinLang-JS is. Violating them transforms the project into something else entirely.*

### Principle 1 — Purity Above All

All GherkinLang programs must compile to **pure JavaScript functions**. There shall be no side effects in generated code unless explicitly and deliberately introduced by the user through clearly marked constructs.

**Rationale:** Purity enables reasoning, testing, and composition. It is the foundation of functional programming.

**Enforcement:** The compiler shall reject any generated code that:
- Mutates input parameters
- Modifies objects via assignment (`obj.prop = value`)
- Uses `Array.prototype.push`, `.pop`, `.shift`, `.unshift`, `.splice`
- Accesses or modifies global state (`window`, `global`, `process.env`)
- Performs I/O operations (`console.*`, `fs.*`, `fetch`)
- Uses non-deterministic operations (`Date.now()`, `Math.random()`)

**Permitted Purity Exceptions:**
- Explicit `@impure` annotations in source
- Test scaffolding and debugging utilities
- User-defined escape hatches documented in rules

### Principle 2 — Deterministic Builds

Given identical inputs (source code + rules + compiler version), the compiler must produce **byte-for-byte identical** JavaScript output.

**Rationale:** Reproducibility is non-negotiable for production systems.

**Enforcement:**
- Fixed AI temperature (0.0 where possible)
- Content-addressed caching: `SHA256(source + rules + compiler_version)`
- Deterministic code formatting (Prettier with locked config)
- Sorted object keys in generated code
- Consistent variable naming scheme

### Principle 3 — Human Readability of Rules

The rules file must remain comprehensible to a human who has never programmed. Technical jargon shall be minimized. Examples shall be abundant. Intent shall be explicit.

**Rationale:** If humans cannot read the rules, we have merely created a more complex traditional compiler.

### Principle 4 — AI as Interpreter, Not Oracle

The AI shall interpret rules faithfully. It shall not:
- Invent language features not specified in rules
- Apply "common sense" that contradicts explicit rules
- Optimize in ways that change semantics
- Add polyfills or utilities not requested

**Rationale:** The rules are the specification. The AI is the executor, not the architect.

### Principle 5 — Graceful Degradation

Compilation failures must produce clear, actionable error messages. The compiler shall never:
- Fail silently
- Produce partial JavaScript output without warning
- Generate code that throws at parse time
- Leave temporary files on failure

**Rationale:** Developers must trust the compiler completely or not at all.

---

## Article III: JavaScript Code Standards

*These standards define what "good" generated JavaScript looks like.*

### Section 3.1 — Language Level

**Target:** ECMAScript 2020 (ES11) or later

**Required Features:**
- `const` and `let` (never `var`)
- Arrow functions for all function expressions
- Destructuring assignment
- Spread operator for immutability
- Optional chaining (`?.`)
- Nullish coalescing (`??`)
- Array methods (`.map`, `.filter`, `.reduce`, `.flatMap`)

**Forbidden Features:**
- `var` keyword
- `function` declarations (except named exports)
- `this` keyword
- `class` keyword
- `new` keyword (except for `Error`)
- `for`, `while`, `do-while` loops
- `switch` statements (use object lookup or if-chains)

### Section 3.2 — Variable Conventions

```javascript
// ✓ CORRECT
const userName = getUserName(user);
const filteredUsers = users.filter(u => u.age >= 18);
const result = processData(input);

// ✗ FORBIDDEN
let counter = 0;           // Mutable variable
var oldStyle = true;       // var keyword
const fn = function() {};  // function keyword
```

**Naming Rules:**
- `camelCase` for variables and functions
- `PascalCase` for module names (from Feature:)
- `SCREAMING_SNAKE_CASE` for constants
- Descriptive names derived from Gherkin source

### Section 3.3 — Function Style

All functions shall be arrow functions with implicit or explicit returns:

```javascript
// ✓ CORRECT - Single expression (implicit return)
const double = (n) => n * 2;

// ✓ CORRECT - Multiple statements (explicit return)
const processUser = (user) => {
  const validated = validateUser(user);
  const normalized = normalizeUser(validated);
  return normalized;
};

// ✗ FORBIDDEN
function double(n) { return n * 2; }  // function keyword
const double = function(n) { return n * 2; };  // function expression
```

### Section 3.4 — Immutability Patterns

```javascript
// ✓ CORRECT - Spread for object updates
const updatedUser = { ...user, name: newName };

// ✓ CORRECT - Spread for array operations  
const withNewItem = [...items, newItem];
const withoutFirst = items.slice(1);

// ✓ CORRECT - Map/filter for transformations
const doubled = numbers.map(n => n * 2);
const adults = users.filter(u => u.age >= 18);

// ✗ FORBIDDEN - Mutation
user.name = newName;        // Direct mutation
items.push(newItem);        // Array mutation
items[0] = newValue;        // Index assignment
```

### Section 3.5 — Module Format

**Primary Format:** CommonJS (for Node.js compatibility)

```javascript
/**
 * Mathematics module
 * Generated by GherkinLang v1.0.0
 * Source: features/mathematics.feature
 */

const Mathematics = {
  /**
   * Calculates factorial of n
   * @param {number} n - Non-negative integer
   * @returns {number} Factorial result
   */
  factorial: (n, acc = 1) => 
    n === 0 ? acc : Mathematics.factorial(n - 1, n * acc),

  /**
   * Doubles a number
   * @param {number} n - Input number
   * @returns {number} Doubled value
   */
  double: (n) => n * 2,
};

module.exports = Mathematics;
```

**Alternative Format:** ES Modules (when configured)

```javascript
export const factorial = (n, acc = 1) => 
  n === 0 ? acc : factorial(n - 1, n * acc);

export const double = (n) => n * 2;

export default { factorial, double };
```

### Section 3.6 — JSDoc Requirements

All generated functions must include JSDoc comments:

```javascript
/**
 * Brief description from Scenario name
 * @param {Type} paramName - Description from Given step
 * @param {Type} paramName2 - Description from Given step
 * @returns {Type} Description from Then step
 */
```

Type mappings from GherkinLang:
| GherkinLang | JSDoc Type |
|-------------|------------|
| `as Array` | `{Array}` |
| `as List` | `{Array}` |
| `as Object` | `{Object}` |
| `as String` | `{string}` |
| `as Number` | `{number}` |
| `as Boolean` | `{boolean}` |
| (unspecified) | `{*}` |

---

## Article IV: Compilation Rules

### Section 4.1 — Feature to Module Mapping

```gherkin
Feature: UserManagement
```

Compiles to:

```javascript
const UserManagement = {
  // scenarios become methods
};

module.exports = UserManagement;
```

### Section 4.2 — Scenario to Function Mapping

```gherkin
Scenario: adult_users defines a function
  Given function adult_users accepts users as Array
  When filter users where user.age >= 18
  Then return result
```

Compiles to:

```javascript
/**
 * adult_users - filters for adult users
 * @param {Array} users - Input user array
 * @returns {Array} Filtered users
 */
adult_users: (users) => users.filter(user => user.age >= 18),
```

### Section 4.3 — Operation Mappings

| GherkinLang | JavaScript |
|-------------|------------|
| `filter X where Y` | `X.filter(item => Y)` |
| `map X to Y` | `X.map(item => Y)` |
| `map X with fn(args)` | `X.map(item => fn(args))` |
| `reduce X with acc and fn` | `X.reduce((acc, item) => fn, acc)` |
| `sort X by field` | `[...X].sort((a, b) => a.field - b.field)` |
| `group X by field` | `Object.groupBy(X, item => item.field)` |
| `flatten X` | `X.flat()` |
| `zip X with Y` | `X.map((item, i) => [item, Y[i]])` |

### Section 4.4 — Pattern Matching Translation

```gherkin
When result matches
  | {ok: value}    | return value           |
  | {error: msg}   | return handleError(msg)|
  | _              | return null            |
```

Compiles to:

```javascript
const matched = (() => {
  if (result.ok !== undefined) return result.ok;
  if (result.error !== undefined) return handleError(result.error);
  return null;
})();
```

### Section 4.5 — Pipeline Translation

```gherkin
When pipe users through
  | filterAdults |
  | sortByAge    |
  | getEmails    |
```

Compiles to:

```javascript
const result = getEmails(sortByAge(filterAdults(users)));

// Or with pipe helper:
const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x);
const result = pipe(filterAdults, sortByAge, getEmails)(users);
```

### Section 4.6 — Recursion Requirements

Recursive functions must be tail-call optimized where possible:

```javascript
// ✗ NOT tail-optimized (stack grows)
const factorial = (n) => n === 0 ? 1 : n * factorial(n - 1);

// ✓ Tail-optimized (constant stack)
const factorial = (n, acc = 1) => 
  n === 0 ? acc : factorial(n - 1, n * acc);
```

---

## Article V: Validation Requirements

### Section 5.1 — Syntax Validation

Generated JavaScript must pass parsing by:
- **Primary:** esprima or @babel/parser
- **Fallback:** Node.js native `vm.compileFunction`

Syntax errors cause immediate compilation failure.

### Section 5.2 — Purity Validation

The compiler shall perform AST analysis to detect:

**Forbidden AST Nodes:**
- `AssignmentExpression` (except in initialization)
- `UpdateExpression` (`++`, `--`)
- `ForStatement`, `WhileStatement`, `DoWhileStatement`
- `ThisExpression`
- `ClassDeclaration`, `ClassExpression`
- `NewExpression` (except `new Error()`)

**Forbidden Identifiers:**
- `console`, `window`, `global`, `process`
- `document`, `localStorage`, `sessionStorage`
- `fetch`, `XMLHttpRequest`
- `setTimeout`, `setInterval`
- `Math.random`, `Date.now`

### Section 5.3 — Lint Validation

Generated code must pass ESLint with this configuration:

```javascript
module.exports = {
  env: { es2020: true, node: true },
  parserOptions: { ecmaVersion: 2020 },
  rules: {
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    'no-param-reassign': 'error',
    'no-mutating-methods': 'error',
    'functional/no-let': 'error',
    'functional/immutable-data': 'error',
    'functional/no-loop-statement': 'error',
    'functional/no-this-expression': 'error',
  },
};
```

### Section 5.4 — Validation Pipeline

```
Generated JS
     │
     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Syntax    │────▶│   Purity    │────▶│    Lint     │
│   Check     │     │   Check     │     │   Check     │
└─────────────┘     └─────────────┘     └─────────────┘
     │                    │                   │
     ▼                    ▼                   ▼
  Pass/Fail           Pass/Fail           Pass/Fail
```

All three must pass for successful compilation.

---

## Article VI: Caching Strategy

### Section 6.1 — Cache Key Generation

```javascript
const cacheKey = crypto
  .createHash('sha256')
  .update(sourceCode)
  .update(rulesContent)
  .update(compilerVersion)
  .update(targetLanguage) // 'javascript'
  .digest('hex');
```

### Section 6.2 — Cache Structure

```
.gherkin-cache/
├── manifest.json           # Index of all cached compilations
├── ab/
│   └── abcd1234...json    # Cached compilation result
└── cd/
    └── cdef5678...json    # Cached compilation result
```

**Cache Entry Format:**
```json
{
  "version": "1.0.0",
  "sourceHash": "abc123...",
  "rulesHash": "def456...",
  "compiledAt": "2025-01-17T12:00:00Z",
  "output": "const Module = { ... }",
  "metadata": {
    "functions": ["factorial", "double"],
    "dependencies": []
  }
}
```

### Section 6.3 — Cache Invalidation

Cache entries are invalidated when:
- Source file content changes
- Rules file content changes
- Compiler version changes
- Cache entry exceeds 30 days age
- Manual `--no-cache` flag used

### Section 6.4 — Cache Limits

- Maximum total cache size: 1GB
- Maximum single entry size: 10MB
- Eviction policy: LRU (Least Recently Used)

---

## Article VII: Error Handling

### Section 7.1 — Error Categories

| Category | Exit Code | Description |
|----------|-----------|-------------|
| `PARSE_ERROR` | 1 | Invalid GherkinLang syntax |
| `TRANSFORM_ERROR` | 2 | AI transformation failed |
| `VALIDATION_ERROR` | 3 | Generated JS invalid |
| `PURITY_ERROR` | 4 | Generated JS has side effects |
| `IO_ERROR` | 5 | File system operation failed |
| `CONFIG_ERROR` | 6 | Invalid configuration |

### Section 7.2 — Error Message Format

```
GherkinLang Error [PURITY_ERROR]

  File: features/user.feature
  Line: 15, Column: 5
  
  Problem:
    Generated code contains mutation: `users.push(newUser)`
  
  In Scenario:
    "add_user defines a function"
  
  Generated Code:
    14 │ const add_user = (users, newUser) => {
    15 │   users.push(newUser);  // ← Mutation detected
    16 │   return users;
    17 │ };
  
  Suggestion:
    Use spread operator for immutable addition:
    `return [...users, newUser];`
  
  Documentation:
    https://gherkinlang.dev/errors/PURITY_ERROR
```

### Section 7.3 — Error Recovery

The compiler shall:
1. Collect all errors before reporting (don't fail on first)
2. Provide machine-readable output with `--json` flag
3. Suggest fixes where possible
4. Never leave partial output files

---

## Article VIII: Testing Requirements

### Section 8.1 — Test Generation

For each compiled module, generate Jest tests:

```javascript
// mathematics.test.js
const Mathematics = require('./mathematics');

describe('Mathematics', () => {
  describe('factorial', () => {
    it('returns 1 for 0', () => {
      expect(Mathematics.factorial(0)).toBe(1);
    });
    
    it('returns 120 for 5', () => {
      expect(Mathematics.factorial(5)).toBe(120);
    });
  });
});
```

### Section 8.2 — Property-Based Tests

Generate property tests for pure functions:

```javascript
const fc = require('fast-check');

describe('Mathematics properties', () => {
  it('double(n) equals n + n', () => {
    fc.assert(fc.property(fc.integer(), (n) => {
      return Mathematics.double(n) === n + n;
    }));
  });
});
```

### Section 8.3 — Golden File Tests

Maintain expected outputs for all example programs:

```
test/golden/
├── mathematics.feature.expected.js
├── user_management.feature.expected.js
└── registration.feature.expected.js
```

Test compares generated output byte-for-byte with expected.

### Section 8.4 — Coverage Requirements

- Minimum line coverage: 80%
- Minimum branch coverage: 75%
- All public functions must have at least one test

---

## Article IX: MCP Tools Integration

### Section 9.1 — Available Tools

| Tool | Purpose | When Used |
|------|---------|-----------|
| `file_system` | Read other .feature files | Cross-module references |
| `javascript_analyzer` | Validate generated code | Post-transformation |
| `dependency_checker` | Verify npm packages | Import statements |
| `test_generator` | Generate Jest tests | Test file creation |

### Section 9.2 — Tool Constraints

Tools shall:
- Only **read** information, never write
- Return results within 5 seconds
- Provide structured, parseable output
- Fail gracefully with clear errors

Tools shall not:
- Execute arbitrary code
- Modify source files
- Install packages
- Make network requests (except to defined APIs)

### Section 9.3 — Tool Response Format

```json
{
  "success": true,
  "tool": "javascript_analyzer",
  "result": {
    "valid": true,
    "ast": { ... },
    "issues": []
  },
  "duration_ms": 45
}
```

---

## Article X: Security Considerations

### Section 10.1 — AI Prompt Safety

The compiler shall:
- Sanitize all user input before including in prompts
- Reject source files containing potential prompt injections
- Use system prompts that constrain AI behavior
- Log unusual AI responses for review

### Section 10.2 — Generated Code Safety

Generated JavaScript shall never contain:
- `eval()` or `Function()` constructor
- `require()` of user-controlled paths
- Template literals with user data (XSS vector)
- `child_process` or `exec` calls
- `fs` operations (unless explicitly requested)

### Section 10.3 — Dependency Security

- All npm dependencies pinned to exact versions
- Weekly automated security audits (`npm audit`)
- No dependencies with known critical vulnerabilities
- Minimal dependency tree (prefer native solutions)

---

## Article XI: Performance Standards

### Section 11.1 — Compilation Time

| Input Size | Maximum Time |
|------------|--------------|
| Single file, < 100 lines | 5 seconds |
| Single file, < 1000 lines | 15 seconds |
| Project, < 10 files | 30 seconds |
| Project, < 100 files | 2 minutes |

Cache hits should complete in < 100ms.

### Section 11.2 — Generated Code Performance

Generated code should:
- Prefer `.map`/`.filter` over manual loops (V8 optimizes these)
- Use tail recursion for recursive functions
- Avoid creating unnecessary intermediate arrays
- Use early returns for guard clauses

### Section 11.3 — Memory Limits

- Compiler process: < 512MB RAM
- Cache in memory: < 100MB
- Single file processing: < 50MB

---

## Article XII: Versioning and Compatibility

### Section 12.1 — Semantic Versioning

```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes to generated JavaScript
MINOR: New GherkinLang features (backward compatible)
PATCH: Bug fixes, performance improvements
```

### Section 12.2 — Node.js Compatibility

| GherkinLang Version | Minimum Node.js |
|---------------------|-----------------|
| 1.x | Node.js 18 LTS |
| 2.x | Node.js 20 LTS |

### Section 12.3 — Generated Code Header

All generated files include:

```javascript
/**
 * @generated by GherkinLang v1.2.3
 * @source features/mathematics.feature  
 * @rules v1.0.0
 * @timestamp 2025-01-17T12:00:00Z
 * 
 * DO NOT EDIT - This file is automatically generated.
 * Changes will be overwritten on next compilation.
 */
```

---

## Article XIII: Amendment Process

### Section 13.1 — Amending Mutable Standards

1. Propose change with rationale
2. Demonstrate that immutable principles are preserved
3. Show impact on existing generated code
4. Achieve consensus among maintainers
5. Update this constitution
6. Increment appropriate version number

### Section 13.2 — Challenging Immutable Principles

Immutable principles define GherkinLang-JS. Changing them creates a different language. If change is truly necessary:

1. Demonstrate keeping the principle causes greater harm
2. Unanimous agreement among all maintainers
3. Major version increment
4. Extensive migration documentation
5. Minimum 6-month deprecation period

---

## Appendix A: Quick Reference

### The Five Immutable Principles

1. **Purity Above All** — No side effects in generated code
2. **Deterministic Builds** — Same input → identical output
3. **Human Readability** — Rules readable by non-programmers
4. **AI as Interpreter** — Faithful rule execution only
5. **Graceful Degradation** — Clear errors, never silent failure

### JavaScript Generation Rules

```
Feature:        → const ModuleName = { ... }
Scenario:       → methodName: (params) => { ... }
Given accepts:  → function parameters
When filter:    → .filter(item => condition)
When map:       → .map(item => transformation)
When pipe:      → fn3(fn2(fn1(value)))
Then return:    → return expression
```

### Forbidden in Generated Code

- `var`, `function`, `class`, `this`, `new`
- `for`, `while`, `do-while`, `switch`
- `.push()`, `.pop()`, `.splice()`, `obj.prop = x`
- `console`, `eval`, `setTimeout`
- `Math.random()`, `Date.now()`

### The Promise

> When GherkinLang-JS compiles successfully, the output is:
> - Syntactically valid ES2020+
> - Completely pure (no side effects)
> - Semantically faithful to the source
> - Ready for production use

---

*"In the beginning was the Rule, and the Rule was with the Compiler, and the Rule was the Compiler."*