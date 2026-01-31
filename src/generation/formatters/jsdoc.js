/**
 * JSDoc generator for GherkinLang compiler.
 *
 * Generates JSDoc comments for compiled functions based on type hints and
 * Gherkin source information. Creates module-level and function-level
 * documentation with parameter types, return types, and descriptions.
 *
 * @module generation/formatters/jsdoc
 */

/**
 * @typedef {import('../types').ParamInfo} ParamInfo
 * @typedef {import('../types').ModuleExport} ModuleExport
 */

/**
 * @typedef {Object} Scenario
 * @property {string} name - Scenario name
 * @property {string} [description] - Scenario description
 * @property {Step[]} steps - Gherkin steps
 */

/**
 * @typedef {Object} Step
 * @property {string} keyword - Given/When/Then
 * @property {string} text - Step text
 */

/**
 * @typedef {Object} Example
 * @property {string} name - Example name
 * @property {Object.<string, any>[]} rows - Example data rows
 */

/**
 * Common type mappings from parameter names to types.
 * Used for type inference when explicit types aren't available.
 * @type {Object.<string, string>}
 */
const PARAM_NAME_TYPE_MAP = {
  // Numeric types
  count: 'number',
  num: 'number',
  number: 'number',
  amount: 'number',
  total: 'number',
  sum: 'number',
  index: 'number',
  idx: 'number',
  i: 'number',
  j: 'number',
  n: 'number',
  x: 'number',
  y: 'number',
  z: 'number',
  a: 'number',
  b: 'number',
  price: 'number',
  quantity: 'number',
  width: 'number',
  height: 'number',
  length: 'number',
  size: 'number',
  min: 'number',
  max: 'number',
  age: 'number',
  year: 'number',
  month: 'number',
  day: 'number',

  // String types
  name: 'string',
  text: 'string',
  str: 'string',
  string: 'string',
  message: 'string',
  msg: 'string',
  label: 'string',
  title: 'string',
  description: 'string',
  desc: 'string',
  content: 'string',
  value: 'string',
  key: 'string',
  id: 'string',
  email: 'string',
  url: 'string',
  path: 'string',
  filename: 'string',
  prefix: 'string',
  suffix: 'string',
  separator: 'string',
  delimiter: 'string',

  // Boolean types
  flag: 'boolean',
  enabled: 'boolean',
  disabled: 'boolean',
  active: 'boolean',
  visible: 'boolean',
  hidden: 'boolean',
  valid: 'boolean',
  checked: 'boolean',
  selected: 'boolean',
  isValid: 'boolean',
  isEmpty: 'boolean',
  hasValue: 'boolean',

  // Array types
  arr: 'Array',
  array: 'Array',
  list: 'Array',
  items: 'Array',
  elements: 'Array',
  values: 'Array',
  data: 'Array',
  results: 'Array',
  rows: 'Array',
  records: 'Array',
  entries: 'Array',
  numbers: 'number[]',
  strings: 'string[]',

  // Object types
  obj: 'Object',
  object: 'Object',
  options: 'Object',
  config: 'Object',
  settings: 'Object',
  params: 'Object',
  props: 'Object',
  state: 'Object',
  context: 'Object',
  user: 'Object',
  item: 'Object',
  record: 'Object',

  // Function types
  fn: 'Function',
  func: 'Function',
  callback: 'Function',
  cb: 'Function',
  handler: 'Function',
  predicate: 'Function',
  mapper: 'Function',
  reducer: 'Function',
  comparator: 'Function',
  transformer: 'Function',
};

/**
 * Common function name patterns and their return types.
 * @type {Object.<string, string>}
 */
