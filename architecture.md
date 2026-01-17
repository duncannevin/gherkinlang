# GherkinLang Compiler Architecture
## JavaScript Target Implementation

---

## Executive Summary

GherkinLang is an experimental programming language where compilation rules are expressed in natural language rather than traditional parsing logic. This document details the architecture for the JavaScript target compiler, which transforms Gherkin-syntax source code into clean, functional JavaScript using AI-powered transformation.

The core innovation: **the AST is a markdown file**. Language rules written in plain English serve simultaneously as documentation, specification, and the compiler's decision-making logic.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GherkinLang Compiler                                │
│                       JavaScript Target (v1.0)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   INPUT                    PROCESS                       OUTPUT             │
│  ┌─────────┐            ┌───────────┐               ┌──────────┐           │
│  │.feature │───────────▶│ AI-Powered│──────────────▶│ .js      │           │
│  │ files   │            │ Transform │               │ modules  │           │
│  └─────────┘            └───────────┘               └──────────┘           │
│       │                      │                           │                  │
│       │                      │                           │                  │
│  ┌─────────┐            ┌───────────┐               ┌──────────┐           │
│  │rules.md │            │   MCP     │               │ .test.js │           │
│  │(AST!)   │            │  Tools    │               │ files    │           │
│  └─────────┘            └───────────┘               └──────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Design Principles

### 1. AI-Native Compilation
Traditional compilers parse source code into an Abstract Syntax Tree (AST), then traverse it to generate output. GherkinLang replaces this with natural language rules interpreted by Claude. The AI understands intent, handles ambiguity, and produces idiomatic code.

### 2. Pure Functional Output
All generated JavaScript must be purely functional: no side effects, no mutations, no global state. This constraint ensures predictable, testable output.

### 3. Deterministic Builds
Despite AI involvement, builds are reproducible. Content-addressed caching ensures identical inputs produce identical outputs. The rules file is part of the cache key.

### 4. Human-Readable Everything
Source code is Gherkin (readable by non-programmers). Rules are plain English. Output is clean, documented JavaScript. Every layer is inspectable.

---

## Architecture Layers

The compiler is organized into seven distinct layers, each with a single responsibility:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Layer 7: CLI Interface                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 6: Orchestration                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 5: AI Transformation                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 4: MCP Tools                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 3: Validation                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 2: Code Generation                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 1: Storage (Cache + File System)                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Storage

### Cache Manager

The cache system ensures deterministic, incremental builds using content-addressed storage.

**Location:** `src/compiler/cache.js`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Cache Manager                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Cache Key Generation:                                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  key = SHA256(                                                       │  │
│  │    source_content +                                                  │  │
│  │    rules_content +                                                   │  │
│  │    compiler_version +                                                │  │
│  │    target_language                                                   │  │
│  │  )                                                                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Storage Structure:                                                         │
│  .gherkin-cache/                                                           │
│  ├── manifest.json          # Index of all cached entries                  │
│  ├── a1b2c3d4.cache         # Cached compilation result                    │
│  ├── e5f6g7h8.cache         # Another cached result                        │
│  └── ...                                                                   │
│                                                                             │
│  Cache Entry Format:                                                        │
│  {                                                                          │
│    "key": "a1b2c3d4...",                                                   │
│    "source_hash": "...",                                                   │
│    "rules_hash": "...",                                                    │
│    "compiled_code": "const Module = { ... }",                              │
│    "generated_tests": "describe('Module', () => { ... })",                 │
│    "metadata": {                                                           │
│      "timestamp": "2025-01-17T...",                                        │
│      "duration_ms": 1234,                                                  │
│      "ai_model": "claude-3-opus"                                           │
│    }                                                                       │
│  }                                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Interface:**

```javascript
interface CacheManager {
  // Generate deterministic cache key
  generateKey(source: string, rules: string): string;
  
  // Retrieve cached compilation
  get(key: string): Promise<CacheEntry | null>;
  
  // Store compilation result
  set(key: string, entry: CacheEntry): Promise<void>;
  
  // Check if cache is valid
  isValid(key: string): Promise<boolean>;
  
  // Clear all or specific entries
  clear(key?: string): Promise<void>;
  
  // LRU eviction when cache exceeds size limit
  evict(maxSize: number): Promise<void>;
}
```

**Cache Invalidation Triggers:**
- Source file content changes
- Rules file (rules.md) changes
- Compiler version changes
- Target language changes
- Manual cache clear

---

## Layer 2: Code Generation

### Code Generator

Writes validated JavaScript to the output directory with proper formatting and documentation.

**Location:** `src/generation/generator.js`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Code Generator                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Input:  Validated JavaScript string                                        │
│  Output: Formatted .js file with JSDoc                                     │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Processing Pipeline:                                                │  │
│  │                                                                       │  │
│  │  1. Parse validated code                                             │  │
│  │  2. Generate JSDoc from type hints                                   │  │
│  │  3. Format with Prettier                                             │  │
│  │  4. Add module exports (CJS or ESM)                                  │  │
│  │  5. Write to output directory                                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Output Patterns:                                                           │
│                                                                             │
│  CommonJS (default for Node.js):                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  /**                                                                 │  │
│  │   * @module Mathematics                                              │  │
│  │   * @description Generated from mathematics.feature                  │  │
│  │   */                                                                 │  │
│  │  const Mathematics = {                                               │  │
│  │    /**                                                               │  │
│  │     * @param {number} n                                              │  │
│  │     * @returns {number}                                              │  │
│  │     */                                                               │  │
│  │    factorial: (n, acc = 1) =>                                        │  │
│  │      n === 0 ? acc : Mathematics.factorial(n - 1, n * acc),          │  │
│  │  };                                                                  │  │
│  │  module.exports = Mathematics;                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ES Modules (for browser/modern Node):                                     │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  export const factorial = (n, acc = 1) =>                            │  │
│  │    n === 0 ? acc : factorial(n - 1, n * acc);                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Test Generator

Automatically generates Jest test suites from compiled functions.

