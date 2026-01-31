/**
 * Purity checker for GherkinLang compiler.
 *
 * Ensures generated JavaScript code is pure (no side effects) by walking the
 * AST and detecting forbidden operations such as console.log, file system
 * operations, mutations, and global state access. Validates that only
 * functional patterns are used.
 *
 * @module validation/purity
 */

const traverse = require('@babel/traverse').default;
const {
  FORBIDDEN_IDENTIFIERS,
  FORBIDDEN_MEMBER_EXPRESSIONS,
  MUTATING_ARRAY_METHODS,
  MUTATING_OBJECT_METHODS,
  FORBIDDEN_NODE_TYPES,
  ALLOWED_PURE_PATTERNS,
} = require('./constants');
const { getCodeSnippet, VIOLATION_TYPES } = require('./types');

/**
 * @typedef {import('./types').PurityCheckResult} PurityCheckResult
 * @typedef {import('./types').PurityViolation} PurityViolation
 * @typedef {import('./types').ErrorLocation} ErrorLocation
 */

/**
 * @typedef {Object} PurityOptions
 * @property {string} [filename] - Virtual filename for error reporting
 * @property {string[]} [allowedGlobals=[]] - Additional allowed global identifiers
 * @property {string[]} [allowedMethods=[]] - Additional allowed member expressions
 */

/**
 * Creates a purity violation object with consistent structure.
 *
 * @param {Object} options - Violation options
 * @param {'mutation' | 'side_effect' | 'global_access' | 'forbidden_construct'} options.violationType - Type of violation
 * @param {string} options.pattern - The forbidden pattern detected
 * @param {ErrorLocation} options.location - Location in source
 * @param {string} [options.code=''] - Source code snippet
 * @param {string} options.message - Human-readable description
 * @returns {PurityViolation} The purity violation object
 */
const createPurityViolation = ({ violationType, pattern, location, code = '', message }) => {
  if (!VIOLATION_TYPES.includes(violationType)) {
    throw new Error(
      `Invalid violation type: ${violationType}. Must be one of: ${VIOLATION_TYPES.join(', ')}`
    );
  }

  return {
    violationType,
    pattern,
    location: {
      line: location.line,
      column: location.column ?? 0,
      ...(location.file && { file: location.file }),
      ...(location.endLine !== undefined && { endLine: location.endLine }),
      ...(location.endColumn !== undefined && { endColumn: location.endColumn }),
    },
    code,
    message,
  };
};

/**
 * Extracts location information from a Babel AST node.
 *
 * @param {Object} node - Babel AST node
 * @param {string} [filename] - Optional filename to include
 * @returns {ErrorLocation} Location object
 */
const getNodeLocation = (node, filename) => {
  const loc = node.loc?.start || { line: 1, column: 0 };

  return {
    line: loc.line,
    column: loc.column,
    ...(filename && { file: filename }),
    ...(node.loc?.end && {
      endLine: node.loc.end.line,
      endColumn: node.loc.end.column,
    }),
  };
};

/**
 * Builds a member expression string from a Babel AST node.
 * For example: console.log -> "console.log"
 *
 * @param {Object} node - Babel MemberExpression node
 * @returns {string} Dot-notation string representation
 */
const getMemberExpressionString = (node) => {
  const parts = [];
  let current = node;

  while (current.type === 'MemberExpression') {
    if (current.property.type === 'Identifier') {
      // For computed properties like obj[key], we can't build a static string
      // because 'key' is a variable reference, not a literal property name
      if (current.computed) {
        return null;
      }
      parts.unshift(current.property.name);
    } else if (current.property.type === 'StringLiteral') {
      // String literal computed access like obj["prop"] is OK
      parts.unshift(current.property.value);
    } else {
      // Computed property with non-literal - can't build string
      return null;
    }
    current = current.object;
  }

  if (current.type === 'Identifier') {
    parts.unshift(current.name);
  } else {
    // Object is not an identifier (e.g., function call result)
    return null;
  }

  return parts.join('.');
};

