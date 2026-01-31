/**
 * Unit tests for JSDoc generation module.
 *
 * @module test/unit/generation/formatters/jsdoc
 */

const {
  generateModuleJSDoc,
  generateFunctionJSDoc,
  generateModuleJSDocComplete,
  generateExampleSection,
  extractDescriptionFromScenario,
  inferTypeFromName,
  inferReturnTypeFromName,
  inferTypeFromValue,
  wrapText,
  formatValueForExample,
  PARAM_NAME_TYPE_MAP,
  FUNCTION_RETURN_TYPE_MAP,
} = require('../../../../src/generation/formatters/jsdoc');

describe('generateModuleJSDoc', () => {
  it('should generate a basic @module tag', () => {
    const result = generateModuleJSDoc('math');

    expect(result).toContain('/**');
    expect(result).toContain('@module math');
    expect(result).toContain('*/');
  });

  it('should include description if provided', () => {
    const result = generateModuleJSDoc('math', 'Mathematical utility functions');

    expect(result).toContain('Mathematical utility functions');
    expect(result).toContain('@module math');
  });

  it('should wrap long descriptions', () => {
    const longDesc = 'This is a very long description that should be wrapped across multiple lines for better readability in the generated documentation.';
    const result = generateModuleJSDoc('utils', longDesc);

    expect(result).toContain('@module utils');
    // Should have wrapped the text
    const lines = result.split('\n');
    expect(lines.length).toBeGreaterThan(3);
  });
});

describe('generateFunctionJSDoc', () => {
  it('should generate basic function JSDoc', () => {
    const result = generateFunctionJSDoc('add');

    expect(result).toContain('/**');
    expect(result).toContain('@returns');
    expect(result).toContain('*/');
  });

  it('should include description if provided', () => {
    const result = generateFunctionJSDoc('add', {
      description: 'Adds two numbers together',
    });

    expect(result).toContain('Adds two numbers together');
  });

  it('should include @param tags for parameters', () => {
    const result = generateFunctionJSDoc('add', {
      params: [
        { name: 'a', type: 'number', description: 'First number' },
        { name: 'b', type: 'number', description: 'Second number' },
      ],
    });

    expect(result).toContain('@param {number} a - First number');
    expect(result).toContain('@param {number} b - Second number');
  });

  it('should mark optional parameters', () => {
    const result = generateFunctionJSDoc('greet', {
      params: [
        { name: 'name', type: 'string' },
        { name: 'prefix', type: 'string', optional: true, defaultValue: 'Hello' },
      ],
    });

    expect(result).toContain('@param {string} name');
    expect(result).toContain('@param {string=} prefix');
    expect(result).toContain("(default: \"Hello\")");
  });

  it('should include @returns tag', () => {
    const result = generateFunctionJSDoc('add', {
      returnType: 'number',
      returnDescription: 'The sum of the two numbers',
    });

    expect(result).toContain('@returns {number} The sum of the two numbers');
  });

  it('should infer return type from function name', () => {
    const result = generateFunctionJSDoc('isEmpty');

    expect(result).toContain('@returns {boolean}');
  });

  it('should include @example sections', () => {
    const result = generateFunctionJSDoc('add', {
      params: [
        { name: 'a', type: 'number' },
        { name: 'b', type: 'number' },
      ],
      examples: [
        {
          name: 'Basic addition',
          rows: [
            { a: 1, b: 2, result: 3 },
            { a: 5, b: 3, result: 8 },
          ],
        },
      ],
    });

    expect(result).toContain('@example');
    expect(result).toContain('add(1, 2)');
    expect(result).toContain('// => 3');
  });
});