**Location:** `src/generation/test-generator.js`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Test Generator                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Input:  Compiled JavaScript module                                         │
│  Output: Jest test file                                                    │
│                                                                             │
│  Generation Strategy:                                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  1. Extract function signatures from JSDoc                           │  │
│  │  2. Generate edge case tests (null, undefined, empty)                │  │
│  │  3. Generate type validation tests                                   │  │
│  │  4. Generate example-based tests from Gherkin examples               │  │
│  │  5. Generate property-based tests where applicable                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Output Example:                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  const Mathematics = require('../dist/mathematics');                 │  │
│  │                                                                       │  │
│  │  describe('Mathematics', () => {                                     │  │
│  │    describe('factorial', () => {                                     │  │
│  │      it('returns 1 for n=0', () => {                                 │  │
│  │        expect(Mathematics.factorial(0)).toBe(1);                     │  │
│  │      });                                                             │  │
│  │                                                                       │  │
│  │      it('returns 120 for n=5', () => {                               │  │
│  │        expect(Mathematics.factorial(5)).toBe(120);                   │  │
│  │      });                                                             │  │
│  │                                                                       │  │
│  │      it('handles large numbers', () => {                             │  │
│  │        expect(Mathematics.factorial(20)).toBe(2432902008176640000);  │  │
│  │      });                                                             │  │
│  │    });                                                               │  │
│  │  });                                                                 │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 3: Validation

### Code Validator

Ensures generated JavaScript is syntactically correct, pure, and follows best practices.

**Location:** `src/validation/validator.js`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Code Validator                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Validation Pipeline:                                                       │
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Syntax    │───▶│   Purity    │───▶│    Lint     │───▶│   Output    │  │
│  │   Check     │    │   Check     │    │   Check     │    │  Validation │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                             │
│  Stage 1: Syntax Check (esprima/babel)                                     │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  • Parse JavaScript to AST                                           │  │
│  │  • Detect syntax errors                                              │  │
│  │  • Validate ES6+ features                                            │  │
│  │  • Report line/column for errors                                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Stage 2: Purity Check (custom AST walker)                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  FORBIDDEN (side effects):                                           │  │
│  │  • console.log/warn/error                                            │  │
│  │  • process.exit                                                      │  │
│  │  • fs.* operations                                                   │  │
│  │  • http/https requests                                               │  │
│  │  • Date.now(), Math.random()                                         │  │
│  │  • Array mutators: push, pop, shift, unshift, splice, sort (in-place)│  │
│  │  • Object.assign to existing objects                                 │  │
│  │  • delete operator                                                   │  │
│  │  • ++ and -- operators                                               │  │
│  │  • Assignment to parameters                                          │  │
│  │  • Global variable access/mutation                                   │  │
│  │                                                                       │  │
│  │  ALLOWED:                                                            │  │
│  │  • Array.map, filter, reduce, slice, concat                          │  │
│  │  • Object spread { ...obj }                                          │  │
│  │  • Array spread [...arr]                                             │  │
│  │  • Object.freeze, Object.keys, Object.values, Object.entries         │  │
│  │  • const declarations                                                │  │
│  │  • Arrow functions                                                   │  │
│  │  • Ternary expressions                                               │  │
│  │  • Destructuring                                                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Stage 3: Lint Check (ESLint)                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Rules:                                                              │  │
│  │  • no-var                                                            │  │
│  │  • prefer-const                                                      │  │
│  │  • prefer-arrow-callback                                             │  │
│  │  • no-unused-vars                                                    │  │
│  │  • no-undef                                                          │  │
│  │  • eqeqeq                                                            │  │
│  │  • no-eval                                                           │  │
│  │  • no-implied-eval                                                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Stage 4: Output Validation                                                │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  • Module exports exist                                              │  │
│  │  • All declared functions are exported                               │  │
│  │  • No circular dependencies                                          │  │
│  │  • JSDoc comments are valid                                          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Interface:**

```javascript
interface CodeValidator {
  // Run full validation pipeline
  validate(code: string): ValidationResult;
  
  // Individual checks
  checkSyntax(code: string): SyntaxResult;
  checkPurity(code: string): PurityResult;
  lint(code: string): LintResult;
  
  // Configuration
  configure(options: ValidatorOptions): void;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  stage: 'syntax' | 'purity' | 'lint' | 'output';
  message: string;
  line?: number;
  column?: number;
  code?: string;
}
```

---

## Layer 4: MCP Tools

The Model Context Protocol (MCP) provides tools that make the AI-powered compilation context-aware and intelligent.

**Location:** `src/mcp/`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MCP Layer                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         MCP Client                                    │ │
│  │                      (src/mcp/client.js)                              │ │
│  │                                                                        │ │
│  │  • Server connection management                                       │ │
│  │  • Tool invocation                                                    │ │
│  │  • Result handling                                                    │ │
│  │  • Error recovery                                                     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                              │                                              │
│            ┌─────────────────┼─────────────────┐                           │
│            │                 │                 │                           │
│            ▼                 ▼                 ▼                           │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐              │
│  │   file_system   │ │   analyzer      │ │  dependencies   │              │
│  │                 │ │                 │ │                 │              │
│  │ • read_file     │ │ • validate_js   │ │ • check_npm     │              │
│  │ • list_files    │ │ • parse_ast     │ │ • resolve_pkg   │              │
│  │ • file_exists   │ │ • lint_code     │ │ • suggest_alt   │              │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tool: file_system

Enables cross-module awareness during compilation.

```javascript
// Tool definition
{
  name: "file_system",
  description: "Read other .feature files for cross-module references",
  input_schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["read", "list", "exists"]
      },
      path: {
        type: "string",
        description: "File or directory path"
      }
    },
    required: ["action", "path"]
  }
}

// Usage example during compilation
// When compiling user_management.feature that imports from mathematics.feature:
// AI calls: file_system({ action: "read", path: "features/mathematics.feature" })
// AI receives: Feature content for understanding available functions
```

### Tool: analyzer

Validates generated JavaScript during the AI transformation loop.

```javascript
// Tool definition
{
  name: "analyzer",
  description: "Validate and analyze generated JavaScript code",
  input_schema: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "JavaScript code to analyze"
      },
      checks: {
        type: "array",
        items: {
          type: "string",
          enum: ["syntax", "purity", "lint", "types"]
        }
      }
    },
    required: ["code"]
  }
}

// Returns
{
  valid: true,
  issues: [],
  ast: { /* parsed AST for further analysis */ }
}
```

### Tool: dependencies

Checks npm package availability and suggests alternatives.

```javascript
// Tool definition
{
  name: "dependencies",
  description: "Check npm package availability and versions",
  input_schema: {
    type: "object",
    properties: {
      package: {
        type: "string",
        description: "npm package name"
      },
      version: {
        type: "string",
        description: "Optional version constraint"
      }
    },
    required: ["package"]
  }
}

// Example: When AI considers using lodash
// AI calls: dependencies({ package: "lodash" })
// AI receives: { exists: true, latest: "4.17.21", alternatives: ["lodash-es", "radash"] }
```

