# Contract: CLI Entry Point

**Module**: `src/cli/index.js`  
**Executable**: `bin/gherkin.js`

## Overview

The CLI entry point provides the `gherkin` command and routes to subcommands. It handles global options, configuration loading, and error handling.

## Public Interface

### Command Structure

```text
gherkin [options] <command> [command-options] [args...]

Global Options:
  -V, --version      Output version number
  -h, --help         Display help
  --no-color         Disable colored output
  -v, --verbose      Enable verbose output
  -q, --quiet        Suppress non-error output

Commands:
  compile <files...> Compile .feature files to JavaScript
  watch <dir>        Watch directory and recompile on changes
  init [name]        Initialize a new GherkinLang project
  cache              Manage compilation cache (not implemented)
  validate           Validate .feature files (not implemented)
  test               Run generated tests (not implemented)
```

### Exported Functions

```javascript
/**
 * Create and configure the CLI program.
 * @returns {Command} Configured commander program
 */
export const createProgram = () => { ... };

/**
 * Run the CLI with given arguments.
 * @param {string[]} args - Command-line arguments (default: process.argv)
 * @returns {Promise<void>}
 */
export const run = async (args = process.argv) => { ... };

/**
 * Load configuration from .gherkinrc.json.
 * Searches current directory up to filesystem root.
 * @param {string} startDir - Directory to start search from
 * @returns {Promise<{config: CLIConfiguration, path: string|null}>}
 */
export const loadConfig = async (startDir) => { ... };

/**
 * Create command context for a handler.
 * @param {Command} cmd - Commander command instance
 * @returns {CommandContext}
 */
export const createContext = (cmd) => { ... };
```

## Behavior Specifications

### Configuration Loading

1. Search for `.gherkinrc.json` starting from `cwd`
2. Traverse parent directories up to filesystem root
3. Stop at first config found
4. If no config found, use defaults
5. Merge CLI options over config file (CLI wins)

### Error Handling

| Scenario | Behavior | Exit Code |
|----------|----------|-----------|
| Unknown command | Display error + suggestions | 1 |
| Invalid option | Display error + usage | 1 |
| Command success | Normal exit | 0 |
| Command error | Display formatted error | 1 |
| Unhandled exception | Display stack (if verbose) | 1 |

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Command error (compilation failed, file not found, etc.) |
| 2 | Usage error (invalid arguments, unknown command) |

## Dependencies

- `commander`: CLI framework
- `chalk`: Colored output
- `src/cli/utils/logger.js`: Logging utilities
- `src/cli/commands/*`: Command handlers

## Example Usage

```bash
# Display version
gherkin --version

# Display help
gherkin --help
gherkin compile --help

# Compile with verbose output
gherkin -v compile features/

# Compile without colors (CI mode)
gherkin --no-color compile features/*.feature
```