/**
 * Checks if a member expression matches a forbidden pattern.
 *
 * @param {string} memberExpr - The member expression string (e.g., "console.log")
 * @param {string[]} forbiddenPatterns - List of forbidden patterns
 * @returns {string|null} The matched pattern or null
 */
const matchesForbiddenMemberExpression = (memberExpr, forbiddenPatterns) => {
  for (const pattern of forbiddenPatterns) {
    if (memberExpr === pattern) {
      return pattern;
    }
    // Check for wildcard patterns like "console.*"
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      if (memberExpr.startsWith(prefix + '.')) {
        return pattern;
      }
    }
  }
  return null;
};

/**
 * Checks if a method call is a mutating array method.
 *
 * @param {Object} node - Babel CallExpression node
 * @returns {string|null} The mutating method name or null
 */
const getMutatingArrayMethod = (node) => {
  if (node.callee.type !== 'MemberExpression') {
    return null;
  }

  const property = node.callee.property;
  if (property.type !== 'Identifier') {
    return null;
  }

  const methodName = property.name;

  // Check if it's a mutating array method
  if (MUTATING_ARRAY_METHODS.includes(methodName)) {
    return methodName;
  }

  return null;
};

/**
 * Checks if a method call is a mutating object method.
 *
 * @param {Object} node - Babel CallExpression node
 * @returns {string|null} The mutating method pattern or null
 */
const getMutatingObjectMethod = (node) => {
  if (node.callee.type !== 'MemberExpression') {
    return null;
  }

  const memberExpr = getMemberExpressionString(node.callee);
  if (!memberExpr) {
    return null;
  }

  // Check if it's a mutating object method
  if (MUTATING_OBJECT_METHODS.includes(memberExpr)) {
    return memberExpr;
  }

  return null;
};

/**
 * Checks if a pure pattern is being used (allowed).
 *
 * @param {Object} node - Babel CallExpression node
 * @returns {boolean} True if this is an allowed pure pattern
 */
const isAllowedPurePattern = (node) => {
  if (node.callee.type !== 'MemberExpression') {
    return false;
  }

  const property = node.callee.property;
  if (property.type !== 'Identifier') {
    return false;
  }

  const methodName = property.name;

  // Check if it's in the allowed pure patterns list
  if (ALLOWED_PURE_PATTERNS.includes(methodName)) {
    return true;
  }

  // Check full member expression for Object.* patterns
  const memberExpr = getMemberExpressionString(node.callee);
  if (memberExpr && ALLOWED_PURE_PATTERNS.includes(memberExpr)) {
    return true;
  }

  return false;
};

/**
 * Checks if a statement is at the module level (top-level, not inside a function).
 *
 * @param {Object} path - Babel path object
 * @returns {boolean} True if at module level
 */
const isModuleLevelStatement = (path) => {
  // Walk up to find if we're inside any function
  let current = path;
  while (current) {
    if (
      current.isFunctionDeclaration() ||
      current.isFunctionExpression() ||
      current.isArrowFunctionExpression() ||
      current.isClassMethod()
    ) {
      return false;
    }
    current = current.parentPath;
  }
  return true;
};

/**
 * Checks if a node is within a function scope (local variable).
 * Used to allow local mutations within function scope.
 *
 * @param {Object} path - Babel traversal path
 * @param {string} identifierName - Name of the identifier being assigned
 * @returns {boolean} True if the identifier is locally scoped
 */
const isLocalVariable = (path, identifierName) => {
  // Check if the variable is declared within the current function scope
  const binding = path.scope.getBinding(identifierName);

  if (!binding) {
    // No binding found - might be a global or undeclared
    return false;
  }

  // Get the function that contains this path
  const functionParent = path.getFunctionParent();

  if (!functionParent) {
    // Not inside a function - this is top-level
    return false;
  }

  // Check if the binding is within this function's scope
  const bindingScope = binding.scope;
  let currentScope = path.scope;

  while (currentScope) {
    if (currentScope === bindingScope) {
      // The binding is in an ancestor scope
      // Check if it's within the same function
      const bindingFunction = binding.path.getFunctionParent();

      if (bindingFunction === functionParent) {
        // Same function - local variable
        return true;
      }

      // Different function - could be a closure capturing an outer variable
      // Allow mutation if the variable was declared in the same function
      return false;
    }
    currentScope = currentScope.parent;
  }

  return false;
};