---

## Layer 5: AI Transformation

The heart of the compiler. Natural language rules + source code → generated JavaScript.

**Location:** `src/ai/transformer.js`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AI Transformer                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                        Prompt Construction                            │ │
│  │                                                                        │ │
│  │  System Prompt:                                                       │ │
│  │  ┌────────────────────────────────────────────────────────────────┐   │ │
│  │  │ You are a compiler for GherkinLang...                          │   │ │
│  │  │ [JavaScript target prompt from rules.md]                       │   │ │
│  │  │                                                                 │   │ │
│  │  │ # Language Rules                                               │   │ │
│  │  │ [Complete contents of rules.md]                                │   │ │
│  │  │                                                                 │   │ │
│  │  │ # Project Context                                              │   │ │
│  │  │ Available modules: [list from project context]                 │   │ │
│  │  └────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                        │ │
│  │  User Prompt:                                                         │ │
│  │  ┌────────────────────────────────────────────────────────────────┐   │ │
│  │  │ Compile this GherkinLang source to JavaScript:                 │   │ │
│  │  │                                                                 │   │ │
│  │  │ Feature: Mathematics                                           │   │ │
│  │  │   Scenario: factorial defines a recursive function             │   │ │
│  │  │     Given function factorial accepts n as Number               │   │ │
│  │  │     When n matches                                             │   │ │
│  │  │       | 0 | return 1                |                          │   │ │
│  │  │       | _ | return n * factorial(n - 1) |                      │   │ │
│  │  │     Then return result                                         │   │ │
│  │  └────────────────────────────────────────────────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                        Tool Calling Loop                              │ │
│  │                                                                        │ │
│  │    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐          │ │
│  │    │ Initial │───▶│  Tool   │───▶│ Process │───▶│Continue │          │ │
│  │    │ Request │    │  Call?  │    │ Result  │    │   or    │          │ │
│  │    └─────────┘    └─────────┘    └─────────┘    │  Done?  │          │ │
│  │                        │              │         └─────────┘          │ │
│  │                        │              │              │               │ │
│  │                   ┌────┴────┐    ┌────┴────┐    ┌────┴────┐         │ │
│  │                   │  Yes    │    │ Execute │    │  Done   │         │ │
│  │                   │         │    │  Tool   │    │         │         │ │
│  │                   └─────────┘    └─────────┘    └─────────┘         │ │
│  │                        │                             │               │ │
│  │                        └─────────────────────────────┘               │ │
│  │                              (loop back)                             │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                        Code Extraction                                │ │
│  │                                                                        │ │
│  │  • Strip markdown code blocks if present                             │ │
│  │  • Extract pure JavaScript                                           │ │
│  │  • Validate before returning                                         │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Interface:**

```javascript
interface AITransformer {
  // Main transformation entry point
  transform(source: string, context: ProjectContext): Promise<TransformResult>;
  
  // Load and parse rules file
  loadRules(target: 'javascript' | 'elixir'): string;
  
  // Construct the full prompt
  buildPrompt(source: string, rules: string, context: ProjectContext): Prompt;
  
  // Call Claude API with tool support
  callAPI(prompt: Prompt, tools: MCPTool[]): Promise<APIResponse>;
  
  // Extract code from API response
  extractCode(response: APIResponse): string;
}

interface TransformResult {
  success: boolean;
  code?: string;
  error?: string;
  toolCalls?: ToolCall[];
  metadata: {
    model: string;
    tokens: { input: number; output: number };
    duration_ms: number;
  };
}
```

### Rules Engine

The rules file IS the language specification. Located at `src/ai/rules.md`.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Rules Engine                                     │
│                          (src/ai/rules.md)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  The rules.md file serves three purposes simultaneously:                   │
│                                                                             │
│  1. HUMAN DOCUMENTATION                                                    │
│     ├── Readable by non-programmers                                        │
│     ├── Explains language features                                         │
│     └── Provides examples                                                  │
│                                                                             │
│  2. AI INSTRUCTIONS                                                        │
│     ├── Tells Claude how to compile                                        │
│     ├── Defines syntax patterns                                            │
│     └── Specifies output format                                            │
│                                                                             │
│  3. CACHE KEY COMPONENT                                                    │
│     ├── Changes invalidate cache                                           │
│     ├── Ensures rule changes propagate                                     │
│     └── Part of deterministic build                                        │
│                                                                             │
│  Rule Categories:                                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Module Rules          │ Feature: → Module definition                │  │
│  │  Function Rules        │ Scenario: → Function definition             │  │
│  │  Parameter Rules       │ Given accepts → Parameters                  │  │
│  │  Operation Rules       │ When filter/map/reduce → Collection ops     │  │
│  │  Control Flow Rules    │ When matches → Pattern matching             │  │
│  │  Return Rules          │ Then return → Function output               │  │
│  │  Target-Specific Rules │ JavaScript/Elixir idioms                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 6: Orchestration

### Compiler Core

Coordinates all components to execute the compilation pipeline.

