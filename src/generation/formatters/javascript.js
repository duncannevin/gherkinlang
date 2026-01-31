/**
 * JavaScript code formatter for GherkinLang compiler.
 *
 * Formats generated JavaScript code according to project standards. Handles
 * CommonJS and ES Module formatting, code style consistency, and integration
 * with Prettier.
 *
 * @module generation/formatters/javascript
 */

const path = require('path');
const fs = require('fs').promises;

/**
 * @typedef {Object} FormatResult
 * @property {string} code - Formatted code (or original if failed)
 * @property {boolean} formatted - Whether formatting succeeded
 * @property {string} [warning] - Warning message if failed
 */

/**
 * @typedef {Object} FormatOptions
 * @property {Object} [prettierConfig] - Custom Prettier configuration
 * @property {string} [filepath] - File path for parser inference
 * @property {boolean} [useTabs] - Use tabs instead of spaces
 * @property {number} [tabWidth] - Tab width (default: 2)
 * @property {boolean} [semi] - Include semicolons (default: true)
 * @property {boolean} [singleQuote] - Use single quotes (default: true)
 * @property {string} [trailingComma] - Trailing comma style (default: 'es5')
 * @property {number} [printWidth] - Print width (default: 100)
 */

/**
 * Default Prettier configuration for deterministic output.
 * These settings are locked to ensure byte-for-byte identical output.
 * @type {Object}
 */
const DEFAULT_PRETTIER_CONFIG = {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  useTabs: false,
  trailingComma: 'es5',
  printWidth: 100,
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',
  parser: 'babel',
};

/**
 * Cached Prettier module.
 * @type {Object|null}
 */
let prettierCache = null;

/**
 * Gets the Prettier module (lazy loaded).
 * Handles Prettier 3.x ESM compatibility issues in Jest environment.
 *
 * @returns {Object|null} Prettier module or null if not available
 */
const getPrettier = () => {
  if (prettierCache) {
    return prettierCache;
  }

  try {
    // Try to require prettier synchronously
    const prettier = require('prettier');

    // Check if it's a valid prettier module with format function
    if (prettier && typeof prettier.format === 'function') {
      prettierCache = prettier;
      return prettierCache;
    }

    // Prettier 3.x uses ESM, which may cause issues in Jest
    // Return a mock that indicates async-only support
    prettierCache = {
      format: async (code, options) => {
        // Try dynamic import as fallback
        try {
          const prettierModule = await import('prettier');
          return prettierModule.format(code, options);
        } catch {
          throw new Error('Prettier formatting not available');
        }
      },
      resolveConfig: async () => null,
      check: async () => false,
      version: prettier.version || 'unknown',
    };
    return prettierCache;
  } catch {
    return null;
  }
};

/**
 * Loads project .prettierrc configuration if it exists.
 *
 * @param {string} [startPath] - Path to start searching from
 * @returns {Promise<Object|null>} Prettier config or null if not found
 */
const loadProjectPrettierConfig = async (startPath) => {
  const prettier = getPrettier();
  if (!prettier) {
    return null;
  }

  try {
    // Use Prettier's built-in config resolution
    const config = await prettier.resolveConfig(startPath || process.cwd(), {
      useCache: false,
    });
    return config;
  } catch {
    return null;
  }
};

/**
 * Merges project config with defaults, with defaults taking precedence
 * for critical settings that ensure deterministic output.
 *
 * @param {Object} projectConfig - Project's Prettier config
 * @param {Object} [overrides] - User-provided overrides
 * @returns {Object} Merged configuration
 */
const mergeConfig = (projectConfig, overrides = {}) => {
  // Start with project config
  const merged = { ...projectConfig };

  // Apply user overrides
  Object.assign(merged, overrides);

  // Ensure critical settings for determinism are locked
  // These cannot be overridden to ensure byte-for-byte identical output
  merged.endOfLine = 'lf';
  merged.parser = merged.parser || 'babel';

  return merged;
};

/**
 * Creates a complete Prettier configuration by merging defaults,
 * project config, and options.
 *
 * @param {FormatOptions} [options={}] - Format options
 * @param {Object} [projectConfig=null] - Project's .prettierrc config
 * @returns {Object} Complete Prettier configuration
 */
