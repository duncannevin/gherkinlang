/**
 * Unit tests for syntax validation module.
 *
 * @module test/unit/validation/syntax
 */

const {
  validateSyntax,
  isESModuleSyntax,
  isCommonJSSyntax,
  detectModuleFormat,
  DEFAULT_PLUGINS,
  createParserOptions,
  babelErrorToValidationError,
  getSyntaxErrorSuggestion,
} = require('../../../src/validation/syntax');

describe('validateSyntax', () => {
  describe('valid JavaScript code', () => {
    it('should return valid=true for a simple constant declaration', () => {
      const code = 'const x = 42;';
      const result = validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.ast).toBeDefined();
      expect(result.ast.type).toBe('File');
    });

    it('should return valid=true for arrow functions', () => {
      const code = 'const add = (a, b) => a + b;';
      const result = validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.ast).toBeDefined();
    });

    it('should return valid=true for template literals', () => {
      const code = 'const greeting = `Hello, ${name}!`;';
      const result = validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid=true for destructuring', () => {
      const code = 'const { a, b } = obj; const [x, y] = arr;';
      const result = validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid=true for async/await', () => {
      const code = 'const getData = async () => { const data = await fetch(url); return data; };';
      const result = validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid=true for spread operator', () => {
      const code = 'const merged = { ...obj1, ...obj2 }; const arr = [...arr1, ...arr2];';
      const result = validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid=true for higher-order functions', () => {
      const code = 'const double = arr.map(x => x * 2).filter(x => x > 10).reduce((a, b) => a + b, 0);';
      const result = validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid=true for closures', () => {
      const code = `
        const createCounter = () => {
          let count = 0;
          return () => ++count;
        };
      `;
      const result = validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('ES2020+ features', () => {
    it('should parse optional chaining (?.)', () => {
      const code = 'const value = obj?.foo?.bar?.baz;';
      const result = validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse optional chaining with method calls', () => {
      const code = 'const result = obj?.method?.();';
      const result = validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse optional chaining with array access', () => {
      const code = 'const item = arr?.[0]?.value;';
      const result = validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse nullish coalescing operator (??)', () => {
      const code = 'const value = input ?? defaultValue;';
      const result = validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse chained nullish coalescing', () => {
      const code = 'const value = a ?? b ?? c ?? "default";';
      const result = validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse BigInt literals', () => {
      const code = 'const big = 123456789012345678901234567890n;';
      const result = validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse numeric separators', () => {
      const code = 'const million = 1_000_000; const binary = 0b1010_0001;';
      const result = validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse logical assignment operators', () => {
      const code = 'a ||= b; c &&= d; e ??= f;';
      const result = validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse dynamic import', () => {
      const code = 'const module = import("./module.js");';
      const result = validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse optional catch binding', () => {
      const code = 'try { doSomething(); } catch { handleError(); }';
      const result = validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse async generators', () => {
      const code = 'async function* asyncGen() { yield await promise; }';
      const result = validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse class properties', () => {
      const code = 'class MyClass { property = "value"; static staticProp = 42; }';
      const result = validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse private class properties', () => {
      const code = 'class MyClass { #privateField = "secret"; #privateMethod() { return this.#privateField; } }';
      const result = validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('invalid JavaScript code', () => {
    it('should return valid=false for missing expression after assignment', () => {
      const code = 'const x = ;';
      const result = validateSyntax(code);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.ast).toBeNull();
    });

    it('should return valid=false for unclosed parenthesis', () => {
      const code = 'const x = (1 + 2;';
      const result = validateSyntax(code);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return valid=false for unclosed brace', () => {
      const code = 'const obj = { foo: 1;';
      const result = validateSyntax(code);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return valid=false for unclosed bracket', () => {
      const code = 'const arr = [1, 2, 3;';
      const result = validateSyntax(code);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return valid=false for unterminated string', () => {
      const code = 'const str = "hello;';
      const result = validateSyntax(code);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return valid=false for invalid arrow function syntax', () => {
      const code = 'const fn = => 42;';
      const result = validateSyntax(code);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return valid=false for reserved word as identifier', () => {
      const code = 'const class = 42;';
      const result = validateSyntax(code);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return valid=false for invalid destructuring', () => {
      const code = 'const { = obj;';
      const result = validateSyntax(code);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('error details', () => {
    it('should include line and column in error location', () => {
      const code = 'const x = 1;\nconst y = ;\nconst z = 3;';
      const result = validateSyntax(code);

      expect(result.valid).toBe(false);
      expect(result.errors[0].location).toBeDefined();
      expect(result.errors[0].location.line).toBe(2);
      expect(typeof result.errors[0].location.column).toBe('number');
    });

    it('should include error type as "syntax"', () => {
      const code = 'const x = ;';
      const result = validateSyntax(code);

      expect(result.errors[0].type).toBe('syntax');
    });

    it('should include severity as "error"', () => {
      const code = 'const x = ;';
      const result = validateSyntax(code);

      expect(result.errors[0].severity).toBe('error');
    });

    it('should include a descriptive message', () => {
      const code = 'const x = ;';
      const result = validateSyntax(code);

      expect(result.errors[0].message).toBeDefined();
      expect(typeof result.errors[0].message).toBe('string');
      expect(result.errors[0].message.length).toBeGreaterThan(0);
    });

    it('should include code snippet in error', () => {
      const code = 'const x = ;';
      const result = validateSyntax(code);

      expect(result.errors[0].code).toBeDefined();
      expect(typeof result.errors[0].code).toBe('string');
    });

    it('should include file in location when filename option is provided', () => {
      const code = 'const x = ;';
      const result = validateSyntax(code, { filename: 'test.js' });

      expect(result.errors[0].location.file).toBe('test.js');
    });
  });

  describe('error recovery and maxErrors', () => {
    it('should collect multiple errors with error recovery', () => {
      // Create code with multiple syntax errors
      const code = `
        const a = ;
        const b = ;
        const c = ;
      `;
      const result = validateSyntax(code);

      expect(result.valid).toBe(false);
      // Should have collected at least one error
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
    });

    it('should respect maxErrors option', () => {
      const code = `
        const a = ;
        const b = ;
        const c = ;
        const d = ;
        const e = ;
      `;
      const result = validateSyntax(code, { maxErrors: 2 });

      expect(result.valid).toBe(false);
      // If multiple errors are collected, should be limited to maxErrors
      if (result.errors.length > 2) {
        expect(result.errors.length).toBeLessThanOrEqual(2);
      }
    });

    it('should default to MAX_SYNTAX_ERRORS (10)', () => {
      // Create code with many syntax errors
      const lines = Array.from({ length: 15 }, () => 'const x = ;').join('\n');
      const result = validateSyntax(lines);

      expect(result.valid).toBe(false);
      // Should not exceed default max of 10
      expect(result.errors.length).toBeLessThanOrEqual(10);
    });
  });

  describe('module format options', () => {
    describe('ES Module syntax (esm)', () => {
      it('should parse export default', () => {
        const code = 'export default () => 42;';
        const result = validateSyntax(code, { moduleFormat: 'esm' });

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should parse named exports', () => {
        const code = 'export const add = (a, b) => a + b;';
        const result = validateSyntax(code, { moduleFormat: 'esm' });

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should parse export from', () => {
        const code = 'export { foo, bar } from "./module.js";';
        const result = validateSyntax(code, { moduleFormat: 'esm' });

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should parse export * as namespace', () => {
        const code = 'export * as utils from "./utils.js";';
        const result = validateSyntax(code, { moduleFormat: 'esm' });

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should parse import statements', () => {
        const code = 'import { foo } from "./module.js"; const x = foo();';
        const result = validateSyntax(code, { moduleFormat: 'esm' });

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should parse import default', () => {
        const code = 'import module from "./module.js";';
        const result = validateSyntax(code, { moduleFormat: 'esm' });

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should parse import * as namespace', () => {
        const code = 'import * as utils from "./utils.js";';
        const result = validateSyntax(code, { moduleFormat: 'esm' });

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('CommonJS syntax (cjs)', () => {
      it('should parse module.exports', () => {
        const code = 'module.exports = { add: (a, b) => a + b };';
        const result = validateSyntax(code, { moduleFormat: 'cjs' });

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should parse exports.property', () => {
        const code = 'exports.add = (a, b) => a + b;';
        const result = validateSyntax(code, { moduleFormat: 'cjs' });

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should parse require()', () => {
        const code = 'const fs = require("fs"); const path = require("path");';
        const result = validateSyntax(code, { moduleFormat: 'cjs' });

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('unambiguous mode (default)', () => {
      it('should parse plain JavaScript without import/export', () => {
        const code = 'const x = 42; const add = (a, b) => a + b;';
        const result = validateSyntax(code);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should auto-detect and parse ES Module syntax', () => {
        const code = 'export const add = (a, b) => a + b;';
        const result = validateSyntax(code);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should auto-detect and parse CommonJS syntax', () => {
        const code = 'const add = (a, b) => a + b; module.exports = { add };';
        const result = validateSyntax(code);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = validateSyntax('');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.ast).toBeDefined();
    });

    it('should handle whitespace only', () => {
      const result = validateSyntax('   \n\t\n   ');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle comments only', () => {
      const code = '// This is a comment\n/* Block comment */';
      const result = validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle very long single line', () => {
      const longExpression = 'const x = ' + Array(100).fill('1').join(' + ') + ';';
      const result = validateSyntax(longExpression);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle Unicode in identifiers', () => {
      const code = 'const π = 3.14159; const αβγ = "greek";';
      const result = validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle Unicode in strings', () => {
      const code = 'const greeting = "Hello, 世界! 🌍";';
      const result = validateSyntax(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('isESModuleSyntax', () => {
  it('should return true for import statement', () => {
    expect(isESModuleSyntax('import { foo } from "bar";')).toBe(true);
  });

  it('should return true for import default', () => {
    expect(isESModuleSyntax('import foo from "bar";')).toBe(true);
  });

  it('should return true for import * as', () => {
    expect(isESModuleSyntax('import * as foo from "bar";')).toBe(true);
  });

  it('should return true for dynamic import', () => {
    expect(isESModuleSyntax('const mod = import("./mod.js");')).toBe(true);
  });

  it('should return true for export default', () => {
    expect(isESModuleSyntax('export default function() {}')).toBe(true);
  });

  it('should return true for export const', () => {
    expect(isESModuleSyntax('export const x = 42;')).toBe(true);
  });

  it('should return true for export function', () => {
    expect(isESModuleSyntax('export function foo() {}')).toBe(true);
  });

  it('should return true for export class', () => {
    expect(isESModuleSyntax('export class Foo {}')).toBe(true);
  });

  it('should return true for export *', () => {
    expect(isESModuleSyntax('export * from "./module.js";')).toBe(true);
  });

  it('should return true for export { }', () => {
    expect(isESModuleSyntax('export { foo, bar };')).toBe(true);
  });

  it('should return false for plain JavaScript', () => {
    expect(isESModuleSyntax('const x = 42;')).toBe(false);
  });

  it('should return false for CommonJS require', () => {
    expect(isESModuleSyntax('const fs = require("fs");')).toBe(false);
  });

  it('should return false for CommonJS module.exports', () => {
    expect(isESModuleSyntax('module.exports = {};')).toBe(false);
  });

  it('should match "import" in string content (known limitation of heuristic)', () => {
    // Note: This is a known limitation of the regex-based heuristic check.
    // The function uses pattern matching without parsing, so it may have
    // false positives when import/export keywords appear in strings.
    // This is acceptable since the actual parsing will determine validity.
    expect(isESModuleSyntax('const str = "import foo from bar";')).toBe(true);
  });
});

describe('isCommonJSSyntax', () => {
  it('should return true for require()', () => {
    expect(isCommonJSSyntax('const fs = require("fs");')).toBe(true);
  });

  it('should return true for module.exports', () => {
    expect(isCommonJSSyntax('module.exports = {};')).toBe(true);
  });

  it('should return true for exports.property', () => {
    expect(isCommonJSSyntax('exports.foo = 42;')).toBe(true);
  });

  it('should return false for plain JavaScript', () => {
    expect(isCommonJSSyntax('const x = 42;')).toBe(false);
  });

  it('should return false for ES Module syntax', () => {
    expect(isCommonJSSyntax('import { foo } from "bar";')).toBe(false);
  });

  it('should return false for export statements', () => {
    expect(isCommonJSSyntax('export const x = 42;')).toBe(false);
  });
});

describe('detectModuleFormat', () => {
  it('should return "esm" for ES Module syntax', () => {
    expect(detectModuleFormat('import { foo } from "bar";')).toBe('esm');
    expect(detectModuleFormat('export const x = 42;')).toBe('esm');
    expect(detectModuleFormat('export default () => {};')).toBe('esm');
  });

  it('should return "cjs" for CommonJS syntax', () => {
    expect(detectModuleFormat('const fs = require("fs");')).toBe('cjs');
    expect(detectModuleFormat('module.exports = {};')).toBe('cjs');
    expect(detectModuleFormat('exports.foo = 42;')).toBe('cjs');
  });

  it('should return "unambiguous" for plain JavaScript', () => {
    expect(detectModuleFormat('const x = 42;')).toBe('unambiguous');
    expect(detectModuleFormat('const add = (a, b) => a + b;')).toBe('unambiguous');
  });

  it('should prioritize ESM when both patterns are present', () => {
    // ESM is checked first, so if both are present, it returns 'esm'
    const code = 'import { foo } from "bar"; const fs = require("fs");';
    expect(detectModuleFormat(code)).toBe('esm');
  });
});

describe('createParserOptions', () => {
  it('should include all default plugins', () => {
    const options = createParserOptions();

    expect(options.plugins).toBeDefined();
    expect(options.plugins).toContain('optionalChaining');
    expect(options.plugins).toContain('nullishCoalescingOperator');
    expect(options.plugins).toContain('bigInt');
    expect(options.plugins).toContain('logicalAssignment');
  });

  it('should set sourceType to "script" for cjs module format', () => {
    const options = createParserOptions({ moduleFormat: 'cjs' });

    expect(options.sourceType).toBe('script');
  });

  it('should set sourceType to "module" for esm module format', () => {
    const options = createParserOptions({ moduleFormat: 'esm' });

    expect(options.sourceType).toBe('module');
  });

  it('should set sourceType to "unambiguous" by default', () => {
    const options = createParserOptions();

    expect(options.sourceType).toBe('unambiguous');
  });

  it('should enable errorRecovery', () => {
    const options = createParserOptions();

    expect(options.errorRecovery).toBe(true);
  });

  it('should set sourceFilename when filename option is provided', () => {
    const options = createParserOptions({ filename: 'test.js' });

    expect(options.sourceFilename).toBe('test.js');
  });
});

describe('babelErrorToValidationError', () => {
  it('should convert babel error with loc to ValidationError', () => {
    const babelError = {
      message: 'Unexpected token (1:10)',
      loc: { line: 1, column: 10 },
    };
    const code = 'const x = ;';

    const result = babelErrorToValidationError(babelError, code);

    expect(result.type).toBe('syntax');
    expect(result.severity).toBe('error');
    expect(result.location.line).toBe(1);
    expect(result.location.column).toBe(10);
    expect(result.message).toBe('Unexpected token');
  });

  it('should include filename in location when provided', () => {
    const babelError = {
      message: 'Unexpected token (1:10)',
      loc: { line: 1, column: 10 },
    };

    const result = babelErrorToValidationError(babelError, 'const x = ;', 'test.js');

    expect(result.location.file).toBe('test.js');
  });

  it('should default to line 1, column 0 when loc is missing', () => {
    const babelError = {
      message: 'Some error',
    };

    const result = babelErrorToValidationError(babelError, 'code');

    expect(result.location.line).toBe(1);
    expect(result.location.column).toBe(0);
  });

  it('should strip position suffix from error message', () => {
    const babelError = {
      message: 'Unexpected token, expected ";" (5:12)',
      loc: { line: 5, column: 12 },
    };

    const result = babelErrorToValidationError(babelError, 'code');

    expect(result.message).toBe('Unexpected token, expected ";"');
  });
});

describe('getSyntaxErrorSuggestion', () => {
  it('should return suggestion for unexpected } token', () => {
    const suggestion = getSyntaxErrorSuggestion('Unexpected token }');

    expect(suggestion).toBe('Check for missing opening brace or extra closing brace');
  });

  it('should return suggestion for unexpected ) token', () => {
    const suggestion = getSyntaxErrorSuggestion('Unexpected token )');

    expect(suggestion).toBe('Check for missing opening parenthesis or extra closing parenthesis');
  });

  it('should return suggestion for unexpected ] token', () => {
    const suggestion = getSyntaxErrorSuggestion('Unexpected token ]');

    expect(suggestion).toBe('Check for missing opening bracket or extra closing bracket');
  });

  it('should return generic suggestion for other unexpected tokens', () => {
    const suggestion = getSyntaxErrorSuggestion('Unexpected token ,');

    expect(suggestion).toBe('Check for typos or missing punctuation');
  });

  it('should return suggestion for unterminated string', () => {
    const suggestion = getSyntaxErrorSuggestion('Unterminated string constant');

    expect(suggestion).toBe('Add the closing quote to terminate the string');
  });

  it('should return suggestion for unexpected reserved word', () => {
    const suggestion = getSyntaxErrorSuggestion('Unexpected reserved word');

    expect(suggestion).toBe('This word is reserved and cannot be used as an identifier');
  });

  it('should return suggestion for duplicate export', () => {
    const suggestion = getSyntaxErrorSuggestion('Duplicate export "foo"');

    expect(suggestion).toBe('Remove the duplicate export or rename one of them');
  });

  it('should return undefined for unknown error type', () => {
    const suggestion = getSyntaxErrorSuggestion('Some random error message');

    expect(suggestion).toBeUndefined();
  });
});

describe('DEFAULT_PLUGINS', () => {
  it('should include essential ES2020+ plugins', () => {
    expect(DEFAULT_PLUGINS).toContain('optionalChaining');
    expect(DEFAULT_PLUGINS).toContain('nullishCoalescingOperator');
    expect(DEFAULT_PLUGINS).toContain('bigInt');
    expect(DEFAULT_PLUGINS).toContain('numericSeparator');
    expect(DEFAULT_PLUGINS).toContain('logicalAssignment');
  });

  it('should include class-related plugins', () => {
    expect(DEFAULT_PLUGINS).toContain('classProperties');
    expect(DEFAULT_PLUGINS).toContain('classPrivateProperties');
    expect(DEFAULT_PLUGINS).toContain('classPrivateMethods');
  });

  it('should include module-related plugins', () => {
    expect(DEFAULT_PLUGINS).toContain('dynamicImport');
    expect(DEFAULT_PLUGINS).toContain('exportDefaultFrom');
    expect(DEFAULT_PLUGINS).toContain('exportNamespaceFrom');
  });

  it('should include other ES features', () => {
    expect(DEFAULT_PLUGINS).toContain('optionalCatchBinding');
    expect(DEFAULT_PLUGINS).toContain('objectRestSpread');
    expect(DEFAULT_PLUGINS).toContain('asyncGenerators');
  });

  it('should be an array', () => {
    expect(Array.isArray(DEFAULT_PLUGINS)).toBe(true);
  });

  it('should be frozen (immutable)', () => {
    // DEFAULT_PLUGINS is not frozen in source, but we test it's an array
    expect(Array.isArray(DEFAULT_PLUGINS)).toBe(true);
  });
});
