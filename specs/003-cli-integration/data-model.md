# Data Model: CLI & Integration

**Feature**: 003-cli-integration  
**Date**: 2026-01-30

## Overview

This document defines the data structures used by the CLI layer. These are internal runtime types, not persisted data. The CLI orchestrates existing compiler components and passes structured data between them.

---

## Core Entities

### CLIConfiguration

Settings loaded from `.gherkinrc.json` merged with command-line options.

```javascript
/**
 * @typedef {Object} CLIConfiguration
 * @property {string} target - Target language: 'javascript' | 'elixir'
 * @property {string} moduleFormat - Output format: 'commonjs' | 'esm'
 * @property {OutputConfig} output - Output directory settings
 * @property {CacheConfig} cache - Cache settings
 * @property {ValidationConfig} validation - Validation settings
 * @property {AIConfig} ai - AI transformer settings
 * @property {GenerationConfig} generation - Code generation settings
 * @property {WatchConfig} watch - Watch mode settings
 */

/**
 * @typedef {Object} OutputConfig
 * @property {string} dir - Output directory for compiled JS (default: 'dist')
 * @property {string} testDir - Output directory for tests (default: 'test/generated')
 * @property {string} docsDir - Output directory for docs (default: 'docs/generated')
 */

/**
 * @typedef {Object} CacheConfig
 * @property {boolean} enabled - Whether caching is enabled
 * @property {string} dir - Cache directory path
 * @property {string} maxSize - Maximum cache size (e.g., '100MB')
 * @property {string} ttl - Time to live for cache entries (e.g., '7d')
 */

/**
 * @typedef {Object} WatchConfig
 * @property {number} debounce - Debounce delay in milliseconds
 * @property {string[]} ignore - Directories to ignore
 */
```

**Source**: Loaded from `.gherkinrc.json`, merged with CLI options (CLI takes precedence)

**Validation Rules**:
- `target` must be 'javascript' or 'elixir'
- `moduleFormat` must be 'commonjs' or 'esm'
- `debounce` must be positive integer
- All paths are resolved relative to config file location

---

### CommandContext

Runtime context passed to all command handlers.

```javascript
/**
 * @typedef {Object} CommandContext
 * @property {CLIConfiguration} config - Merged configuration
 * @property {string} configPath - Path to .gherkinrc.json (or null if not found)
 * @property {string} cwd - Current working directory
 * @property {Logger} logger - Logger instance
 * @property {Object} options - Parsed CLI options for this command
 * @property {string[]} args - Positional arguments for this command
 * @property {AbortSignal} signal - Signal for cancellation (SIGINT/SIGTERM)
 */
```

**Lifecycle**:
1. Created at command invocation
2. Passed to command handler
3. Used for all operations within command
4. Disposed on command completion or signal

---

### CompileOptions

Options specific to the compile command.

```javascript
/**
 * @typedef {Object} CompileOptions
 * @property {string} [output] - Override output directory
 * @property {string} [format] - Override module format: 'commonjs' | 'esm'
 * @property {string} [target] - Override target language
 * @property {boolean} [noCache] - Bypass cache (default: false)
 * @property {boolean} [noTests] - Skip test generation (default: false)
 * @property {boolean} [verbose] - Enable verbose output
 * @property {boolean} [quiet] - Suppress non-error output
 * @property {boolean} [noColor] - Disable colored output
 */
```

---

### CompilationResult

Result of compiling one or more files.

```javascript
/**
 * @typedef {Object} CompilationResult
 * @property {boolean} success - Overall success (true if no errors)
 * @property {FileResult[]} files - Results for each file
 * @property {CompilationSummary} summary - Aggregate statistics
 */

/**
 * @typedef {Object} FileResult
 * @property {string} sourcePath - Input .feature file path
 * @property {string} [outputPath] - Output .js file path (if successful)
 * @property {string} [testPath] - Generated test file path (if tests enabled)
 * @property {boolean} success - Whether this file compiled successfully
 * @property {boolean} cached - Whether result came from cache
 * @property {number} duration - Compilation time in milliseconds
 * @property {CompilationError[]} errors - Errors for this file (if any)
 * @property {CompilationWarning[]} warnings - Warnings for this file
 */

/**
 * @typedef {Object} CompilationSummary
 * @property {number} total - Total files attempted
 * @property {number} succeeded - Files compiled successfully
 * @property {number} failed - Files that failed
 * @property {number} cached - Files served from cache
 * @property {number} totalDuration - Total time in milliseconds
 * @property {number} errorCount - Total error count
 * @property {number} warningCount - Total warning count
 */
```

