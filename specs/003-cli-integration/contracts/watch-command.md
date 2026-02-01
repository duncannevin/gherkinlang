# Contract: Watch Command

**Module**: `src/cli/commands/watch.js`

## Overview

The watch command monitors a directory for file changes and automatically recompiles affected `.feature` files. It provides a development workflow with real-time feedback and incremental builds.

## Public Interface

### Command Signature

```text
gherkin watch [options] <dir>

Arguments:
  dir                      Directory to watch

Options:
  --initial                Compile all files before watching
  --debounce <ms>          Debounce delay (default: 100)
  -o, --output <dir>       Output directory
  -f, --format <format>    Module format: commonjs, esm
  -t, --target <lang>      Target language
  --no-cache               Bypass compilation cache
  --no-tests               Skip test generation
  -v, --verbose            Enable verbose output
  -q, --quiet              Suppress non-error output
  -h, --help               Display help
```

### Exported Functions

```javascript
/**
 * Register the watch command with the program.
 * @param {Command} program - Commander program instance
 */
export const register = (program) => { ... };

/**
 * Execute the watch command.
 * @param {string} dir - Directory to watch
 * @param {WatchOptions} options - Command options
 * @param {CommandContext} context - Command context
 * @returns {Promise<void>} Resolves on graceful shutdown
 */
export const execute = async (dir, options, context) => { ... };

/**
 * Create a file watcher for .feature files.
 * @param {string} dir - Directory to watch
 * @param {WatchOptions} options - Watch options
 * @returns {FSWatcher} Chokidar watcher instance
 */
export const createWatcher = (dir, options) => { ... };

/**
 * Handle a file change event.
 * @param {WatchEvent} event - File system event
 * @param {WatchState} state - Current watch state
 * @param {CommandContext} context - Command context
 * @returns {Promise<void>}
 */
export const handleEvent = async (event, state, context) => { ... };

/**
 * Get files that need recompilation (changed + dependents).
 * @param {string} changedFile - Path to changed file
 * @param {ProjectContext} projectContext - Project context
 * @returns {string[]} Files to recompile
 */
export const getFilesToRecompile = (changedFile, projectContext) => { ... };

/**
 * Gracefully shutdown the watcher.
 * @param {FSWatcher} watcher - Chokidar watcher
 * @param {WatchState} state - Current state
 * @returns {Promise<void>}
 */
export const shutdown = async (watcher, state) => { ... };
```

## Behavior Specifications

### Initialization

1. Validate directory exists
2. Create file watcher for `**/*.feature`
3. Ignore: `node_modules`, `dist`, `.gherkin-cache`, config ignores
4. If `--initial`: compile all files first
5. Build project context (dependency graph)
6. Display "Watching for changes..."

### Event Handling

| Event | Action |
|-------|--------|
| `add` | New file: compile, add to context |
| `change` | Modified: recompile file + dependents |
| `unlink` | Deleted: display message, update context |

### Debouncing

1. On event, add file to pending set
2. Reset debounce timer
3. After debounce period, compile all pending files
4. Clear pending set

### Dependency Recompilation

When file A changes:
1. Find all files that import A (dependents)
2. Queue: [A, ...dependents]
3. Sort by dependency order
4. Compile in order

### Error Recovery

- On compilation error: display error, continue watching
- Do NOT exit on error
- Clear error on next successful compile of same file

### Signal Handling

On SIGINT (Ctrl+C) or SIGTERM:
1. Stop spinner
2. Close watcher
3. Display summary
4. Exit with code 0

### Display

```text
👀 Watching features/ for changes...

[12:34:56] Changed: features/math.feature
[12:34:56] Recompiling: math.feature, calculator.feature
✔ Compiled 2 files in 2.1s

[12:35:12] Changed: features/strings.feature
✖ Error in strings.feature:15:3
  Purity violation: Array.push() is not allowed

[12:35:20] Changed: features/strings.feature
✔ Compiled 1 file in 1.8s

^C
Stopped watching. Summary:
  Duration:  5m 32s
  Compiles:  12 successful, 2 failed
```

## Dependencies

- `chokidar`: File watching
- `src/compiler/context.js`: Project context, dependency graph
- `src/cli/commands/compile.js`: Compilation logic
- `src/cli/utils/logger.js`: Logging
- `src/cli/utils/progress.js`: Progress indicators

## Example Usage

```bash
# Basic watch
gherkin watch features/

# Watch with initial compile
gherkin watch --initial features/

# Watch with custom debounce
gherkin watch --debounce 200 features/

# Watch with compile options
gherkin watch --output ./lib --format esm features/
```
