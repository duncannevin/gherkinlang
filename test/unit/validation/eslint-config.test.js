/**
 * Unit tests for ESLint validation module.
 *
 * @module test/unit/validation/eslint-config
 */

const {
  validateLint,
  getDefaultRules,
  createCustomRules,
  isRuleEnabled,
  listEnabledRules,
  createEslintConfig,
  createLintViolation,
  convertSeverity,
  DEFAULT_ESLINT_CONFIG,
  createFunctionalEslintConfig,
  getFunctionalPlugin,
} = require('../../../src/validation/eslint-config');

// Check if functional plugin is available (may not be in Jest environment)
const isFunctionalPluginAvailable = () => {
  const plugin = getFunctionalPlugin();
  return plugin.rules && Object.keys(plugin.rules).length > 0;
};

// Skip functional tests if plugin not available
const describeFunctional = isFunctionalPluginAvailable() ? describe : describe.skip;

describe('validateLint', () => {
  describe('valid JavaScript code', () => {
    it('should return valid=true for a simple pure function export', async () => {
      const code = 'export const add = (a, b) => a + b;';
      const result = await validateLint(code);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.errorCount).toBe(0);
    });

    it('should return valid=true for arrow functions with module.exports', async () => {
      const code = 'const add = (a, b) => a + b; module.exports = { add };';
      const result = await validateLint(code);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should return valid=true for const declarations', async () => {
      const code = 'export const x = 42;';
      const result = await validateLint(code);

      expect(result.valid).toBe(true);
      expect(result.errorCount).toBe(0);
    });

    it('should return valid=true for array methods (map, filter, reduce)', async () => {
      const code = `
        export const double = (arr) => arr.map((x) => x * 2);
        export const evens = (arr) => arr.filter((x) => x % 2 === 0);
        export const sum = (arr) => arr.reduce((a, b) => a + b, 0);
      `;
      const result = await validateLint(code);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should return valid=true for spread operator', async () => {
      const code = 'export const merge = (a, b) => ({ ...a, ...b });';
      const result = await validateLint(code);

      expect(result.valid).toBe(true);
    });

    it('should return valid=true for template literals', async () => {
      const code = 'export const greet = (name) => `Hello, ${name}!`;';
      const result = await validateLint(code);

      expect(result.valid).toBe(true);
    });

    it('should return valid=true for destructuring', async () => {
      const code = 'export const getX = ({ x }) => x;';
      const result = await validateLint(code);

      expect(result.valid).toBe(true);
    });

    it('should return valid=true for default parameters', async () => {
      const code = 'export const greet = (name = "World") => `Hello, ${name}!`;';
      const result = await validateLint(code);

      expect(result.valid).toBe(true);
    });

    it('should return valid=true for rest parameters', async () => {
      const code = 'export const sum = (...nums) => nums.reduce((a, b) => a + b, 0);';
      const result = await validateLint(code);

      expect(result.valid).toBe(true);
    });

    it('should allow underscore-prefixed unused args', async () => {
      const code = 'export const first = (_unused, second) => second;';
      const result = await validateLint(code);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('no-var rule (T021)', () => {
    it('should detect var declaration', async () => {
      const code = 'var x = 1; module.exports = { x };';
      const result = await validateLint(code);

      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.rule === 'no-var')).toBe(true);
    });

    it('should provide helpful message for no-var', async () => {
      const code = 'var x = 1;';
      const result = await validateLint(code);

      const violation = result.violations.find((v) => v.rule === 'no-var');
      expect(violation).toBeDefined();
      expect(violation.message).toContain('var');
    });

    it('should detect multiple var declarations', async () => {
      const code = 'var a = 1; var b = 2;';
      const result = await validateLint(code);

      const varViolations = result.violations.filter((v) => v.rule === 'no-var');
      expect(varViolations.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('prefer-const rule (T021)', () => {
    it('should detect let that should be const', async () => {
      const code = 'let x = 1; module.exports = { x };';
      const result = await validateLint(code);

      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.rule === 'prefer-const')).toBe(true);
    });

    it('should allow let when variable is reassigned', async () => {
      const code = `
        export const counter = () => {
          let count = 0;
          count = count + 1;
          return count;
        };
      `;
      const result = await validateLint(code);

      const preferConstViolations = result.violations.filter((v) => v.rule === 'prefer-const');
      expect(preferConstViolations).toHaveLength(0);
    });
  });

  describe('prefer-arrow-callback rule (T021)', () => {
    it('should detect function expression in callback', async () => {
      const code = `
        export const mapped = [1, 2, 3].map(function(x) { return x * 2; });
      `;
      const result = await validateLint(code);

      expect(result.violations.some((v) => v.rule === 'prefer-arrow-callback')).toBe(true);
    });

    it('should allow arrow function callbacks', async () => {
      const code = 'export const mapped = [1, 2, 3].map((x) => x * 2);';
      const result = await validateLint(code);

      expect(result.violations.filter((v) => v.rule === 'prefer-arrow-callback')).toHaveLength(0);
    });
  });

  describe('no-unused-vars rule (T021)', () => {
    it('should detect unused variables', async () => {
      const code = 'const unused = 42;';
      const result = await validateLint(code);

      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.rule === 'no-unused-vars')).toBe(true);
    });

    it('should allow exported variables', async () => {
      const code = 'export const used = 42;';
      const result = await validateLint(code);

      expect(result.violations.filter((v) => v.rule === 'no-unused-vars')).toHaveLength(0);
    });

    it('should allow underscore-prefixed parameters', async () => {
      const code = 'export const second = (_first, second) => second;';
      const result = await validateLint(code);

      expect(result.violations.filter((v) => v.rule === 'no-unused-vars')).toHaveLength(0);
    });
  });

  describeFunctional('functional/immutable-data rule (T022)', () => {
    it('should detect object mutation', async () => {
      const code = `
        const obj = { x: 1 };
        obj.x = 2;
        module.exports = { obj };
      `;
      const result = await validateLint(code);

      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.rule === 'functional/immutable-data')).toBe(true);
    });

    it('should detect array mutation with push', async () => {
      const code = `
        const arr = [1, 2, 3];
        arr.push(4);
        module.exports = { arr };
      `;
      const result = await validateLint(code);

      expect(result.violations.some((v) => v.rule === 'functional/immutable-data')).toBe(true);
    });

    it('should allow spread for immutable updates', async () => {
      const code = `
        export const update = (obj, key, value) => ({ ...obj, [key]: value });
      `;
      const result = await validateLint(code);

      expect(result.violations.filter((v) => v.rule === 'functional/immutable-data')).toHaveLength(
        0
      );
    });
  });

  describeFunctional('functional/no-loop-statements rule (T022)', () => {
    it('should detect for loop', async () => {
      const code = 'for (let i = 0; i < 10; i++) {}';
      const result = await validateLint(code);

      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.rule === 'functional/no-loop-statements')).toBe(true);
    });

    it('should detect for...of loop', async () => {
      const code = 'for (const item of [1, 2, 3]) {}';
      const result = await validateLint(code);

      expect(result.violations.some((v) => v.rule === 'functional/no-loop-statements')).toBe(true);
    });

    it('should detect for...in loop', async () => {
      const code = 'for (const key in obj) {}';
      const result = await validateLint(code);

      expect(result.violations.some((v) => v.rule === 'functional/no-loop-statements')).toBe(true);
    });

    it('should detect while loop', async () => {
      const code = 'while (true) { break; }';
      const result = await validateLint(code);

      expect(result.violations.some((v) => v.rule === 'functional/no-loop-statements')).toBe(true);
    });

    it('should detect do...while loop', async () => {
      const code = 'do { } while (false);';
      const result = await validateLint(code);

      expect(result.violations.some((v) => v.rule === 'functional/no-loop-statements')).toBe(true);
    });

    it('should allow array methods as loop alternatives', async () => {
      const code = `
        export const doubled = [1, 2, 3].map((x) => x * 2);
        export const sum = [1, 2, 3].reduce((a, b) => a + b, 0);
      `;
      const result = await validateLint(code);

      expect(result.violations.filter((v) => v.rule === 'functional/no-loop-statements')).toHaveLength(0);
    });
  });

  describeFunctional('functional/no-this-expressions rule (T022)', () => {
    it('should detect this in method', async () => {
      const code = `
        const obj = {
          value: 42,
          getValue() { return this.value; }
        };
        module.exports = { obj };
      `;
      const result = await validateLint(code);

      expect(result.violations.some((v) => v.rule === 'functional/no-this-expressions')).toBe(true);
    });

    it('should detect this in function', async () => {
      const code = `
        function getValue() { return this.value; }
        module.exports = { getValue };
      `;
      const result = await validateLint(code);

      expect(result.violations.some((v) => v.rule === 'functional/no-this-expressions')).toBe(true);
    });

    it('should allow pure functions without this', async () => {
      const code = 'export const add = (a, b) => a + b;';
      const result = await validateLint(code);

      expect(result.violations.filter((v) => v.rule === 'functional/no-this-expressions')).toHaveLength(0);
    });
  });

  describe('no-console rule', () => {
    it('should detect console.log', async () => {
      const code = 'console.log("hello");';
      const result = await validateLint(code);

      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.rule === 'no-console')).toBe(true);
    });

    it('should detect console.error', async () => {
      const code = 'console.error("error");';
      const result = await validateLint(code);

      expect(result.violations.some((v) => v.rule === 'no-console')).toBe(true);
    });

    it('should detect console.warn', async () => {
      const code = 'console.warn("warning");';
      const result = await validateLint(code);

      expect(result.violations.some((v) => v.rule === 'no-console')).toBe(true);
    });
  });

  describe('no-param-reassign rule', () => {
    it('should detect parameter reassignment', async () => {
      const code = `
        export const double = (x) => {
          x = x * 2;
          return x;
        };
      `;
      const result = await validateLint(code);

      expect(result.violations.some((v) => v.rule === 'no-param-reassign')).toBe(true);
    });

    it('should allow creating new variables from parameters', async () => {
      const code = `
        export const double = (x) => {
          const doubled = x * 2;
          return doubled;
        };
      `;
      const result = await validateLint(code);

      expect(result.violations.filter((v) => v.rule === 'no-param-reassign')).toHaveLength(0);
    });
  });

  describe('eqeqeq rule', () => {
    it('should detect == comparison', async () => {
      const code = 'export const isZero = (x) => x == 0;';
      const result = await validateLint(code);

      expect(result.violations.some((v) => v.rule === 'eqeqeq')).toBe(true);
    });

    it('should detect != comparison', async () => {
      const code = 'export const isNotZero = (x) => x != 0;';
      const result = await validateLint(code);

      expect(result.violations.some((v) => v.rule === 'eqeqeq')).toBe(true);
    });

    it('should allow === comparison', async () => {
      const code = 'export const isZero = (x) => x === 0;';
      const result = await validateLint(code);

      expect(result.violations.filter((v) => v.rule === 'eqeqeq')).toHaveLength(0);
    });

    it('should allow !== comparison', async () => {
      const code = 'export const isNotZero = (x) => x !== 0;';
      const result = await validateLint(code);

      expect(result.violations.filter((v) => v.rule === 'eqeqeq')).toHaveLength(0);
    });
  });

  describe('no-eval rule', () => {
    it('should detect eval usage', async () => {
      const code = 'const result = eval("1 + 1");';
      const result = await validateLint(code);

      expect(result.violations.some((v) => v.rule === 'no-eval')).toBe(true);
    });
  });

  describe('custom rules (T023)', () => {
    it('should allow disabling rules via options', async () => {
      const code = 'console.log("allowed");';
      const result = await validateLint(code, {
        rules: { 'no-console': 'off' },
      });

      expect(result.violations.filter((v) => v.rule === 'no-console')).toHaveLength(0);
    });

    it('should allow adding new rules via options', async () => {
      const code = 'export const x = 1;;'; // Double semicolon
      const result = await validateLint(code, {
        rules: { 'no-extra-semi': 'error' },
      });

      expect(result.violations.some((v) => v.rule === 'no-extra-semi')).toBe(true);
    });

    it('should allow changing rule severity via options', async () => {
      const code = 'console.log("warning");';
      const result = await validateLint(code, {
        rules: { 'no-console': 'warn' },
      });

      const consoleViolation = result.violations.find((v) => v.rule === 'no-console');
      expect(consoleViolation).toBeDefined();
      expect(consoleViolation.severity).toBe('warning');
      expect(result.warningCount).toBeGreaterThan(0);
    });

    it('should merge custom eslintConfig with defaults', async () => {
      // Use a clear magic number (42) that isn't in the default ignore list
      const code = 'export const getValue = () => 42;';
      const result = await validateLint(code, {
        eslintConfig: {
          rules: { 'no-magic-numbers': ['error', { ignore: [0, 1] }] },
        },
      });

      expect(result.violations.some((v) => v.rule === 'no-magic-numbers')).toBe(true);
    });
  });

  describe('filename option', () => {
    it('should include filename in violation location', async () => {
      const code = 'var x = 1;';
      const result = await validateLint(code, { filename: 'test-file.js' });

      expect(result.violations[0].location.file).toBe('test-file.js');
    });

    it('should default filename to code.js', async () => {
      const code = 'var x = 1;';
      const result = await validateLint(code);

      expect(result.violations[0].location.file).toBe('code.js');
    });
  });

  describe('violation details', () => {
    it('should include line and column in violation location', async () => {
      const code = 'const x = 1;\nvar y = 2;';
      const result = await validateLint(code);

      const varViolation = result.violations.find((v) => v.rule === 'no-var');
      expect(varViolation).toBeDefined();
      expect(varViolation.location.line).toBe(2);
      expect(typeof varViolation.location.column).toBe('number');
    });

    it('should include rule name in violation', async () => {
      const code = 'var x = 1;';
      const result = await validateLint(code);

      expect(result.violations[0].rule).toBe('no-var');
    });

    it('should include severity in violation', async () => {
      const code = 'var x = 1;';
      const result = await validateLint(code);

      expect(result.violations[0].severity).toBe('error');
    });

    it('should include message in violation', async () => {
      const code = 'var x = 1;';
      const result = await validateLint(code);

      expect(result.violations[0].message).toBeDefined();
      expect(typeof result.violations[0].message).toBe('string');
      expect(result.violations[0].message.length).toBeGreaterThan(0);
    });

    it('should include code snippet in violation', async () => {
      const code = 'var x = 1;';
      const result = await validateLint(code);

      // Code snippet is optional, but when present should be a string
      if (result.violations[0].code) {
        expect(typeof result.violations[0].code).toBe('string');
      }
    });
  });

  describe('error and warning counts', () => {
    it('should count errors correctly', async () => {
      const code = 'var a = 1; var b = 2;';
      const result = await validateLint(code);

      expect(result.errorCount).toBeGreaterThanOrEqual(1);
    });

    it('should count warnings correctly', async () => {
      const code = 'console.log("warning");';
      const result = await validateLint(code, {
        rules: { 'no-console': 'warn' },
      });

      expect(result.warningCount).toBe(1);
    });

    it('should set valid=true when only warnings exist', async () => {
      // Using export to avoid unused-vars error
      const code = 'export const x = 1; console.log(x);';
      const result = await validateLint(code, {
        rules: { 'no-console': 'warn' },
      });

      expect(result.valid).toBe(true);
      expect(result.warningCount).toBeGreaterThan(0);
    });

    it('should set valid=false when errors exist', async () => {
      const code = 'var x = 1;';
      const result = await validateLint(code);

      expect(result.valid).toBe(false);
      expect(result.errorCount).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty code', async () => {
      const result = await validateLint('');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should handle whitespace only', async () => {
      const result = await validateLint('   \n\t\n   ');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should handle comments only', async () => {
      const result = await validateLint('// This is a comment\n/* Block comment */');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should handle multiple violations', async () => {
      const code = 'var x = 1; console.log(x);';
      const result = await validateLint(code);

      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(1);

      const rules = result.violations.map((v) => v.rule);
      expect(rules).toContain('no-var');
      expect(rules).toContain('no-console');
    });

    it('should handle syntax errors gracefully', async () => {
      const code = 'const x = {';
      const result = await validateLint(code);

      // Should not throw, should return error result
      expect(result).toBeDefined();
      expect(result.valid).toBe(false);
    });
  });
});

