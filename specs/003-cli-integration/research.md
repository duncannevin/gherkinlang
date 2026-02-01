# Research: CLI & Integration

**Feature**: 003-cli-integration  
**Date**: 2026-01-30

## Summary

This document captures technology decisions and best practices research for implementing the GherkinLang CLI. All NEEDS CLARIFICATION items from the technical context have been resolved.

---

## Decision 1: CLI Argument Parsing Library

**Decision**: Use `commander` for CLI argument parsing

**Rationale**:
- Already listed in techstack.md as intended dependency
- Industry standard for Node.js CLIs (used by npm, webpack, vue-cli)
- Excellent subcommand support with automatic help generation
- Clean API for options, arguments, and validation
- Active maintenance and large community

**Alternatives Considered**:
- `yargs`: More feature-rich but heavier; overkill for this use case
- `meow`: Simpler but less subcommand support
- `arg`: Minimal but requires manual help generation
- Native `process.argv`: Too low-level, requires significant boilerplate

**Implementation Notes**:
```javascript
import { Command } from 'commander';
const program = new Command();
program
  .name('gherkin')
  .version(version)
  .description('GherkinLang compiler for JavaScript');
```

---

## Decision 2: File Watching Library

**Decision**: Use `chokidar` for file system watching

**Rationale**:
- Already listed in techstack.md as intended dependency
- Cross-platform support (macOS FSEvents, Linux inotify, Windows ReadDirectoryChangesW)
- Built-in debouncing and filtering capabilities
- Handles edge cases (atomic saves, vim swap files, etc.)
- Used by major tools (webpack, parcel, nodemon)

**Alternatives Considered**:
- Native `fs.watch`: Inconsistent across platforms, limited features
- `node-watch`: Simpler but fewer features than chokidar
- `watchman` (Facebook): Powerful but requires separate installation
- `nsfw`: Faster but less mature ecosystem

**Implementation Notes**:
```javascript
import chokidar from 'chokidar';
const watcher = chokidar.watch('**/*.feature', {
  ignored: ['node_modules', 'dist', '.gherkin-cache'],
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 100 }
});
```

---

## Decision 3: Terminal Output (Colors, Spinners)

**Decision**: Use `chalk` for colors and `ora` for spinners

**Rationale**:
- `chalk`: De facto standard for terminal colors in Node.js
  - Automatic detection of color support
  - Clean chainable API
  - Handles CI environments correctly
- `ora`: Elegant spinners with minimal API
  - Built-in CI detection (disables spinner animation)
  - Works well with chalk for colored text

**Alternatives Considered**:
- `kleur`: Lighter than chalk but less ecosystem support
- `picocolors`: Even lighter but no terminal detection
- `cli-spinners` + custom: More control but more code
- `listr2`: Full task runner - overkill for our needs

**Implementation Notes**:
```javascript
import chalk from 'chalk';
import ora from 'ora';

const spinner = ora('Compiling...').start();
spinner.succeed(chalk.green('Compiled 5 files'));
```

---

## Decision 4: Configuration File Search Strategy

**Decision**: Implement custom upward directory traversal

**Rationale**:
- Need to search from current directory up to filesystem root (per clarification)
- Stop at first `.gherkinrc.json` found
- Similar pattern used by ESLint, Prettier, npm

**Alternatives Considered**:
- `cosmiconfig`: Feature-rich config loading but heavier than needed
- `find-up`: Good for file search but doesn't handle JSON parsing
- `rc`: Legacy pattern, not modern ESM-friendly

**Implementation Notes**:
```javascript
const findConfig = (startDir) => {
  let dir = startDir;
  while (dir !== path.parse(dir).root) {
    const configPath = path.join(dir, '.gherkinrc.json');
    if (fs.existsSync(configPath)) return configPath;
    dir = path.dirname(dir);
  }
  return null;
};
```

---

## Decision 5: Signal Handling (SIGINT/SIGTERM)

**Decision**: Use native Node.js `process.on()` with cleanup callbacks

**Rationale**:
- Native support is sufficient for CLI use case
- Need to handle Ctrl+C gracefully in watch mode
- Must clean up file watchers and display summary

**Implementation Notes**:
```javascript
const cleanup = async () => {
  spinner.stop();
  await watcher.close();
  console.log('\nWatch mode stopped. Summary: ...');
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
```

---

## Decision 6: Interactive Prompts (Init Command)