const FUNCTION_RETURN_TYPE_MAP = {
  // Numeric operations
  add: 'number',
  subtract: 'number',
  multiply: 'number',
  divide: 'number',
  sum: 'number',
  average: 'number',
  avg: 'number',
  count: 'number',
  length: 'number',
  size: 'number',
  indexOf: 'number',
  findIndex: 'number',
  min: 'number',
  max: 'number',
  floor: 'number',
  ceil: 'number',
  round: 'number',
  abs: 'number',
  sqrt: 'number',
  pow: 'number',

  // String operations
  concat: 'string',
  join: 'string',
  trim: 'string',
  toUpperCase: 'string',
  toLowerCase: 'string',
  capitalize: 'string',
  reverse: 'string',
  substring: 'string',
  slice: 'string',
  replace: 'string',
  format: 'string',
  stringify: 'string',
  toString: 'string',
  toJSON: 'string',

  // Boolean operations
  isEmpty: 'boolean',
  isValid: 'boolean',
  isEqual: 'boolean',
  equals: 'boolean',
  contains: 'boolean',
  includes: 'boolean',
  has: 'boolean',
  hasOwn: 'boolean',
  startsWith: 'boolean',
  endsWith: 'boolean',
  matches: 'boolean',
  test: 'boolean',
  check: 'boolean',
  validate: 'boolean',
  every: 'boolean',
  some: 'boolean',
  none: 'boolean',

  // Array operations
  filter: 'Array',
  map: 'Array',
  flatMap: 'Array',
  flat: 'Array',
  sort: 'Array',
  sorted: 'Array',
  toSorted: 'Array',
  reverse: 'Array',
  reversed: 'Array',
  toReversed: 'Array',
  slice: 'Array',
  concat: 'Array',
  split: 'Array',
  keys: 'Array',
  values: 'Array',
  entries: 'Array',
  unique: 'Array',
  distinct: 'Array',
  take: 'Array',
  drop: 'Array',
  range: 'Array',
  zip: 'Array',

  // Object operations
  merge: 'Object',
  assign: 'Object',
  extend: 'Object',
  clone: 'Object',
  copy: 'Object',
  pick: 'Object',
  omit: 'Object',
  fromEntries: 'Object',
  groupBy: 'Object',
  keyBy: 'Object',

  // Single value from collection
  find: '*',
  get: '*',
  first: '*',
  last: '*',
  head: '*',
  tail: 'Array',
  reduce: '*',
  fold: '*',

  // Void/undefined
  forEach: 'void',
  log: 'void',
  print: 'void',
};

/**
 * Infers a parameter type from its name using common naming patterns.
 *
 * @param {string} paramName - Parameter name to analyze
 * @returns {string} Inferred type or '*' if unknown
 */
const inferTypeFromName = (paramName) => {
  const lowerName = paramName.toLowerCase();

  // Direct match
  if (PARAM_NAME_TYPE_MAP[lowerName]) {
    return PARAM_NAME_TYPE_MAP[lowerName];
  }

  // Check for common prefixes/suffixes
  if (lowerName.startsWith('is') || lowerName.startsWith('has') || lowerName.startsWith('can')) {
    return 'boolean';
  }

  if (lowerName.endsWith('count') || lowerName.endsWith('num') || lowerName.endsWith('id')) {
    return 'number';
  }

  if (lowerName.endsWith('name') || lowerName.endsWith('text') || lowerName.endsWith('str')) {
    return 'string';
  }

  if (lowerName.endsWith('list') || lowerName.endsWith('array') || lowerName.endsWith('s')) {
    // Ends with 's' might be plural, but this is a weak heuristic
    // Only use if it's a known plural pattern
    if (lowerName.endsWith('items') || lowerName.endsWith('values') || lowerName.endsWith('results')) {
      return 'Array';
    }
  }

  if (lowerName.endsWith('fn') || lowerName.endsWith('callback') || lowerName.endsWith('handler')) {
    return 'Function';
  }

  return '*';
};

/**
 * Infers return type from function name using common naming patterns.
 *
 * @param {string} functionName - Function name to analyze
 * @returns {string} Inferred return type or '*' if unknown
 */
const inferReturnTypeFromName = (functionName) => {
  const lowerName = functionName.toLowerCase();

  // Direct match
  if (FUNCTION_RETURN_TYPE_MAP[lowerName]) {
    return FUNCTION_RETURN_TYPE_MAP[lowerName];
  }

  // Check common prefixes
  if (lowerName.startsWith('is') || lowerName.startsWith('has') || lowerName.startsWith('can') ||
      lowerName.startsWith('should') || lowerName.startsWith('will') || lowerName.startsWith('check')) {
    return 'boolean';
  }

  if (lowerName.startsWith('get') || lowerName.startsWith('fetch') || lowerName.startsWith('find')) {
    return '*';
  }

  if (lowerName.startsWith('create') || lowerName.startsWith('make') || lowerName.startsWith('build')) {
    return 'Object';
  }

  if (lowerName.startsWith('to') && lowerName.length > 2) {
    // toArray, toString, toNumber, etc.
    const suffix = lowerName.slice(2);
    if (suffix.startsWith('string')) return 'string';
    if (suffix.startsWith('number')) return 'number';
    if (suffix.startsWith('array')) return 'Array';
    if (suffix.startsWith('boolean')) return 'boolean';
    if (suffix.startsWith('object')) return 'Object';
  }

  // Check for calculation/math words
  if (lowerName.includes('sum') || lowerName.includes('count') || lowerName.includes('total') ||
      lowerName.includes('calc') || lowerName.includes('compute')) {
    return 'number';
  }

  // Check for string operations
  if (lowerName.includes('format') || lowerName.includes('stringify') || lowerName.includes('join')) {
    return 'string';
  }

  // Check for array operations
  if (lowerName.includes('filter') || lowerName.includes('map') || lowerName.includes('sort')) {
    return 'Array';
  }

  return '*';
};