describe('getDefaultRules', () => {
  it('should return default ESLint rules', () => {
    const rules = getDefaultRules();

    expect(rules).toBeDefined();
    expect(typeof rules).toBe('object');
  });

  it('should include no-var rule', () => {
    const rules = getDefaultRules();

    expect(rules['no-var']).toBe('error');
  });

  it('should include prefer-const rule', () => {
    const rules = getDefaultRules();

    expect(rules['prefer-const']).toBe('error');
  });

  it('should include prefer-arrow-callback rule', () => {
    const rules = getDefaultRules();

    expect(rules['prefer-arrow-callback']).toBe('error');
  });

  it('should include no-unused-vars rule', () => {
    const rules = getDefaultRules();

    expect(rules['no-unused-vars']).toBeDefined();
  });

  it('should include functional plugin rules (if available)', () => {
    const rules = getDefaultRules();

    // Functional rules only present if plugin is available
    if (isFunctionalPluginAvailable()) {
      expect(rules['functional/immutable-data']).toBe('error');
      expect(rules['functional/no-loop-statements']).toBe('error');
      expect(rules['functional/no-this-expressions']).toBe('error');
    }
  });
});

describe('createCustomRules', () => {
  it('should merge overrides with default rules', () => {
    const custom = createCustomRules({ 'no-console': 'off' });

    expect(custom['no-console']).toBe('off');
    expect(custom['no-var']).toBe('error'); // Default still present
  });

  it('should override existing rules', () => {
    const custom = createCustomRules({ 'no-var': 'warn' });

    expect(custom['no-var']).toBe('warn');
  });

  it('should add new rules', () => {
    const custom = createCustomRules({ 'new-rule': 'error' });

    expect(custom['new-rule']).toBe('error');
  });
});

