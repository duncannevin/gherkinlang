/**
 * Unit tests for the test generator module.
 *
 * @module test/unit/generation/test-generator
 */

const path = require('path');
const os = require('os');
const fs = require('fs').promises;

const {
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
  extractParamNamesFromCode,
  analyzeCodeForTypeHints,
  formatValue,
  formatValueForCode,
  escapeString,
  estimateCoverage,
  getDefaultValue,
  getWrongTypeValues,
  EDGE_CASES_BY_TYPE,
  BOUNDARY_VALUES,
} = require('../../../src/generation/test-generator');

describe('inferTypes', () => {
  it('should infer return type from function name', () => {
    const result = inferTypes('add', 'const add = (a, b) => a + b;');

    expect(result.returnType).toBe('number');
  });

  it('should infer param types from param names', () => {
    const result = inferTypes('doSomething', 'const doSomething = (count, text) => {};', {
      paramNames: ['count', 'text'],
    });

    expect(result.params.count).toBe('number');
    expect(result.params.text).toBe('string');
  });

  it('should extract param names from arrow function code', () => {
    const result = inferTypes('add', 'const add = (a, b) => a + b;');

    expect(Object.keys(result.params)).toContain('a');
    expect(Object.keys(result.params)).toContain('b');
  });

  it('should extract param names from function declaration', () => {
    const result = inferTypes('multiply', 'function multiply(x, y) { return x * y; }');

    expect(Object.keys(result.params)).toContain('x');
    expect(Object.keys(result.params)).toContain('y');
  });

  it('should return confidence score', () => {
    const result = inferTypes('add', 'const add = (a, b) => a + b;');

    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

describe('extractParamNamesFromCode', () => {
  it('should extract from arrow function with parens', () => {
    const code = 'const add = (a, b) => a + b;';
    const result = extractParamNamesFromCode(code, 'add');

    expect(result).toEqual(['a', 'b']);
  });

  it('should extract from arrow function without parens', () => {
    const code = 'const double = x => x * 2;';
    const result = extractParamNamesFromCode(code, 'double');

    expect(result).toEqual(['x']);
  });

  it('should extract from function declaration', () => {
    const code = 'function greet(name, greeting) { return greeting + name; }';
    const result = extractParamNamesFromCode(code, 'greet');

    expect(result).toEqual(['name', 'greeting']);
  });

  it('should return empty array if not found', () => {
    const code = 'const x = 1;';
    const result = extractParamNamesFromCode(code, 'add');

    expect(result).toEqual([]);
  });

  it('should handle params with default values', () => {
    const code = 'const greet = (name, prefix = "Hello") => prefix + name;';
    const result = extractParamNamesFromCode(code, 'greet');

    expect(result).toContain('name');
    expect(result).toContain('prefix');
  });
});

describe('analyzeCodeForTypeHints', () => {
  it('should detect array methods', () => {
    const code = 'arr.map(x => x * 2).filter(x => x > 0)';
    const result = analyzeCodeForTypeHints(code);

    expect(result.hasArrayMethods).toBe(true);
  });

  it('should detect math operations', () => {
    const code = 'const result = a + b * c / d;';
    const result = analyzeCodeForTypeHints(code);

    expect(result.hasMathOperations).toBe(true);
  });

  it('should detect string methods', () => {
    const code = 'str.split(",").join("-").trim()';
    const result = analyzeCodeForTypeHints(code);

    expect(result.hasStringMethods).toBe(true);
  });
});

describe('generateExampleTests', () => {
  it('should generate tests from example rows', () => {
    const examples = [{
      name: 'Addition examples',
      functionName: 'add',
      rows: [
        { a: 1, b: 2, result: 3 },
        { a: 5, b: 3, result: 8 },
      ],
    }];

    const tests = generateExampleTests('add', examples, ['a', 'b']);

    expect(tests).toHaveLength(2);
    expect(tests[0].category).toBe('example');
    expect(tests[0].functionName).toBe('add');
    expect(tests[0].inputs).toEqual([1, 2]);
    expect(tests[0].expected).toBe(3);
  });

  it('should detect result key in various formats', () => {
    const examples = [{
      functionName: 'fn',
      rows: [{ x: 1, expected: 10 }],
    }];

    const tests = generateExampleTests('fn', examples, ['x']);

    expect(tests[0].expected).toBe(10);
  });

  it('should handle empty examples', () => {
    const tests = generateExampleTests('fn', [], ['x']);

    expect(tests).toHaveLength(0);
  });
});

describe('generateTypeTests', () => {
  it('should generate wrong-type tests for each parameter', () => {
    const tests = generateTypeTests('add', { a: 'number', b: 'number' }, 'number');

    expect(tests.length).toBeGreaterThan(0);
    expect(tests.every((t) => t.category === 'type_validation')).toBe(true);
    expect(tests.every((t) => t.expectsError)).toBe(true);
  });

  it('should test with wrong types', () => {
    const tests = generateTypeTests('fn', { text: 'string' }, 'string');

    // Should include tests with non-string inputs
    const testInputTypes = tests.map((t) => typeof t.inputs[0]);
    expect(testInputTypes.some((t) => t === 'number' || t === 'boolean')).toBe(true);
  });
});

describe('generateEdgeCaseTests', () => {
  it('should generate edge case tests for numbers', () => {
    const tests = generateEdgeCaseTests('fn', { count: 'number' });

    expect(tests.length).toBeGreaterThan(0);
    expect(tests.every((t) => t.category === 'edge_case')).toBe(true);

    // Should include zero edge case
    const hasZero = tests.some((t) => t.inputs.includes(0));
    expect(hasZero).toBe(true);
  });

  it('should generate edge case tests for strings', () => {
    const tests = generateEdgeCaseTests('fn', { text: 'string' });

    expect(tests.length).toBeGreaterThan(0);

    // Should include empty string edge case
    const hasEmpty = tests.some((t) => t.inputs.includes(''));
    expect(hasEmpty).toBe(true);
  });

  it('should generate edge case tests for arrays', () => {
    const tests = generateEdgeCaseTests('fn', { items: 'array' });

    expect(tests.length).toBeGreaterThan(0);

    // Should include empty array edge case
    const hasEmpty = tests.some((t) =>
      t.inputs.some((i) => Array.isArray(i) && i.length === 0)
    );
    expect(hasEmpty).toBe(true);
  });
});

describe('generateBoundaryTests', () => {
  it('should generate boundary tests for numeric parameters', () => {
    const tests = generateBoundaryTests('fn', { num: 'number' });

    expect(tests.length).toBeGreaterThan(0);
    expect(tests.every((t) => t.category === 'boundary')).toBe(true);
  });

  it('should not generate boundary tests for non-numeric parameters', () => {
    const tests = generateBoundaryTests('fn', { text: 'string' });

    expect(tests).toHaveLength(0);
  });

  it('should include special numeric values', () => {
    const tests = generateBoundaryTests('fn', { x: 'number' });

    const values = tests.map((t) => t.inputs[0]);
    expect(values).toContain(0);
    expect(values).toContain(-1);
  });
});

describe('generateAssertion', () => {
  it('should generate toBe for number expected', () => {
    const testCase = {
      functionName: 'add',
      inputs: [1, 2],
      expected: 3,
      expectsError: false,
    };

    const result = generateAssertion(testCase);

    expect(result).toContain('expect(add(1, 2)).toBe(3)');
  });

  it('should generate toBe for string expected', () => {
    const testCase = {
      functionName: 'greet',
      inputs: ['World'],
      expected: 'Hello, World',
      expectsError: false,
    };

    const result = generateAssertion(testCase);

    expect(result).toContain('expect(greet("World")).toBe("Hello, World")');
  });

  it('should generate toThrow for error expected', () => {
    const testCase = {
      functionName: 'fn',
      inputs: ['invalid'],
      expected: undefined,
      expectsError: true,
    };

    const result = generateAssertion(testCase);

    expect(result).toContain('toThrow()');
  });

  it('should generate toEqual for array expected', () => {
    const testCase = {
      functionName: 'getItems',
      inputs: [],
      expected: [1, 2, 3],
      expectsError: false,
    };

    const result = generateAssertion(testCase);

    expect(result).toContain('toEqual([1,2,3])');
  });

  it('should generate not.toThrow for edge cases without expected', () => {
    const testCase = {
      functionName: 'fn',
      inputs: [0],
      expected: undefined,
      expectsError: false,
    };

    const result = generateAssertion(testCase);

    expect(result).toContain('not.toThrow()');
  });
});

describe('generateDescribeBlock', () => {
  it('should create describe block with function name', () => {
    const testCases = [{
      name: 'test 1',
      category: 'example',
      functionName: 'add',
      inputs: [1, 2],
      expected: 3,
      expectsError: false,
    }];

    const result = generateDescribeBlock('add', testCases);

    expect(result).toContain("describe('add'");
    expect(result).toContain("describe('examples'");
    expect(result).toContain("it('test 1'");
  });

  it('should group by category', () => {
    const testCases = [
      { name: 'example test', category: 'example', functionName: 'fn', inputs: [], expected: 1, expectsError: false },
      { name: 'edge test', category: 'edge_case', functionName: 'fn', inputs: [], expected: undefined, expectsError: false },
    ];

    const result = generateDescribeBlock('fn', testCases);

    expect(result).toContain("describe('examples'");
    expect(result).toContain("describe('edge cases'");
  });
});

describe('generateImportStatement', () => {
  it('should generate CommonJS require', () => {
    const result = generateImportStatement('./module', ['add', 'sub'], 'commonjs');

    expect(result).toContain("require('./module')");
    expect(result).toContain('{ add, sub }');
  });

  it('should generate ESM import', () => {
    const result = generateImportStatement('./module', ['add', 'sub'], 'esm');

    expect(result).toContain("import { add, sub }");
    expect(result).toContain("from './module'");
  });
});

describe('computeTestPath', () => {
  it('should convert .js to .test.js', () => {
    const result = computeTestPath('/src/module.js');

    expect(result).toBe(path.join('/src', 'module.test.js'));
  });

  it('should use custom test directory', () => {
    const result = computeTestPath('/src/module.js', '/tests');

    expect(result).toBe(path.join('/tests', 'module.test.js'));
  });
});

describe('createTestFile', () => {
  it('should create complete test file', () => {
    const testCases = [{
      name: 'should return 3',
      category: 'example',
      functionName: 'add',
      inputs: [1, 2],
      expected: 3,
      expectsError: false,
    }];

    const result = createTestFile('math', './math.js', ['add'], testCases);

    expect(result).toContain('Auto-generated tests for math');
    expect(result).toContain("require('./math.js')");
    expect(result).toContain("describe('math'");
    expect(result).toContain("describe('add'");
  });

  it('should include imports for all exports', () => {
    const result = createTestFile('module', './mod.js', ['fn1', 'fn2'], []);

    expect(result).toContain('fn1, fn2');
  });
});

describe('formatValue', () => {
  it('should format strings with quotes', () => {
    expect(formatValue('hello')).toBe('"hello"');
  });

  it('should format numbers', () => {
    expect(formatValue(42)).toBe('42');
  });

  it('should format null and undefined', () => {
    expect(formatValue(null)).toBe('null');
    expect(formatValue(undefined)).toBe('undefined');
  });

  it('should format arrays briefly', () => {
    expect(formatValue([1, 2, 3])).toBe('[3 items]');
  });
});

describe('formatValueForCode', () => {
  it('should format strings as JSON', () => {
    expect(formatValueForCode('hello')).toBe('"hello"');
  });

  it('should format NaN', () => {
    expect(formatValueForCode(NaN)).toBe('NaN');
  });

  it('should format Infinity', () => {
    expect(formatValueForCode(Infinity)).toBe('Infinity');
    expect(formatValueForCode(-Infinity)).toBe('-Infinity');
  });

  it('should format arrays as JSON', () => {
    expect(formatValueForCode([1, 2])).toBe('[1,2]');
  });
});

describe('escapeString', () => {
  it('should escape single quotes', () => {
    expect(escapeString("it's")).toBe("it\\'s");
  });

  it('should escape newlines', () => {
    expect(escapeString('line1\nline2')).toBe('line1\\nline2');
  });
});

describe('getDefaultValue', () => {
  it('should return 1 for number', () => {
    expect(getDefaultValue('number')).toBe(1);
  });

  it('should return "test" for string', () => {
    expect(getDefaultValue('string')).toBe('test');
  });

  it('should return array for array type', () => {
    expect(Array.isArray(getDefaultValue('array'))).toBe(true);
  });

  it('should handle array notation', () => {
    expect(getDefaultValue('number[]')).toBe(1);
  });
});

describe('getWrongTypeValues', () => {
  it('should return non-number types for number', () => {
    const result = getWrongTypeValues('number');

    expect(result.some((v) => typeof v.value === 'string')).toBe(true);
    expect(result.some((v) => typeof v.value === 'boolean')).toBe(true);
  });

  it('should return non-string types for string', () => {
    const result = getWrongTypeValues('string');

    expect(result.some((v) => typeof v.value === 'number')).toBe(true);
  });
});

describe('estimateCoverage', () => {
  it('should return 0 for no exports', () => {
    const result = estimateCoverage([], []);
    expect(result).toBe(0);
  });

  it('should increase coverage with more test categories', () => {
    const exports = [{ name: 'fn' }];

    const withExamples = estimateCoverage(
      [{ functionName: 'fn', category: 'example' }],
      exports
    );

    const withMore = estimateCoverage(
      [
        { functionName: 'fn', category: 'example' },
        { functionName: 'fn', category: 'edge_case' },
      ],
      exports
    );

    expect(withMore).toBeGreaterThan(withExamples);
  });
});

describe('generateTests', () => {
  let tempDir;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-gen-'));
  });

  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should generate test suite for module', async () => {
    const module = {
      sourcePath: 'features/math.feature',
      outputPath: path.join(tempDir, 'math.js'),
      code: 'const add = (a, b) => a + b;',
      formattedCode: 'const add = (a, b) => a + b;\nmodule.exports = { add };',
      formatted: true,
      exports: [{
        name: 'add',
        exportType: 'named',
        params: [
          { name: 'a', type: 'number' },
          { name: 'b', type: 'number' },
        ],
        returnType: 'number',
      }],
      imports: [],
    };

    const context = {
      examples: [{
        functionName: 'add',
        rows: [{ a: 1, b: 2, result: 3 }],
      }],
    };

    const result = await generateTests(module, context, {
      testDir: tempDir,
      dryRun: true,
    });

    expect(result.sourcePath).toBe(module.outputPath);
    expect(result.testPath).toContain('.test.js');
    expect(result.testCases.length).toBeGreaterThan(0);
    expect(result.code).toContain("describe('math'");
    expect(result.expectedCoverage).toBeGreaterThan(0);
  });

  it('should write test file to disk when not dry run', async () => {
    const module = {
      sourcePath: 'test.feature',
      outputPath: path.join(tempDir, 'testmod.js'),
      code: 'const fn = () => 42;',
      formattedCode: 'const fn = () => 42;\nmodule.exports = { fn };',
      formatted: true,
      exports: [{ name: 'fn', exportType: 'named', params: [], returnType: 'number' }],
      imports: [],
    };

    const result = await generateTests(module, {}, {
      testDir: tempDir,
      dryRun: false,
      includeTypeTests: false,
      includeEdgeCases: false,
      includeBoundaryTests: false,
    });

    // Check file was written
    const content = await fs.readFile(result.testPath, 'utf8');
    expect(content).toContain("describe('testmod'");
  });

  it('should infer types when not provided', async () => {
    const module = {
      sourcePath: 'calc.feature',
      outputPath: path.join(tempDir, 'calc.js'),
      code: 'const sum = (count, amount) => count + amount;',
      formattedCode: 'const sum = (count, amount) => count + amount;',
      formatted: true,
      exports: [{ name: 'sum', exportType: 'named', params: [], returnType: 'number' }],
      imports: [],
    };

    const result = await generateTests(module, {}, {
      testDir: tempDir,
      dryRun: true,
    });

    // Should have generated some tests based on inferred types
    expect(result.testCases.length).toBeGreaterThan(0);
  });
});