/**
 * Extracts type information from a value for example-based inference.
 *
 * @param {*} value - Value to extract type from
 * @returns {string} Inferred type
 */
const inferTypeFromValue = (value) => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  const type = typeof value;

  switch (type) {
    case 'number':
      return Number.isInteger(value) ? 'number' : 'number';
    case 'string':
      return 'string';
    case 'boolean':
      return 'boolean';
    case 'function':
      return 'Function';
    case 'object':
      if (Array.isArray(value)) {
        if (value.length === 0) return 'Array';
        const elementType = inferTypeFromValue(value[0]);
        return `${elementType}[]`;
      }
      return 'Object';
    default:
      return '*';
  }
};

/**
 * Generates a @module JSDoc tag for a module.
 *
 * @param {string} moduleName - Module name
 * @param {string} [description] - Optional module description
 * @returns {string} JSDoc module comment
 */
const generateModuleJSDoc = (moduleName, description) => {
  const lines = ['/**'];

  if (description) {
    // Wrap description at ~80 chars
    const descLines = wrapText(description, 77);
    descLines.forEach((line) => {
      lines.push(` * ${line}`);
    });
    lines.push(' *');
  }

  lines.push(` * @module ${moduleName}`);
  lines.push(' */');

  return lines.join('\n');
};

/**
 * Generates a function-level JSDoc comment.
 *
 * @param {string} functionName - Function name
 * @param {Object} [options] - Generation options
 * @param {string} [options.description] - Function description
 * @param {ParamInfo[]} [options.params] - Parameter information
 * @param {string} [options.returnType] - Return type
 * @param {string} [options.returnDescription] - Return value description
 * @param {Example[]} [options.examples] - Gherkin examples for @example tags
 * @param {Scenario} [options.scenario] - Gherkin scenario for description extraction
 * @returns {string} JSDoc function comment
 */
const generateFunctionJSDoc = (functionName, options = {}) => {
  const {
    description,
    params = [],
    returnType,
    returnDescription,
    examples = [],
    scenario,
  } = options;

  const lines = ['/**'];

  // Description from scenario or explicit
  const desc = description || (scenario ? extractDescriptionFromScenario(scenario) : null);
  if (desc) {
    const descLines = wrapText(desc, 77);
    descLines.forEach((line) => {
      lines.push(` * ${line}`);
    });
    lines.push(' *');
  }

  // @param tags
  for (const param of params) {
    const paramType = param.type || inferTypeFromName(param.name);
    const optional = param.optional ? '=' : '';
    const paramDesc = param.description ? ` - ${param.description}` : '';
    const defaultVal = param.defaultValue !== undefined ? ` (default: ${JSON.stringify(param.defaultValue)})` : '';
    lines.push(` * @param {${paramType}${optional}} ${param.name}${paramDesc}${defaultVal}`);
  }

  // @returns tag
  const inferredReturn = returnType || inferReturnTypeFromName(functionName);
  const returnDesc = returnDescription ? ` ${returnDescription}` : '';
  lines.push(` * @returns {${inferredReturn}}${returnDesc}`);

  // @example sections from Gherkin Examples
  if (examples.length > 0) {
    lines.push(' *');
    for (const example of examples) {
      lines.push(generateExampleSection(functionName, example, params));
    }
  }

  lines.push(' */');

  return lines.join('\n');
};

/**
 * Extracts a description from a Gherkin scenario.
 *
 * @param {Scenario} scenario - Gherkin scenario
 * @returns {string|null} Extracted description or null
 */
