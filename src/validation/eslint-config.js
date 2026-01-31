/**
 * ESLint configuration and validation for GherkinLang compiler.
 *
 * Provides ESLint-based linting for generated JavaScript code using the
 * ESLint programmatic API. Enforces rules such as no-var, prefer-const,
 * prefer-arrow-callback, no-unused-vars, and functional programming rules
 * from eslint-plugin-functional.
 *
 * @module validation/eslint-config
 */

const { ESLint } = require('eslint');
const { DEFAULT_ESLINT_RULES } = require('./constants');
const { getCodeSnippet } = require('./types');

/**
 * @typedef {import('./types').LintCheckResult} LintCheckResult
 * @typedef {import('./types').LintViolation} LintViolation
 * @typedef {import('./types').ErrorLocation} ErrorLocation
 */

/**
 * @typedef {Object} LintOptions
 * @property {string} [filename='code.js'] - Virtual filename for error reporting
 * @property {Object} [eslintConfig] - Custom ESLint config to merge with defaults
 * @property {Object.<string, string|Array>} [rules] - Additional rules to apply
 * @property {boolean} [useProjectConfig=false] - Whether to load project .eslintrc
 */

/**
 * Default ESLint configuration for validating generated code.
 * Uses flat config format (ESLint 9.x).
 *
 * @type {Object[]}
 */
const DEFAULT_ESLINT_CONFIG = [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        // Node.js globals (read-only)
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        // Browser globals (read-only, for detection purposes)
        console: 'readonly',
        window: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        // Common globals
        Promise: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        Symbol: 'readonly',
        BigInt: 'readonly',
        globalThis: 'readonly',
      },
    },
    rules: {
      // Required by constitution (T021)
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Additional quality rules
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-param-reassign': 'error',
    },
  },
];

/**
 * Cached functional plugin instance.
 * @type {Object|null}
 */
let functionalPluginCache = null;

/**
 * Get the eslint-plugin-functional plugin.
 * Handles both ESM default export and CommonJS exports.
 * Uses lazy loading to avoid issues with Jest.
 *
 * @returns {Object} The functional plugin
 */
const getFunctionalPlugin = () => {
  if (functionalPluginCache) {
    return functionalPluginCache;
  }

  try {
    const functional = require('eslint-plugin-functional');
    functionalPluginCache = functional.default || functional;
    return functionalPluginCache;
  } catch {
    // If plugin can't be loaded (e.g., in Jest), return a stub
    return {
      rules: {},
    };
  }
};

/**
 * Creates ESLint configuration with eslint-plugin-functional rules (T022).
 * These rules enforce functional programming patterns.
 *
 * @returns {Object[]} Functional ESLint config array
 */
const createFunctionalEslintConfig = () => {
  const plugin = getFunctionalPlugin();

  // Check if the plugin has the required rules
  const hasRules = plugin.rules && Object.keys(plugin.rules).length > 0;

  if (!hasRules) {
    // Return empty config if plugin couldn't be loaded
    return [];
  }

  return [
    {
      plugins: {
        functional: plugin,
      },
      rules: {
        // Functional programming rules (T022)
        'functional/immutable-data': [
          'error',
          {
            // Allow module.exports and exports.* for CommonJS modules
            ignoreAccessorPattern: ['module.exports', 'exports.*'],
          },
        ],
        'functional/no-loop-statements': 'error',
        'functional/no-this-expressions': 'error',
      },
    },
  ];
};

/**
 * ESLint configuration with eslint-plugin-functional rules (T022).
 * Lazily evaluated to avoid ESM issues during testing.
 *
 * @type {Object[]}
 */
const FUNCTIONAL_ESLINT_CONFIG = [];

/**
 * Creates an ESLint configuration by merging defaults with custom options.
 *
 * @param {LintOptions} [options={}] - Lint options
 * @returns {Object[]} Merged ESLint flat config array
 */
const createEslintConfig = (options = {}) => {
  const { eslintConfig = {}, rules = {} } = options;

  // Start with default config
  const config = [...DEFAULT_ESLINT_CONFIG];

  // Add functional plugin config (lazy loaded)
  const functionalConfig = createFunctionalEslintConfig();
  config.push(...functionalConfig);

  // Apply custom rules if provided (T023)
  if (Object.keys(rules).length > 0) {
    config.push({
      rules,
    });
  }

  // Apply custom ESLint config if provided (T023)
  if (Object.keys(eslintConfig).length > 0) {
    config.push(eslintConfig);
  }

  return config;
};

/**
 * Converts ESLint severity number to string.
 *
 * @param {number} severity - ESLint severity (1 = warning, 2 = error)
 * @returns {'error' | 'warning'} Severity string
 */
const convertSeverity = (severity) => {
  return severity === 2 ? 'error' : 'warning';
};

/**
 * Creates a lint violation object from an ESLint message.
 *
 * @param {Object} message - ESLint message object
 * @param {string} code - Original source code
 * @param {string} [filename] - Virtual filename
 * @returns {LintViolation} Lint violation object
 */