**Location:** `src/compiler/index.js`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Compiler Orchestrator                              │
│                         (src/compiler/index.js)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                      Compilation Pipeline                             │ │
│  │                                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │ 1. File Discovery                                               │  │ │
│  │  │    • Scan input directory for .feature files                    │  │ │
│  │  │    • Build file list                                            │  │ │
│  │  │    • Check file accessibility                                   │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │                              │                                        │ │
│  │                              ▼                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │ 2. Dependency Resolution                                        │  │ │
│  │  │    • Parse imports/references                                   │  │ │
│  │  │    • Build dependency graph                                     │  │ │
│  │  │    • Topological sort for compile order                         │  │ │
│  │  │    • Detect circular dependencies                               │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │                              │                                        │ │
│  │                              ▼                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │ 3. Cache Check (per file)                                       │  │ │
│  │  │    • Generate cache key                                         │  │ │
│  │  │    • Check for valid cache entry                                │  │ │
│  │  │    • Skip compilation if cached                                 │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │                              │                                        │ │
│  │                     ┌────────┴────────┐                              │ │
│  │                     │                 │                              │ │
│  │               Cache HIT         Cache MISS                           │ │
│  │                     │                 │                              │ │
│  │                     ▼                 ▼                              │ │
│  │  ┌──────────────────────┐  ┌────────────────────────────────────┐   │ │
│  │  │ Return cached code   │  │ 4. AI Transformation               │   │ │
│  │  └──────────────────────┘  │    • Build compilation prompt      │   │ │
│  │                            │    • Call Claude API               │   │ │
│  │                            │    • Handle tool calls             │   │ │
│  │                            │    • Extract generated code        │   │ │
│  │                            └────────────────────────────────────┘   │ │
│  │                                       │                              │ │
│  │                                       ▼                              │ │
│  │                            ┌────────────────────────────────────┐   │ │
│  │                            │ 5. Validation                      │   │ │
│  │                            │    • Syntax check                  │   │ │
│  │                            │    • Purity check                  │   │ │
│  │                            │    • Lint check                    │   │ │
│  │                            └────────────────────────────────────┘   │ │
│  │                                       │                              │ │
│  │                            ┌──────────┴──────────┐                  │ │
│  │                            │                     │                  │ │
│  │                       Valid ✓              Invalid ✗                │ │
│  │                            │                     │                  │ │
│  │                            ▼                     ▼                  │ │
│  │             ┌────────────────────────┐  ┌────────────────────────┐ │ │
│  │             │ 6. Code Generation     │  │ Retry or Report Error  │ │ │
│  │             │    • Format code       │  │    • Log issues        │ │ │
│  │             │    • Add JSDoc         │  │    • Retry with hints  │ │ │
│  │             │    • Write to disk     │  │    • Fail if max tries │ │ │
│  │             └────────────────────────┘  └────────────────────────┘ │ │
│  │                            │                                        │ │
│  │                            ▼                                        │ │
│  │             ┌────────────────────────┐                              │ │
│  │             │ 7. Cache Storage       │                              │ │
│  │             │    • Store result      │                              │ │
│  │             │    • Update manifest   │                              │ │
│  │             └────────────────────────┘                              │ │
│  │                            │                                        │ │
│  │                            ▼                                        │ │
│  │             ┌────────────────────────┐                              │ │
│  │             │ 8. Test Generation     │                              │ │
│  │             │    • Generate tests    │                              │ │
│  │             │    • Write test files  │                              │ │
│  │             └────────────────────────┘                              │ │
│  │                                                                      │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Project Context

Manages awareness of the full project during compilation.

**Location:** `src/compiler/context.js`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Project Context                                    │
│                        (src/compiler/context.js)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Responsibilities:                                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  1. File Discovery                                                   │  │
│  │     • Scan directories for .feature files                            │  │
│  │     • Watch for file changes (watch mode)                            │  │
│  │     • Track file modification times                                  │  │
│  │                                                                       │  │
│  │  2. Module Registry                                                  │  │
│  │     • Map Feature names to file paths                                │  │
│  │     • Track exported functions per module                            │  │
│  │     • Enable cross-module references                                 │  │
│  │                                                                       │  │
│  │  3. Dependency Graph                                                 │  │
│  │     • Track module dependencies                                      │  │
│  │     • Detect circular dependencies                                   │  │
│  │     • Determine compilation order                                    │  │
│  │                                                                       │  │
│  │  4. Configuration Loading                                            │  │
│  │     • Read .gherkinrc.json                                           │  │
│  │     • Apply defaults                                                 │  │
│  │     • Validate configuration                                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Data Model:                                                                │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  {                                                                   │  │
│  │    "modules": {                                                      │  │
│  │      "Mathematics": {                                                │  │
│  │        "file": "features/mathematics.feature",                       │  │
│  │        "exports": ["factorial", "fibonacci", "gcd"],                 │  │
│  │        "dependencies": []                                            │  │
│  │      },                                                              │  │
│  │      "UserManagement": {                                             │  │
│  │        "file": "features/user_management.feature",                   │  │
│  │        "exports": ["adult_users", "validate_email"],                 │  │
│  │        "dependencies": ["Mathematics"]                               │  │
│  │      }                                                               │  │
│  │    },                                                                │  │
│  │    "config": {                                                       │  │
│  │      "target": "javascript",                                         │  │
│  │      "moduleFormat": "commonjs",                                     │  │
│  │      "outputDir": "dist",                                            │  │
│  │      "testDir": "test"                                               │  │
│  │    },                                                                │  │
│  │    "compileOrder": ["Mathematics", "UserManagement"]                 │  │
│  │  }                                                                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 7: CLI Interface

Command-line interface for interacting with the compiler.

