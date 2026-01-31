/**
 * Unit tests for the code generator module.
 *
 * @module test/unit/generation/generator
 */

const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Mock prettier to avoid ESM issues in Jest
jest.mock('prettier', () => ({
  format: jest.fn((code) => Promise.resolve(code)),
  resolveConfig: jest.fn(() => Promise.resolve(null)),
  check: jest.fn(() => Promise.resolve(true)),
  version: '3.0.0',
}));

const {
  generate,
  generateBatch,
  wrapWithExports,
  wrapWithESMExports,
  wrapWithCJSExports,
  resolveImports,
  generateESMImport,
  generateCJSImport,
  computeOutputPath,
  extractExportsFromCode,
} = require('../../../src/generation/generator');

describe('computeOutputPath', () => {
  it('should convert .feature to .js', () => {
    const result = computeOutputPath('features/math.feature', 'dist');

    expect(result).toBe(path.join('dist', 'math.js'));
  });

  it('should handle nested paths', () => {
    const result = computeOutputPath('features/project/utils.feature', 'output');

    expect(result).toBe(path.join('output', 'utils.js'));
  });

  it('should handle absolute paths', () => {
    const result = computeOutputPath('/home/user/features/test.feature', '/output');

    expect(result).toBe(path.join('/output', 'test.js'));
  });
});

describe('resolveImports', () => {
  describe('CommonJS', () => {
    it('should generate require for named imports', () => {
      const deps = [{ modulePath: './utils', named: ['add', 'multiply'] }];
      const result = resolveImports(deps, 'cjs');

      expect(result).toContain("require('./utils')");
      expect(result).toContain('{ add, multiply }');
    });

    it('should generate require for default import', () => {
      const deps = [{ modulePath: './math', default: 'math' }];
      const result = resolveImports(deps, 'cjs');

      expect(result).toContain("const math = require('./math')");
    });

    it('should handle multiple dependencies', () => {
      const deps = [
        { modulePath: './utils', named: ['helper'] },
        { modulePath: './math', default: 'math' },
      ];
      const result = resolveImports(deps, 'cjs');

      expect(result).toContain('./utils');
      expect(result).toContain('./math');
    });

    it('should return empty string for no dependencies', () => {
      expect(resolveImports([], 'cjs')).toBe('');
      expect(resolveImports(null, 'cjs')).toBe('');
    });
  });

  describe('ES Modules', () => {
    it('should generate import for named imports', () => {
      const deps = [{ modulePath: './utils', named: ['add', 'multiply'] }];
      const result = resolveImports(deps, 'esm');

      expect(result).toContain('import');
      expect(result).toContain('{ add, multiply }');
      expect(result).toContain('./utils.js');
    });

    it('should generate import for default import', () => {
      const deps = [{ modulePath: './math', default: 'math' }];
      const result = resolveImports(deps, 'esm');

      expect(result).toContain('import math');
      expect(result).toContain('./math.js');
    });

    it('should add .js extension for local modules', () => {
      const deps = [{ modulePath: './local', named: ['fn'] }];
      const result = resolveImports(deps, 'esm');

      expect(result).toContain('./local.js');
    });

    it('should not add .js for node_modules', () => {
      const deps = [{ modulePath: 'lodash', named: ['map'] }];
      const result = resolveImports(deps, 'esm');

      expect(result).toContain("from 'lodash'");
      expect(result).not.toContain('lodash.js');
    });
  });
});

describe('generateCJSImport', () => {
  it('should generate default require', () => {
    const result = generateCJSImport({ modulePath: './mod', default: 'mod' });

    expect(result).toBe("const mod = require('./mod');");
  });

  it('should generate destructured require', () => {
    const result = generateCJSImport({ modulePath: './mod', named: ['a', 'b'] });

    expect(result).toBe("const { a, b } = require('./mod');");
  });

  it('should handle namespace import', () => {
    const result = generateCJSImport({ modulePath: './mod', namespace: 'ns' });

    expect(result).toBe("const ns = require('./mod');");
  });
});