const createLintViolation = (message, code, filename) => {
  const location = {
    line: message.line || 1,
    column: (message.column || 1) - 1, // ESLint uses 1-indexed columns, we use 0-indexed
    ...(filename && { file: filename }),
    ...(message.endLine && { endLine: message.endLine }),
    ...(message.endColumn && { endColumn: message.endColumn - 1 }),
  };

  const snippet = getCodeSnippet(code, location, { contextLines: 1 });

  return {
    rule: message.ruleId || 'unknown',
    severity: convertSeverity(message.severity),
    message: message.message,
    location,
    ...(snippet && { code: snippet }),
    ...(message.fix && {
      fix: `Replace with: ${code.substring(message.fix.range[0], message.fix.range[1])}`,
    }),
  };
};

/**
 * Validates JavaScript code against ESLint rules.
 *
 * Uses the ESLint programmatic API to lint code in-memory without writing
 * to disk. Applies default rules plus optional custom configuration.
 * Does NOT auto-fix; returns violations for AI retry.
 *
 * @param {string} code - JavaScript code to validate
 * @param {LintOptions} [options={}] - Lint validation options
 * @returns {Promise<LintCheckResult>} Lint check result
 *
 * @example
 * // Valid code passes
 * const result = await validateLint('const add = (a, b) => a + b;');
 * console.log(result.valid); // true
 *
 * @example
 * // Code with violations
 * const result = await validateLint('var x = 1;');
 * console.log(result.valid); // false
 * console.log(result.violations[0].rule); // 'no-var'
 *
 * @example
 * // With custom rules
 * const result = await validateLint(code, {
 *   rules: { 'no-console': 'off' }
 * });
 */
const validateLint = async (code, options = {}) => {
  const { filename = 'code.js' } = options;

  /** @type {LintViolation[]} */
  const violations = [];
  let errorCount = 0;
  let warningCount = 0;

  try {
    // Create ESLint configuration
    const eslintConfig = createEslintConfig(options);

    // Create ESLint instance with flat config
    const eslint = new ESLint({
      overrideConfigFile: true, // Ignore any project config files
      overrideConfig: eslintConfig,
      fix: false, // Never auto-fix
    });

    // Lint the code in memory
    const results = await eslint.lintText(code, {
      filePath: filename,
    });

    // Process results
    if (results.length > 0) {
      const result = results[0];

      errorCount = result.errorCount;
      warningCount = result.warningCount;

      // Convert ESLint messages to our violation format
      for (const message of result.messages) {
        violations.push(createLintViolation(message, code, filename));
      }
    }
  } catch (error) {
    // Wrap ESLint errors as violations
    violations.push({
      rule: 'eslint-error',
      severity: 'error',
      message: `ESLint configuration error: ${error.message}`,
      location: { line: 1, column: 0, ...(filename && { file: filename }) },
    });
    errorCount = 1;
  }

  return {
    valid: errorCount === 0,
    violations,
    errorCount,
    warningCount,
  };
};

/**
 * Gets the default ESLint rules used by the validator.
 *
 * @returns {Object.<string, string|Array>} Default ESLint rules
 */
const getDefaultRules = () => {
  return { ...DEFAULT_ESLINT_RULES };
};

/**
 * Creates a custom lint configuration with overrides.
 *
 * @param {Object.<string, string|Array>} overrides - Rules to override
 * @returns {Object.<string, string|Array>} Merged rules
 */
const createCustomRules = (overrides) => {
  return {
    ...DEFAULT_ESLINT_RULES,
    ...overrides,
  };
};

/**
 * Gets all rules from default and functional configs.
 *
 * @returns {Object.<string, string|Array>} All rules
 */
const getAllRules = () => {
  const functionalConfig = createFunctionalEslintConfig();
  const functionalRules = functionalConfig[0]?.rules || {};

  return {
    ...DEFAULT_ESLINT_CONFIG[0].rules,
    ...functionalRules,
  };
};

/**
 * Checks if a specific ESLint rule is enabled in the default config.
 *
 * @param {string} ruleName - Name of the ESLint rule
 * @returns {boolean} Whether the rule is enabled
 */
const isRuleEnabled = (ruleName) => {
  const rules = getAllRules();

  const rule = rules[ruleName];
  if (!rule) return false;

  const severity = Array.isArray(rule) ? rule[0] : rule;
  return severity === 'error' || severity === 'warn' || severity === 2 || severity === 1;
};

/**
 * Lists all enabled rules in the default configuration.
 *
 * @returns {string[]} Array of enabled rule names
 */
const listEnabledRules = () => {
  const allRules = getAllRules();

  return Object.keys(allRules).filter((ruleName) => {
    const rule = allRules[ruleName];
    const severity = Array.isArray(rule) ? rule[0] : rule;
    return severity === 'error' || severity === 'warn' || severity === 2 || severity === 1;
  });
};

module.exports = {
  validateLint,
  getDefaultRules,
  createCustomRules,
  isRuleEnabled,
  listEnabledRules,
  // Export for testing
  createEslintConfig,
  createLintViolation,
  convertSeverity,
  DEFAULT_ESLINT_CONFIG,
  createFunctionalEslintConfig,
  getFunctionalPlugin,
};
