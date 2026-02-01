/**
 * CLI constants and default configuration values.
 *
 * @module cli/constants
 */

/**
 * Default configuration file name.
 */
export const CONFIG_FILE_NAME = '.gherkinrc.json';

/**
 * Default output configuration.
 * @type {import('./types.js').OutputConfig}
 */
export const DEFAULT_OUTPUT_CONFIG = {
  dir: 'dist',
  testDir: 'test/generated',
  docsDir: 'docs/generated',
};

/**
 * Default cache configuration.
 * @type {import('./types.js').CacheConfig}
 */
export const DEFAULT_CACHE_CONFIG = {
  enabled: true,
  dir: '.gherkin-cache',
  maxSize: '100MB',
  ttl: '7d',
};

/**
 * Default validation configuration.
 * @type {import('./types.js').ValidationConfig}
 */
export const DEFAULT_VALIDATION_CONFIG = {
  syntax: true,
  purity: true,
  lint: true,
};

/**
 * Default AI configuration.
 * @type {import('./types.js').AIConfig}
 */
export const DEFAULT_AI_CONFIG = {
  model: 'claude-sonnet-4-20250514',
  maxRetries: 3,
  timeout: 60000,
};

/**
 * Default generation configuration.
 * @type {import('./types.js').GenerationConfig}
 */
export const DEFAULT_GENERATION_CONFIG = {
  jsdoc: true,
  tests: true,
  docs: true,
  prettier: true,
};

/**
 * Default watch configuration.
 * @type {import('./types.js').WatchConfig}
 */
export const DEFAULT_WATCH_CONFIG = {
  debounce: 100,
  ignore: ['node_modules', 'dist', '.gherkin-cache'],
};

/**
 * Complete default CLI configuration.
 * @type {import('./types.js').CLIConfiguration}
 */
export const DEFAULT_CONFIG = {
  target: 'javascript',
  moduleFormat: 'commonjs',
  output: DEFAULT_OUTPUT_CONFIG,
  cache: DEFAULT_CACHE_CONFIG,
  validation: DEFAULT_VALIDATION_CONFIG,
  ai: DEFAULT_AI_CONFIG,
  generation: DEFAULT_GENERATION_CONFIG,
  watch: DEFAULT_WATCH_CONFIG,
};

/**
 * Exit codes for CLI commands.
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  ERROR: 1,
  USAGE_ERROR: 2,
};

/**
 * Valid target languages.
 */
export const VALID_TARGETS = ['javascript', 'elixir'];

/**
 * Valid module formats.
 */
export const VALID_MODULE_FORMATS = ['commonjs', 'esm'];

/**
 * Valid template names for init command.
 */
export const VALID_TEMPLATES = ['basic', 'library', 'api'];

/**
 * File extension for GherkinLang source files.
 */
export const FEATURE_FILE_EXTENSION = '.feature';

/**
 * Glob pattern for discovering feature files.
 */
export const FEATURE_GLOB_PATTERN = '**/*.feature';

/**
 * Environment variable to detect CI environment.
 */
export const CI_ENV_VARS = ['CI', 'CONTINUOUS_INTEGRATION', 'BUILD_NUMBER', 'GITHUB_ACTIONS'];

/**
 * Check if running in CI environment.
 * @returns {boolean}
 */
export const isCI = () => {
  return CI_ENV_VARS.some((envVar) => process.env[envVar] === 'true' || process.env[envVar] === '1');
};

/**
 * Check if stdout is a TTY (interactive terminal).
 * @returns {boolean}
 */
export const isTTY = () => {
  return process.stdout.isTTY === true;
};

/**
 * Determine if colors should be enabled.
 * @param {boolean} [noColorFlag] - Explicit --no-color flag
 * @returns {boolean}
 */
export const shouldUseColor = (noColorFlag = false) => {
  if (noColorFlag) return false;
  if (process.env.NO_COLOR) return false;
  if (isCI()) return false;
  return isTTY();
};

/**
 * Determine if spinners should be enabled.
 * @param {boolean} [noColorFlag] - Explicit --no-color flag
 * @returns {boolean}
 */
export const shouldUseSpinner = (noColorFlag = false) => {
  if (noColorFlag) return false;
  if (isCI()) return false;
  return isTTY();
};
