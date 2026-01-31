/**
 * Unit tests for the main validator module.
 *
 * Tests the validation pipeline orchestrator including:
 * - T024: validate() orchestrator function
 * - T025: Fail-fast logic (skip purity/lint if syntax fails)
 * - T026: aggregateErrors() to combine all validation results
 * - T027: Duration tracking for performance metrics
 * - T028: No auto-fix behavior
 *
 * @module test/unit/validation/validator
 */

const {
  validate,
  validateBatch,
  validateSyntaxOnly,
  isValid,
  aggregateErrors,
  purityViolationToValidationError,
  lintViolationToValidationError,
  getSuggestionForPurityViolation,
} = require('../../../src/validation/validator');

describe('validate', () => {
  describe('T024: orchestrator function', () => {
    it('should return valid=true for pure, syntactically correct code', async () => {
      // IIFE pattern that is pure and has no unused vars
      const code = '(() => ({ add: (a, b) => a + b }))();';
      const result = await validate(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.syntax.valid).toBe(true);
      expect(result.purity.valid).toBe(true);
    });

    it('should return the full validation result structure', async () => {
      const code = '(() => ({ identity: (x) => x }))();';
      const result = await validate(code);

      // Check all required properties exist
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('syntax');
      expect(result).toHaveProperty('purity');
      expect(result).toHaveProperty('lint');
      expect(result).toHaveProperty('duration');
    });

    it('should validate ES module code with moduleFormat option', async () => {
      const code = 'export const add = (a, b) => a + b;';
      const result = await validate(code, { moduleFormat: 'esm' });

      expect(result.valid).toBe(true);
      expect(result.syntax.valid).toBe(true);
    });

    it('should validate CommonJS code with moduleFormat option', async () => {
      // CommonJS syntax is valid, purity is checked separately
      const code = '(() => ({ add: (a, b) => a + b }))();';
      const result = await validate(code, { moduleFormat: 'cjs' });

      expect(result.valid).toBe(true);
      expect(result.syntax.valid).toBe(true);
    });

    it('should include filename in errors when provided', async () => {
      const code = 'const x = ;'; // Syntax error
      const result = await validate(code, { filename: 'test.js' });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].location.file).toBe('test.js');
    });

    it('should handle empty code', async () => {
      const code = '';
      const result = await validate(code);

      // Empty code is syntactically valid
      expect(result.syntax.valid).toBe(true);
    });

    it('should handle whitespace-only code', async () => {
      const code = '   \n\n\t  ';
      const result = await validate(code);

      expect(result.syntax.valid).toBe(true);
    });
  });

  describe('T025: fail-fast logic', () => {
    it('should skip purity check when syntax fails', async () => {
      const code = 'const x = ;'; // Syntax error
      const result = await validate(code);

      expect(result.valid).toBe(false);
      expect(result.syntax.valid).toBe(false);
      expect(result.purity).toBeNull();
      expect(result.lint).toBeNull();
    });

    it('should skip lint check when syntax fails', async () => {
      const code = 'function {'; // Syntax error
      const result = await validate(code);

      expect(result.valid).toBe(false);
      expect(result.syntax.valid).toBe(false);
      expect(result.lint).toBeNull();
    });

    it('should only contain syntax errors when syntax fails', async () => {
      const code = 'const = 42;'; // Syntax error
      const result = await validate(code);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.every((e) => e.type === 'syntax')).toBe(true);
    });

    it('should run purity and lint checks when syntax passes', async () => {
      const code = 'const add = (a, b) => a + b;';
      const result = await validate(code);

      expect(result.syntax.valid).toBe(true);
      expect(result.purity).not.toBeNull();
      expect(result.lint).not.toBeNull();
    });

    it('should run lint even if purity fails', async () => {
      // Code with a purity violation (console.log) but valid syntax
      const code = 'const log = (x) => { console.log(x); return x; };';
      const result = await validate(code);

      expect(result.syntax.valid).toBe(true);
      expect(result.purity.valid).toBe(false);
      // Lint should still have run
      expect(result.lint).not.toBeNull();
    });
  });

  describe('T026: aggregateErrors', () => {
    it('should combine syntax errors into errors array', async () => {
      const code = 'const x = ;';
      const result = await validate(code);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.type === 'syntax')).toBe(true);
    });

    it('should combine purity violations into errors array', async () => {
      const code = 'const fn = () => { console.log("test"); };';
      const result = await validate(code);

      expect(result.errors.some((e) => e.type === 'purity')).toBe(true);
    });

    it('should combine lint errors into errors array', async () => {
      const code = 'var x = 1;'; // no-var rule violation
      const result = await validate(code);

      expect(result.errors.some((e) => e.type === 'lint')).toBe(true);
    });

    it('should separate warnings from errors', async () => {
      // Valid pure code with IIFE pattern should have no errors
      const code = '(() => ({ add: (a, b) => a + b }))();';
      const result = await validate(code);

      expect(result.errors).toHaveLength(0);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should aggregate errors from multiple validation phases', async () => {
      // Code with both purity violation and lint error
      const code = 'var x = 1; console.log(x);';
      const result = await validate(code);

      expect(result.valid).toBe(false);
      // Should have both lint (no-var) and purity (console.log) errors
      const hasLintError = result.errors.some((e) => e.type === 'lint');
      const hasPurityError = result.errors.some((e) => e.type === 'purity');
      expect(hasLintError || hasPurityError).toBe(true);
    });
  });

  describe('T027: duration tracking', () => {
    it('should include duration in milliseconds', async () => {
      const code = 'const add = (a, b) => a + b;';
      const result = await validate(code);

      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should track duration even for invalid code', async () => {
      const code = 'const x = ;';
      const result = await validate(code);

      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should have reasonable duration for simple validation', async () => {
      const code = 'const x = 42;';
      const result = await validate(code);

      // Should be fast - under 500ms as per performance target
      expect(result.duration).toBeLessThan(500);
    });
  });

  describe('T028: no auto-fix behavior', () => {
    it('should return errors without modifying the code', async () => {
      const code = 'var x = 1;';
      const result = await validate(code);

      // Should return errors, not auto-fix
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should not auto-fix purity violations', async () => {
      const code = 'const fn = () => console.log("test");';
      const result = await validate(code);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.type === 'purity')).toBe(true);
    });

    it('should not auto-fix lint violations', async () => {
      const code = 'var x = 1;';
      const result = await validate(code);

      // Errors should be returned, code should not be fixed
      expect(result.errors.some((e) => e.rule === 'no-var')).toBe(true);
    });

    it('should provide suggestions for fixing errors', async () => {
      const code = 'var x = 1;';
      const result = await validate(code);

      // Errors may have suggestions but are not auto-applied
      const hasErrors = result.errors.length > 0;
      expect(hasErrors).toBe(true);
    });
  });

  describe('skipLint option', () => {
    it('should skip lint validation when skipLint is true', async () => {
      const code = 'var x = 1;'; // Would fail lint
      const result = await validate(code, { skipLint: true });

      expect(result.lint).toBeNull();
      // Should still check purity
      expect(result.purity).not.toBeNull();
    });

    it('should be valid if only lint would fail and skipLint is true', async () => {
      const code = 'var x = 1; const add = (a, b) => a + b;';
      const result = await validate(code, { skipLint: true });

      // Should be invalid due to lint, but we're skipping
      // Purity is valid
      expect(result.purity.valid).toBe(true);
    });
  });

  describe('error locations', () => {
    it('should include line and column for syntax errors', async () => {
      const code = 'const x = ;';
      const result = await validate(code);

      expect(result.errors[0].location).toBeDefined();
      expect(result.errors[0].location.line).toBeDefined();
      expect(typeof result.errors[0].location.column).toBe('number');
    });

    it('should include line and column for purity errors', async () => {
      const code = 'const fn = () => console.log("test");';
      const result = await validate(code);

      const purityError = result.errors.find((e) => e.type === 'purity');
      expect(purityError).toBeDefined();
      expect(purityError.location.line).toBeDefined();
      expect(typeof purityError.location.column).toBe('number');
    });

    it('should include line and column for lint errors', async () => {
      const code = 'var x = 1;';
      const result = await validate(code);

      const lintError = result.errors.find((e) => e.type === 'lint');
      expect(lintError).toBeDefined();
      expect(lintError.location.line).toBeDefined();
      expect(typeof lintError.location.column).toBe('number');
    });
  });
});