/**
 * Checks if an assignment is to a function parameter.
 *
 * @param {Object} path - Babel traversal path
 * @param {string} identifierName - Name of the identifier being assigned
 * @returns {boolean} True if the identifier is a function parameter
 */
const isFunctionParameter = (path, identifierName) => {
  const binding = path.scope.getBinding(identifierName);

  if (!binding) {
    return false;
  }

  // Check if the binding is a parameter
  return binding.kind === 'param';
};

/**
 * Validates JavaScript code is pure (no side effects).
 *
 * Analyzes the provided AST using @babel/traverse to detect:
 * - Mutation patterns (assignment to external variables, array mutations)
 * - Forbidden constructs (for loops, while loops, classes, this)
 * - Side effects (console.log, fs operations, fetch, setTimeout)
 * - Global access (window, global, process mutations)
 *
 * Pure patterns like closures, higher-order functions, map/filter/reduce,
 * and spread operators are allowed.
 *
 * @param {Object} ast - Babel AST from syntax validation
 * @param {string} code - Original code for error snippets
 * @param {PurityOptions} [options={}] - Purity validation options
 * @returns {PurityCheckResult} Purity check result
 *
 * @example
 * // Pure code passes
 * const ast = parse('const add = (a, b) => a + b;');
 * const result = validatePurity(ast, code);
 * console.log(result.valid); // true
 *
 * @example
 * // Impure code fails
 * const ast = parse('console.log("hello");');
 * const result = validatePurity(ast, code);
 * console.log(result.valid); // false
 * console.log(result.violations[0].pattern); // "console.log"
 */
