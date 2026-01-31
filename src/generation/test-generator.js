/**
 * Test file generator for GherkinLang compiler.
 *
 * Automatically generates Jest test suites from compiled functions. Extracts
 * function signatures from JSDoc, generates edge case tests, type validation
 * tests, example-based tests from Gherkin examples, and property-based tests
 * where applicable.
 *
 * @module generation/test-generator
 */

const path = require('path');
const fs = require('fs').promises;
const { createEmptyTestSuite, createTestCase } = require('./types');
const { inferTypeFromName, inferReturnTypeFromName } = require('./formatters/jsdoc');

/**
 * @typedef {import('./types').GeneratedModule} GeneratedModule
 * @typedef {import('./types').GeneratedTestSuite} GeneratedTestSuite
 * @typedef {import('./types').TestCase} TestCase
 * @typedef {import('./types').ModuleExport} ModuleExport
 */

/**
 * @typedef {Object} TestGenerationContext
 * @property {GherkinExample[]} [examples] - Gherkin Examples tables
 * @property {Object.<string, Object.<string, string>>} [paramTypes] - Parameter types by function
 * @property {Object[]} [scenarios] - Scenarios from Gherkin source
 */

/**
 * @typedef {Object} GherkinExample
 * @property {string} [name] - Example table name
 * @property {string} functionName - Function the example applies to
 * @property {Object.<string, any>[]} rows - Example data rows
 */

/**
 * @typedef {Object} TestGenerateOptions
 * @property {string} [testDir] - Test output directory
 * @property {boolean} [includeTypeTests=true] - Generate type validation tests
 * @property {boolean} [includeEdgeCases=true] - Generate edge case tests
 * @property {boolean} [includeBoundaryTests=true] - Generate boundary tests
 * @property {boolean} [dryRun=false] - Generate without writing
 * @property {'commonjs' | 'esm'} [moduleFormat='commonjs'] - Module format for imports
 */

/**
 * @typedef {Object} InferredTypes
 * @property {Object.<string, string>} params - Parameter name to type
 * @property {string} returnType - Inferred return type
 * @property {number} confidence - Confidence score 0-1
 */

/**
 * Edge cases by type for generating edge case tests.
 * @type {Object.<string, Array<{value: any, description: string}>>}
 */
const EDGE_CASES_BY_TYPE = {
  number: [
    { value: 0, description: 'zero' },
    { value: -1, description: 'negative number' },
    { value: 1.5, description: 'decimal number' },
    { value: Number.MAX_SAFE_INTEGER, description: 'max safe integer' },
    { value: Number.MIN_SAFE_INTEGER, description: 'min safe integer' },
  ],
  string: [
    { value: '', description: 'empty string' },
    { value: ' ', description: 'whitespace only' },
    { value: 'a'.repeat(1000), description: 'very long string' },
    { value: '   trimmed   ', description: 'string with leading/trailing spaces' },
  ],
  array: [
    { value: [], description: 'empty array' },
    { value: [1], description: 'single element array' },
    { value: Array(100).fill(0), description: 'large array' },
  ],
  boolean: [
    { value: true, description: 'true' },
    { value: false, description: 'false' },
  ],
  object: [
    { value: {}, description: 'empty object' },
    { value: null, description: 'null' },
  ],
};

/**
 * Boundary test values for numeric parameters.
 * @type {Array<{value: number, description: string}>}
 */
const BOUNDARY_VALUES = [
  { value: 0, description: 'zero' },
  { value: -1, description: 'negative one' },
  { value: 1, description: 'positive one' },
  { value: -Infinity, description: 'negative infinity' },
  { value: Infinity, description: 'positive infinity' },
  { value: NaN, description: 'NaN' },
];

/**
 * Infers parameter and return types from function name and code.
 *
 * Uses heuristics based on function name patterns and parameter names
 * to infer types when explicit type annotations are not available.
 *
 * @param {string} functionName - Function name
 * @param {string} code - Function implementation code
 * @param {Object} [options] - Options
 * @param {string[]} [options.paramNames] - Parameter names if known
 * @returns {InferredTypes} Inferred parameter and return types
 */