describe('EDGE_CASES_BY_TYPE', () => {
  it('should have edge cases for common types', () => {
    expect(EDGE_CASES_BY_TYPE.number).toBeDefined();
    expect(EDGE_CASES_BY_TYPE.string).toBeDefined();
    expect(EDGE_CASES_BY_TYPE.array).toBeDefined();
    expect(EDGE_CASES_BY_TYPE.boolean).toBeDefined();
  });

  it('should include zero for numbers', () => {
    const hasZero = EDGE_CASES_BY_TYPE.number.some((e) => e.value === 0);
    expect(hasZero).toBe(true);
  });

  it('should include empty string', () => {
    const hasEmpty = EDGE_CASES_BY_TYPE.string.some((e) => e.value === '');
    expect(hasEmpty).toBe(true);
  });
});

describe('BOUNDARY_VALUES', () => {
  it('should include critical boundary values', () => {
    const values = BOUNDARY_VALUES.map((b) => b.value);

    expect(values).toContain(0);
    expect(values).toContain(-1);
    expect(values).toContain(1);
    expect(values).toContain(Infinity);
    expect(values).toContain(-Infinity);
  });

  it('should include NaN', () => {
    const hasNaN = BOUNDARY_VALUES.some((b) => Number.isNaN(b.value));
    expect(hasNaN).toBe(true);
  });
});
