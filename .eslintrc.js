/**
 * ESLint configuration for GherkinLang compiler project.
 * Defines linting rules for JavaScript code quality and consistency.
 */

module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  rules: {
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    'no-unused-vars': 'warn',
    'no-undef': 'error',
    'eqeqeq': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
  },
};
