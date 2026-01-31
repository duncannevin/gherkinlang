/**
 * Code generator for GherkinLang compiler.
 *
 * Writes validated JavaScript to the output directory with proper formatting
 * and documentation. Handles JSDoc generation, Prettier formatting, module
 * exports (CJS or ESM), and file writing with locking.
 *
 * @module generation/generator
 */

const fs = require('fs').promises;
const path = require('path');
const { formatCode } = require('./formatters/javascript');
const { generateFunctionJSDoc, generateModuleJSDoc } = require('./formatters/jsdoc');
const { createEmptyModule, createModuleExport } = require('./types');

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
 * Computes the output path from a source .feature file path.
 *
 * @param {string} sourcePath - Original .feature file path
 * @param {string} outputDir - Output directory
 * @returns {string} Output .js file path
 *
 * @example
 * computeOutputPath('features/math.feature', 'dist')
 * // => 'dist/math.js'
 */
const computeOutputPath = (sourcePath, outputDir) => {
  const basename = path.basename(sourcePath, '.feature');
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

  // Add .js extension for ESM if not present (only for relative paths)
  let modulePath = dep.modulePath;
  const isRelative = modulePath.startsWith('./') || modulePath.startsWith('../');
  const isScoped = modulePath.startsWith('@');
  const hasExtension = modulePath.endsWith('.js') || modulePath.endsWith('.mjs');

  if (isRelative && !hasExtension) {
    modulePath = `${modulePath}.js`;
  }
  // Don't add .js for node_modules packages (non-relative, non-scoped or scoped)

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
    moduleFormat = 'cjs',
    dryRun = false,
    skipFormat = false,
    prettierConfig,
  } = options;

  const { sourcePath, featureName, scenarios, examples, dependencies, config } = context;

  // Compute output path
  const outputPath = computeOutputPath(sourcePath, outputDir);

  // Create result structure
  const result = createEmptyModule(sourcePath, outputPath);

  // Extract or use provided exports
  let exports = extractExportsFromCode(validatedCode);

  // Generate JSDoc for module
  const moduleJSDoc = generateModuleJSDoc(featureName, config?.description);

  // Generate JSDoc for each exported function
  const functionJSDocs = [];
  for (const exp of exports) {
    const scenario = scenarios?.find((s) =>
      s.name?.toLowerCase().includes(exp.name.toLowerCase())
    );

    const examplesForFunc = examples?.filter((e) =>
      e.name?.toLowerCase().includes(exp.name.toLowerCase())
    ) || [];

    const jsdoc = generateFunctionJSDoc(exp.name, {
      description: exp.description,
      params: exp.params || [],
      returnType: exp.returnType,
      examples: examplesForFunc,
      scenario,
    });

    exp.jsdoc = jsdoc;
    functionJSDocs.push({ name: exp.name, jsdoc });
  }

  result.exports = exports;

  // Build imports section
  const importsSection = resolveImports(dependencies || [], moduleFormat);
  result.imports = dependencies?.map((d) => ({
    source: d.modulePath,
    named: d.named,
    default: d.default,
    namespace: d.namespace,
  })) || [];

  // Inject JSDoc comments before function declarations
  let codeWithJSDoc = validatedCode;
  for (const { name, jsdoc } of functionJSDocs) {
    // Find function declaration and prepend JSDoc
    const patterns = [
      new RegExp(`(const\\s+${name}\\s*=)`, 'g'),
      new RegExp(`(let\\s+${name}\\s*=)`, 'g'),
      new RegExp(`(var\\s+${name}\\s*=)`, 'g'),
      new RegExp(`(function\\s+${name}\\s*\\()`, 'g'),
    ];

    for (const pattern of patterns) {
      if (pattern.test(codeWithJSDoc)) {
        codeWithJSDoc = codeWithJSDoc.replace(pattern, `${jsdoc}\n$1`);
        break;
      }
    }
  }

  // Wrap with exports
  const codeWithExports = wrapWithExports(codeWithJSDoc, exports, moduleFormat);

  // Combine all parts
  const parts = [];

  // Add module JSDoc at top
  parts.push(moduleJSDoc);
  parts.push('');

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

module.exports = {
  generate,
  generateBatch,
  // Export utilities for testing and extension
  wrapWithExports,
  wrapWithESMExports,
  wrapWithCJSExports,
  resolveImports,
  generateESMImport,
  generateCJSImport,
  computeOutputPath,
  ensureOutputDir,
  acquireLock,
  releaseLock,
  extractExportsFromCode,
  // Constants
  LOCK_OPTIONS,
};
