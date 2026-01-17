# GherkinLang Compiler - Tech Stack

## Overview

Technology stack for the GherkinLang compiler, an experimental programming language where the AST is replaced by natural language rules interpreted by AI. This document covers the JavaScript target.

---

## Core Runtime

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18.x+ | Runtime environment |
| JavaScript | ES2020+ | Implementation language |

---

## AI Integration

| Technology | Purpose |
|------------|---------|
| **Claude API** (Anthropic) | AI engine that transforms Gherkin syntax to JavaScript |
| **MCP (Model Context Protocol)** | Tool calling protocol for context-aware compilation |

### MCP Tools

| Tool | Purpose |
|------|---------|
| `file_system` | Read .feature files for cross-module references |
| `javascript_analyzer` | Validate generated JavaScript code |
| `dependency_checker` | Verify npm packages exist |
| `test_generator` | Generate Jest test files |

---

## Parsing & Validation

| Technology | Purpose |
|------------|---------|
| **esprima** | Primary JavaScript syntax validation |
| **@babel/parser** | Alternative parser with modern JS support |
| **ESLint** | Linting with functional programming rules |
| **eslint-plugin-functional** | Immutability and purity enforcement |
| **Prettier** | Code formatting for generated output |

---

## Testing

| Technology | Purpose |
|------------|---------|
| **Jest** | Test framework for unit, integration, and generated tests |
| **fast-check** | Property-based testing for compiler correctness |

---

## Caching

| Component | Technology |
|-----------|------------|
| Hash Algorithm | SHA256 (content-addressed) |
| Storage | File-system based (`.gherkin-cache/`) |
| Eviction | LRU (Least Recently Used) |

---

## Package Dependencies

### Production

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.x",
    "esprima": "^4.0.1",
    "@babel/parser": "^7.24.x",
    "eslint": "^8.57.x",
    "eslint-plugin-functional": "^6.x.x",
    "prettier": "^3.2.x",
    "commander": "^12.x.x",
    "chokidar": "^3.6.x",
    "glob": "^10.x.x"
  }
}
```

### Development

```json
{
  "devDependencies": {
    "jest": "^29.7.x",
    "fast-check": "^3.15.x"
  }
}
```

---

## Output Constraints

Generated JavaScript must be:
- Pure functional (no side effects)
- ES6+ syntax (const, arrow functions, destructuring)
- CommonJS or ES Modules format

### Forbidden Patterns

| Category | Forbidden |
|----------|-----------|
| Variables | `var`, `let` (prefer `const`) |
| OOP | `class`, `this`, `new` (except `new Error()`) |
| Loops | `for`, `while`, `do-while` |
| Mutations | `.push()`, `.splice()`, `.pop()`, `.shift()` |
| Side Effects | `console.*`, `Math.random()`, `Date.now()` |

---

## Performance Targets

| Scenario | Maximum Time |
|----------|--------------|
| Single file (< 100 lines) | 5 seconds |
| Single file (< 1000 lines) | 15 seconds |
| Project (< 10 files) | 30 seconds |
| Cache hit | < 100ms |