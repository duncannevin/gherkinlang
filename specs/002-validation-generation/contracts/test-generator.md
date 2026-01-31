# Contract: Test Generator

**Module**: `src/generation/test-generator.js`  
**Purpose**: Generate Jest test suites for compiled modules

## Public API

### generateTests(module, context, options)

Generates Jest test suite for a compiled module.

```javascript
/**
 * Generates Jest test suite for a compiled module.
 * 
 * @param {GeneratedModule} module - Generated module from generator
 * @param {TestGenerationContext} context - Test generation context
 * @param {TestGenerateOptions} [options] - Generation options
 * @returns {Promise<GeneratedTestSuite>} Generated test suite
 * 
 * @example
 * const testSuite = await generateTests(module, {
 *   examples: [...],
 *   paramTypes: { add: { a: 'number', b: 'number' } }
 * });
 */
async function generateTests(module, context, options = {}) {}
```

**Parameters**:

| Name | Type | Required | Description |
|------|------|----------|-------------|
| module | GeneratedModule | Yes | Generated module to test |
| context | TestGenerationContext | Yes | Test generation context |
| options | TestGenerateOptions | No | Generation options |

**Context**:

```javascript
/**
 * @typedef {Object} TestGenerationContext
 * @property {GherkinExample[]} [examples] - Gherkin Examples tables
 * @property {Object.<string, ParamTypes>} [paramTypes] - Parameter types by function
 * @property {Scenario[]} scenarios - Scenarios from Gherkin source
 */
```

**Options**:

```javascript
/**
 * @typedef {Object} TestGenerateOptions
 * @property {string} [testDir] - Test output directory
 * @property {boolean} [includeTypeTests=true] - Generate type validation tests
 * @property {boolean} [includeEdgeCases=true] - Generate edge case tests
 * @property {boolean} [dryRun=false] - Generate without writing
 */
```

**Returns**: `Promise<GeneratedTestSuite>`

---

### generateExampleTests(functionName, examples)

Generates tests from Gherkin Examples table.

```javascript
/**
 * Generates example-based tests from Gherkin Examples.
 * 
 * @param {string} functionName - Function to test
 * @param {GherkinExample[]} examples - Examples from Gherkin
 * @returns {TestCase[]} Generated test cases
 * 
 * @example
 * // From Gherkin:
 * // | a | b | result |
 * // | 1 | 2 | 3      |
 * // | 0 | 0 | 0      |
 * 
 * const tests = generateExampleTests('add', examples);
 * // Returns tests for add(1, 2) => 3, add(0, 0) => 0
 */
function generateExampleTests(functionName, examples) {}
```

---

### generateTypeTests(functionName, paramTypes, returnType)

Generates type validation tests.

```javascript
/**
 * Generates type validation tests for a function.
 * 
 * @param {string} functionName - Function to test
 * @param {Object.<string, string>} paramTypes - Parameter name to type mapping
 * @param {string} returnType - Expected return type
 * @returns {TestCase[]} Generated test cases
 * 
 * @example
 * const tests = generateTypeTests('add', { a: 'number', b: 'number' }, 'number');
 * // Returns tests that verify add('x', 1) throws, add(1, null) throws, etc.
 */
function generateTypeTests(functionName, paramTypes, returnType) {}
```

---

### generateEdgeCaseTests(functionName, paramTypes)

Generates edge case tests based on parameter types.

```javascript
/**
 * Generates edge case tests for a function.
 * 
 * @param {string} functionName - Function to test
 * @param {Object.<string, string>} paramTypes - Parameter types
 * @returns {TestCase[]} Generated test cases
 */
function generateEdgeCaseTests(functionName, paramTypes) {}
```

**Edge Cases by Type**:

| Type | Edge Cases |
|------|------------|
| number | 0, -1, Infinity, NaN, MAX_SAFE_INTEGER |
| string | '', ' ', very long string |
| array | [], [single], [many] |
| object | {}, null, undefined |
| boolean | true, false |

---

### inferTypes(functionName, code)

Infers parameter types from function name and implementation.

```javascript
/**
 * Infers parameter types from function name and code.
 * 
 * @param {string} functionName - Function name
 * @param {string} code - Function implementation code
 * @returns {InferredTypes} Inferred parameter and return types
 * 
 * @typedef {Object} InferredTypes
 * @property {Object.<string, string>} params - Parameter name to type
 * @property {string} returnType - Inferred return type
 * @property {number} confidence - Confidence score 0-1
 */
function inferTypes(functionName, code) {}
```

**Inference Heuristics**:

| Pattern | Inferred Type |
|---------|---------------|
| Name contains: add, sum, multiply, divide, count | number |
| Name contains: concat, join, split, trim, format | string |
| Name contains: filter, map, find, sort, includes | array |
| Name contains: is, has, can, should | boolean |
| Param name: count, num, amount, index, id | number |
| Param name: text, str, name, message, label | string |
| Param name: items, list, arr, elements | array |

## Internal Functions

### createTestFile(modulePath, testCases)

Creates Jest test file content from test cases.

### computeTestPath(modulePath, testDir)

Computes test file path from module path (.js → .test.js).

### generateDescribeBlock(functionName, testCases)

Generates describe/it block structure.

### generateAssertion(testCase)

Generates appropriate Jest assertion for test case.

## Dependencies

- None (generates plain Jest code)

## Test File Template

```javascript
/**
 * Auto-generated tests for {ModuleName}
 * Source: {sourcePath}
 * Generated: {timestamp}
 */

const { functionA, functionB } = require('./module');

describe('ModuleName', () => {
  describe('functionA', () => {
    // Example-based tests
    describe('examples', () => {
      it('should return 3 when given (1, 2)', () => {
        expect(functionA(1, 2)).toBe(3);
      });
    });

    // Type validation tests
    describe('type validation', () => {
      it('should handle string input gracefully', () => {
        expect(() => functionA('x', 1)).toThrow();
      });
    });

    // Edge case tests
    describe('edge cases', () => {
      it('should handle zero values', () => {
        expect(functionA(0, 0)).toBe(0);
      });

      it('should handle negative values', () => {
        expect(functionA(-1, -1)).toBe(-2);
      });
    });
  });
});
```

## Acceptance Criteria

1. ✅ Generated tests are valid Jest syntax
2. ✅ Tests can run without modification
3. ✅ Example-based tests from Gherkin Examples
4. ✅ Type validation tests for typed parameters
5. ✅ Edge case tests for common patterns
6. ✅ Types inferred when annotations missing
7. ✅ Test file names match source (.test.js suffix)
8. ✅ Proper describe/it nesting structure