const inferTypes = (functionName, code, options = {}) => {
  const { paramNames = [] } = options;

  // Infer return type from function name
  const returnType = inferReturnTypeFromName(functionName);

  // Infer parameter types from parameter names
  const params = {};
  let confidence = 0.5; // Base confidence

  // Extract parameter names from code if not provided
  let extractedParams = paramNames;
  if (extractedParams.length === 0) {
    extractedParams = extractParamNamesFromCode(code, functionName);
  }

  for (const paramName of extractedParams) {
    const inferredType = inferTypeFromName(paramName);
    params[paramName] = inferredType;

    // Increase confidence if we got a specific type
    if (inferredType !== '*') {
      confidence = Math.min(1, confidence + 0.1);
    }
  }

  // Analyze code for additional hints
  const codeHints = analyzeCodeForTypeHints(code);
  if (codeHints.hasArrayMethods) {
    confidence = Math.min(1, confidence + 0.1);
  }
  if (codeHints.hasMathOperations) {
    confidence = Math.min(1, confidence + 0.1);
  }

  return {
    params,
    returnType,
    confidence,
  };
};

/**
 * Extracts parameter names from function code.
 *
 * @param {string} code - Function code
 * @param {string} functionName - Function name to find
 * @returns {string[]} Parameter names
 */
const extractParamNamesFromCode = (code, functionName) => {
  const patterns = [
    // Arrow function: const fn = (a, b) => ...
    new RegExp(`(?:const|let|var)\\s+${functionName}\\s*=\\s*\\(([^)]*)\\)\\s*=>`),
    // Arrow function: const fn = a => ...
    new RegExp(`(?:const|let|var)\\s+${functionName}\\s*=\\s*(\\w+)\\s*=>`),
    // Function declaration: function fn(a, b) { ... }
    new RegExp(`function\\s+${functionName}\\s*\\(([^)]*)\\)`),
  ];

  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (match && match[1]) {
      const paramsStr = match[1].trim();
      if (!paramsStr) return [];

      // Handle single param without parens
      if (!paramsStr.includes(',') && !paramsStr.includes('(')) {
        return [paramsStr.trim()];
      }

      return paramsStr
        .split(',')
        .map((p) => p.trim().split('=')[0].trim())
        .filter((p) => p);
    }
  }

  return [];
};

/**
 * Analyzes code for type hints.
 *
 * @param {string} code - Function code
 * @returns {{hasArrayMethods: boolean, hasMathOperations: boolean, hasStringMethods: boolean}}
 */