**Location:** `bin/gherkin.js`, `src/cli/`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLI Interface                                    │
│                           (bin/gherkin.js)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Commands:                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  gherkin compile [files...]     Compile .feature files                │  │
│  │    --target, -t <lang>          Target language (javascript|elixir)   │  │
│  │    --output, -o <dir>           Output directory (default: dist)      │  │
│  │    --format <fmt>               Module format (commonjs|esm)          │  │
│  │    --no-cache                   Skip cache, force recompile           │  │
│  │    --verbose, -v                Show detailed output                  │  │
│  │    --dry-run                    Show what would be compiled           │  │
│  │                                                                       │  │
│  │  gherkin watch [dir]            Watch directory for changes           │  │
│  │    --target, -t <lang>          Target language                       │  │
│  │    --output, -o <dir>           Output directory                      │  │
│  │    --debounce <ms>              Debounce time (default: 100)          │  │
│  │                                                                       │  │
│  │  gherkin init [dir]             Initialize new GherkinLang project    │  │
│  │    --template <name>            Template to use (basic|library|api)   │  │
│  │    --target, -t <lang>          Default target language               │  │
│  │                                                                       │  │
│  │  gherkin validate [files...]    Validate without compiling            │  │
│  │    --rules                      Also validate rules.md                │  │
│  │                                                                       │  │
│  │  gherkin cache                  Cache management                      │  │
│  │    --clear                      Clear all cached entries              │  │
│  │    --stats                      Show cache statistics                 │  │
│  │    --inspect <key>              Inspect specific cache entry          │  │
│  │                                                                       │  │
│  │  gherkin test [files...]        Run generated tests                   │  │
│  │    --coverage                   Generate coverage report              │  │
│  │    --watch                      Watch mode                            │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Example Usage:                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  # Compile single file                                               │  │
│  │  gherkin compile features/math.feature -o dist                       │  │
│  │                                                                       │  │
│  │  # Compile all files in directory                                    │  │
│  │  gherkin compile features/ --target javascript                       │  │
│  │                                                                       │  │
│  │  # Watch mode for development                                        │  │
│  │  gherkin watch features/ -o dist                                     │  │
│  │                                                                       │  │
│  │  # Initialize new project                                            │  │
│  │  gherkin init my-project --template library                          │  │
│  │                                                                       │  │
│  │  # Check cache status                                                │  │
│  │  gherkin cache --stats                                               │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Complete Compilation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Complete Data Flow                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  INPUT FILES                                                                │
│  ───────────                                                                │
│  features/mathematics.feature                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Feature: Mathematics                                                 │  │
│  │                                                                       │  │
│  │   Scenario: factorial defines a recursive function                   │  │
│  │     Given function factorial accepts n as Number                     │  │
│  │     When n matches                                                   │  │
│  │       | 0 | return 1                    |                            │  │
│  │       | _ | return n * factorial(n - 1) |                            │  │
│  │     Then return result                                               │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  STEP 1: CLI PARSING                                                        │
│  ──────────────────────────────                                             │
│  $ gherkin compile features/mathematics.feature -o dist                    │
│  → options = { files: [...], output: 'dist', target: 'javascript' }        │
│                                      │                                      │
│                                      ▼                                      │
│  STEP 2: CONTEXT BUILDING                                                   │
│  ────────────────────────────────────                                       │
│  ProjectContext.build()                                                     │
│  → Discovers all .feature files                                            │
│  → Builds module registry                                                  │
│  → Resolves dependencies                                                   │
│  → Returns: { modules: {...}, compileOrder: [...] }                        │
│                                      │                                      │
│                                      ▼                                      │
│  STEP 3: CACHE CHECK                                                        │
│  ───────────────────────                                                    │
│  CacheManager.get(key)                                                      │
│  → key = SHA256(source + rules + version + target)                         │
│  → Cache HIT? Return cached code, skip to STEP 7                           │
│  → Cache MISS? Continue to STEP 4                                          │
│                                      │                                      │
│                                      ▼                                      │
│  STEP 4: AI TRANSFORMATION                                                  │
│  ─────────────────────────────────                                          │
│  AITransformer.transform(source, context)                                   │
│                                                                             │
│  a) Load rules                                                              │
│     ┌────────────────────────────────────────────────────────────────────┐ │
│     │ rules = fs.readFileSync('src/ai/rules.md')                         │ │
│     └────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  b) Build prompt                                                            │
│     ┌────────────────────────────────────────────────────────────────────┐ │
│     │ system: "You are a compiler for GherkinLang..." + rules            │ │
│     │ user: "Compile this source: ..." + source                          │ │
│     │ tools: [file_system, analyzer, dependencies]                       │ │
│     └────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  c) Call Claude API                                                         │
│     ┌────────────────────────────────────────────────────────────────────┐ │
│     │ Request → Claude API                                               │ │
│     │                                                                     │ │
│     │ AI might call tools:                                               │ │
│     │   file_system({ action: "read", path: "features/utils.feature" })  │ │
│     │   analyzer({ code: "const x = ...", checks: ["syntax", "purity"]}) │ │
│     │                                                                     │ │
│     │ Response ← Generated JavaScript code                               │ │
│     └────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  d) Extract code                                                            │
│     ┌────────────────────────────────────────────────────────────────────┐ │
│     │ const Mathematics = {                                              │ │
│     │   factorial: (n, acc = 1) =>                                       │ │
│     │     n === 0 ? acc : Mathematics.factorial(n - 1, n * acc),         │ │
│     │ };                                                                 │ │
│     │ module.exports = Mathematics;                                      │ │
│     └────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                                      ▼                                      │
│  STEP 5: VALIDATION                                                         │
│  ──────────────────────                                                     │
│  CodeValidator.validate(code)                                               │
│                                                                             │
│  a) Syntax check                                                            │
│     → Parse with esprima → ✓ Valid JavaScript                              │
│                                                                             │
│  b) Purity check                                                            │
│     → Walk AST → No side effects found → ✓ Pure                            │
│                                                                             │
│  c) Lint check                                                              │
│     → ESLint → ✓ No warnings                                               │
│                                                                             │
│  Result: { valid: true, errors: [], warnings: [] }                         │
│                                      │                                      │
│                                      ▼                                      │
│  STEP 6: CODE GENERATION                                                    │
│  ───────────────────────────────                                            │
│  CodeGenerator.generate(code, options)                                      │
│                                                                             │
│  a) Add JSDoc comments                                                      │
│  b) Format with Prettier                                                    │
│  c) Write to output directory                                               │
│     → dist/mathematics.js                                                  │
│                                      │                                      │
│                                      ▼                                      │
│  STEP 7: CACHE STORAGE                                                      │
│  ─────────────────────────                                                  │
│  CacheManager.set(key, { code, tests, metadata })                          │
│     → .gherkin-cache/a1b2c3d4.cache                                        │
│                                      │                                      │
│                                      ▼                                      │
│  STEP 8: TEST GENERATION                                                    │
│  ───────────────────────────────                                            │
│  TestGenerator.generate(code)                                               │
│     → test/mathematics.test.js                                             │
│                                                                             │
│  OUTPUT FILES                                                               │
│  ────────────                                                               │
│  dist/mathematics.js                                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ /**                                                                  │  │
│  │  * @module Mathematics                                               │  │
│  │  * @description Generated from mathematics.feature                   │  │
│  │  */                                                                  │  │
│  │                                                                       │  │
│  │ /**                                                                  │  │
│  │  * Calculate factorial of n                                          │  │
│  │  * @param {number} n - Input number                                  │  │
│  │  * @param {number} [acc=1] - Accumulator for tail recursion          │  │
│  │  * @returns {number} Factorial of n                                  │  │
│  │  */                                                                  │  │
│  │ const Mathematics = {                                                │  │
│  │   factorial: (n, acc = 1) =>                                         │  │
│  │     n === 0 ? acc : Mathematics.factorial(n - 1, n * acc),           │  │
│  │ };                                                                   │  │
│  │                                                                       │  │
│  │ module.exports = Mathematics;                                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  test/mathematics.test.js                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ const Mathematics = require('../dist/mathematics');                  │  │
│  │                                                                       │  │
│  │ describe('Mathematics', () => {                                      │  │
│  │   describe('factorial', () => {                                      │  │
│  │     it('returns 1 for n=0', () => {                                  │  │
│  │       expect(Mathematics.factorial(0)).toBe(1);                      │  │
│  │     });                                                              │  │
│  │     it('returns 120 for n=5', () => {                                │  │
│  │       expect(Mathematics.factorial(5)).toBe(120);                    │  │
│  │     });                                                              │  │
│  │   });                                                                │  │
│  │ });                                                                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
gherkin-lang-js/
├── package.json                      # Project manifest
├── package-lock.json                 # Dependency lock file
├── .gherkinrc.json                   # Compiler configuration
├── .eslintrc.js                      # ESLint configuration
├── .prettierrc                       # Prettier configuration
├── README.md                         # Project documentation
│
├── bin/
│   └── gherkin.js                    # CLI entry point (executable)
│
├── src/
│   ├── index.js                      # Main library entry point
│   │
│   ├── compiler/
│   │   ├── index.js                  # Compiler orchestrator
│   │   ├── context.js                # Project context manager
│   │   ├── cache.js                  # Cache manager
│   │   └── parser.js                 # Basic Gherkin parser (for structure)
│   │
│   ├── ai/
│   │   ├── transformer.js            # AI transformation engine
│   │   ├── rules.md                  # Language rules (THE AST!)
│   │   └── prompts/
│   │       ├── javascript.md         # JS-specific prompt
│   │       └── elixir.md             # Elixir-specific prompt
│   │
│   ├── mcp/
│   │   ├── client.js                 # MCP client
│   │   ├── server.js                 # MCP server (for tool hosting)
│   │   └── tools/
│   │       ├── index.js              # Tool registry
│   │       ├── filesystem.js         # File system tool
│   │       ├── analyzer.js           # Code analyzer tool
│   │       └── dependencies.js       # Dependency checker tool
│   │
│   ├── validation/
│   │   ├── validator.js              # Main validator
│   │   ├── syntax.js                 # Syntax checker
│   │   ├── purity.js                 # Purity checker
│   │   └── eslint-config.js          # ESLint rules
│   │
│   ├── generation/
│   │   ├── generator.js              # Code generator
│   │   ├── test-generator.js         # Test file generator
│   │   ├── doc-generator.js          # Documentation generator
│   │   └── formatters/
│   │       ├── javascript.js         # JS formatting
│   │       └── jsdoc.js              # JSDoc generation
│   │
│   └── cli/
│       ├── index.js                  # CLI setup
│       ├── commands/
│       │   ├── compile.js            # Compile command
│       │   ├── watch.js              # Watch command
│       │   ├── init.js               # Init command
│       │   ├── validate.js           # Validate command
│       │   ├── cache.js              # Cache command
│       │   └── test.js               # Test command
│       └── utils/
│           ├── logger.js             # CLI logging
│           └── progress.js           # Progress indicators
│
├── features/                         # Example GherkinLang programs
│   ├── mathematics.feature           # Math operations
│   ├── user_management.feature       # User handling
│   ├── data_processing.feature       # Data transformations
│   └── examples/
│       ├── fibonacci.feature
│       ├── sorting.feature
│       └── validation.feature
│
├── dist/                             # Compiled output (generated)
│   ├── mathematics.js
│   ├── user_management.js
│   └── ...
│
├── test/                             # Test files
│   ├── unit/
│   │   ├── compiler.test.js
│   │   ├── cache.test.js
│   │   ├── validator.test.js
│   │   └── transformer.test.js
│   ├── integration/
│   │   ├── compile-flow.test.js
│   │   └── mcp-tools.test.js
│   └── generated/                    # Generated tests (from features)
│       ├── mathematics.test.js
│       └── ...
│
├── docs/                             # Documentation
│   ├── api.md                        # API reference
│   ├── rules-reference.md            # Rules documentation
│   └── examples.md                   # Usage examples
│
└── .gherkin-cache/                   # Cache directory (generated)
    ├── manifest.json
    └── *.cache
