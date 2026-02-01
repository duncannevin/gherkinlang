/**
 * Code generator for GherkinLang compiler.
 *
 * Writes validated JavaScript to the output directory with proper formatting
 * and documentation. Handles JSDoc generation, Prettier formatting, module
 * exports (CJS or ESM), and file writing with locking.
 *
 * @module generation/generator
 */

import fs from 'fs/promises';
import path from 'path';
import { formatCode } from './formatters/javascript.js';
import { createEmptyModule, createModuleExport } from './types.js';

/**
 * @typedef {import('./types').GeneratedModule} GeneratedModule
 * @typedef {import('./types').ModuleExport} ModuleExport
 * @typedef {import('./types').ModuleImport} ModuleImport
 * @typedef {import('./types').ParamInfo} ParamInfo
 */

/**
 * @typedef {Object} GenerationContext
 * @property {string} sourcePath - Original .feature file path
 * @property {string} featureName - Feature name (becomes module name)
 * @property {Object[]} [scenarios] - Parsed scenarios from Gherkin
 * @property {Object[]} [examples] - Gherkin Examples tables
 * @property {Dependency[]} [dependencies] - Cross-module dependencies
 * @property {Object} [config] - Project configuration
 */

/**
 * @typedef {Object} Dependency
 * @property {string} modulePath - Path to dependent module
 * @property {string[]} [named] - Named exports to import
 * @property {string} [default] - Default import name
 */

/**
 * @typedef {Object} GenerateOptions
 * @property {string} [outputDir] - Output directory (default from config)
 * @property {'cjs' | 'esm'} [moduleFormat='cjs'] - Module format
 * @property {boolean} [dryRun=false] - Generate without writing to disk
 * @property {boolean} [skipFormat=false] - Skip Prettier formatting
 * @property {Object} [prettierConfig] - Custom Prettier configuration
 */

/**
 * Lock options for proper-lockfile.
 * @type {Object}
 */
const LOCK_OPTIONS = {
  retries: {
    retries: 5,
    factor: 2,
    minTimeout: 100,
    maxTimeout: 1000,
  },
  stale: 10000, // 10 seconds
};

/**
 * Cached lockfile module.
 * @type {Object|null}
 */
let lockfileCache = null;

/**
 * Gets the proper-lockfile module (lazy loaded).
 *
 * @returns {Object|null} Lockfile module or null if not available
 */
const getLockfile = () => {
  if (lockfileCache) {
    return lockfileCache;
  }

  try {
    lockfileCache = require('proper-lockfile');
    return lockfileCache;
  } catch {
    return null;
  }
};

/**
 * Acquires a file lock for concurrent write protection.
 *
 * @param {string} filepath - Path to the file to lock
 * @returns {Promise<Function|null>} Release function or null if locking unavailable
 */
const acquireLock = async (filepath) => {
  const lockfile = getLockfile();

  if (!lockfile) {
    // Locking not available, return null
    return null;
  }

  try {
    // Ensure parent directory exists for the lock file
    const dir = path.dirname(filepath);
    await fs.mkdir(dir, { recursive: true });

    // Create a placeholder file if it doesn't exist
    try {
      await fs.access(filepath);
    } catch {
      await fs.writeFile(filepath, '', 'utf8');
    }

    const release = await lockfile.lock(filepath, LOCK_OPTIONS);
    return release;
  } catch (error) {
    // Lock acquisition failed, return null
    console.warn(`Failed to acquire lock for ${filepath}: ${error.message}`);
    return null;
  }
};

/**
 * Releases a file lock.
 *
 * @param {Function|null} release - Release function from acquireLock
 * @returns {Promise<void>}
 */
const releaseLock = async (release) => {
  if (release && typeof release === 'function') {
    try {
      await release();
    } catch {
      // Ignore release errors
    }
  }
};

/**
 * Ensures the output directory exists.
 *
 * @param {string} outputDir - Output directory path
 * @returns {Promise<void>}
 */
const ensureOutputDir = async (outputDir) => {
  await fs.mkdir(outputDir, { recursive: true });
};

/**
 * Ensures a package.json exists in the output directory for CommonJS modules.
 * This allows .js files to be treated as CommonJS even in an ESM project.
 * Also adds external dependencies to the package.json.
 *
 * @param {string} outputDir - Output directory path
 * @param {'cjs' | 'esm'} moduleFormat - Module format
 * @param {string[]} [externalDeps=[]] - External package dependencies to add
 * @returns {Promise<void>}
 */