describe('generateESMImport', () => {
  it('should generate default import', () => {
    const result = generateESMImport({ modulePath: './mod', default: 'mod' });

    expect(result).toBe("import mod from './mod.js';");
  });

  it('should generate named import', () => {
    const result = generateESMImport({ modulePath: './mod', named: ['a', 'b'] });

    expect(result).toBe("import { a, b } from './mod.js';");
  });

  it('should combine default and named imports', () => {
    const result = generateESMImport({ modulePath: './mod', default: 'mod', named: ['a'] });

    expect(result).toBe("import mod, { a } from './mod.js';");
  });

  it('should generate namespace import', () => {
    const result = generateESMImport({ modulePath: './mod', namespace: 'ns' });

    expect(result).toContain('* as ns');
  });
});

describe('wrapWithExports', () => {
  const code = 'const add = (a, b) => a + b;';

  describe('CommonJS', () => {
    it('should wrap with module.exports for named exports', () => {
      const exports = [{ name: 'add', exportType: 'named' }];
      const result = wrapWithExports(code, exports, 'cjs');

      expect(result).toContain(code);
      expect(result).toContain('module.exports = { add }');
    });

    it('should wrap with module.exports = fn for default export', () => {
      const exports = [{ name: 'add', exportType: 'default' }];
      const result = wrapWithExports(code, exports, 'cjs');

      expect(result).toContain('module.exports = add');
    });

    it('should handle multiple named exports', () => {
      const exports = [
        { name: 'add', exportType: 'named' },
        { name: 'subtract', exportType: 'named' },
      ];
      const result = wrapWithExports(code, exports, 'cjs');

      expect(result).toContain('module.exports = { add, subtract }');
    });
  });

  describe('ES Modules', () => {
    it('should wrap with export { } for named exports', () => {
      const exports = [{ name: 'add', exportType: 'named' }];
      const result = wrapWithExports(code, exports, 'esm');

      expect(result).toContain(code);
      expect(result).toContain('export { add }');
    });

    it('should add export default for default export', () => {
      const exports = [{ name: 'add', exportType: 'default' }];
      const result = wrapWithExports(code, exports, 'esm');

      expect(result).toContain('export default add');
    });

    it('should handle both named and default exports', () => {
      const exports = [
        { name: 'add', exportType: 'named' },
        { name: 'main', exportType: 'default' },
      ];
      const result = wrapWithExports(code, exports, 'esm');

      expect(result).toContain('export { add }');
      expect(result).toContain('export default main');
    });
  });

  it('should return original code if no exports', () => {
    const result = wrapWithExports(code, [], 'cjs');
    expect(result).toBe(code);
  });
});

describe('wrapWithCJSExports', () => {
  it('should create module.exports object', () => {
    const code = 'const fn = () => 42;';
    const exports = [{ name: 'fn', exportType: 'named' }];

    const result = wrapWithCJSExports(code, exports);

    expect(result).toContain('module.exports = { fn }');
  });
});

describe('wrapWithESMExports', () => {
  it('should create export statement', () => {
    const code = 'const fn = () => 42;';
    const exports = [{ name: 'fn', exportType: 'named' }];

    const result = wrapWithESMExports(code, exports);

    expect(result).toContain('export { fn }');
  });
});

describe('extractExportsFromCode', () => {
  it('should extract arrow function declarations', () => {
    const code = `
      const add = (a, b) => a + b;
      const multiply = (x, y) => x * y;
    `;

    const exports = extractExportsFromCode(code);

    expect(exports).toHaveLength(2);
    expect(exports.map((e) => e.name)).toContain('add');
    expect(exports.map((e) => e.name)).toContain('multiply');
  });

  it('should extract function declarations', () => {
    const code = `
      function greet(name) {
        return 'Hello, ' + name;
      }
    `;

    const exports = extractExportsFromCode(code);

    expect(exports).toHaveLength(1);
    expect(exports[0].name).toBe('greet');
  });

  it('should handle mixed declarations', () => {
    const code = `
      const add = (a, b) => a + b;
      function subtract(a, b) {
        return a - b;
      }
    `;

    const exports = extractExportsFromCode(code);

    expect(exports).toHaveLength(2);
  });
});