const analyzeCodeForTypeHints = (code) => {
  const arrayMethods = /\.(map|filter|reduce|forEach|find|some|every|includes|indexOf)\(/;
  const mathOperations = /[\+\-\*\/\%]|Math\./;
  const stringMethods = /\.(split|join|trim|toLowerCase|toUpperCase|substring|slice|replace)\(/;

  return {
    hasArrayMethods: arrayMethods.test(code),
    hasMathOperations: mathOperations.test(code),
    hasStringMethods: stringMethods.test(code),
  };
};

/**
 * Generates example-based tests from Gherkin Examples table.
 *
 * @param {string} functionName - Function to test
 * @param {GherkinExample[]} examples - Examples from Gherkin
 * @param {string[]} [paramNames] - Parameter names in order
 * @returns {TestCase[]} Generated test cases
 */
const generateExampleTests = (functionName, examples, paramNames = []) => {
  const testCases = [];

  for (const example of examples) {
    if (!example.rows || example.rows.length === 0) continue;

    for (let i = 0; i < example.rows.length; i++) {
      const row = example.rows[i];

      // Extract inputs based on param names or all non-result keys
      const resultKeys = ['result', 'expected', 'output', 'returns'];
      const inputKeys = paramNames.length > 0
        ? paramNames
        : Object.keys(row).filter((k) => !resultKeys.includes(k.toLowerCase()));

      const inputs = inputKeys.map((k) => row[k]);

      // Find expected result
      const resultKey = Object.keys(row).find((k) =>
        resultKeys.includes(k.toLowerCase())
      );
      const expected = resultKey ? row[resultKey] : undefined;

      const inputStr = inputs.map((v) => formatValue(v)).join(', ');

      testCases.push(
        createTestCase({
          name: `should return ${formatValue(expected)} when given (${inputStr})`,
          category: 'example',
          functionName,
          inputs,
          expected,
          expectsError: false,
          description: example.name ? `${example.name} - row ${i + 1}` : `Example row ${i + 1}`,
        })
      );
    }
  }

  return testCases;
};

/**
 * Generates type validation tests for a function.
 *
 * @param {string} functionName - Function to test
 * @param {Object.<string, string>} paramTypes - Parameter name to type mapping
 * @param {string} returnType - Expected return type
 * @returns {TestCase[]} Generated test cases
 */
const generateTypeTests = (functionName, paramTypes, returnType) => {
  const testCases = [];
  const paramNames = Object.keys(paramTypes);

  // Generate tests for each parameter with wrong type
  for (const paramName of paramNames) {
    const expectedType = paramTypes[paramName];
    const wrongTypes = getWrongTypeValues(expectedType);

    for (const wrongType of wrongTypes) {
      // Create inputs with the wrong type for this param
      const inputs = paramNames.map((name) => {
        if (name === paramName) {
          return wrongType.value;
        }
        // Use a valid value for other params
        return getDefaultValue(paramTypes[name]);
      });

      testCases.push(
        createTestCase({
          name: `should handle ${wrongType.typeName} for parameter '${paramName}'`,
          category: 'type_validation',
          functionName,
          inputs,
          expected: undefined,
          expectsError: true,
          description: `Testing ${paramName} with ${wrongType.typeName} instead of ${expectedType}`,
        })
      );
    }
  }

  return testCases;
};

/**
 * Gets values of wrong types for testing.
 *
 * @param {string} expectedType - Expected type
 * @returns {Array<{value: any, typeName: string}>}
 */
const getWrongTypeValues = (expectedType) => {
  const allWrongTypes = [
    { value: 'string', typeName: 'string', forTypes: ['number', 'boolean', 'array', 'object'] },
    { value: 42, typeName: 'number', forTypes: ['string', 'boolean', 'array', 'object'] },
    { value: true, typeName: 'boolean', forTypes: ['number', 'string', 'array', 'object'] },
    { value: [], typeName: 'array', forTypes: ['number', 'string', 'boolean', 'object'] },
    { value: {}, typeName: 'object', forTypes: ['number', 'string', 'boolean', 'array'] },
    { value: null, typeName: 'null', forTypes: ['number', 'string', 'boolean', 'array'] },
    { value: undefined, typeName: 'undefined', forTypes: ['number', 'string', 'boolean', 'array', 'object'] },
  ];

  const normalizedType = expectedType.toLowerCase().replace('[]', '');

  return allWrongTypes
    .filter((wt) => wt.forTypes.includes(normalizedType))
    .slice(0, 3); // Limit to 3 wrong type tests per param
};

/**
 * Gets a default value for a type.
 *
 * @param {string} type - Type name
 * @returns {any}
 */
const getDefaultValue = (type) => {
  const normalized = type.toLowerCase().replace('[]', '');

  switch (normalized) {
    case 'number':
      return 1;
    case 'string':
      return 'test';
    case 'boolean':
      return true;
    case 'array':
      return [1, 2, 3];
    case 'object':
      return { key: 'value' };
    case 'function':
      return () => {};
    default:
      return null;
  }
};

/**
 * Generates edge case tests for a function.
 *
 * @param {string} functionName - Function to test
 * @param {Object.<string, string>} paramTypes - Parameter types
 * @returns {TestCase[]} Generated test cases
 */
const generateEdgeCaseTests = (functionName, paramTypes) => {
  const testCases = [];
  const paramNames = Object.keys(paramTypes);

  for (const paramName of paramNames) {
    const paramType = paramTypes[paramName].toLowerCase().replace('[]', '');
    const edgeCases = EDGE_CASES_BY_TYPE[paramType] || [];

    for (const edgeCase of edgeCases.slice(0, 3)) { // Limit to 3 per param
      // Create inputs with edge case value for this param
      const inputs = paramNames.map((name) => {
        if (name === paramName) {
          return edgeCase.value;
        }
        return getDefaultValue(paramTypes[name]);
      });

      testCases.push(
        createTestCase({
          name: `should handle ${edgeCase.description} for '${paramName}'`,
          category: 'edge_case',
          functionName,
          inputs,
          expected: undefined, // Edge cases don't have expected values
          expectsError: false,
          description: `Edge case: ${paramName} = ${edgeCase.description}`,
        })
      );
    }
  }

  return testCases;
};

/**
 * Generates boundary tests for numeric parameters.
 *
 * @param {string} functionName - Function to test
 * @param {Object.<string, string>} paramTypes - Parameter types
 * @returns {TestCase[]} Generated test cases
 */
const generateBoundaryTests = (functionName, paramTypes) => {
  const testCases = [];
  const paramNames = Object.keys(paramTypes);

  // Only generate boundary tests for numeric parameters
  const numericParams = paramNames.filter((name) =>
    paramTypes[name].toLowerCase() === 'number'
  );

  for (const paramName of numericParams) {
    for (const boundary of BOUNDARY_VALUES.slice(0, 4)) { // Limit
      const inputs = paramNames.map((name) => {
        if (name === paramName) {
          return boundary.value;
        }
        return getDefaultValue(paramTypes[name]);
      });

      testCases.push(
        createTestCase({
          name: `should handle ${boundary.description} for '${paramName}'`,
          category: 'boundary',
          functionName,
          inputs,
          expected: undefined,
          expectsError: false,
          description: `Boundary: ${paramName} = ${boundary.description}`,
        })
      );
    }
  }

  return testCases;
};

/**
 * Generates appropriate Jest assertion code for a test case.
 *
 * @param {TestCase} testCase - Test case
 * @returns {string} Jest assertion code
 */
const generateAssertion = (testCase) => {
  const { functionName, inputs, expected, expectsError } = testCase;

  const argsStr = inputs.map((v) => formatValueForCode(v)).join(', ');
  const call = `${functionName}(${argsStr})`;

  if (expectsError) {
    return `expect(() => ${call}).toThrow();`;
  }

  if (expected === undefined) {
    // For edge case/boundary tests without expected values
    return `expect(() => ${call}).not.toThrow();`;
  }

  // Choose appropriate matcher
  if (typeof expected === 'number' && !Number.isNaN(expected)) {
    if (Number.isFinite(expected)) {
      return `expect(${call}).toBe(${expected});`;
    }
    return `expect(${call}).toBe(${expected});`;
  }

  if (typeof expected === 'string') {
    return `expect(${call}).toBe(${formatValueForCode(expected)});`;
  }

  if (typeof expected === 'boolean') {
    return `expect(${call}).toBe(${expected});`;
  }

  if (Array.isArray(expected)) {
    return `expect(${call}).toEqual(${formatValueForCode(expected)});`;
  }

  if (typeof expected === 'object' && expected !== null) {
    return `expect(${call}).toEqual(${formatValueForCode(expected)});`;
  }

  if (expected === null) {
    return `expect(${call}).toBeNull();`;
  }

  return `expect(${call}).toBe(${formatValueForCode(expected)});`;
};

/**
 * Formats a value for display in test names.
 *
 * @param {any} value - Value to format
 * @returns {string}
 */
const formatValue = (value) => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') return '{...}';
  return String(value);
};

/**
 * Formats a value for use in code.
 *
 * @param {any} value - Value to format
 * @returns {string}
 */
const formatValueForCode = (value) => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'NaN';
    if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity';
    return String(value);
  }
  if (typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'function') return '() => {}';
  return String(value);
};