const ensureOutputPackageJson = async (outputDir, moduleFormat, externalDeps = []) => {
  const pkgPath = path.join(outputDir, 'package.json');

  let pkg = {};

  // Try to read existing package.json
  try {
    const content = await fs.readFile(pkgPath, 'utf8');
    pkg = JSON.parse(content);
  } catch {
    // File doesn't exist or is invalid, start fresh
  }

  // Set type for CommonJS
  if (moduleFormat === 'cjs') {
    pkg.type = 'commonjs';
  }

  // Add external dependencies
  if (externalDeps.length > 0) {
    pkg.dependencies = pkg.dependencies || {};
    for (const dep of externalDeps) {
      if (!pkg.dependencies[dep]) {
        pkg.dependencies[dep] = '*'; // Use * to indicate "any version"
      }
    }
  }

  // Write updated package.json
  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
};

/**
 * Computes the output path from a source .feature file path.
 *
 * @param {string} sourcePath - Original .feature file path
 * @param {string} outputDir - Output directory
 * @param {'cjs' | 'esm'} [moduleFormat='esm'] - Module format
 * @returns {string} Output file path (.cjs for CommonJS, .js for ESM)
 *
 * @example
 * computeOutputPath('features/math.feature', 'dist', 'esm')
 * // => 'dist/math.js'
 * computeOutputPath('features/math.feature', 'dist', 'cjs')
 * // => 'dist/math.cjs'
 */
const computeOutputPath = (sourcePath, outputDir, moduleFormat = 'esm') => {
  const basename = path.basename(sourcePath, '.feature');
  // Always use .js extension
  return path.join(outputDir, `${basename}.js`);
};

/**
 * Generates import statements for dependencies.
 *
 * @param {Dependency[]} dependencies - Module dependencies
 * @param {'cjs' | 'esm'} moduleFormat - Module format
 * @returns {string} Import statements
 *
 * @example
 * // CommonJS
 * resolveImports([{ modulePath: './utils', named: ['add', 'multiply'] }], 'cjs')
 * // => "const { add, multiply } = require('./utils');"
 *
 * @example
 * // ES Modules
 * resolveImports([{ modulePath: './utils', named: ['add'], default: 'utils' }], 'esm')
 * // => "import utils, { add } from './utils.js';"
 */
const resolveImports = (dependencies, moduleFormat) => {
  if (!dependencies || dependencies.length === 0) {
    return '';
  }

  const lines = [];

  for (const dep of dependencies) {
    // Skip invalid dependencies
    if (!dep || !dep.modulePath) {
      continue;
    }

    if (moduleFormat === 'esm') {
      lines.push(generateESMImport(dep));
    } else {
      lines.push(generateCJSImport(dep));
    }
  }

  return lines.join('\n');
};

/**
 * Generates an ES Module import statement.
 *
 * @param {Dependency} dep - Dependency info
 * @returns {string} Import statement
 */
const generateESMImport = (dep) => {
  const parts = [];

  // Use module path as-is (no automatic extension adding)
  const modulePath = dep.modulePath;

  // Default import
  if (dep.default) {
    parts.push(dep.default);
  }

  // Named imports
  if (dep.named && dep.named.length > 0) {
    const namedPart = `{ ${dep.named.join(', ')} }`;
    parts.push(namedPart);
  }

  // Namespace import
  if (dep.namespace) {
    parts.push(`* as ${dep.namespace}`);
  }

  if (parts.length === 0) {
    // Side-effect only import
    return `import '${modulePath}';`;
  }

  return `import ${parts.join(', ')} from '${modulePath}';`;
};

/**
 * Generates a CommonJS require statement.
 *
 * @param {Dependency} dep - Dependency info
 * @returns {string} Require statement
 */
const generateCJSImport = (dep) => {
  const modulePath = dep.modulePath;

  // Default import only
  if (dep.default && (!dep.named || dep.named.length === 0)) {
    return `const ${dep.default} = require('${modulePath}');`;
  }

  // Named imports only
  if (dep.named && dep.named.length > 0 && !dep.default) {
    return `const { ${dep.named.join(', ')} } = require('${modulePath}');`;
  }

  // Both default and named
  if (dep.default && dep.named && dep.named.length > 0) {
    const lines = [
      `const ${dep.default} = require('${modulePath}');`,
      `const { ${dep.named.join(', ')} } = ${dep.default};`,
    ];
    return lines.join('\n');
  }

  // Namespace
  if (dep.namespace) {
    return `const ${dep.namespace} = require('${modulePath}');`;
  }

  // Side-effect only
  return `require('${modulePath}');`;
};

/**
 * Strips existing import statements from code.
 * This cleans up AI-generated code that may include its own imports.
 *
 * @param {string} code - JavaScript code that may contain import statements
 * @returns {string} Code with imports removed
 */
