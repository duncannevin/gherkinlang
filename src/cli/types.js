/**
 * CLI type definitions for GherkinLang compiler.
 *
 * @module cli/types
 */

/**
 * Output directory configuration.
 * @typedef {Object} OutputConfig
 * @property {string} dir - Output directory for compiled JS (default: 'dist')
 * @property {string} testDir - Output directory for tests (default: 'test/generated')
 * @property {string} docsDir - Output directory for docs (default: 'docs/generated')
 */

/**
 * Cache configuration.
 * @typedef {Object} CacheConfig
 * @property {boolean} enabled - Whether caching is enabled
 * @property {string} dir - Cache directory path
 * @property {string} maxSize - Maximum cache size (e.g., '100MB')
 * @property {string} ttl - Time to live for cache entries (e.g., '7d')
 */

/**
 * Validation configuration.
 * @typedef {Object} ValidationConfig
 * @property {boolean} syntax - Enable syntax validation
 * @property {boolean} purity - Enable purity validation
 * @property {boolean} lint - Enable lint validation
 * @property {string} [lintConfig] - Path to ESLint config
 */

/**
 * AI transformer configuration.
 * @typedef {Object} AIConfig
 * @property {string} model - AI model to use
 * @property {number} maxRetries - Maximum retry attempts
 * @property {number} timeout - Timeout in milliseconds
 */

/**
 * Code generation configuration.
 * @typedef {Object} GenerationConfig
 * @property {boolean} jsdoc - Generate JSDoc comments
 * @property {boolean} tests - Generate test files
 * @property {boolean} docs - Generate documentation
 * @property {boolean} prettier - Format with Prettier
 */

/**
 * Watch mode configuration.
 * @typedef {Object} WatchConfig
 * @property {number} debounce - Debounce delay in milliseconds
 * @property {string[]} ignore - Directories to ignore
 */

/**
 * Complete CLI configuration loaded from .gherkinrc.json.
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
 * Runtime context passed to all command handlers.
 * @typedef {Object} CommandContext
 * @property {CLIConfiguration} config - Merged configuration
 * @property {string|null} configPath - Path to .gherkinrc.json (or null if not found)
 * @property {string} cwd - Current working directory
 * @property {import('./utils/logger.js').Logger} logger - Logger instance
 * @property {Object} options - Parsed CLI options for this command
 * @property {string[]} args - Positional arguments for this command
 * @property {AbortController} abortController - Controller for cancellation
 */

/**
 * Options for the compile command.
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

/**
 * Result of compiling a single file.
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
 * Summary statistics for a compilation run.
 * @typedef {Object} CompilationSummary
 * @property {number} total - Total files attempted
 * @property {number} succeeded - Files compiled successfully
 * @property {number} failed - Files that failed
 * @property {number} cached - Files served from cache
 * @property {number} totalDuration - Total time in milliseconds
 * @property {number} errorCount - Total error count
 * @property {number} warningCount - Total warning count
 */

/**
 * Result of compiling one or more files.
 * @typedef {Object} CompilationResult
 * @property {boolean} success - Overall success (true if no errors)
 * @property {FileResult[]} files - Results for each file
 * @property {CompilationSummary} summary - Aggregate statistics
 */

/**
 * Structured error from compilation.
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

/**
 * Warning from compilation.
 * @typedef {Object} CompilationWarning
 * @property {string} code - Warning code
 * @property {string} message - Warning message
 * @property {string} file - File path
 * @property {number} [line] - Line number
 * @property {number} [column] - Column number
 */

/**
 * Options for the watch command.
 * @typedef {Object} WatchOptions
 * @property {boolean} [initial] - Compile all files before watching
 * @property {number} [debounce] - Override debounce delay
 * @property {string[]} [ignore] - Additional patterns to ignore
 * @property {string} [output] - Override output directory
 * @property {string} [format] - Override module format
 * @property {string} [target] - Override target language
 * @property {boolean} [noCache] - Bypass cache
 * @property {boolean} [noTests] - Skip test generation
 * @property {boolean} [verbose] - Enable verbose output
 * @property {boolean} [quiet] - Suppress non-error output
 */

/**
 * File system event from the watcher.
 * @typedef {Object} WatchEvent
 * @property {'add' | 'change' | 'unlink'} type - Event type
 * @property {string} path - Absolute path to affected file
 * @property {number} timestamp - Event timestamp
 */

/**
 * Running statistics for watch mode.
 * @typedef {Object} WatchSummary
 * @property {number} compilations - Total compilations triggered
 * @property {number} succeeded - Successful compilations
 * @property {number} failed - Failed compilations
 * @property {number} startTime - Watch start timestamp
 */

/**
 * Runtime state of the watch command.
 * @typedef {Object} WatchState
 * @property {boolean} isCompiling - Whether compilation is in progress
 * @property {Set<string>} pendingFiles - Files queued for recompilation
 * @property {Map<string, number>} lastCompiled - Last compile time per file
 * @property {WatchSummary} summary - Running statistics
 */

/**
 * Options for the init command.
 * @typedef {Object} InitOptions
 * @property {string} [template] - Template: 'basic' | 'library' | 'api'
 * @property {boolean} [yes] - Accept all defaults without prompts
 * @property {boolean} [force] - Overwrite existing files without warning
 */

/**
 * File in a project template.
 * @typedef {Object} TemplateFile
 * @property {string} path - Relative path from project root
 * @property {string} content - File content
 */

/**
 * Template definition for project scaffolding.
 * @typedef {Object} ProjectTemplate
 * @property {string} name - Template identifier
 * @property {string} description - Human-readable description
 * @property {Object} config - .gherkinrc.json content
 * @property {TemplateFile[]} files - Files to create
 */

// Export empty object to make this a module
export {};