/**
 * Generates a describe block for a function's tests.
 *
 * @param {string} functionName - Function name
 * @param {TestCase[]} testCases - Test cases for the function
 * @returns {string} Generated describe block code
 */
const generateDescribeBlock = (functionName, testCases) => {
  const lines = [];

  lines.push(`  describe('${functionName}', () => {`);

  // Group by category
  const byCategory = {
    example: testCases.filter((t) => t.category === 'example'),
    type_validation: testCases.filter((t) => t.category === 'type_validation'),
    edge_case: testCases.filter((t) => t.category === 'edge_case'),
    boundary: testCases.filter((t) => t.category === 'boundary'),
  };

  // Examples
  if (byCategory.example.length > 0) {
    lines.push(`    describe('examples', () => {`);
    for (const testCase of byCategory.example) {
      lines.push(`      it('${escapeString(testCase.name)}', () => {`);
      lines.push(`        ${generateAssertion(testCase)}`);
      lines.push(`      });`);
      lines.push('');
    }
    lines.push(`    });`);
    lines.push('');
  }

  // Type validation
  if (byCategory.type_validation.length > 0) {
    lines.push(`    describe('type validation', () => {`);
    for (const testCase of byCategory.type_validation) {
      lines.push(`      it('${escapeString(testCase.name)}', () => {`);
      lines.push(`        ${generateAssertion(testCase)}`);
      lines.push(`      });`);
      lines.push('');
    }
    lines.push(`    });`);
    lines.push('');
  }

  // Edge cases
  if (byCategory.edge_case.length > 0) {
    lines.push(`    describe('edge cases', () => {`);
    for (const testCase of byCategory.edge_case) {
      lines.push(`      it('${escapeString(testCase.name)}', () => {`);
      lines.push(`        ${generateAssertion(testCase)}`);
      lines.push(`      });`);
      lines.push('');
    }
    lines.push(`    });`);
    lines.push('');
  }

  // Boundary tests
  if (byCategory.boundary.length > 0) {
    lines.push(`    describe('boundary values', () => {`);
    for (const testCase of byCategory.boundary) {
      lines.push(`      it('${escapeString(testCase.name)}', () => {`);
      lines.push(`        ${generateAssertion(testCase)}`);
      lines.push(`      });`);
      lines.push('');
    }
    lines.push(`    });`);
  }

  lines.push(`  });`);

  return lines.join('\n');
};