const stripImports = (code) => {
  let result = code;

  // Remove ESM import statements
  // import X from 'module';
  // import { X } from 'module';
  // import * as X from 'module';
  // import 'module';
  result = result.replace(/^import\s+.*?from\s+['"][^'"]+['"];\s*$/gm, '');
  result = result.replace(/^import\s+['"][^'"]+['"];\s*$/gm, '');

  // Remove CommonJS require statements (const X = require('module'))
  result = result.replace(/^(?:const|let|var)\s+\w+\s*=\s*require\s*\([^)]+\);\s*$/gm, '');
  result = result.replace(/^(?:const|let|var)\s+\{[^}]+\}\s*=\s*require\s*\([^)]+\);\s*$/gm, '');
  result = result.replace(/^require\s*\([^)]+\);\s*$/gm, '');

  // Clean up any duplicate blank lines created
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
};

/**
 * Strips existing export statements from code.
 * This cleans up AI-generated code that may include its own exports.
 *
 * @param {string} code - JavaScript code that may contain export statements
 * @returns {string} Code with exports removed
 */
const stripExports = (code) => {
  let result = code;

  // Remove inline `export ` before const/let/var/function declarations
  result = result.replace(/^export\s+(const|let|var|function|async\s+function)\s+/gm, '$1 ');

  // Remove `export default { ... };` blocks
  result = result.replace(/^export\s+default\s+\{[^}]*\};\s*$/gm, '');

  // Remove `export { ... };` blocks
  result = result.replace(/^export\s+\{[^}]*\};\s*$/gm, '');

  // Remove `module.exports = ...;` statements
  result = result.replace(/^module\.exports\s*=\s*\{[^}]*\};\s*$/gm, '');
  result = result.replace(/^module\.exports\s*=\s*\w+;\s*$/gm, '');

  // Remove `exports.name = ...;` statements
  result = result.replace(/^exports\.\w+\s*=\s*[^;]+;\s*$/gm, '');

  // Clean up any duplicate blank lines created
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
};

/**
 * Wraps code with appropriate module exports.
 *
 * @param {string} code - JavaScript code
 * @param {ModuleExport[]} exports - Functions to export
 * @param {'cjs' | 'esm'} moduleFormat - Module format
 * @returns {string} Code with exports
 *
 * @example
 * // CommonJS
 * wrapWithExports('const add = (a, b) => a + b;', [{ name: 'add', exportType: 'named' }], 'cjs')
 * // => "const add = (a, b) => a + b;\n\nmodule.exports = { add };"
 */
const wrapWithExports = (code, exports, moduleFormat) => {
  if (!exports || exports.length === 0) {
    return code;
  }

  if (moduleFormat === 'esm') {
    return wrapWithESMExports(code, exports);
  } else {
    return wrapWithCJSExports(code, exports);
  }
};

/**
 * Wraps code with ES Module exports.
 *
 * @param {string} code - JavaScript code
 * @param {ModuleExport[]} exports - Functions to export
 * @returns {string} Code with ESM exports
 */
const wrapWithESMExports = (code, exports) => {
  const namedExports = exports.filter((e) => e.exportType === 'named').map((e) => e.name);
  const defaultExport = exports.find((e) => e.exportType === 'default');

  const lines = [code, ''];

  // Add named exports
  if (namedExports.length > 0) {
    lines.push(`export { ${namedExports.join(', ')} };`);
  }

  // Add default export
  if (defaultExport) {
    lines.push(`export default ${defaultExport.name};`);
  }

  return lines.join('\n');
};

/**
 * Wraps code with CommonJS exports.
 *
 * @param {string} code - JavaScript code
 * @param {ModuleExport[]} exports - Functions to export
 * @returns {string} Code with CJS exports
 */
const wrapWithCJSExports = (code, exports) => {
  const namedExports = exports.filter((e) => e.exportType === 'named').map((e) => e.name);
  const defaultExport = exports.find((e) => e.exportType === 'default');

  const lines = [code, ''];

  if (defaultExport && namedExports.length === 0) {
    // Only default export
    lines.push(`module.exports = ${defaultExport.name};`);
  } else if (namedExports.length > 0) {
    // Named exports (with optional default)
    const exportObj = [...namedExports];
    if (defaultExport && !namedExports.includes(defaultExport.name)) {
      exportObj.push(defaultExport.name);
    }
    lines.push(`module.exports = { ${exportObj.join(', ')} };`);
  }

  return lines.join('\n');
};

/**
 * Extracts export information from code by parsing function declarations.
 *
 * @param {string} code - JavaScript code to analyze
 * @returns {ModuleExport[]} Extracted exports
 */
