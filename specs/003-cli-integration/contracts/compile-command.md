# Contract: Compile Command

**Module**: `src/cli/commands/compile.js`

## Overview

The compile command transforms GherkinLang `.feature` files into JavaScript modules. It orchestrates the full compilation pipeline: discovery, parsing, AI transformation, validation, and code generation.

## Public Interface

### Command Signature

```text
gherkin compile [options] <files...>

Arguments:
  files                    Files or directories to compile

Options:
  -o, --output <dir>       Output directory (default: from config)
  -f, --format <format>    Module format: commonjs, esm (default: from config)
  -t, --target <lang>      Target language: javascript, elixir (default: from config)
  --no-cache               Bypass compilation cache
  --no-tests               Skip test generation
  -v, --verbose            Enable verbose output
  -q, --quiet              Suppress non-error output
  -h, --help               Display help
```

### Exported Functions

```javascript
/**
 * Register the compile command with the program.
 * @param {Command} program - Commander program instance
 */
export const register = (program) => { ... };

/**
 * Execute the compile command.
 * @param {string[]} files - File or directory paths to compile
 * @param {CompileOptions} options - Command options
 * @param {CommandContext} context - Command context
 * @returns {Promise<CompilationResult>}
 */
export const execute = async (files, options, context) => { ... };

/**
 * Discover .feature files from paths.
 * @param {string[]} paths - File or directory paths
 * @returns {Promise<string[]>} Resolved absolute paths
 */
export const discoverFiles = async (paths) => { ... };

/**
 * Sort files by dependency order.
 * @param {string[]} files - Files to sort
 * @param {ProjectContext} context - Project context with dependency graph
 * @returns {string[]} Files in topological order
 */
export const sortByDependency = (files, context) => { ... };

/**
 * Compile a single file.
 * @param {string} file - File path
 * @param {CompileOptions} options - Compile options
 * @param {CommandContext} context - Command context
 * @returns {Promise<FileResult>}
 */
export const compileFile = async (file, options, context) => { ... };
```

## Behavior Specifications

### File Discovery

1. For each argument:
   - If file: validate exists, add to list
   - If directory: recursively find all `*.feature` files
2. Filter duplicates (by absolute path)
3. Validate all files exist, error if any missing

### Compilation Pipeline (per file)

```
1. Check cache → if hit, return cached result
2. Parse .feature file → ParsedFeature
3. Transform via AI → generated JavaScript
4. Validate (syntax, purity, lint) → ValidationResult
5. If valid: generate output files
6. If invalid: collect errors, continue to next file
7. Update cache
```

### Error Aggregation

- Continue compiling all files even if one fails
- Collect all errors in `CompilationResult.files[].errors`
- Display aggregated errors at end
- Exit with code 1 if any errors

### Progress Display

| Mode | Display |
|------|---------|
| Single file | Spinner: "Compiling example.feature..." |
| Multiple files | Counter: "Compiling [3/10] user.feature..." |
| Quiet mode | No progress output |
| Verbose mode | Full AI transformer logs |

### Output

On success:
```text
✔ Compiled 5 files in 12.3s

  Files:     5 compiled, 0 failed
  Cache:     3 hits, 2 misses
  Output:    dist/
```

On failure:
```text
✖ Compilation failed with 2 errors

  Error: features/math.feature:15:3
    Purity violation: console.log() is not allowed
    Suggestion: Remove console statement or use @impure annotation

  Error: features/strings.feature:8:1
    Syntax error: Unexpected token 'let'
    Suggestion: Use 'const' instead of 'let'

  Files:     3 compiled, 2 failed
  Cache:     1 hit, 4 misses
```

## Dependencies

- `src/compiler/parser.js`: Parse .feature files
- `src/compiler/context.js`: Project context, dependency graph
- `src/compiler/cache.js`: Compilation cache
- `src/ai/transformer.js`: AI transformation
- `src/validation/validator.js`: Code validation
- `src/generation/generator.js`: Code generation
- `src/generation/test-generator.js`: Test generation
- `src/cli/utils/logger.js`: Logging
- `src/cli/utils/progress.js`: Progress indicators
- `glob`: File discovery

## Example Usage

```bash
# Compile single file
gherkin compile features/math.feature

# Compile multiple files
gherkin compile features/math.feature features/strings.feature

# Compile entire directory
gherkin compile features/

# Compile with options
gherkin compile --output ./lib --format esm features/

# Compile without cache
gherkin compile --no-cache features/math.feature

# Compile without tests
gherkin compile --no-tests features/
```
