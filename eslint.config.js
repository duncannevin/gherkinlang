/**
 * ESLint flat configuration for GherkinLang compiler project.
 * Defines linting rules for JavaScript code quality and consistency.
 *
 * @see https://eslint.org/docs/latest/use/configure/configuration-files
 */

const js = require('@eslint/js');

module.exports = [
  // Apply recommended rules
  js.configs.recommended,

  // Global configuration
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Node.js globals
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        // Jest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
    },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      eqeqeq: 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
    },
  },

  // Ignores (replaces .eslintignore)
  {
    ignores: [
      // Dependencies
      'node_modules/',

      // Build output
      'dist/',
      'build/',
      '*.min.js',

      // Test coverage
      'coverage/',
      '.nyc_output/',

      // Cache
      '.gherkin-cache/',

      // Generated files
      'test/generated/',

      // Logs
      '*.log',

      // Scratch files
      'scratch.js',
      'phase5-scratch.js',
    ],
  },
];
