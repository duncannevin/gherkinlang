# Quickstart: Validation & Generation

**Feature**: 002-validation-generation  
**Time to first working code**: ~30 minutes

## Prerequisites

- Node.js 18.x+
- Existing gherkinlang-js repository cloned
- Phase 1 (Core Components) implemented
- Phase 3 (AI Transformation) implemented

## Step 1: Install Dependencies

```bash
npm install @babel/parser @babel/traverse eslint eslint-plugin-functional prettier proper-lockfile
```

## Step 2: Implement Syntax Validator

Replace stub in `src/validation/syntax.js`:

```javascript
const parser = require('@babel/parser');

const MAX_ERRORS = 10;

/**
 * Validates JavaScript syntax.
 * @param {string} code - Code to validate
 * @param {Object} options - Validation options
 * @returns {SyntaxCheckResult}
 */
function validateSyntax(code, options = {}) {
  const { moduleFormat = 'cjs' } = options;
  
  try {
    const ast = parser.parse(code, {
      sourceType: moduleFormat === 'esm' ? 'module' : 'script',
      plugins: ['optionalChaining', 'nullishCoalescingOperator'],
      errorRecovery: true
    });
    
    // Collect errors up to max
    const errors = (ast.errors || []).slice(0, MAX_ERRORS).map(err => ({
      type: 'syntax',
      severity: 'error',
      message: err.message,
      location: {
        line: err.loc?.line || 1,
        column: err.loc?.column || 0
      },
      code: getCodeSnippet(code, err.loc?.line)
    }));
    
    return {
      valid: errors.length === 0,
      errors,
      ast: errors.length === 0 ? ast : null
    };
  } catch (err) {
    return {
      valid: false,
      errors: [{
        type: 'syntax',
        severity: 'error',
        message: err.message,
        location: { line: err.loc?.line || 1, column: err.loc?.column || 0 },
        code: getCodeSnippet(code, err.loc?.line)
      }],
      ast: null
    };
  }
}

function getCodeSnippet(code, line) {
  if (!line) return '';
  const lines = code.split('\n');
  return lines[line - 1] || '';
}

module.exports = { validateSyntax };
```

## Step 3: Implement Purity Validator

Replace stub in `src/validation/purity.js`:

```javascript
const traverse = require('@babel/traverse').default;

const FORBIDDEN_IDENTIFIERS = new Set([
  'console', 'window', 'global', 'process', 'eval',
  'setTimeout', 'setInterval', 'fetch', 'fs'
]);

const FORBIDDEN_MEMBERS = new Set(['Math.random', 'Date.now']);

/**
 * Validates code purity.
 * @param {Object} ast - Babel AST
 * @param {string} code - Original code
 * @returns {PurityCheckResult}
 */
function validatePurity(ast, code) {
  const violations = [];
  
  traverse(ast, {
    // Detect mutations
    AssignmentExpression(path) {
      if (path.parent.type !== 'VariableDeclarator') {
        violations.push(createViolation('mutation', 'Assignment expression', path, code));
      }
    },
    
    UpdateExpression(path) {
      violations.push(createViolation('mutation', 'Update expression (++/--)', path, code));
    },
    
    // Detect forbidden constructs
    ForStatement(path) {
      violations.push(createViolation('forbidden_construct', 'For loop', path, code));
    },
    
    WhileStatement(path) {
      violations.push(createViolation('forbidden_construct', 'While loop', path, code));
    },
    
    ThisExpression(path) {
      violations.push(createViolation('forbidden_construct', 'this keyword', path, code));
    },
    
    ClassDeclaration(path) {
      violations.push(createViolation('forbidden_construct', 'Class declaration', path, code));
    },
    
    // Detect side effects
    CallExpression(path) {
      const callee = path.node.callee;
      if (callee.type === 'Identifier' && FORBIDDEN_IDENTIFIERS.has(callee.name)) {
        violations.push(createViolation('side_effect', `${callee.name} call`, path, code));
      }
      if (callee.type === 'MemberExpression') {
        const name = getMemberName(callee);
        if (FORBIDDEN_MEMBERS.has(name) || FORBIDDEN_IDENTIFIERS.has(callee.object?.name)) {
          violations.push(createViolation('side_effect', `${name} call`, path, code));
        }
      }
    }
  });
  
  return {
    valid: violations.length === 0,
    violations
  };
}

function createViolation(type, pattern, path, code) {
  const loc = path.node.loc?.start || { line: 1, column: 0 };
  return {
    violationType: type,
    pattern,
    location: { line: loc.line, column: loc.column },
    code: getCodeSnippet(code, loc.line),
    message: `Purity violation: ${pattern} detected`
  };
}

function getMemberName(node) {
  if (node.object?.name && node.property?.name) {
    return `${node.object.name}.${node.property.name}`;
  }
  return '';
}

function getCodeSnippet(code, line) {
  const lines = code.split('\n');
  return lines[line - 1] || '';
}

module.exports = { validatePurity };
```

## Step 4: Verify Setup

```bash
# Run existing tests
npm test

# Test syntax validator manually
node -e "
const { validateSyntax } = require('./src/validation/syntax');
console.log(validateSyntax('const x = 1;'));  // Should be valid
console.log(validateSyntax('const x = '));    // Should have errors
"
```

## Step 5: Next Implementation Steps

1. Complete `eslint-config.js` - ESLint validation
2. Complete `validator.js` - Orchestration
3. Complete `generator.js` - Code generation
4. Complete `formatters/javascript.js` - Prettier integration
5. Complete `formatters/jsdoc.js` - JSDoc generation
6. Complete `test-generator.js` - Test generation

## Verification Checklist

- [ ] `validateSyntax` returns errors with line/column
- [ ] `validatePurity` detects console.log
- [ ] `validatePurity` detects mutations
- [ ] Validation pipeline runs in correct order
- [ ] Generator writes to output directory
- [ ] Tests are generated and can run

## Common Issues

### Parser not recognizing ES2020+ syntax

Ensure plugins are enabled:
```javascript
parser.parse(code, {
  plugins: ['optionalChaining', 'nullishCoalescingOperator']
});
```

### ESLint not finding config

Use programmatic API to avoid file lookup:
```javascript
const { ESLint } = require('eslint');
const eslint = new ESLint({ useEslintrc: false, overrideConfig: {...} });
```

### Prettier failing silently

Always catch format errors:
```javascript
try {
  return { code: prettier.format(code, config), formatted: true };
} catch (err) {
  return { code, formatted: false, warning: err.message };
}
```