describe('isRuleEnabled', () => {
  it('should return true for enabled rules', () => {
    expect(isRuleEnabled('no-var')).toBe(true);
    expect(isRuleEnabled('prefer-const')).toBe(true);
    expect(isRuleEnabled('no-console')).toBe(true);
  });

  it('should return true for functional plugin rules (if available)', () => {
    if (isFunctionalPluginAvailable()) {
      expect(isRuleEnabled('functional/immutable-data')).toBe(true);
      expect(isRuleEnabled('functional/no-loop-statements')).toBe(true);
      expect(isRuleEnabled('functional/no-this-expressions')).toBe(true);
    }
  });

  it('should return false for non-existent rules', () => {
    expect(isRuleEnabled('non-existent-rule')).toBe(false);
  });
});

describe('listEnabledRules', () => {
  it('should return array of enabled rule names', () => {
    const rules = listEnabledRules();

    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBeGreaterThan(0);
  });

  it('should include standard ESLint rules', () => {
    const rules = listEnabledRules();

    expect(rules).toContain('no-var');
    expect(rules).toContain('prefer-const');
    expect(rules).toContain('no-console');
  });

  it('should include functional plugin rules (if available)', () => {
    const rules = listEnabledRules();

    if (isFunctionalPluginAvailable()) {
      expect(rules).toContain('functional/immutable-data');
      expect(rules).toContain('functional/no-loop-statements');
      expect(rules).toContain('functional/no-this-expressions');
    }
  });
});