/**
 * Escapes a string for use in test names.
 *
 * @param {string} str - String to escape
 * @returns {string}
 */
const escapeString = (str) => {
  return str.replace(/'/g, "\\'").replace(/\n/g, '\\n');
};

/**
 * Generates import statement for the module under test.
 *
 * @param {string} modulePath - Path to module
 * @param {string[]} exportNames - Names of exports to import
 * @param {'commonjs' | 'esm'} [moduleFormat='commonjs'] - Module format
 * @returns {string} Import statement
 */
const generateImportStatement = (modulePath, exportNames, moduleFormat = 'commonjs') => {
  if (moduleFormat === 'esm') {
    return `import { ${exportNames.join(', ')} } from '${modulePath}';`;
  }

  return `const { ${exportNames.join(', ')} } = require('${modulePath}');`;
};

/**
 * Computes the test file path from a module path.
 *
 * @param {string} modulePath - Path to module (.js file)
 * @param {string} [testDir] - Test directory (defaults to same directory)
 * @returns {string} Test file path
 */
const computeTestPath = (modulePath, testDir) => {
  const dir = testDir || path.dirname(modulePath);
  const basename = path.basename(modulePath, '.js');
  return path.join(dir, `${basename}.test.js`);
};

/**
 * Creates a complete test file from test cases.
 *
 * @param {string} moduleName - Module name
 * @param {string} modulePath - Path to module
 * @param {string[]} exportNames - Export names
 * @param {TestCase[]} testCases - All test cases
 * @param {Object} [options] - Options
 * @param {'commonjs' | 'esm'} [options.moduleFormat='commonjs'] - Module format
 * @returns {string} Complete test file content
 */
const createTestFile = (moduleName, modulePath, exportNames, testCases, options = {}) => {
  const { moduleFormat = 'commonjs' } = options;

  const lines = [];

  // Header comment
  lines.push('/**');
  lines.push(` * Auto-generated tests for ${moduleName}`);
  lines.push(` * Source: ${modulePath}`);
  lines.push(` * Generated: ${new Date().toISOString()}`);
  lines.push(' */');
  lines.push('');

  // Import statement
  const relativePath = modulePath.startsWith('.')
    ? modulePath
    : `./${path.basename(modulePath)}`;
  lines.push(generateImportStatement(relativePath, exportNames, moduleFormat));
  lines.push('');

  // Main describe block
  lines.push(`describe('${moduleName}', () => {`);

  // Group test cases by function
  const byFunction = {};
  for (const testCase of testCases) {
    if (!byFunction[testCase.functionName]) {
      byFunction[testCase.functionName] = [];
    }
    byFunction[testCase.functionName].push(testCase);
  }

  // Generate describe blocks for each function
  for (const funcName of Object.keys(byFunction)) {
    lines.push(generateDescribeBlock(funcName, byFunction[funcName]));
    lines.push('');
  }

  lines.push('});');

  return lines.join('\n');
};

/**
 * Generates Jest test suite for a compiled module.
 *
 * @param {GeneratedModule} module - Generated module from generator
 * @param {TestGenerationContext} context - Test generation context
 * @param {TestGenerateOptions} [options={}] - Generation options
 * @returns {Promise<GeneratedTestSuite>} Generated test suite
 */
const generateTests = async (module, context, options = {}) => {
  const {
    testDir,
    includeTypeTests = true,
    includeEdgeCases = true,
    includeBoundaryTests = true,
    dryRun = false,
    moduleFormat = 'commonjs',
  } = options;

  const { examples = [], paramTypes = {}, scenarios = [] } = context;

  // Compute test path
  const testPath = computeTestPath(module.outputPath, testDir);

  // Create result structure
  const result = createEmptyTestSuite(module.outputPath, testPath);

  // Get export names
  const exportNames = module.exports.map((e) => e.name);

  // Generate test cases for each exported function
  const allTestCases = [];

  for (const exp of module.exports) {
    const funcName = exp.name;

    // Get param types for this function
    let funcParamTypes = paramTypes[funcName] || {};

    // If no param types provided, infer from export info or code
    if (Object.keys(funcParamTypes).length === 0) {
      if (exp.params && exp.params.length > 0) {
        funcParamTypes = {};
        for (const param of exp.params) {
          funcParamTypes[param.name] = param.type || inferTypeFromName(param.name);
        }
      } else {
        const inferred = inferTypes(funcName, module.code);
        funcParamTypes = inferred.params;
      }
    }

    // Get examples for this function
    const funcExamples = examples.filter((e) =>
      e.functionName === funcName ||
      e.name?.toLowerCase().includes(funcName.toLowerCase())
    );

    // Generate example tests
    if (funcExamples.length > 0) {
      const paramNames = Object.keys(funcParamTypes);
      const exampleTests = generateExampleTests(funcName, funcExamples, paramNames);
      allTestCases.push(...exampleTests);
    }

    // Generate type tests
    if (includeTypeTests && Object.keys(funcParamTypes).length > 0) {
      const typeTests = generateTypeTests(funcName, funcParamTypes, exp.returnType || '*');
      allTestCases.push(...typeTests);
    }

    // Generate edge case tests
    if (includeEdgeCases && Object.keys(funcParamTypes).length > 0) {
      const edgeTests = generateEdgeCaseTests(funcName, funcParamTypes);
      allTestCases.push(...edgeTests);
    }

    // Generate boundary tests
    if (includeBoundaryTests && Object.keys(funcParamTypes).length > 0) {
      const boundaryTests = generateBoundaryTests(funcName, funcParamTypes);
      allTestCases.push(...boundaryTests);
    }
  }

  result.testCases = allTestCases;

  // Get module name from path
  const moduleName = path.basename(module.outputPath, '.js');

  // Create test file content
  result.code = createTestFile(
    moduleName,
    module.outputPath,
    exportNames,
    allTestCases,
    { moduleFormat }
  );

  // Estimate coverage
  result.expectedCoverage = estimateCoverage(allTestCases, module.exports);

  // Write to disk if not dry run
  if (!dryRun) {
    const dir = path.dirname(testPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(testPath, result.code, 'utf8');
  }

  return result;
};

/**
 * Estimates test coverage based on test cases.
 *
 * @param {TestCase[]} testCases - Test cases
 * @param {ModuleExport[]} exports - Module exports
 * @returns {number} Estimated coverage percentage
 */
const estimateCoverage = (testCases, exports) => {
  if (exports.length === 0) return 0;

  // Base coverage per export
  const basePerExport = 100 / exports.length;

  let totalCoverage = 0;

  for (const exp of exports) {
    const testsForFunc = testCases.filter((t) => t.functionName === exp.name);

    if (testsForFunc.length === 0) {
      continue;
    }

    // Calculate coverage contribution
    let funcCoverage = 0;

    // Examples give 40% of function coverage
    const hasExamples = testsForFunc.some((t) => t.category === 'example');
    if (hasExamples) funcCoverage += 40;

    // Type tests give 20%
    const hasTypeTests = testsForFunc.some((t) => t.category === 'type_validation');
    if (hasTypeTests) funcCoverage += 20;

    // Edge cases give 25%
    const hasEdgeCases = testsForFunc.some((t) => t.category === 'edge_case');
    if (hasEdgeCases) funcCoverage += 25;

    // Boundary tests give 15%
    const hasBoundary = testsForFunc.some((t) => t.category === 'boundary');
    if (hasBoundary) funcCoverage += 15;

    totalCoverage += (funcCoverage / 100) * basePerExport;
  }

  return Math.min(100, Math.round(totalCoverage));
};

module.exports = {
  generateTests,
  generateExampleTests,
  generateTypeTests,
  generateEdgeCaseTests,
  generateBoundaryTests,
  generateAssertion,
  generateDescribeBlock,
  generateImportStatement,
  createTestFile,
  computeTestPath,
  inferTypes,
  // Utilities for testing
  extractParamNamesFromCode,
  analyzeCodeForTypeHints,
  formatValue,
  formatValueForCode,
  escapeString,
  estimateCoverage,
  getDefaultValue,
  getWrongTypeValues,
  // Constants
  EDGE_CASES_BY_TYPE,
  BOUNDARY_VALUES,
};