describe('inferTypeFromName', () => {
  it('should infer number type for count-related names', () => {
    expect(inferTypeFromName('count')).toBe('number');
    expect(inferTypeFromName('num')).toBe('number');
    expect(inferTypeFromName('amount')).toBe('number');
    expect(inferTypeFromName('index')).toBe('number');
  });

  it('should infer string type for text-related names', () => {
    expect(inferTypeFromName('name')).toBe('string');
    expect(inferTypeFromName('text')).toBe('string');
    expect(inferTypeFromName('message')).toBe('string');
    expect(inferTypeFromName('title')).toBe('string');
  });

  it('should infer boolean for is/has prefixes', () => {
    expect(inferTypeFromName('isValid')).toBe('boolean');
    expect(inferTypeFromName('hasValue')).toBe('boolean');
    expect(inferTypeFromName('canEdit')).toBe('boolean');
  });

  it('should infer Array for list-related names', () => {
    expect(inferTypeFromName('items')).toBe('Array');
    expect(inferTypeFromName('list')).toBe('Array');
    expect(inferTypeFromName('values')).toBe('Array');
  });

  it('should infer Function for callback-related names', () => {
    expect(inferTypeFromName('callback')).toBe('Function');
    expect(inferTypeFromName('handler')).toBe('Function');
    expect(inferTypeFromName('fn')).toBe('Function');
  });

  it('should return * for unknown names', () => {
    expect(inferTypeFromName('xyz')).toBe('*');
    expect(inferTypeFromName('foo')).toBe('*');
  });
});

describe('inferReturnTypeFromName', () => {
  it('should infer number for math operations', () => {
    expect(inferReturnTypeFromName('add')).toBe('number');
    expect(inferReturnTypeFromName('sum')).toBe('number');
    expect(inferReturnTypeFromName('multiply')).toBe('number');
    expect(inferReturnTypeFromName('average')).toBe('number');
  });

  it('should infer string for string operations', () => {
    // Note: concat can be Array.concat or String concat - we default to Array
    expect(inferReturnTypeFromName('trim')).toBe('string');
    expect(inferReturnTypeFromName('format')).toBe('string');
    expect(inferReturnTypeFromName('stringify')).toBe('string');
  });

  it('should infer boolean for check operations', () => {
    expect(inferReturnTypeFromName('isEmpty')).toBe('boolean');
    expect(inferReturnTypeFromName('isValid')).toBe('boolean');
    expect(inferReturnTypeFromName('hasValue')).toBe('boolean');
    expect(inferReturnTypeFromName('contains')).toBe('boolean');
  });

  it('should infer Array for collection operations', () => {
    expect(inferReturnTypeFromName('filter')).toBe('Array');
    expect(inferReturnTypeFromName('map')).toBe('Array');
    expect(inferReturnTypeFromName('sort')).toBe('Array');
  });

  it('should return * for unknown function names', () => {
    expect(inferReturnTypeFromName('doSomething')).toBe('*');
    expect(inferReturnTypeFromName('xyz')).toBe('*');
  });
});

describe('inferTypeFromValue', () => {
  it('should infer number from numeric values', () => {
    expect(inferTypeFromValue(42)).toBe('number');
    expect(inferTypeFromValue(3.14)).toBe('number');
    expect(inferTypeFromValue(-10)).toBe('number');
  });

  it('should infer string from string values', () => {
    expect(inferTypeFromValue('hello')).toBe('string');
    expect(inferTypeFromValue('')).toBe('string');
  });

  it('should infer boolean from boolean values', () => {
    expect(inferTypeFromValue(true)).toBe('boolean');
    expect(inferTypeFromValue(false)).toBe('boolean');
  });

  it('should infer Array from arrays', () => {
    expect(inferTypeFromValue([])).toBe('Array');
    expect(inferTypeFromValue([1, 2, 3])).toBe('number[]');
    expect(inferTypeFromValue(['a', 'b'])).toBe('string[]');
  });

  it('should infer Object from objects', () => {
    expect(inferTypeFromValue({})).toBe('Object');
    expect(inferTypeFromValue({ a: 1 })).toBe('Object');
  });

  it('should handle null and undefined', () => {
    expect(inferTypeFromValue(null)).toBe('null');
    expect(inferTypeFromValue(undefined)).toBe('undefined');
  });
});

