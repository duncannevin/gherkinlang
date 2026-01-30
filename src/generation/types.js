/**
 * Type definitions for GherkinLang code generation.
 *
 * Provides JSDoc type definitions for generated modules, exports,
 * test suites, and test cases used across the generation system.
 *
 * @module generation/types
 */

/**
 * @typedef {Object} ParamInfo
 * @property {string} name - Parameter name
 * @property {string} type - Inferred or declared type
 * @property {string} [description] - Parameter description from Gherkin
 * @property {boolean} [optional] - Whether parameter is optional
 * @property {*} [defaultValue] - Default value if optional
 */

/**
 * @typedef {Object} ModuleImport
 * @property {string} source - Module path to import from
 * @property {string[]} [named] - Named imports
 * @property {string} [default] - Default import name
 * @property {boolean} [namespace] - Whether to use namespace import
 */

/**
 * @typedef {Object} ModuleExport
 * @property {string} name - Function name
 * @property {'default' | 'named'} exportType - Export type
 * @property {string} jsdoc - Generated JSDoc comment
 * @property {ParamInfo[]} params - Parameter information
 * @property {string} returnType - Return type
 * @property {string} [description] - Function description
 */

/**
 * @typedef {Object} GeneratedModule
 * @property {string} sourcePath - Original .feature file path
 * @property {string} outputPath - Generated .js file path
 * @property {string} code - Generated JavaScript code
 * @property {string} formattedCode - Prettier-formatted code
 * @property {boolean} formatted - Whether formatting succeeded
 * @property {string} [formatWarning] - Warning if formatting failed
 * @property {ModuleExport[]} exports - Exported functions
 * @property {ModuleImport[]} imports - Required imports
 */

/**
 * @typedef {Object} TestCase
 * @property {string} name - Test case name
 * @property {'example' | 'type_validation' | 'edge_case' | 'boundary'} category
 * @property {string} functionName - Function being tested
 * @property {any[]} inputs - Test inputs
 * @property {any} expected - Expected output or error
 * @property {boolean} expectsError - Whether test expects an error
 * @property {string} [description] - Test case description
 */

/**
 * @typedef {Object} GeneratedTestSuite
 * @property {string} sourcePath - Path to module being tested
 * @property {string} testPath - Path to generated test file
 * @property {string} code - Generated test code
 * @property {TestCase[]} testCases - Individual test cases
 * @property {number} expectedCoverage - Estimated coverage percentage
 */

/**
 * @typedef {Object} GenerationOptions
 * @property {'commonjs' | 'esm'} [moduleType='commonjs'] - Module format
 * @property {boolean} [includeJsdoc=true] - Whether to include JSDoc comments
 * @property {boolean} [format=true] - Whether to format with Prettier
 * @property {string} [outputDir] - Output directory path
 * @property {Object} [prettierConfig] - Custom Prettier configuration
 */

/**
 * @typedef {Object} TestGenerationOptions
 * @property {'jest' | 'mocha' | 'vitest'} [framework='jest'] - Test framework
 * @property {boolean} [includeEdgeCases=true] - Generate edge case tests
 * @property {boolean} [includeBoundaryTests=true] - Generate boundary tests
 * @property {boolean} [includeTypeTests=true] - Generate type validation tests
 * @property {string} [testDir] - Test output directory
 */

/**
 * Valid test case categories.
 * @type {readonly ['example', 'type_validation', 'edge_case', 'boundary']}
 */
const TEST_CATEGORIES = Object.freeze([
  'example',
  'type_validation',
  'edge_case',
  'boundary',
]);

/**
 * Valid module export types.
 * @type {readonly ['default', 'named']}
 */
const EXPORT_TYPES = Object.freeze(['default', 'named']);

/**
 * Valid module format types.
 * @type {readonly ['commonjs', 'esm']}
 */
const MODULE_TYPES = Object.freeze(['commonjs', 'esm']);

/**
 * Supported test frameworks.
 * @type {readonly ['jest', 'mocha', 'vitest']}
 */
const TEST_FRAMEWORKS = Object.freeze(['jest', 'mocha', 'vitest']);

/**
 * Creates an empty generated module structure.
 *
 * @param {string} sourcePath - Original .feature file path
 * @param {string} outputPath - Generated .js file path
 * @returns {GeneratedModule} An empty generated module
 */
const createEmptyModule = (sourcePath, outputPath) => ({
  sourcePath,
  outputPath,
  code: '',
  formattedCode: '',
  formatted: false,
  exports: [],
  imports: [],
});

/**
 * Creates an empty test suite structure.
 *
 * @param {string} sourcePath - Path to module being tested
 * @param {string} testPath - Path to generated test file
 * @returns {GeneratedTestSuite} An empty test suite
 */
const createEmptyTestSuite = (sourcePath, testPath) => ({
  sourcePath,
  testPath,
  code: '',
  testCases: [],
  expectedCoverage: 0,
});

/**
 * Creates a test case object.
 *
 * @param {Object} options - Test case options
 * @param {string} options.name - Test case name
 * @param {'example' | 'type_validation' | 'edge_case' | 'boundary'} options.category - Category
 * @param {string} options.functionName - Function being tested
 * @param {any[]} [options.inputs=[]] - Test inputs
 * @param {any} [options.expected] - Expected output
 * @param {boolean} [options.expectsError=false] - Whether test expects an error
 * @param {string} [options.description] - Test case description
 * @returns {TestCase} The test case object
 */
const createTestCase = ({
  name,
  category,
  functionName,
  inputs = [],
  expected,
  expectsError = false,
  description,
}) => {
  if (!TEST_CATEGORIES.includes(category)) {
    throw new Error(
      `Invalid test category: ${category}. Must be one of: ${TEST_CATEGORIES.join(', ')}`
    );
  }

  const testCase = {
    name,
    category,
    functionName,
    inputs,
    expected,
    expectsError,
  };

  if (description !== undefined) {
    testCase.description = description;
  }

  return testCase;
};

/**
 * Creates a module export object.
 *
 * @param {Object} options - Export options
 * @param {string} options.name - Function name
 * @param {'default' | 'named'} [options.exportType='named'] - Export type
 * @param {string} [options.jsdoc=''] - JSDoc comment
 * @param {ParamInfo[]} [options.params=[]] - Parameter information
 * @param {string} [options.returnType='*'] - Return type
 * @param {string} [options.description] - Function description
 * @returns {ModuleExport} The module export object
 */
const createModuleExport = ({
  name,
  exportType = 'named',
  jsdoc = '',
  params = [],
  returnType = '*',
  description,
}) => {
  if (!EXPORT_TYPES.includes(exportType)) {
    throw new Error(
      `Invalid export type: ${exportType}. Must be one of: ${EXPORT_TYPES.join(', ')}`
    );
  }

  const moduleExport = {
    name,
    exportType,
    jsdoc,
    params,
    returnType,
  };

  if (description !== undefined) {
    moduleExport.description = description;
  }

  return moduleExport;
};

module.exports = {
  TEST_CATEGORIES,
  EXPORT_TYPES,
  MODULE_TYPES,
  TEST_FRAMEWORKS,
  createEmptyModule,
  createEmptyTestSuite,
  createTestCase,
  createModuleExport,
};