```

---

## Component Interfaces

### Core Interfaces

```javascript
// ═══════════════════════════════════════════════════════════════════════════
// COMPILER INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

interface CompileOptions {
  target: 'javascript' | 'elixir';
  output: string;
  format: 'commonjs' | 'esm';
  cache: boolean;
  verbose: boolean;
}

interface CompileResult {
  success: boolean;
  files: CompiledFile[];
  errors: CompileError[];
  stats: {
    totalFiles: number;
    cachedFiles: number;
    compiledFiles: number;
    duration: number;
  };
}

interface CompiledFile {
  source: string;
  output: string;
  cached: boolean;
  duration: number;
}

interface Compiler {
  compile(files: string[], options: CompileOptions): Promise<CompileResult>;
  compileFile(file: string, options: CompileOptions): Promise<string>;
  watch(dir: string, options: WatchOptions): Watcher;
}

// ═══════════════════════════════════════════════════════════════════════════
// AI TRANSFORMER INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

interface TransformOptions {
  target: 'javascript' | 'elixir';
  context: ProjectContext;
  maxRetries: number;
}

interface TransformResult {
  success: boolean;
  code?: string;
  error?: TransformError;
  metadata: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    toolCalls: ToolCall[];
    duration: number;
  };
}

interface AITransformer {
  transform(source: string, options: TransformOptions): Promise<TransformResult>;
  loadRules(target: string): string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CACHE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

interface CacheEntry {
  key: string;
  code: string;
  tests?: string;
  metadata: {
    timestamp: string;
    duration: number;
    sourceHash: string;
    rulesHash: string;
  };
}

interface CacheStats {
  entries: number;
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

interface CacheManager {
  generateKey(source: string, rules: string, version: string): string;
  get(key: string): Promise<CacheEntry | null>;
  set(key: string, entry: CacheEntry): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(key?: string): Promise<void>;
  getStats(): Promise<CacheStats>;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATOR INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  type: 'syntax' | 'purity' | 'lint';
  message: string;
  line?: number;
  column?: number;
  rule?: string;
}

interface CodeValidator {
  validate(code: string): ValidationResult;
  checkSyntax(code: string): boolean;
  checkPurity(code: string): PurityResult;
  lint(code: string): LintResult[];
}

// ═══════════════════════════════════════════════════════════════════════════
// MCP INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

interface MCPTool {
  name: string;
  description: string;
  input_schema: object;
}

interface ToolCall {
  tool: string;
  input: object;
  output: object;
  duration: number;
}

interface MCPClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  callTool(name: string, input: object): Promise<object>;
  listTools(): MCPTool[];
}

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT CONTEXT INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

interface ModuleInfo {
  file: string;
  exports: string[];
  dependencies: string[];
}

interface ProjectConfig {
  target: string;
  moduleFormat: string;
  outputDir: string;
  testDir: string;
  cacheDir: string;
}

interface ProjectContext {
  modules: Map<string, ModuleInfo>;
  config: ProjectConfig;
  compileOrder: string[];
  