const createPrettierConfig = (options = {}, projectConfig = null) => {
  // Start with defaults
  const config = { ...DEFAULT_PRETTIER_CONFIG };

  // Merge project config (project settings override defaults)
  if (projectConfig) {
    Object.assign(config, projectConfig);
  }

  // Merge user options from prettierConfig property
  if (options.prettierConfig) {
    Object.assign(config, options.prettierConfig);
  }

  // Apply direct options
  if (options.tabWidth !== undefined) config.tabWidth = options.tabWidth;
  if (options.useTabs !== undefined) config.useTabs = options.useTabs;
  if (options.semi !== undefined) config.semi = options.semi;
  if (options.singleQuote !== undefined) config.singleQuote = options.singleQuote;
  if (options.trailingComma !== undefined) config.trailingComma = options.trailingComma;
  if (options.printWidth !== undefined) config.printWidth = options.printWidth;

  // Ensure deterministic settings are locked
  config.endOfLine = 'lf';
  config.parser = config.parser || 'babel';

  return config;
};

/**
 * Formats JavaScript code using Prettier.
 *
 * Uses the programmatic Prettier API to format code. Falls back to returning
 * the original code with a warning if formatting fails.
 *
 * @param {string} code - JavaScript code to format
 * @param {FormatOptions} [options={}] - Formatting options
 * @returns {Promise<FormatResult>} Format result
 *
 * @example
 * const result = await formatCode('const x=1;const y=2;');
 * console.log(result.formatted); // true
 * console.log(result.code); // 'const x = 1;\nconst y = 2;\n'
 *
 * @example
 * // With custom options
 * const result = await formatCode(code, {
 *   singleQuote: false,
 *   tabWidth: 4
 * });
 */
const formatCode = async (code, options = {}) => {
  const prettier = getPrettier();

  // If Prettier is not available, return original with warning
  if (!prettier) {
    return {
      code,
      formatted: false,
      warning: 'Prettier is not installed. Code was not formatted.',
    };
  }

  try {
    // Load project config if filepath is provided
    let projectConfig = null;
    if (options.filepath) {
      projectConfig = await loadProjectPrettierConfig(options.filepath);
    }

    // Create final config
    const config = createPrettierConfig(options, projectConfig);

    // Add filepath for parser inference if provided
    if (options.filepath) {
      config.filepath = options.filepath;
    }

    // Format the code
    const formattedCode = await prettier.format(code, config);

    return {
      code: formattedCode,
      formatted: true,
    };
  } catch (error) {
    // Formatting failed - return original with warning
    return {
      code,
      formatted: false,
      warning: `Prettier formatting failed: ${error.message}. Code was not formatted.`,
    };
  }
};

/**
 * Synchronously formats JavaScript code using Prettier.
 * Only use when async is not possible.
 *
 * @param {string} code - JavaScript code to format
 * @param {Object} [config={}] - Prettier configuration
 * @returns {FormatResult} Format result
 */
const formatCodeSync = (code, config = {}) => {
  const prettier = getPrettier();

  if (!prettier || !prettier.format) {
    return {
      code,
      formatted: false,
      warning: 'Prettier is not installed or does not support sync formatting.',
    };
  }

  try {
    const finalConfig = { ...DEFAULT_PRETTIER_CONFIG, ...config };
    // Note: Prettier 3.x only supports async, but we try anyway
    const formattedCode = prettier.format(code, finalConfig);

    // If it's a promise, we can't use it synchronously
    if (formattedCode && typeof formattedCode.then === 'function') {
      return {
        code,
        formatted: false,
        warning: 'Prettier only supports async formatting in this version.',
      };
    }

    return {
      code: formattedCode,
      formatted: true,
    };
  } catch (error) {
    return {
      code,
      formatted: false,
      warning: `Prettier formatting failed: ${error.message}`,
    };
  }
};

/**
 * Checks if code is already formatted according to Prettier config.
 *
 * @param {string} code - JavaScript code to check
 * @param {FormatOptions} [options={}] - Formatting options
 * @returns {Promise<boolean>} True if code is already formatted
 */
const isFormatted = async (code, options = {}) => {
  const prettier = getPrettier();

  if (!prettier || !prettier.check) {
    // Can't check, assume not formatted
    return false;
  }

  try {
    const config = createPrettierConfig(options);
    return await prettier.check(code, config);
  } catch {
    return false;
  }
};

/**
 * Gets information about the Prettier installation.
 *
 * @returns {Object} Prettier info
 */
const getPrettierInfo = () => {
  const prettier = getPrettier();

  if (!prettier) {
    return {
      available: false,
      version: null,
    };
  }

  return {
    available: true,
    version: prettier.version || 'unknown',
  };
};

/**
 * Gets the default Prettier configuration.
 *
 * @returns {Object} Default configuration
 */
const getDefaultConfig = () => {
  return { ...DEFAULT_PRETTIER_CONFIG };
};

module.exports = {
  formatCode,
  formatCodeSync,
  isFormatted,
  loadProjectPrettierConfig,
  createPrettierConfig,
  mergeConfig,
  getDefaultConfig,
  getPrettierInfo,
  // Constants
  DEFAULT_PRETTIER_CONFIG,
};