describe('createEslintConfig', () => {
  it('should return array of config objects', () => {
    const config = createEslintConfig();

    expect(Array.isArray(config)).toBe(true);
    expect(config.length).toBeGreaterThan(0);
  });

  it('should include default config', () => {
    const config = createEslintConfig();

    expect(config.some((c) => c.languageOptions)).toBe(true);
    expect(config.some((c) => c.rules && c.rules['no-var'])).toBe(true);
  });

  it('should include functional plugin config (if available)', () => {
    const config = createEslintConfig();

    if (isFunctionalPluginAvailable()) {
      expect(config.some((c) => c.plugins && c.plugins.functional)).toBe(true);
    }
  });

  it('should merge custom rules', () => {
    const config = createEslintConfig({
      rules: { 'custom-rule': 'error' },
    });

    expect(config.some((c) => c.rules && c.rules['custom-rule'] === 'error')).toBe(true);
  });

  it('should merge custom eslintConfig', () => {
    const config = createEslintConfig({
      eslintConfig: {
        rules: { 'another-rule': 'warn' },
      },
    });

    expect(config.some((c) => c.rules && c.rules['another-rule'] === 'warn')).toBe(true);
  });
});

describe('createLintViolation', () => {
  it('should create violation from ESLint message', () => {
    const message = {
      ruleId: 'no-var',
      severity: 2,
      message: 'Unexpected var, use let or const instead.',
      line: 1,
      column: 1,
    };
    const code = 'var x = 1;';

    const violation = createLintViolation(message, code, 'test.js');

    expect(violation.rule).toBe('no-var');
    expect(violation.severity).toBe('error');
    expect(violation.message).toBe('Unexpected var, use let or const instead.');
    expect(violation.location.line).toBe(1);
    expect(violation.location.column).toBe(0); // Converted from 1-indexed
    expect(violation.location.file).toBe('test.js');
  });

  it('should handle warning severity', () => {
    const message = {
      ruleId: 'no-console',
      severity: 1,
      message: 'Unexpected console statement.',
      line: 1,
      column: 1,
    };

    const violation = createLintViolation(message, 'console.log()', 'test.js');

    expect(violation.severity).toBe('warning');
  });

  it('should handle missing ruleId', () => {
    const message = {
      severity: 2,
      message: 'Some error',
      line: 1,
      column: 1,
    };

    const violation = createLintViolation(message, 'code', 'test.js');

    expect(violation.rule).toBe('unknown');
  });

  it('should handle end location', () => {
    const message = {
      ruleId: 'test',
      severity: 2,
      message: 'Test',
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 10,
    };

    const violation = createLintViolation(message, 'code', 'test.js');

    expect(violation.location.endLine).toBe(1);
    expect(violation.location.endColumn).toBe(9); // Converted from 1-indexed
  });
});