  build(rootDir: string): Promise<void>;
  getModule(name: string): ModuleInfo | null;
  getDependencies(name: string): string[];
  getCompileOrder(): string[];
}
```

---

## Error Handling

### Error Types

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Error Hierarchy                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GherkinError (base)                                                        │
│  ├── ParseError                                                             │
│  │   ├── InvalidSyntax                                                     │
│  │   ├── UnknownKeyword                                                    │
│  │   └── MalformedStep                                                     │
│  │                                                                          │
│  ├── CompileError                                                           │
│  │   ├── AITransformError                                                  │
│  │   │   ├── APIError (rate limit, auth, etc)                              │
│  │   │   └── GenerationError (invalid output)                              │
│  │   ├── ValidationError                                                   │
│  │   │   ├── SyntaxError                                                   │
│  │   │   ├── PurityError                                                   │
│  │   │   └── LintError                                                     │
│  │   └── DependencyError                                                   │
│  │       ├── CircularDependency                                            │
│  │       └── MissingModule                                                 │
│  │                                                                          │
│  ├── CacheError                                                             │
│  │   ├── ReadError                                                         │
│  │   ├── WriteError                                                        │
│  │   └── CorruptionError                                                   │
│  │                                                                          │
│  └── ConfigError                                                            │
│      ├── MissingConfig                                                     │
│      └── InvalidConfig                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Error Recovery Strategies

```javascript
// Retry strategy for AI transformation errors
const retryStrategy = {
  maxRetries: 3,
  backoff: 'exponential',
  retryableErrors: ['rate_limit', 'timeout', 'invalid_output'],
  
  onRetry: (error, attempt) => {
    if (error.type === 'invalid_output') {
      // Append validation errors to prompt for AI to self-correct
      return { appendToPrompt: `Previous output had errors: ${error.details}` };
    }
    return { delay: Math.pow(2, attempt) * 1000 };
  }
};

// Fallback strategy for cache errors
const cacheErrorHandler = {
  onReadError: () => {
    // Cache miss, proceed with compilation
    return { action: 'compile' };
  },
  onWriteError: () => {
    // Log warning, don't fail compilation
    return { action: 'warn', message: 'Failed to cache result' };
  },
  onCorruption: () => {
    // Clear corrupted cache, rebuild
    return { action: 'clear_and_rebuild' };
  }
};
```

---

## Configuration

### Configuration File (.gherkinrc.json)

```json
{
  "target": "javascript",
  "moduleFormat": "commonjs",
  "output": {
    "dir": "dist",
    "testDir": "test/generated",
    "docsDir": "docs/generated"
  },
  "cache": {
    "enabled": true,
    "dir": ".gherkin-cache",
    "maxSize": "100MB",
    "ttl": "7d"
  },
  "validation": {
    "syntax": true,
    "purity": true,
    "lint": true,
    "lintConfig": ".eslintrc.js"
  },
  "ai": {
    "model": "claude-3-opus-20240229",
    "maxRetries": 3,
    "timeout": 60000
  },
  "generation": {
    "jsdoc": true,
    "tests": true,
    "docs": true,
    "prettier": true
  },
  "watch": {
    "debounce": 100,
    "ignore": ["node_modules", "dist", ".gherkin-cache"]
  }
}
```

### Environment Variables

```
ANTHROPIC_API_KEY         # Required: Claude API key
GHERKIN_CACHE_DIR         # Override cache directory
GHERKIN_LOG_LEVEL         # Log level: debug, info, warn, error
GHERKIN_NO_CACHE          # Disable caching (set to "true")
GHERKIN_MAX_RETRIES       # Override max AI retries
```

---

## Performance Considerations

### Optimization Strategies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Performance Optimizations                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. CACHING                                                                 │
│     ├── Content-addressed caching for deterministic builds                 │
│     ├── Incremental compilation (only changed files)                       │
│     ├── LRU eviction to manage cache size                                  │
│     └── Persistent cache across runs                                       │
│                                                                             │
│  2. PARALLEL COMPILATION                                                    │
│     ├── Compile independent modules concurrently                           │
│     ├── Respect dependency order for dependent modules                     │
│     └── Worker pool for CPU-bound validation                               │
│                                                                             │
│  3. LAZY LOADING                                                            │
│     ├── Load rules file only when needed                                   │
│     ├── Initialize MCP client on first tool call                           │
│     └── Defer test generation until requested                              │
│                                                                             │
│  4. EFFICIENT AI USAGE                                                      │
│     ├── Batch small files into single API call                             │
│     ├── Stream responses for large outputs                                 │
│     ├── Cache tool call results within compilation                         │
│     └── Use appropriate model for task complexity                          │
│                                                                             │
│  5. WATCH MODE EFFICIENCY                                                   │
│     ├── Debounce rapid file changes                                        │
│     ├── Only recompile affected modules                                    │
│     ├── Use file system events (not polling)                               │
│     └── Keep MCP connection alive                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Benchmarks (Target)

| Operation | Target Time | Notes |
|-----------|------------|-------|
| Cache hit | <10ms | Pure disk I/O |
| Small file compilation | <3s | Single AI call |
| Large file compilation | <10s | Multiple tool calls |
| Full project (10 files, cached) | <100ms | Parallel reads |
| Full project (10 files, uncached) | <30s | Parallel AI calls |
| Watch mode recompile | <3s | Single file |

---

## Testing Strategy

### Test Categories

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Testing Strategy                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  UNIT TESTS (test/unit/)                                                    │
│  ├── Cache Manager                                                         │
│  │   ├── Key generation determinism                                        │
│  │   ├── Get/set operations                                                │
│  │   ├── Expiration handling                                               │
│  │   └── Corruption recovery                                               │
│  │                                                                          │
│  ├── Code Validator                                                         │
│  │   ├── Syntax validation (valid/invalid JS)                              │
│  │   ├── Purity detection (side effects)                                   │
│  │   └── Lint rule enforcement                                             │
│  │                                                                          │
│  ├── Code Generator                                                         │
│  │   ├── JSDoc generation                                                  │
│  │   ├── Module formatting (CJS/ESM)                                       │
│  │   └── Prettier integration                                              │
│  │                                                                          │
│  └── Project Context                                                        │
│      ├── File discovery                                                    │
│      ├── Dependency resolution                                             │
│      └── Circular dependency detection                                     │
│                                                                             │
│  INTEGRATION TESTS (test/integration/)                                      │
│  ├── Full compilation flow                                                 │
│  │   ├── Source to output                                                  │
│  │   ├── Cache integration                                                 │
│  │   └── Multi-file projects                                               │
│  │                                                                          │
│  ├── MCP tools                                                             │
│  │   ├── File system tool                                                  │
│  │   ├── Analyzer tool                                                     │
│  │   └── Dependencies tool                                                 │
│  │                                                                          │
│  └── AI transformer                                                         │
│      ├── Simple transformations                                            │
│      ├── Complex patterns                                                  │
│      └── Error recovery                                                    │
│                                                                             │
│  END-TO-END TESTS (test/e2e/)                                               │
│  ├── CLI commands                                                          │
│  │   ├── compile command                                                   │
│  │   ├── watch command                                                     │
│  │   └── init command                                                      │
│  │                                                                          │
│  └── Example programs                                                       │
│      ├── mathematics.feature → mathematics.js                              │
│      ├── user_management.feature → user_management.js                      │
│      └── Compiled output actually runs                                     │
│                                                                             │
│  GENERATED TESTS (test/generated/)                                          │
│  └── Auto-generated from compiled features                                 │
│      ├── Function behavior tests                                           │
│      ├── Edge case tests                                                   │
│      └── Type validation tests                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Future Considerations

### Planned Enhancements

1. **Language Server Protocol (LSP)**: IDE support with syntax highlighting, completions, and error reporting.

2. **Source Maps**: Map generated JavaScript back to original Gherkin for debugging.

3. **Streaming Compilation**: Real-time output for large files.

4. **Plugin System**: Extensible rules and custom transformations.

5. **Type Generation**: Generate TypeScript definitions from compiled modules.

6. **Documentation Site**: Auto-generated documentation from features.

---

## Appendix A: Example Compilation

### Input: mathematics.feature

```gherkin
Feature: Mathematics
  Basic mathematical operations compiled to pure JavaScript.