const extractDescriptionFromScenario = (scenario) => {
  if (scenario.description) {
    return scenario.description;
  }

  // Try to build description from steps
  if (scenario.steps && scenario.steps.length > 0) {
    const parts = [];
    for (const step of scenario.steps) {
      if (step.keyword.toLowerCase() === 'given') {
        parts.push(`Given ${step.text}`);
      } else if (step.keyword.toLowerCase() === 'when') {
        parts.push(`When ${step.text}`);
      } else if (step.keyword.toLowerCase() === 'then') {
        parts.push(`Then ${step.text}`);
      }
    }
    if (parts.length > 0) {
      return parts.join(', ');
    }
  }

  return scenario.name || null;
};

/**
 * Generates an @example section from a Gherkin Example table.
 *
 * @param {string} functionName - Function name
 * @param {Example} example - Gherkin example
 * @param {ParamInfo[]} params - Parameter info for ordering
 * @returns {string} @example JSDoc section
 */
const generateExampleSection = (functionName, example, params) => {
  const lines = [];

  // Add example name as comment if present
  if (example.name) {
    lines.push(` * @example ${example.name}`);
  } else {
    lines.push(' * @example');
  }

  // Generate example code from rows
  if (example.rows && example.rows.length > 0) {
    for (const row of example.rows.slice(0, 3)) { // Limit to 3 examples
      const args = params.map((p) => {
        const value = row[p.name];
        return value !== undefined ? formatValueForExample(value) : 'undefined';
      }).join(', ');

      const expectedKey = Object.keys(row).find((k) =>
        k.toLowerCase() === 'result' ||
        k.toLowerCase() === 'expected' ||
        k.toLowerCase() === 'output'
      );
      const expected = expectedKey ? row[expectedKey] : undefined;

      if (expected !== undefined) {
        lines.push(` * ${functionName}(${args}); // => ${formatValueForExample(expected)}`);
      } else {
        lines.push(` * ${functionName}(${args});`);
      }
    }
  }

  return lines.join('\n');
};

/**
 * Formats a value for use in an @example section.
 *
 * @param {*} value - Value to format
 * @returns {string} Formatted value string
 */
const formatValueForExample = (value) => {
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "\\'")}'`;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'undefined';
  }
  if (Array.isArray(value)) {
    return `[${value.map(formatValueForExample).join(', ')}]`;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

/**
 * Wraps text at a specified width.
 *
 * @param {string} text - Text to wrap
 * @param {number} width - Maximum line width
 * @returns {string[]} Array of wrapped lines
 */
const wrapText = (text, width) => {
  if (!text || text.length <= width) {
    return [text || ''];
  }

  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= width) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

/**
 * Generates JSDoc for an entire module with multiple functions.
 *
 * @param {string} moduleName - Module name
 * @param {string} [moduleDescription] - Module description
 * @param {ModuleExport[]} exports - Exported functions
 * @param {Object} [context] - Generation context
 * @param {Scenario[]} [context.scenarios] - Gherkin scenarios
 * @param {Example[]} [context.examples] - Gherkin examples
 * @returns {string} Complete JSDoc for the module
 */
const generateModuleJSDocComplete = (moduleName, moduleDescription, exports, context = {}) => {
  const parts = [];

  // Module-level JSDoc
  parts.push(generateModuleJSDoc(moduleName, moduleDescription));
  parts.push('');

  // Function-level JSDoc for each export
  for (const exp of exports) {
    const scenario = context.scenarios?.find((s) =>
      s.name.toLowerCase().includes(exp.name.toLowerCase())
    );

    const examples = context.examples?.filter((e) =>
      e.name?.toLowerCase().includes(exp.name.toLowerCase())
    ) || [];

    const jsdoc = generateFunctionJSDoc(exp.name, {
      description: exp.description,
      params: exp.params,
      returnType: exp.returnType,
      examples,
      scenario,
    });

    parts.push(jsdoc);
  }

  return parts.join('\n');
};

module.exports = {
  generateModuleJSDoc,
  generateFunctionJSDoc,
  generateModuleJSDocComplete,
  generateExampleSection,
  extractDescriptionFromScenario,
  // Type inference exports
  inferTypeFromName,
  inferReturnTypeFromName,
  inferTypeFromValue,
  // Utilities
  wrapText,
  formatValueForExample,
  // Constants for testing
  PARAM_NAME_TYPE_MAP,
  FUNCTION_RETURN_TYPE_MAP,
};