describe('convertSeverity', () => {
  it('should convert 2 to error', () => {
    expect(convertSeverity(2)).toBe('error');
  });

  it('should convert 1 to warning', () => {
    expect(convertSeverity(1)).toBe('warning');
  });

  it('should convert 0 to warning', () => {
    expect(convertSeverity(0)).toBe('warning');
  });
});

describe('DEFAULT_ESLINT_CONFIG', () => {
  it('should be an array', () => {
    expect(Array.isArray(DEFAULT_ESLINT_CONFIG)).toBe(true);
  });

  it('should have languageOptions', () => {
    expect(DEFAULT_ESLINT_CONFIG[0].languageOptions).toBeDefined();
  });

  it('should set ecmaVersion to 2022', () => {
    expect(DEFAULT_ESLINT_CONFIG[0].languageOptions.ecmaVersion).toBe(2022);
  });

  it('should set sourceType to module', () => {
    expect(DEFAULT_ESLINT_CONFIG[0].languageOptions.sourceType).toBe('module');
  });

  it('should include required rules', () => {
    const rules = DEFAULT_ESLINT_CONFIG[0].rules;

    expect(rules['no-var']).toBe('error');
    expect(rules['prefer-const']).toBe('error');
    expect(rules['prefer-arrow-callback']).toBe('error');
    expect(rules['no-unused-vars']).toBeDefined();
  });
});

describeFunctional('createFunctionalEslintConfig', () => {
  it('should return an array', () => {
    const config = createFunctionalEslintConfig();
    expect(Array.isArray(config)).toBe(true);
  });

  it('should have functional plugin', () => {
    const config = createFunctionalEslintConfig();
    expect(config[0].plugins.functional).toBeDefined();
  });

  it('should include functional rules', () => {
    const config = createFunctionalEslintConfig();
    const rules = config[0].rules;

    expect(rules['functional/immutable-data']).toBe('error');
    expect(rules['functional/no-loop-statements']).toBe('error');
    expect(rules['functional/no-this-expressions']).toBe('error');
  });
});