describe('extractDescriptionFromScenario', () => {
  it('should return scenario description if present', () => {
    const scenario = {
      name: 'Add numbers',
      description: 'Adds two numbers together',
    };

    expect(extractDescriptionFromScenario(scenario)).toBe('Adds two numbers together');
  });

  it('should build description from steps if no description', () => {
    const scenario = {
      name: 'Add numbers',
      steps: [
        { keyword: 'Given', text: 'I have two numbers' },
        { keyword: 'When', text: 'I add them' },
        { keyword: 'Then', text: 'I get the sum' },
      ],
    };

    const result = extractDescriptionFromScenario(scenario);
    expect(result).toContain('Given I have two numbers');
    expect(result).toContain('When I add them');
    expect(result).toContain('Then I get the sum');
  });

  it('should return scenario name as fallback', () => {
    const scenario = {
      name: 'Calculate sum',
      steps: [],
    };

    expect(extractDescriptionFromScenario(scenario)).toBe('Calculate sum');
  });
});

describe('generateExampleSection', () => {
  it('should generate @example with function calls', () => {
    const example = {
      rows: [
        { a: 1, b: 2, result: 3 },
      ],
    };
    const params = [
      { name: 'a' },
      { name: 'b' },
    ];

    const result = generateExampleSection('add', example, params);

    expect(result).toContain('@example');
    expect(result).toContain('add(1, 2)');
    expect(result).toContain('// => 3');
  });

  it('should include example name if present', () => {
    const example = {
      name: 'Basic addition',
      rows: [{ a: 1, b: 2, result: 3 }],
    };

    const result = generateExampleSection('add', example, [{ name: 'a' }, { name: 'b' }]);

    expect(result).toContain('@example Basic addition');
  });

  it('should limit to 3 examples', () => {
    const example = {
      rows: [
        { x: 1 },
        { x: 2 },
        { x: 3 },
        { x: 4 },
        { x: 5 },
      ],
    };

    const result = generateExampleSection('fn', example, [{ name: 'x' }]);

    // Should only have 3 examples
    const fnCalls = (result.match(/fn\(/g) || []).length;
    expect(fnCalls).toBe(3);
  });
});

describe('wrapText', () => {
  it('should not wrap short text', () => {
    const result = wrapText('Short text', 80);
    expect(result).toEqual(['Short text']);
  });

  it('should wrap long text at word boundaries', () => {
    const text = 'This is a longer text that should be wrapped at word boundaries for readability';
    const result = wrapText(text, 40);

    expect(result.length).toBeGreaterThan(1);
    result.forEach((line) => {
      expect(line.length).toBeLessThanOrEqual(40);
    });
  });

  it('should handle empty text', () => {
    expect(wrapText('', 80)).toEqual(['']);
    expect(wrapText(null, 80)).toEqual(['']);
  });
});

describe('formatValueForExample', () => {
  it('should format strings with quotes', () => {
    expect(formatValueForExample('hello')).toBe("'hello'");
  });

  it('should format numbers without quotes', () => {
    expect(formatValueForExample(42)).toBe('42');
    expect(formatValueForExample(3.14)).toBe('3.14');
  });

  it('should format booleans', () => {
    expect(formatValueForExample(true)).toBe('true');
    expect(formatValueForExample(false)).toBe('false');
  });

  it('should format null and undefined', () => {
    expect(formatValueForExample(null)).toBe('null');
    expect(formatValueForExample(undefined)).toBe('undefined');
  });

  it('should format arrays', () => {
    expect(formatValueForExample([1, 2, 3])).toBe('[1, 2, 3]');
    expect(formatValueForExample(['a', 'b'])).toBe("['a', 'b']");
  });

  it('should escape single quotes in strings', () => {
    expect(formatValueForExample("it's")).toBe("'it\\'s'");
  });
});

describe('generateModuleJSDocComplete', () => {
  it('should generate complete module documentation', () => {
    const exports = [
      {
        name: 'add',
        exportType: 'named',
        params: [
          { name: 'a', type: 'number' },
          { name: 'b', type: 'number' },
        ],
        returnType: 'number',
        description: 'Adds two numbers',
      },
    ];

    const result = generateModuleJSDocComplete('math', 'Math utilities', exports, {});

    expect(result).toContain('@module math');
    expect(result).toContain('Math utilities');
    expect(result).toContain('Adds two numbers');
    expect(result).toContain('@param {number} a');
    expect(result).toContain('@returns {number}');
  });
});
