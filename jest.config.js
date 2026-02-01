/**
 * Jest configuration for GherkinLang compiler tests.
 */

export default {
  testEnvironment: 'node',
  testMatch: [
    '**/test/**/*.test.js',
    '**/test/**/*.spec.js',
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 10000,
  // ESM support
  transform: {},
  moduleFileExtensions: ['js', 'mjs', 'cjs', 'json'],
};