---

### CompilationError

Structured error from compilation.

```javascript
/**
 * @typedef {Object} CompilationError
 * @property {string} type - Error type: 'parse' | 'transform' | 'validate' | 'generate'
 * @property {string} code - Error code (e.g., 'PURITY_VIOLATION', 'SYNTAX_ERROR')
 * @property {string} message - Human-readable error message
 * @property {string} file - File path where error occurred
 * @property {number} [line] - Line number (if applicable)
 * @property {number} [column] - Column number (if applicable)
 * @property {string} [source] - Source code snippet
 * @property {string} [suggestion] - Suggested fix
 * @property {string} [docsUrl] - Link to documentation
 */
```

---

### WatchOptions

Options specific to the watch command.

```javascript
/**
 * @typedef {Object} WatchOptions
 * @property {boolean} [initial] - Compile all files before watching
 * @property {number} [debounce] - Override debounce delay
 * @property {string[]} [ignore] - Additional patterns to ignore
 * // Plus all CompileOptions
 */
```

---

### WatchEvent

File system event from the watcher.

```javascript
/**
 * @typedef {Object} WatchEvent
 * @property {'add' | 'change' | 'unlink'} type - Event type
 * @property {string} path - Absolute path to affected file
 * @property {number} timestamp - Event timestamp
 */
```

---

### WatchState

Runtime state of the watch command.

```javascript
/**
 * @typedef {Object} WatchState
 * @property {boolean} isCompiling - Whether compilation is in progress
 * @property {Set<string>} pendingFiles - Files queued for recompilation
 * @property {Map<string, number>} lastCompiled - Last compile time per file
 * @property {WatchSummary} summary - Running statistics
 */

/**
 * @typedef {Object} WatchSummary
 * @property {number} compilations - Total compilations triggered
 * @property {number} succeeded - Successful compilations
 * @property {number} failed - Failed compilations
 * @property {number} startTime - Watch start timestamp
 */
```

---

### InitOptions

Options specific to the init command.

```javascript
/**
 * @typedef {Object} InitOptions
 * @property {string} [template] - Template: 'basic' | 'library' | 'api'
 * @property {boolean} [yes] - Accept all defaults without prompts
 * @property {boolean} [force] - Overwrite existing files without warning
 */
```

---

### ProjectTemplate

Template definition for project scaffolding.

```javascript
/**
 * @typedef {Object} ProjectTemplate
 * @property {string} name - Template identifier
 * @property {string} description - Human-readable description
 * @property {Object} config - .gherkinrc.json content
 * @property {TemplateFile[]} files - Files to create
 */

/**
 * @typedef {Object} TemplateFile
 * @property {string} path - Relative path from project root
 * @property {string} content - File content
 */
```

---

## State Transitions

### Compile Command Flow

```
INIT → DISCOVER → SORT → COMPILE_LOOP → SUMMARIZE → EXIT
                              ↓
                         [per file]
                    PARSE → TRANSFORM → VALIDATE → GENERATE
                              ↓ (on error)
                         COLLECT_ERROR
```

### Watch Command Flow

```
INIT → [INITIAL_COMPILE?] → WATCHING
                               ↓
                         [on file event]
                    DEBOUNCE → QUEUE → COMPILE → DISPLAY
                               ↓ (on SIGINT)
                         CLEANUP → SUMMARIZE → EXIT
```

### Init Command Flow

```
CHECK_DIR → [PROMPT_TEMPLATE?] → CREATE_CONFIG → CREATE_DIRS → CREATE_FILES → DISPLAY_NEXT_STEPS
     ↓ (existing config)
WARN_OVERWRITE → [CONFIRM?] → ...
```

---

## Relationships

```
CLIConfiguration ──────────────────────────────────┐
       │                                           │
       ▼                                           │
CommandContext ─────┬──────────────────────────────┤
       │            │                              │
       │     ┌──────┴──────┐                       │
       ▼     ▼             ▼                       │
CompileOptions    WatchOptions    InitOptions      │
       │               │               │           │
       ▼               ▼               ▼           │
CompilationResult  WatchState    ProjectTemplate   │
       │               │                           │
       ▼               │                           │
FileResult ◄───────────┘                           │
       │                                           │
       ▼                                           │
CompilationError ◄─────────────────────────────────┘
```