  Background:
    Given import nothing # Pure math, no external deps

  Scenario: factorial defines a recursive function
    Given function factorial accepts n as Number
    When n matches
      | 0 | return 1                    |
      | _ | return n * factorial(n - 1) |
    Then return result

  Scenario: fibonacci defines a recursive function  
    Given function fibonacci accepts n as Number
    When n matches
      | 0 | return 0                              |
      | 1 | return 1                              |
      | _ | return fibonacci(n-1) + fibonacci(n-2)|
    Then return result

  Scenario: gcd defines a function
    Given function gcd accepts a and b as Numbers
    When b matches
      | 0 | return a              |
      | _ | return gcd(b, a % b)  |
    Then return result
```

### Output: dist/mathematics.js

```javascript
/**
 * @module Mathematics
 * @description Basic mathematical operations compiled to pure JavaScript.
 * @generated from mathematics.feature
 */

const Mathematics = {
  /**
   * Calculate the factorial of n
   * @param {number} n - Input number
   * @param {number} [acc=1] - Accumulator for tail recursion
   * @returns {number} Factorial of n
   */
  factorial: (n, acc = 1) =>
    n === 0 ? acc : Mathematics.factorial(n - 1, n * acc),

  /**
   * Calculate the nth Fibonacci number
   * @param {number} n - Position in Fibonacci sequence
   * @returns {number} Fibonacci number at position n
   */
  fibonacci: (n) => {
    if (n === 0) return 0;
    if (n === 1) return 1;
    return Mathematics.fibonacci(n - 1) + Mathematics.fibonacci(n - 2);
  },

  /**
   * Calculate greatest common divisor of a and b
   * @param {number} a - First number
   * @param {number} b - Second number
   * @returns {number} GCD of a and b
   */
  gcd: (a, b) =>
    b === 0 ? a : Mathematics.gcd(b, a % b),
};

module.exports = Mathematics;
```

### Output: test/generated/mathematics.test.js

```javascript
const Mathematics = require('../../dist/mathematics');

describe('Mathematics', () => {
  describe('factorial', () => {
    it('returns 1 for n=0', () => {
      expect(Mathematics.factorial(0)).toBe(1);
    });

    it('returns 1 for n=1', () => {
      expect(Mathematics.factorial(1)).toBe(1);
    });

    it('returns 120 for n=5', () => {
      expect(Mathematics.factorial(5)).toBe(120);
    });

    it('returns 3628800 for n=10', () => {
      expect(Mathematics.factorial(10)).toBe(3628800);
    });
  });

  describe('fibonacci', () => {
    it('returns 0 for n=0', () => {
      expect(Mathematics.fibonacci(0)).toBe(0);
    });

    it('returns 1 for n=1', () => {
      expect(Mathematics.fibonacci(1)).toBe(1);
    });

    it('returns 55 for n=10', () => {
      expect(Mathematics.fibonacci(10)).toBe(55);
    });
  });

  describe('gcd', () => {
    it('returns a when b=0', () => {
      expect(Mathematics.gcd(10, 0)).toBe(10);
    });

    it('returns 6 for gcd(48, 18)', () => {
      expect(Mathematics.gcd(48, 18)).toBe(6);
    });

    it('returns 1 for coprime numbers', () => {
      expect(Mathematics.gcd(17, 13)).toBe(1);
    });
  });
});
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **AST** | Abstract Syntax Tree - traditionally a data structure representing code; in GherkinLang, replaced by natural language rules |
| **Content-Addressed** | Storage where the address (key) is derived from the content itself (usually via hashing) |
| **Deterministic Build** | A build where identical inputs always produce identical outputs |
| **Gherkin** | A human-readable DSL for describing software behaviors (Given/When/Then) |
| **MCP** | Model Context Protocol - Anthropic's protocol for AI tool use |
| **Pure Function** | A function with no side effects that always returns the same output for the same input |
| **Tail-Call Optimization** | Compiler optimization that reuses stack frames for recursive calls in tail position |
| **Tool Calling** | AI capability to invoke external tools/functions during generation |

---

*Document Version: 1.0*
*Last Updated: January 2025*
*Architecture for GherkinLang JavaScript Target*