const validatePurity = (ast, code, options = {}) => {
  const { filename, allowedGlobals = [], allowedMethods = [] } = options;

  /** @type {PurityViolation[]} */
  const violations = [];

  // Build effective forbidden lists by removing allowed items
  const effectiveForbiddenIdentifiers = FORBIDDEN_IDENTIFIERS.filter(
    (id) => !allowedGlobals.includes(id)
  );

  const effectiveForbiddenMemberExpressions = FORBIDDEN_MEMBER_EXPRESSIONS.filter(
    (expr) => !allowedMethods.includes(expr)
  );

  /**
   * Adds a violation to the list.
   *
   * @param {'mutation' | 'side_effect' | 'global_access' | 'forbidden_construct'} violationType
   * @param {string} pattern
   * @param {Object} node
   * @param {string} message
   */
  const addViolation = (violationType, pattern, node, message) => {
    const location = getNodeLocation(node, filename);
    const snippet = getCodeSnippet(code, location, { contextLines: 1 });

    violations.push(
      createPurityViolation({
        violationType,
        pattern,
        location,
        code: snippet,
        message,
      })
    );
  };

  try {
    traverse(ast, {
      // T016: Detect forbidden constructs
      'ForStatement|ForInStatement|ForOfStatement|WhileStatement|DoWhileStatement'(path) {
        const nodeType = path.node.type;
        addViolation(
          'forbidden_construct',
          nodeType,
          path.node,
          `${nodeType} is forbidden. Use functional alternatives like map, filter, or reduce.`
        );
      },

      ClassDeclaration(path) {
        addViolation(
          'forbidden_construct',
          'ClassDeclaration',
          path.node,
          'Class declarations are forbidden. Use factory functions or plain objects instead.'
        );
      },

      ClassExpression(path) {
        addViolation(
          'forbidden_construct',
          'ClassExpression',
          path.node,
          'Class expressions are forbidden. Use factory functions or plain objects instead.'
        );
      },

      ThisExpression(path) {
        addViolation(
          'forbidden_construct',
          'ThisExpression',
          path.node,
          "'this' keyword is forbidden. Use closures or explicit parameters instead."
        );
      },

      WithStatement(path) {
        addViolation(
          'forbidden_construct',
          'WithStatement',
          path.node,
          "'with' statement is forbidden. It makes code harder to analyze and is deprecated."
        );
      },

      // T015: Detect mutation patterns (AssignmentExpression)
      AssignmentExpression(path) {
        const left = path.node.left;

        // Check for member expression assignments (obj.prop = value)
        if (left.type === 'MemberExpression') {
          const objectName =
            left.object.type === 'Identifier' ? left.object.name : null;

          // Allow module.exports assignments for CommonJS modules at module level
          if (
            objectName === 'module' &&
            left.property.type === 'Identifier' &&
            left.property.name === 'exports' &&
            isModuleLevelStatement(path)
          ) {
            return;
          }

          // Allow exports.* assignments for CommonJS named exports at module level
          if (objectName === 'exports' && isModuleLevelStatement(path)) {
            return;
          }

          // Allow local object mutation within function scope
          if (objectName && isLocalVariable(path, objectName)) {
            return;
          }

          addViolation(
            'mutation',
            'property assignment',
            path.node,
            'Property assignment mutates an object. Use spread operator or Object.assign with a new object instead.'
          );
          return;
        }

        // Check for identifier assignments
        if (left.type === 'Identifier') {
          const name = left.name;

          // Allow reassignment of local variables declared in the same scope
          if (isLocalVariable(path, name)) {
            return;
          }

          // Check for parameter reassignment
          if (isFunctionParameter(path, name)) {
            addViolation(
              'mutation',
              `parameter reassignment: ${name}`,
              path.node,
              `Reassigning parameter '${name}' mutates function arguments. Create a new variable instead.`
            );
            return;
          }

          // Disallow reassignment of outer scope variables
          addViolation(
            'mutation',
            `variable reassignment: ${name}`,
            path.node,
            `Reassigning '${name}' from outer scope is a mutation. Use const and create new values instead.`
          );
        }
      },

      // T015: Detect mutation patterns (UpdateExpression: ++, --)
      UpdateExpression(path) {
        const argument = path.node.argument;

        if (argument.type === 'Identifier') {
          const name = argument.name;

          // Allow update of local variables
          if (isLocalVariable(path, name)) {
            return;
          }

          addViolation(
            'mutation',
            `update expression: ${path.node.operator}${name}`,
            path.node,
            `Update expression '${path.node.operator}' mutates '${name}'. Use const and create new values instead.`
          );
        } else if (argument.type === 'MemberExpression') {
          addViolation(
            'mutation',
            'update expression on property',
            path.node,
            'Update expression on object property mutates the object. Create a new object instead.'
          );
        }
      },

      // T017 & T018: Detect forbidden identifiers (side effects and global access)
      Identifier(path) {
        const name = path.node.name;

        // Skip if not a forbidden identifier
        if (!effectiveForbiddenIdentifiers.includes(name)) {
          return;
        }

        // Skip if this is a property access (handled by MemberExpression)
        if (path.parent.type === 'MemberExpression' && path.parent.property === path.node) {
          return;
        }

        // Skip if this is a declaration, not a reference
        if (
          path.parent.type === 'VariableDeclarator' &&
          path.parent.id === path.node
        ) {
          return;
        }

        // Skip function parameter declarations
        if (
          path.parent.type === 'FunctionDeclaration' ||
          path.parent.type === 'FunctionExpression' ||
          path.parent.type === 'ArrowFunctionExpression'
        ) {
          return;
        }

        // Determine violation type based on the identifier
        let violationType = 'side_effect';
        let message = `'${name}' has side effects and is forbidden.`;

        if (['window', 'global', 'globalThis', 'document'].includes(name)) {
          violationType = 'global_access';
          message = `'${name}' is a global object. Avoid accessing global state.`;
        } else if (['process'].includes(name)) {
          // process is allowed for reading (env), but mutations are caught separately
          violationType = 'global_access';
          message = `'${name}' provides global state access. Prefer passing configuration as parameters.`;
        }

        addViolation(violationType, name, path.node, message);
      },

      // T17: Detect forbidden member expressions (console.log, fs.*, etc.)
      MemberExpression(path) {
        // Skip if this is just part of a larger member expression
        if (path.parent.type === 'MemberExpression' && path.parent.object === path.node) {
          return;
        }

        const memberExpr = getMemberExpressionString(path.node);
        if (!memberExpr) {
          return;
        }

        // Check against forbidden member expressions
        const matchedPattern = matchesForbiddenMemberExpression(
          memberExpr,
          effectiveForbiddenMemberExpressions
        );

        if (matchedPattern) {
          // Determine violation type
          let violationType = 'side_effect';
          let message = `'${memberExpr}' has side effects and is forbidden.`;

          if (memberExpr.startsWith('console.')) {
            message = `'${memberExpr}' writes to console. Remove logging for pure functions.`;
          } else if (memberExpr.startsWith('fs.')) {
            message = `'${memberExpr}' performs file I/O. Pure functions should not access the file system.`;
          } else if (memberExpr.startsWith('process.')) {
            violationType = 'global_access';
            message = `'${memberExpr}' accesses or modifies process state. Avoid side effects on process.`;
          } else if (memberExpr === 'Math.random') {
            message = `'${memberExpr}' is non-deterministic. Pure functions must be deterministic.`;
          } else if (
            memberExpr.startsWith('localStorage.') ||
            memberExpr.startsWith('sessionStorage.')
          ) {
            message = `'${memberExpr}' accesses browser storage. Pure functions should not access external state.`;
          } else if (
            memberExpr.startsWith('document.') ||
            memberExpr.startsWith('history.') ||
            memberExpr.startsWith('location.')
          ) {
            violationType = 'global_access';
            message = `'${memberExpr}' accesses browser globals. Pure functions should not interact with the DOM or browser APIs.`;
          }

          addViolation(violationType, memberExpr, path.node, message);
        }
      },

      // T17: Detect mutating method calls
      CallExpression(path) {
        // T019: Check if this is an allowed pure pattern first
        if (isAllowedPurePattern(path.node)) {
          return;
        }

        // Check for mutating array methods
        const mutatingArrayMethod = getMutatingArrayMethod(path.node);
        if (mutatingArrayMethod) {
          // Check if it's on a local variable (allowed) BUT NOT a parameter
          // Mutating a parameter still mutates an external object
          if (
            path.node.callee.type === 'MemberExpression' &&
            path.node.callee.object.type === 'Identifier'
          ) {
            const objectName = path.node.callee.object.name;
            // Only allow mutation if it's a local variable AND not a parameter
            if (isLocalVariable(path, objectName) && !isFunctionParameter(path, objectName)) {
              return;
            }
          }

          addViolation(
            'mutation',
            mutatingArrayMethod,
            path.node,
            `'${mutatingArrayMethod}' mutates the array. Use immutable alternatives like 'toSorted', 'toReversed', or spread with slice.`
          );
          return;
        }

        // Check for mutating object methods
        const mutatingObjectMethod = getMutatingObjectMethod(path.node);
        if (mutatingObjectMethod) {
          addViolation(
            'mutation',
            mutatingObjectMethod,
            path.node,
            `'${mutatingObjectMethod}' can mutate objects. Use spread operator or Object.fromEntries instead.`
          );
        }
      },
    });
  } catch (error) {
    // If traversal fails, add a generic error
    violations.push(
      createPurityViolation({
        violationType: 'side_effect',
        pattern: 'traversal_error',
        location: { line: 1, column: 0, ...(filename && { file: filename }) },
        code: '',
        message: `Failed to analyze code for purity: ${error.message}`,
      })
    );
  }

  return {
    valid: violations.length === 0,
    violations,
  };
};

module.exports = {
  validatePurity,
  // Export for testing
  createPurityViolation,
  getNodeLocation,
  getMemberExpressionString,
  matchesForbiddenMemberExpression,
  getMutatingArrayMethod,
  getMutatingObjectMethod,
  isAllowedPurePattern,
  isLocalVariable,
  isFunctionParameter,
};
