# Quickstart: CLI & Integration

**Feature**: 003-cli-integration  
**Date**: 2026-01-30

## Overview

This guide covers how to use the GherkinLang CLI to compile, watch, and initialize projects.

---

## Installation

The CLI is available after installing gherkinlang-js:

```bash
npm install -g gherkinlang-js
```

Or run locally via npx:

```bash
npx gherkin <command>
```

---

## Getting Started

### 1. Initialize a New Project

Create a new GherkinLang project with example files:

```bash
# Create project in new directory
gherkin init my-project

# Or initialize in current directory
cd my-project
gherkin init
```

You'll be prompted to choose a template:
- **Basic**: Minimal setup with one example file
- **Library**: Examples for utility functions
- **API**: Examples for request/response patterns

To skip prompts and use defaults:

```bash
gherkin init my-project --yes
```

### 2. Write Your First Feature

Create a `.feature` file in the `features/` directory:

```gherkin
# features/greeting.feature
Feature: Greeting
  Generate personalized greetings.

  Scenario: Say hello
    Given a person's name
    When I generate a greeting
    Then the result is "Hello, {name}!"
```

### 3. Compile to JavaScript

Compile your feature file:

```bash
gherkin compile features/greeting.feature
```

Output:
```text
✔ Compiled 1 file in 3.2s

  Files:     1 compiled, 0 failed
  Output:    dist/
```

The generated JavaScript is in `dist/greeting.js`:

```javascript
/**
 * @module Greeting
 * Generate personalized greetings.
 */

/**
 * Say hello
 * @param {string} name - A person's name
 * @returns {string} The greeting
 */
const sayHello = (name) => `Hello, ${name}!`;

module.exports = { sayHello };
```

### 4. Use Watch Mode for Development

Start the watcher to auto-compile on changes:

```bash
gherkin watch features/
```

Output:
```text
👀 Watching features/ for changes...

[12:34:56] Changed: features/greeting.feature
✔ Compiled 1 file in 1.8s
```

Press `Ctrl+C` to stop watching.

---

## Common Commands

### Compile

```bash
# Compile single file
gherkin compile features/math.feature

# Compile multiple files
gherkin compile features/math.feature features/strings.feature

# Compile entire directory
gherkin compile features/

# Compile to custom output directory
gherkin compile --output ./lib features/

# Compile as ES Modules
gherkin compile --format esm features/

# Skip cache (fresh compile)
gherkin compile --no-cache features/

# Skip test generation
gherkin compile --no-tests features/
```

### Watch

```bash
# Basic watch
gherkin watch features/

# Compile all first, then watch
gherkin watch --initial features/

# Custom debounce delay
gherkin watch --debounce 200 features/

# With compile options
gherkin watch --output ./lib --format esm features/
```

### Init

```bash
# Initialize with prompts
gherkin init

# Specific template
gherkin init --template library

# New directory
gherkin init my-project

# Accept all defaults
gherkin init --yes

# Overwrite existing
gherkin init --force
```

### Help

```bash
# General help
gherkin --help

# Command-specific help
gherkin compile --help
gherkin watch --help
gherkin init --help

# Version
gherkin --version
```

---

## Configuration

Create `.gherkinrc.json` in your project root:

```json
{
  "target": "javascript",
  "moduleFormat": "commonjs",
  "output": {
    "dir": "dist",
    "testDir": "test/generated"
  },
  "cache": {
    "enabled": true,
    "dir": ".gherkin-cache"
  },
  "validation": {
    "syntax": true,
    "purity": true,
    "lint": true
  },
  "generation": {
    "jsdoc": true,
    "tests": true
  },
  "watch": {
    "debounce": 100,
    "ignore": ["node_modules", "dist"]
  }
}
```

CLI options override config file settings.

---

## Error Handling

### Compilation Errors

When compilation fails, you'll see detailed error messages:

```text
✖ Compilation failed with 1 error

  Error: features/math.feature:15:3
    Purity violation: console.log() is not allowed
    
    Generated code must be pure. Remove console statements
    or mark the function with @impure annotation.
    
    Documentation: https://gherkinlang.dev/errors/purity-violation
```

The compiler continues processing all files and reports all errors at the end.

### Watch Mode Errors

In watch mode, errors don't stop the watcher:

```text
[12:35:12] Changed: features/strings.feature
✖ Error in strings.feature:8:1
  Syntax error: Unexpected token

[12:35:20] Changed: features/strings.feature
✔ Compiled 1 file in 1.2s
```

Fix the error, save again, and compilation continues.

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Compilation error |
| 2 | Invalid arguments |

Use in scripts:

```bash
gherkin compile features/ && npm test
```

---

## Tips

### CI/CD Integration

The CLI auto-detects CI environments and disables spinners/colors:

```yaml
# GitHub Actions example
- name: Compile GherkinLang
  run: gherkin compile features/
```

Or explicitly disable:

```bash
gherkin --no-color compile features/
```

### Verbose Output

For debugging, enable verbose mode:

```bash
gherkin -v compile features/math.feature
```

This shows AI transformer logs and detailed timing.

### Quiet Mode

For scripts, suppress non-error output:

```bash
gherkin -q compile features/
```

Only errors are displayed.

---

## Next Steps

- Learn about [writing .feature files](https://gherkinlang.dev/docs/features)
- Explore [language rules](https://gherkinlang.dev/docs/rules)
- Read about [generated code structure](https://gherkinlang.dev/docs/output)