describe('generate', () => {
  let tempDir;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'generator-test-'));
  });

  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should generate a module with correct structure', async () => {
    const code = 'const add = (a, b) => a + b;';
    const context = {
      sourcePath: 'features/math.feature',
      featureName: 'Math',
    };

    const result = await generate(code, context, {
      outputDir: tempDir,
      dryRun: true,
    });

    expect(result.sourcePath).toBe('features/math.feature');
    expect(result.outputPath).toContain('math.js');
    expect(result.code).toContain('add');
    expect(result.exports.length).toBeGreaterThan(0);
  });

  it('should format code by default', async () => {
    const code = 'const add=(a,b)=>a+b;';
    const context = {
      sourcePath: 'features/math.feature',
      featureName: 'Math',
    };

    const result = await generate(code, context, {
      outputDir: tempDir,
      dryRun: true,
    });

    // With mock prettier, formatted should be true
    expect(result.formatted).toBe(true);
    // The code should contain the add function
    expect(result.formattedCode).toContain('add');
    expect(result.formattedCode).toContain('=>');
  });

  it('should skip formatting when skipFormat is true', async () => {
    const code = 'const add=(a,b)=>a+b;';
    const context = {
      sourcePath: 'features/test.feature',
      featureName: 'Test',
    };

    const result = await generate(code, context, {
      outputDir: tempDir,
      dryRun: true,
      skipFormat: true,
    });

    expect(result.formatted).toBe(false);
  });

  it('should include JSDoc comments', async () => {
    const code = 'const add = (a, b) => a + b;';
    const context = {
      sourcePath: 'features/math.feature',
      featureName: 'Math',
    };

    const result = await generate(code, context, {
      outputDir: tempDir,
      dryRun: true,
    });

    expect(result.code).toContain('@module');
    expect(result.code).toContain('/**');
    expect(result.code).toContain('*/');
  });

  it('should include module exports for CommonJS', async () => {
    const code = 'const add = (a, b) => a + b;';
    const context = {
      sourcePath: 'features/math.feature',
      featureName: 'Math',
    };

    const result = await generate(code, context, {
      outputDir: tempDir,
      dryRun: true,
      moduleFormat: 'cjs',
    });

    expect(result.code).toContain('module.exports');
  });

  it('should include export statement for ES Modules', async () => {
    const code = 'const add = (a, b) => a + b;';
    const context = {
      sourcePath: 'features/math.feature',
      featureName: 'Math',
    };

    const result = await generate(code, context, {
      outputDir: tempDir,
      dryRun: true,
      moduleFormat: 'esm',
    });

    expect(result.code).toContain('export {');
  });

  it('should resolve imports', async () => {
    const code = 'const fn = (x) => helper(x);';
    const context = {
      sourcePath: 'features/main.feature',
      featureName: 'Main',
      dependencies: [
        { modulePath: './utils', named: ['helper'] },
      ],
    };

    const result = await generate(code, context, {
      outputDir: tempDir,
      dryRun: true,
      moduleFormat: 'cjs',
    });

    expect(result.code).toContain("require('./utils')");
    expect(result.imports.length).toBe(1);
  });

  it('should write file to disk when not dry run', async () => {
    const code = 'const add = (a, b) => a + b;';
    const context = {
      sourcePath: 'features/realfile.feature',
      featureName: 'RealFile',
    };

    const result = await generate(code, context, {
      outputDir: tempDir,
      dryRun: false,
    });

    // Check file was written
    const fileContent = await fs.readFile(result.outputPath, 'utf8');
    expect(fileContent).toContain('add');
  });
});

describe('generateBatch', () => {
  let tempDir;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'generator-batch-test-'));
  });

  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should generate multiple modules', async () => {
    const items = [
      {
        code: 'const add = (a, b) => a + b;',
        context: { sourcePath: 'f1.feature', featureName: 'F1' },
      },
      {
        code: 'const sub = (a, b) => a - b;',
        context: { sourcePath: 'f2.feature', featureName: 'F2' },
      },
    ];

    const results = await generateBatch(items, {
      outputDir: tempDir,
      dryRun: true,
    });

    expect(results).toHaveLength(2);
    expect(results[0].exports.map((e) => e.name)).toContain('add');
    expect(results[1].exports.map((e) => e.name)).toContain('sub');
  });
});
