/**
 * Type definitions for GherkinLang compiler.
 * 
 * This file contains TypeScript-style type definitions using JSDoc comments.
 * These types define the structure of data flowing through the compiler.
 * 
 * @module compiler/types
 */

const { ParseError } = require('./errors');

/**
 * @typedef {Object} LanguageRules
 * @property {string} content - Raw markdown content of rules.md
 * @property {string} target - Target language identifier ('javascript' | 'elixir')
 * @property {string} contentHash - SHA256 hash of content for cache invalidation
 * @property {Date} loadedAt - Timestamp when rules were loaded
 * @property {string} filePath - Path to rules.md file
 */

/**
 * @typedef {Object} ScenarioInfo
 * @property {string} name - Scenario name
 * @property {number} lineNumber - Line number where scenario is defined (1-indexed)
 */

/**
 * @typedef {Object} ParsedFeature
 * @property {string} featureName - Name extracted from "Feature:" line
 * @property {string} filePath - Path to the .feature file
 * @property {ScenarioInfo[]} scenarios - List of scenarios found
 * @property {string[]} imports - List of imported module names (from import statements)
 * @property {string[]} dependencies - Resolved dependency module names
 * @property {ParseError[]} errors - Any parsing errors encountered
 * @property {number} lineCount - Total lines in file
 */

/**
 * @typedef {Object} ModuleInfo
 * @property {string} file - Path to .feature file
 * @property {string[]} exports - Function names exported by module
 * @property {string[]} dependencies - Module names this module depends on
 * @property {Date} parsedAt - When module was parsed
 */

/**
 * @typedef {Object} DependencyGraph
 * @property {Set<string>} nodes - Set of module names (nodes)
 * @property {Map<string, Set<string>>} edges - Adjacency list (module → set of dependencies)
 * @property {Map<string, Set<string>>} reverseEdges - Reverse adjacency list (module → set of dependents)
 * @property {string[]} compileOrder - Topologically sorted module names
 */

/**
 * @typedef {Object} Cycle
 * @property {string[]} modules - Module names in cycle
 * @property {string} message - Human-readable description
 */

/**
 * @typedef {Object} OutputConfig
 * @property {string} dir - Output directory for compiled code
 * @property {string} testDir - Output directory for generated tests
 * @property {string} docsDir - Output directory for generated documentation
 */

/**
 * @typedef {Object} CacheConfig
 * @property {boolean} enabled - Whether caching is enabled
 * @property {string} dir - Cache directory path
 * @property {string} maxSize - Maximum cache size (e.g., '100MB')
 * @property {string} ttl - Time to live for cache entries (e.g., '7d')
 */

/**
 * @typedef {Object} ValidationConfig
 * @property {boolean} syntax - Enable syntax validation
 * @property {boolean} purity - Enable purity validation
 * @property {boolean} lint - Enable linting
 * @property {string} lintConfig - Path to linting configuration file
 */

/**
 * @typedef {Object} AIConfig
 * @property {string} model - AI model identifier (e.g., 'claude-3-opus-20240229')
 * @property {number} maxRetries - Maximum retry attempts for AI calls
 * @property {number} timeout - Timeout in milliseconds for AI calls
 */

/**
 * @typedef {Object} GenerationConfig
 * @property {boolean} jsdoc - Generate JSDoc comments
 * @property {boolean} tests - Generate test files
 * @property {boolean} docs - Generate documentation
 * @property {boolean} prettier - Format code with Prettier
 */

/**
 * @typedef {Object} WatchConfig
 * @property {number} debounce - Debounce delay in milliseconds
 * @property {string[]} ignore - Patterns to ignore when watching
 */

/**
 * @typedef {Object} ProjectConfiguration
 * @property {'javascript'|'elixir'} target - Target language
 * @property {'commonjs'|'esm'} moduleFormat - Module format
 * @property {OutputConfig} output - Output directory configuration
 * @property {CacheConfig} cache - Cache configuration
 * @property {ValidationConfig} validation - Validation settings
 * @property {AIConfig} ai - AI model configuration
 * @property {GenerationConfig} generation - Code generation settings
 * @property {WatchConfig} [watch] - Watch mode settings (optional)
 */

/**
 * @typedef {Object} CacheMetadata
 * @property {string} timestamp - ISO 8601 timestamp
 * @property {number} duration - Compilation duration in milliseconds
 * @property {string} model - AI model used (e.g., 'claude-3-opus-20240229')
 * @property {string} compilerVersion - Compiler version string
 * @property {string} target - Target language
 */

/**
 * @typedef {Object} CacheEntry
 * @property {string} key - SHA256 cache key
 * @property {string} sourceHash - SHA256 hash of source content
 * @property {string} rulesHash - SHA256 hash of rules content
 * @property {string} compiledCode - Generated JavaScript code
 * @property {string} [generatedTests] - Generated test file content (optional)
 * @property {CacheMetadata} metadata - Compilation metadata
 */

/**
 * @typedef {Object} ManifestEntry
 * @property {string} key - Cache key
 * @property {string} file - Path to cache file
 * @property {number} size - Size of cache entry in bytes
 * @property {Date} lastAccessed - When entry was last read
 */

/**
 * @typedef {Object} CacheManifest
 * @property {ManifestEntry[]} entries - List of all cache entries
 * @property {number} totalSize - Total size of all cache entries in bytes
 * @property {number} maxSize - Maximum cache size in bytes (from config)
 * @property {Date} lastUpdated - When manifest was last updated
 */

/**
 * @typedef {Object} CacheStats
 * @property {number} entries - Number of cache entries
 * @property {number} totalSize - Total cache size in bytes
 * @property {number} hits - Number of cache hits
 * @property {number} misses - Number of cache misses
 * @property {number} hitRate - Hit rate (0.0 to 1.0)
 */

/**
 * @typedef {Object} CacheManagerOptions
 * @property {string} [cacheDir] - Cache directory path (default: '.gherkin-cache')
 * @property {string} [maxSize] - Maximum cache size in bytes (default: '100MB')
 * @property {string} [compilerVersion] - Compiler version string (default: '1.0.0')
 */

/**
 * @typedef {Object} ProjectContextData
 * @property {Map<string, ModuleInfo>} modules - Map of feature names to module info
 * @property {ProjectConfiguration} config - Loaded and validated configuration
 * @property {string[]} compileOrder - Topologically sorted module names
 * @property {Cycle[]} cycles - Detected circular dependencies
 */

// Export types (for JSDoc reference, not runtime values)
// In JavaScript, types are only used for documentation and IDE support
module.exports = {
  // Types are exported as empty object for module structure
  // Actual type checking happens via JSDoc comments
};