**Decision**: Use `@inquirer/prompts` for interactive template selection

**Rationale**:
- Modern ESM-compatible version of Inquirer
- Supports select/confirm prompts needed for init
- Handles TTY detection (skip prompts if not interactive)
- Tree-shakeable - only import what we need

**Alternatives Considered**:
- `inquirer` (legacy): CJS, imports entire package
- `prompts`: Good but less maintained
- `enquirer`: Good API but less ecosystem adoption
- Custom `readline`: Too low-level

**Implementation Notes**:
```javascript
import { select, confirm } from '@inquirer/prompts';

const template = await select({
  message: 'Choose a project template:',
  choices: [
    { name: 'Basic - Minimal setup', value: 'basic' },
    { name: 'Library - Function exports', value: 'library' },
    { name: 'API - Request/response patterns', value: 'api' }
  ]
});
```

---

## Decision 7: Dependency Graph for Recompilation

**Decision**: Use existing Project Context from Phase 1

**Rationale**:
- Phase 1 (Core Components) already implements dependency graph in `src/compiler/context.js`
- Provides `getDependents(filePath)` to find files that import a given module
- No need to duplicate this logic in CLI layer

**Implementation Notes**:
- Load project context once at watch start
- On file change, call `context.getDependents(changedFile)`
- Queue changed file + dependents for recompilation
- Invalidate context on new file creation

---

## Decision 8: Error Aggregation Pattern

**Decision**: Collect errors in array, display formatted summary at end

**Rationale**:
- Per clarification: continue compiling all files, report all errors at end
- Each error includes: file path, line/column, error type, message
- Exit code based on error count (0 if none, 1 if any)

**Implementation Notes**:
```javascript
const errors = [];
for (const file of files) {
  try {
    await compile(file);
  } catch (err) {
    errors.push({ file, error: err });
  }
}
if (errors.length > 0) {
  displayErrors(errors);
  process.exit(1);
}
```

---

## Decision 9: Progress Display Strategy

**Decision**: Use spinner for single file, progress counter for multiple files

**Rationale**:
- Single file: Show spinner with "Compiling example.feature..."
- Multiple files: Show "Compiling [3/10] user_management.feature..."
- Update at least once per second (per SC-006)
- Disable spinners in CI (detected via `CI` env var or `--no-color`)

**Implementation Notes**:
```javascript
const isCI = process.env.CI === 'true' || !process.stdout.isTTY;
if (isCI) {
  console.log(`Compiling ${file}...`);
} else {
  spinner.text = `Compiling [${index}/${total}] ${file}`;
}
```

---

## Decision 10: Project Templates (Init Command)

**Decision**: Embed templates as JavaScript objects, not external files

**Rationale**:
- Simpler deployment (no template directory to bundle)
- Templates are small (config + 1-2 example files)
- Easy to version with code
- Can use template literals for .feature file content

**Template Contents**:

| Template | Files Created |
|----------|---------------|
| basic | `.gherkinrc.json`, `features/example.feature` |
| library | `.gherkinrc.json`, `features/math.feature`, `features/strings.feature` |
| api | `.gherkinrc.json`, `features/users.feature`, `features/health.feature` |

---

## Best Practices Applied

### CLI Design Patterns

1. **Subcommand Structure**: `gherkin <command> [options] [args]`
2. **Consistent Options**: Same flags work across commands where applicable
3. **Exit Codes**: 0 = success, 1 = error, 2 = usage error
4. **Stderr vs Stdout**: Errors to stderr, normal output to stdout
5. **Help Integration**: `--help` at any level shows relevant help

### Error Message Format

```text
Error: Validation failed in features/math.feature

  Line 15, Column 3: Purity violation
  Found: console.log('debug')
  
  Generated code must be pure. Remove console statements or mark
  the function with @impure annotation.

  Documentation: https://gherkinlang.dev/errors/purity-violation
```

### Watch Mode Best Practices

1. **Debounce**: 100ms default prevents duplicate compilations
2. **Atomic Writes**: Use `awaitWriteFinish` to handle editor save patterns
3. **Error Recovery**: Display error, continue watching
4. **Memory Management**: Clear old watcher on context rebuild

---

## Dependencies to Add

```json
{
  "dependencies": {
    "commander": "^12.1.0",
    "chokidar": "^3.6.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.1",
    "@inquirer/prompts": "^5.3.0"
  }
}
```

Note: These align with techstack.md recommendations.