const extractExportsFromCode = (code) => {
  const exports = [];

  // Match const/let/var function declarations
  const funcPattern = /(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=])\s*=>/g;
  let match;

  while ((match = funcPattern.exec(code)) !== null) {
    exports.push(
      createModuleExport({
        name: match[1],
        exportType: 'named',
      })
    );
  }

  // Match function declarations
  const funcDeclPattern = /function\s+(\w+)\s*\(/g;

  while ((match = funcDeclPattern.exec(code)) !== null) {
    exports.push(
      createModuleExport({
        name: match[1],
        exportType: 'named',
      })
    );
  }

  return exports;
};

/**
 * Generates a JavaScript module from validated code.
 *
 * @param {string} validatedCode - Validated JavaScript code (from validator)
 * @param {GenerationContext} context - Generation context with metadata
 * @param {GenerateOptions} [options={}] - Generation options
 * @returns {Promise<GeneratedModule>} Generated module result
 *
 * @example
 * const result = await generate(validatedCode, {
 *   sourcePath: 'features/math.feature',
 *   featureName: 'Math',
 *   scenarios: [...],
 *   examples: [...]
 * });
 */
const generate = async (validatedCode, context, options = {}) => {
  const {
    outputDir = 'dist',
    moduleFormat: rawModuleFormat = 'cjs',
    dryRun = false,
    skipFormat = false,
    prettierConfig,
    externalDeps = [],
  } = options;

  // Normalize module format (commonjs -> cjs)
  const moduleFormat = rawModuleFormat === 'commonjs' ? 'cjs' : rawModuleFormat;

  const { sourcePath, dependencies } = context;

  // Compute output path (uses .cjs for CommonJS, .js for ESM)
  const outputPath = computeOutputPath(sourcePath, outputDir, moduleFormat);

  // Create result structure
  const result = createEmptyModule(sourcePath, outputPath);

  // Extract exports from the original code
  let exports = extractExportsFromCode(validatedCode);

  // Strip any existing imports and exports from the AI-generated code
  // The generator will add proper imports at the top and exports at the end
  const codeWithoutImports = stripImports(validatedCode);
  const cleanedCode = stripExports(codeWithoutImports);

  result.exports = exports;

  // Build imports section
  const importsSection = resolveImports(dependencies || [], moduleFormat);
  result.imports = dependencies?.map((d) => ({
    source: d.modulePath,
    named: d.named,
    default: d.default,
    namespace: d.namespace,
  })) || [];

  // Wrap with exports (AI already generates JSDoc, so we just add exports)
  const codeWithExports = wrapWithExports(cleanedCode, exports, moduleFormat);

  // Combine all parts
  const parts = [];

  // Add imports
  if (importsSection) {
    parts.push(importsSection);
    parts.push('');
  }

  // Add code with exports
  parts.push(codeWithExports);

  const assembledCode = parts.join('\n');
  result.code = assembledCode;

  // Format with Prettier
  if (!skipFormat) {
    const formatResult = await formatCode(assembledCode, {
      prettierConfig,
      filepath: outputPath,
    });

    result.formattedCode = formatResult.code;
    result.formatted = formatResult.formatted;

    if (formatResult.warning) {
      result.formatWarning = formatResult.warning;
    }
  } else {
    result.formattedCode = assembledCode;
    result.formatted = false;
  }

  // Write to disk (unless dry run)
  if (!dryRun) {
    await ensureOutputDir(outputDir);
    await ensureOutputPackageJson(outputDir, moduleFormat, externalDeps);

    // Acquire lock
    const release = await acquireLock(outputPath);

    try {
      // Write file
      await fs.writeFile(outputPath, result.formattedCode, 'utf8');
    } finally {
      // Release lock
      await releaseLock(release);
    }
  }

  return result;
};

/**
 * Generates multiple modules in batch.
 *
 * @param {Array<{code: string, context: GenerationContext}>} items - Items to generate
 * @param {GenerateOptions} [options={}] - Generation options
 * @returns {Promise<GeneratedModule[]>} Generated modules
 */
const generateBatch = async (items, options = {}) => {
  const results = [];

  for (const item of items) {
    const result = await generate(item.code, item.context, options);
    results.push(result);
  }

  return results;
};

export {
  generate,
  generateBatch,
  // Export utilities for testing and extension
  stripImports,
  stripExports,
  wrapWithExports,
  wrapWithESMExports,
  wrapWithCJSExports,
  resolveImports,
  generateESMImport,
  generateCJSImport,
  computeOutputPath,
  ensureOutputDir,
  ensureOutputPackageJson,
  acquireLock,
  releaseLock,
  extractExportsFromCode,
  // Constants
  LOCK_OPTIONS,
};