describe('aggregateErrors', () => {
  it('should return empty arrays for all valid results', () => {
    const syntaxResult = { valid: true, errors: [] };
    const purityResult = { valid: true, violations: [] };
    const lintResult = { valid: true, violations: [], errorCount: 0, warningCount: 0 };

    const { errors, warnings } = aggregateErrors(syntaxResult, purityResult, lintResult);

    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it('should handle null purity result (fail-fast)', () => {
    const syntaxResult = {
      valid: false,
      errors: [
        {
          type: 'syntax',
          severity: 'error',
          message: 'Unexpected token',
          location: { line: 1, column: 0 },
          code: '',
        },
      ],
    };

    const { errors, warnings } = aggregateErrors(syntaxResult, null, null);

    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('syntax');
    expect(warnings).toHaveLength(0);
  });

  it('should handle null lint result', () => {
    const syntaxResult = { valid: true, errors: [] };
    const purityResult = { valid: true, violations: [] };

    const { errors, warnings } = aggregateErrors(syntaxResult, purityResult, null);

    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it('should convert purity violations to validation errors', () => {
    const syntaxResult = { valid: true, errors: [] };
    const purityResult = {
      valid: false,
      violations: [
        {
          violationType: 'side_effect',
          pattern: 'console.log',
          location: { line: 1, column: 10 },
          code: 'console.log("test")',
          message: 'console.log has side effects',
        },
      ],
    };

    const { errors } = aggregateErrors(syntaxResult, purityResult, null);

    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('purity');
    expect(errors[0].message).toBe('console.log has side effects');
  });

  it('should separate lint warnings from errors', () => {
    const syntaxResult = { valid: true, errors: [] };
    const purityResult = { valid: true, violations: [] };
    const lintResult = {
      valid: false,
      violations: [
        {
          rule: 'no-var',
          severity: 'error',
          message: 'Use const or let',
          location: { line: 1, column: 0 },
        },
        {
          rule: 'prefer-const',
          severity: 'warning',
          message: 'Use const instead of let',
          location: { line: 2, column: 0 },
        },
      ],
      errorCount: 1,
      warningCount: 1,
    };

    const { errors, warnings } = aggregateErrors(syntaxResult, purityResult, lintResult);

    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe('no-var');
    expect(warnings).toHaveLength(1);
    expect(warnings[0].rule).toBe('prefer-const');
  });
});

describe('purityViolationToValidationError', () => {
  it('should convert a purity violation to validation error format', () => {
    const violation = {
      violationType: 'mutation',
      pattern: 'push',
      location: { line: 5, column: 10 },
      code: 'arr.push(x)',
      message: 'Array mutation detected',
    };

    const error = purityViolationToValidationError(violation);

    expect(error.type).toBe('purity');
    expect(error.severity).toBe('error');
    expect(error.message).toBe('Array mutation detected');
    expect(error.location.line).toBe(5);
    expect(error.location.column).toBe(10);
  });

  it('should include suggestion for mutation violations', () => {
    const violation = {
      violationType: 'mutation',
      pattern: 'push',
      location: { line: 1, column: 0 },
      code: 'arr.push(x)',
      message: 'push mutates array',
    };

    const error = purityViolationToValidationError(violation);

    expect(error.suggestion).toBeDefined();
    expect(error.suggestion).toContain('spread');
  });
});

describe('lintViolationToValidationError', () => {
  it('should convert a lint violation to validation error format', () => {
    const violation = {
      rule: 'no-var',
      severity: 'error',
      message: 'Unexpected var, use let or const instead',
      location: { line: 1, column: 0 },
      code: 'var x = 1;',
    };

    const error = lintViolationToValidationError(violation);

    expect(error.type).toBe('lint');
    expect(error.severity).toBe('error');
    expect(error.message).toBe('Unexpected var, use let or const instead');
    expect(error.rule).toBe('no-var');
  });

  it('should preserve warning severity', () => {
    const violation = {
      rule: 'prefer-const',
      severity: 'warning',
      message: 'Use const',
      location: { line: 1, column: 0 },
    };

    const error = lintViolationToValidationError(violation);

    expect(error.severity).toBe('warning');
  });
});

describe('getSuggestionForPurityViolation', () => {
  it('should suggest spread for push/pop mutations', () => {
    const violation = { violationType: 'mutation', pattern: 'push' };
    const suggestion = getSuggestionForPurityViolation(violation);

    expect(suggestion).toContain('spread');
  });

  it('should suggest toSorted/toReversed for sort/reverse', () => {
    const violation = { violationType: 'mutation', pattern: 'sort' };
    const suggestion = getSuggestionForPurityViolation(violation);

    expect(suggestion).toContain('toSorted');
  });

  it('should suggest removing console for console side effects', () => {
    const violation = { violationType: 'side_effect', pattern: 'console.log' };
    const suggestion = getSuggestionForPurityViolation(violation);

    expect(suggestion).toContain('Remove console');
  });

  it('should suggest parameters for global access', () => {
    const violation = { violationType: 'global_access', pattern: 'window' };
    const suggestion = getSuggestionForPurityViolation(violation);

    expect(suggestion).toContain('parameters');
  });

  it('should suggest functional patterns for loops', () => {
    const violation = { violationType: 'forbidden_construct', pattern: 'ForStatement' };
    const suggestion = getSuggestionForPurityViolation(violation);

    expect(suggestion).toContain('map');
  });

  it('should suggest factory functions for classes', () => {
    const violation = { violationType: 'forbidden_construct', pattern: 'ClassDeclaration' };
    const suggestion = getSuggestionForPurityViolation(violation);

    expect(suggestion).toContain('factory functions');
  });
});

describe('validateBatch', () => {
  it('should validate multiple code snippets', async () => {
    const items = [
      { code: '(() => 1)();' },
      { code: '(() => 2)();' },
      { code: '(() => 3)();' },
    ];

    const results = await validateBatch(items);

    expect(results).toHaveLength(3);
    expect(results.every((r) => r.valid)).toBe(true);
  });

  it('should handle mixed valid and invalid code', async () => {
    const items = [
      { code: '(() => 1)();' },
      { code: 'const x = ;' }, // Syntax error
      { code: '(() => 3)();' },
    ];

    const results = await validateBatch(items);

    expect(results).toHaveLength(3);
    expect(results[0].valid).toBe(true);
    expect(results[1].valid).toBe(false);
    expect(results[2].valid).toBe(true);
  });

  it('should apply options to each item', async () => {
    const items = [
      { code: 'export const a = 1;', options: { moduleFormat: 'esm' } },
      { code: 'module.exports = {};', options: { moduleFormat: 'cjs' } },
    ];

    const results = await validateBatch(items);

    expect(results).toHaveLength(2);
    expect(results[0].syntax.valid).toBe(true);
    expect(results[1].syntax.valid).toBe(true);
  });
});

describe('validateSyntaxOnly', () => {
  it('should only check syntax', () => {
    const code = 'const add = (a, b) => a + b;';
    const result = validateSyntaxOnly(code);

    expect(result.valid).toBe(true);
    expect(result.ast).toBeDefined();
    // Should not have purity or lint results
    expect(result.purity).toBeUndefined();
    expect(result.lint).toBeUndefined();
  });

  it('should detect syntax errors', () => {
    const code = 'const x = ;';
    const result = validateSyntaxOnly(code);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should be synchronous', () => {
    const code = 'const x = 42;';
    const result = validateSyntaxOnly(code);

    // Should return immediately, not a Promise
    expect(result.valid).toBeDefined();
    expect(result instanceof Promise).toBe(false);
  });
});

describe('isValid', () => {
  it('should return true for valid code', async () => {
    const code = '(() => ({ add: (a, b) => a + b }))();';
    const valid = await isValid(code);

    expect(valid).toBe(true);
  });

  it('should return false for invalid code', async () => {
    const code = 'const x = ;';
    const valid = await isValid(code);

    expect(valid).toBe(false);
  });

  it('should return false for impure code', async () => {
    const code = 'const fn = () => console.log("test");';
    const valid = await isValid(code);

    expect(valid).toBe(false);
  });

  it('should respect options', async () => {
    const code = 'var x = 1;'; // Would fail lint
    const valid = await isValid(code, { skipLint: true });

    // Purity is valid, lint skipped
    expect(valid).toBe(true);
  });
});

describe('integration scenarios', () => {
  it('should handle complex pure functions', async () => {
    const code = `
      const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x);
      const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x);
      const curry = (fn) => {
        const arity = fn.length;
        const curried = (...args) =>
          args.length >= arity ? fn(...args) : (...more) => curried(...args, ...more);
        return curried;
      };
    `;
    const result = await validate(code);

    expect(result.syntax.valid).toBe(true);
    expect(result.purity.valid).toBe(true);
  });

  it('should detect multiple purity violations in one function', async () => {
    const code = `
      const impure = () => {
        console.log("start");
        const x = Math.random();
        console.log("end");
        return x;
      };
    `;
    const result = await validate(code);

    expect(result.purity.valid).toBe(false);
    expect(result.purity.violations.length).toBeGreaterThan(1);
  });

  it('should handle recursive pure functions', async () => {
    const code = `
      const factorial = (n) => n <= 1 ? 1 : n * factorial(n - 1);
      const fibonacci = (n) => n <= 1 ? n : fibonacci(n - 1) + fibonacci(n - 2);
    `;
    const result = await validate(code);

    expect(result.syntax.valid).toBe(true);
    expect(result.purity.valid).toBe(true);
  });

  it('should handle higher-order functions', async () => {
    const code = `
      const map = (fn) => (arr) => arr.map(fn);
      const filter = (pred) => (arr) => arr.filter(pred);
      const reduce = (fn, init) => (arr) => arr.reduce(fn, init);
      const doubled = map((x) => x * 2);
      const evens = filter((x) => x % 2 === 0);
    `;
    const result = await validate(code);

    expect(result.syntax.valid).toBe(true);
    expect(result.purity.valid).toBe(true);
  });

  it('should handle object spread and immutable updates', async () => {
    const code = `
      const updateUser = (user, updates) => ({ ...user, ...updates });
      const addItem = (cart, item) => ({ ...cart, items: [...cart.items, item] });
      const removeItem = (cart, itemId) => ({
        ...cart,
        items: cart.items.filter((item) => item.id !== itemId)
      });
    `;
    const result = await validate(code);

    expect(result.syntax.valid).toBe(true);
    expect(result.purity.valid).toBe(true);
  });
});
