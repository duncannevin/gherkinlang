/**
 * Constants for GherkinLang validation pipeline.
 *
 * Defines forbidden identifiers, member expressions, and configuration
 * values used by syntax, purity, and lint validators.
 *
 * @module validation/constants
 */

/**
 * Maximum number of syntax errors to collect before stopping.
 * Prevents excessive error accumulation for badly malformed code.
 * @type {number}
 */
const MAX_SYNTAX_ERRORS = 10;

/**
 * Forbidden global identifiers that indicate impure code.
 * These are top-level identifiers that should not be accessed.
 * @type {readonly string[]}
 */
const FORBIDDEN_IDENTIFIERS = Object.freeze([
  // Global objects that enable side effects
  'window',
  'document',
  'global',
  'globalThis',

  // Async/timing functions
  'setTimeout',
  'setInterval',
  'setImmediate',
  'clearTimeout',
  'clearInterval',
  'clearImmediate',
  'requestAnimationFrame',
  'cancelAnimationFrame',

  // Network/IO
  'fetch',
  'XMLHttpRequest',
  'WebSocket',

  // Node.js globals that enable side effects
  'Buffer',
  '__dirname',
  '__filename',

  // Forbidden constructors
  'Date', // new Date() is non-deterministic
  'RegExp', // Allow RegExp literals, but not constructor (can have side effects with lastIndex)
]);

/**
 * Forbidden member expressions that indicate side effects.
 * Format: 'object.method' or 'object.*' for all methods.
 * @type {readonly string[]}
 */
const FORBIDDEN_MEMBER_EXPRESSIONS = Object.freeze([
  // Console methods (side effects: output)
  'console.log',
  'console.error',
  'console.warn',
  'console.info',
  'console.debug',
  'console.trace',
  'console.dir',
  'console.table',
  'console.time',
  'console.timeEnd',
  'console.group',
  'console.groupEnd',
  'console.assert',
  'console.count',
  'console.clear',

  // File system (side effects: IO)
  'fs.readFile',
  'fs.readFileSync',
  'fs.writeFile',
  'fs.writeFileSync',
  'fs.appendFile',
  'fs.appendFileSync',
  'fs.unlink',
  'fs.unlinkSync',
  'fs.mkdir',
  'fs.mkdirSync',
  'fs.rmdir',
  'fs.rmdirSync',
  'fs.rename',
  'fs.renameSync',
  'fs.copyFile',
  'fs.copyFileSync',
  'fs.access',
  'fs.accessSync',
  'fs.stat',
  'fs.statSync',
  'fs.readdir',
  'fs.readdirSync',
  'fs.existsSync',
  'fs.createReadStream',
  'fs.createWriteStream',

  // Process (side effects: environment, exit)
  'process.exit',
  'process.abort',
  'process.chdir',
  'process.kill',
  'process.send',
  'process.disconnect',
  'process.on',
  'process.once',
  'process.emit',

  // Mutating array methods (when called on external arrays)
  // Note: These are detected differently in purity checker
  // Listed here for reference

  // Math.random (non-deterministic)
  'Math.random',

  // DOM manipulation
  'document.write',
  'document.writeln',
  'document.createElement',
  'document.getElementById',
  'document.querySelector',
  'document.querySelectorAll',

  // Storage (side effects: persistence)
  'localStorage.setItem',
  'localStorage.getItem',
  'localStorage.removeItem',
  'localStorage.clear',
  'sessionStorage.setItem',
  'sessionStorage.getItem',
  'sessionStorage.removeItem',
  'sessionStorage.clear',

  // History (side effects: navigation)
  'history.pushState',
  'history.replaceState',
  'history.back',
  'history.forward',
  'history.go',

  // Location (side effects: navigation)
  'location.assign',
  'location.replace',
  'location.reload',
]);

/**
 * Mutating array methods that violate purity when called.
 * @type {readonly string[]}
 */
const MUTATING_ARRAY_METHODS = Object.freeze([
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
  'fill',
  'copyWithin',
]);

/**
 * Mutating object methods that violate purity when called.
 * @type {readonly string[]}
 */
const MUTATING_OBJECT_METHODS = Object.freeze([
  'Object.assign', // When target is not a new object
  'Object.defineProperty',
  'Object.defineProperties',
  'Object.setPrototypeOf',
  'Reflect.set',
  'Reflect.defineProperty',
  'Reflect.deleteProperty',
  'Reflect.setPrototypeOf',
]);

/**
 * Forbidden AST node types that indicate impure constructs.
 * @type {readonly string[]}
 */
const FORBIDDEN_NODE_TYPES = Object.freeze([
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
  'ClassDeclaration',
  'ClassExpression',
  'ThisExpression',
  'WithStatement',
]);

/**
 * Allowed pure patterns that should not trigger violations.
 * Used to whitelist functional programming patterns.
 * @type {readonly string[]}
 */
const ALLOWED_PURE_PATTERNS = Object.freeze([
  // Pure array methods
  'map',
  'filter',
  'reduce',
  'reduceRight',
  'every',
  'some',
  'find',
  'findIndex',
  'findLast',
  'findLastIndex',
  'includes',
  'indexOf',
  'lastIndexOf',
  'flat',
  'flatMap',
  'concat',
  'slice',
  'join',
  'entries',
  'keys',
  'values',
  'at',
  'with',
  'toReversed',
  'toSorted',
  'toSpliced',

  // Pure string methods
  'charAt',
  'charCodeAt',
  'codePointAt',
  'endsWith',
  'localeCompare',
  'match',
  'matchAll',
  'normalize',
  'padEnd',
  'padStart',
  'repeat',
  'replace',
  'replaceAll',
  'search',
  'split',
  'startsWith',
  'substring',
  'toLowerCase',
  'toUpperCase',
  'trim',
  'trimEnd',
  'trimStart',

  // Pure object methods
  'Object.keys',
  'Object.values',
  'Object.entries',
  'Object.fromEntries',
  'Object.freeze',
  'Object.isFrozen',
  'Object.seal',
  'Object.isSealed',
  'Object.is',
  'Object.hasOwn',
]);

/**
 * Default ESLint rules for generated code validation.
 * @type {Object.<string, string | Array>}
 */
const DEFAULT_ESLINT_RULES = Object.freeze({
  // Required by constitution
  'no-var': 'error',
  'prefer-const': 'error',
  'prefer-arrow-callback': 'error',
  'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

  // Functional programming rules (from eslint-plugin-functional)
  'functional/immutable-data': 'error',
  'functional/no-loop-statements': 'error',
  'functional/no-this-expressions': 'error',

  // Additional quality rules
  'no-console': 'error',
  eqeqeq: ['error', 'always'],
  'no-eval': 'error',
  'no-implied-eval': 'error',
  'no-new-func': 'error',
  'no-param-reassign': 'error',
});

module.exports = {
  MAX_SYNTAX_ERRORS,
  FORBIDDEN_IDENTIFIERS,
  FORBIDDEN_MEMBER_EXPRESSIONS,
  MUTATING_ARRAY_METHODS,
  MUTATING_OBJECT_METHODS,
  FORBIDDEN_NODE_TYPES,
  ALLOWED_PURE_PATTERNS,
  DEFAULT_ESLINT_RULES,
};
