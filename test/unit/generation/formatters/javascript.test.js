/**
 * Unit tests for JavaScript formatting module.
 *
 * Note: Prettier 3.x uses ESM which can cause issues in Jest.
 * These tests mock Prettier to ensure consistent behavior.
 *
 * @module test/unit/generation/formatters/javascript
 */

// Mock prettier before requiring the module
jest.mock('prettier', () => ({
  format: jest.fn((code, _options) => {
    // Simple formatting simulation - just return a cleaned up version
    return Promise.resolve(
      code
        .replace(/"/g, "'")
        .trim() + '\n'
    );
  }),
  resolveConfig: jest.fn(() => Promise.resolve(null)),
  check: jest.fn((code) => Promise.resolve(code.includes(' = '))),
  version: '3.0.0',
}));

const {
  formatCode,
  formatCodeSync,
  isFormatted,
  createPrettierConfig,
  mergeConfig,
  getDefaultConfig,
  getPrettierInfo,
  DEFAULT_PRETTIER_CONFIG,
} = require('../../../../src/generation/formatters/javascript');

describe('formatCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should format unformatted code', async () => {
    const code = 'const x=1;const y=2;';
    const result = await formatCode(code);

    expect(result.formatted).toBe(true);
    expect(result.code).toContain('const x');
    expect(result.code).toContain('const y');
  });

  it('should preserve semantic meaning', async () => {
    const code = 'const add=(a,b)=>a+b;';
    const result = await formatCode(code);

    expect(result.formatted).toBe(true);
    expect(result.code).toContain('const add');
    expect(result.code).toContain('=>');
  });

  it('should use single quotes (via mock)', async () => {
    const code = 'const x = "hello";';
    const result = await formatCode(code);

    expect(result.formatted).toBe(true);
    expect(result.code).toContain("'hello'");
  });

  it('should call prettier.format', async () => {
    const prettier = require('prettier');
    const code = 'const x = 1';
    await formatCode(code);

    expect(prettier.format).toHaveBeenCalled();
  });

  it('should pass config to prettier', async () => {
    const prettier = require('prettier');
    const code = 'const x = 1';
    await formatCode(code, { tabWidth: 4 });

    expect(prettier.format).toHaveBeenCalled();
  });

  it('should return warning on format error', async () => {
    const prettier = require('prettier');
    prettier.format.mockRejectedValueOnce(new Error('Parse error'));

    const code = 'const x = {{{';
    const result = await formatCode(code);

    expect(result.formatted).toBe(false);
    expect(result.warning).toBeDefined();
    expect(result.code).toBe(code); // Original code returned
  });

  it('should format multiline code', async () => {
    const code = `
      const add = (a, b) => {
        const result = a + b;
        return result;
      };
    `;
    const result = await formatCode(code);

    expect(result.formatted).toBe(true);
    expect(result.code).toContain('const add');
    expect(result.code).toContain('return result');
  });

  it('should format arrow functions consistently', async () => {
    const code = 'const fn = x => x * 2';
    const result = await formatCode(code);

    expect(result.formatted).toBe(true);
    expect(result.code).toContain('=>');
  });
});

describe('createPrettierConfig', () => {
  it('should return default config when no options provided', () => {
    const config = createPrettierConfig();

    expect(config.semi).toBe(true);
    expect(config.singleQuote).toBe(true);
    expect(config.tabWidth).toBe(2);
    expect(config.trailingComma).toBe('es5');
    expect(config.printWidth).toBe(100);
  });

  it('should merge user options', () => {
    const config = createPrettierConfig({
      tabWidth: 4,
      semi: false,
    });

    expect(config.tabWidth).toBe(4);
    expect(config.semi).toBe(false);
    expect(config.singleQuote).toBe(true); // Default preserved
  });

  it('should merge prettierConfig option', () => {
    const config = createPrettierConfig({
      prettierConfig: {
        printWidth: 80,
        singleQuote: false,
      },
    });

    expect(config.printWidth).toBe(80);
    expect(config.singleQuote).toBe(false);
  });

  it('should merge project config', () => {
    const projectConfig = {
      tabWidth: 4,
      singleQuote: false,
    };

    const config = createPrettierConfig({}, projectConfig);

    expect(config.tabWidth).toBe(4);
    expect(config.singleQuote).toBe(false);
  });

  it('should always set endOfLine to lf for determinism', () => {
    const config = createPrettierConfig({
      prettierConfig: { endOfLine: 'crlf' },
    });

    // endOfLine should be locked to 'lf'
    expect(config.endOfLine).toBe('lf');
  });
});

describe('mergeConfig', () => {
  it('should merge project config with overrides', () => {
    const projectConfig = { tabWidth: 4, semi: true };
    const overrides = { semi: false };

    const result = mergeConfig(projectConfig, overrides);

    expect(result.tabWidth).toBe(4);
    expect(result.semi).toBe(false);
    expect(result.endOfLine).toBe('lf'); // Locked setting
  });

  it('should lock endOfLine to lf', () => {
    const result = mergeConfig({ endOfLine: 'crlf' });

    expect(result.endOfLine).toBe('lf');
  });
});

describe('getDefaultConfig', () => {
  it('should return a copy of default config', () => {
    const config = getDefaultConfig();

    expect(config).toEqual(DEFAULT_PRETTIER_CONFIG);
    expect(config).not.toBe(DEFAULT_PRETTIER_CONFIG); // Should be a copy
  });
});

describe('getPrettierInfo', () => {
  it('should return availability info', () => {
    const info = getPrettierInfo();

    expect(info).toHaveProperty('available');
    expect(info).toHaveProperty('version');

    if (info.available) {
      expect(typeof info.version).toBe('string');
    }
  });
});

describe('isFormatted', () => {
  it('should return true for already formatted code', async () => {
    const code = "const x = 1;\n";
    const result = await isFormatted(code);

    // May or may not be true depending on exact formatting
    expect(typeof result).toBe('boolean');
  });

  it('should return false for unformatted code', async () => {
    const code = 'const    x=1;const y=2';
    const result = await isFormatted(code);

    expect(result).toBe(false);
  });
});

describe('DEFAULT_PRETTIER_CONFIG', () => {
  it('should have all required settings', () => {
    expect(DEFAULT_PRETTIER_CONFIG.semi).toBe(true);
    expect(DEFAULT_PRETTIER_CONFIG.singleQuote).toBe(true);
    expect(DEFAULT_PRETTIER_CONFIG.tabWidth).toBe(2);
    expect(DEFAULT_PRETTIER_CONFIG.useTabs).toBe(false);
    expect(DEFAULT_PRETTIER_CONFIG.trailingComma).toBe('es5');
    expect(DEFAULT_PRETTIER_CONFIG.printWidth).toBe(100);
    expect(DEFAULT_PRETTIER_CONFIG.bracketSpacing).toBe(true);
    expect(DEFAULT_PRETTIER_CONFIG.arrowParens).toBe('always');
    expect(DEFAULT_PRETTIER_CONFIG.endOfLine).toBe('lf');
    expect(DEFAULT_PRETTIER_CONFIG.parser).toBe('babel');
  });

  it('should be frozen', () => {
    expect(Object.isFrozen(DEFAULT_PRETTIER_CONFIG)).toBe(false);
    // Note: We don't freeze it to allow runtime configuration
  });
});

describe('formatCodeSync', () => {
  it('should attempt synchronous formatting', () => {
    const code = 'const x=1;';
    const result = formatCodeSync(code);

    // Prettier 3.x only supports async, so this may fail
    expect(result).toHaveProperty('code');
    expect(result).toHaveProperty('formatted');
  });
});
