/**
 * Unit tests for purity validation module.
 *
 * @module test/unit/validation/purity
 */

const { parse } = require('@babel/parser');
const {
  validatePurity,
  createPurityViolation,
  getNodeLocation,
  getMemberExpressionString,
  matchesForbiddenMemberExpression,
  getMutatingArrayMethod,
  getMutatingObjectMethod,
  isAllowedPurePattern,
} = require('../../../src/validation/purity');

/**
 * Helper to parse code and validate purity.
 *
 * @param {string} code - JavaScript code to validate
 * @param {Object} [options] - Purity options
 * @returns {Object} Purity check result
 */
const checkPurity = (code, options = {}) => {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['optionalChaining', 'nullishCoalescingOperator'],
  });
  return validatePurity(ast, code, options);
};

/**
 * Helper to parse code for AST node extraction.
 *
 * @param {string} code - JavaScript code to parse
 * @returns {Object} Babel AST
 */
const parseCode = (code) => {
  return parse(code, {
    sourceType: 'module',
    plugins: ['optionalChaining', 'nullishCoalescingOperator'],
  });
};

describe('validatePurity', () => {
  describe('pure JavaScript code', () => {
    it('should return valid=true for a simple constant declaration', () => {
      const result = checkPurity('const x = 42;');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should return valid=true for arrow functions', () => {
      const result = checkPurity('const add = (a, b) => a + b;');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should return valid=true for template literals', () => {
      const result = checkPurity('const greeting = `Hello, ${name}!`;');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should return valid=true for destructuring', () => {
      const result = checkPurity('const { a, b } = obj; const [x, y] = arr;');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should return valid=true for spread operator', () => {
      const result = checkPurity(
        'const merged = { ...obj1, ...obj2 }; const arr = [...arr1, ...arr2];'
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should return valid=true for nested arrow functions', () => {
      const result = checkPurity('const compose = (f) => (g) => (x) => f(g(x));');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should return valid=true for conditional expressions', () => {
      const result = checkPurity('const max = (a, b) => a > b ? a : b;');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should return valid=true for object literals', () => {
      const result = checkPurity('const obj = { x: 1, y: 2, sum: (a, b) => a + b };');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should return valid=true for array literals', () => {
      const result = checkPurity('const arr = [1, 2, 3, ...other];');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should return valid=true for recursion via named function expressions', () => {
      const result = checkPurity(
        'const factorial = function fact(n) { return n <= 1 ? 1 : n * fact(n - 1); };'
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('pure array methods (allowed)', () => {
    it('should allow map', () => {
      const result = checkPurity('const doubled = arr.map(x => x * 2);');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow filter', () => {
      const result = checkPurity('const evens = arr.filter(x => x % 2 === 0);');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow reduce', () => {
      const result = checkPurity('const sum = arr.reduce((acc, x) => acc + x, 0);');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow chained pure methods', () => {
      const result = checkPurity(
        'const result = arr.map(x => x * 2).filter(x => x > 5).reduce((a, b) => a + b, 0);'
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow every', () => {
      const result = checkPurity('const allPositive = arr.every(x => x > 0);');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow some', () => {
      const result = checkPurity('const hasNegative = arr.some(x => x < 0);');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow find', () => {
      const result = checkPurity('const first = arr.find(x => x > 10);');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow findIndex', () => {
      const result = checkPurity('const idx = arr.findIndex(x => x > 10);');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow slice', () => {
      const result = checkPurity('const sliced = arr.slice(0, 5);');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow concat', () => {
      const result = checkPurity('const merged = arr1.concat(arr2);');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow flat', () => {
      const result = checkPurity('const flattened = arr.flat(2);');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow flatMap', () => {
      const result = checkPurity('const result = arr.flatMap(x => [x, x * 2]);');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow includes', () => {
      const result = checkPurity('const hasValue = arr.includes(5);');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow indexOf', () => {
      const result = checkPurity('const idx = arr.indexOf(5);');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow join', () => {
      const result = checkPurity('const str = arr.join(", ");');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow toReversed (ES2023)', () => {
      const result = checkPurity('const reversed = arr.toReversed();');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow toSorted (ES2023)', () => {
      const result = checkPurity('const sorted = arr.toSorted((a, b) => a - b);');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow toSpliced (ES2023)', () => {
      const result = checkPurity('const spliced = arr.toSpliced(1, 2);');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('pure object methods (allowed)', () => {
    it('should allow Object.keys', () => {
      const result = checkPurity('const keys = Object.keys(obj);');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow Object.values', () => {
      const result = checkPurity('const values = Object.values(obj);');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow Object.entries', () => {
      const result = checkPurity('const entries = Object.entries(obj);');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow Object.fromEntries', () => {
      const result = checkPurity('const obj = Object.fromEntries(entries);');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow Object.freeze', () => {
      const result = checkPurity('const frozen = Object.freeze({ x: 1 });');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('forbidden constructs', () => {
    describe('loop statements', () => {
      it('should detect for statement', () => {
        const result = checkPurity('for (let i = 0; i < 10; i++) { }');

        expect(result.valid).toBe(false);
        expect(result.violations.length).toBeGreaterThan(0);
        expect(result.violations[0].violationType).toBe('forbidden_construct');
        expect(result.violations[0].pattern).toBe('ForStatement');
      });

      it('should detect for...in statement', () => {
        const result = checkPurity('for (const key in obj) { }');

        expect(result.valid).toBe(false);
        expect(result.violations[0].violationType).toBe('forbidden_construct');
        expect(result.violations[0].pattern).toBe('ForInStatement');
      });

      it('should detect for...of statement', () => {
        const result = checkPurity('for (const item of arr) { }');

        expect(result.valid).toBe(false);
        expect(result.violations[0].violationType).toBe('forbidden_construct');
        expect(result.violations[0].pattern).toBe('ForOfStatement');
      });

      it('should detect while statement', () => {
        const result = checkPurity('while (true) { break; }');

        expect(result.valid).toBe(false);
        expect(result.violations[0].violationType).toBe('forbidden_construct');
        expect(result.violations[0].pattern).toBe('WhileStatement');
      });

      it('should detect do...while statement', () => {
        const result = checkPurity('do { } while (false);');

        expect(result.valid).toBe(false);
        expect(result.violations[0].violationType).toBe('forbidden_construct');
        expect(result.violations[0].pattern).toBe('DoWhileStatement');
      });

      it('should include helpful message for loops', () => {
        const result = checkPurity('for (let i = 0; i < 10; i++) { }');

        expect(result.violations[0].message).toContain('functional alternatives');
        expect(result.violations[0].message).toContain('map');
      });
    });

    describe('class constructs', () => {
      it('should detect class declaration', () => {
        const result = checkPurity('class MyClass { }');

        expect(result.valid).toBe(false);
        expect(result.violations[0].violationType).toBe('forbidden_construct');
        expect(result.violations[0].pattern).toBe('ClassDeclaration');
      });

      it('should detect class expression', () => {
        const result = checkPurity('const MyClass = class { };');

        expect(result.valid).toBe(false);
        expect(result.violations[0].violationType).toBe('forbidden_construct');
        expect(result.violations[0].pattern).toBe('ClassExpression');
      });

      it('should include helpful message for classes', () => {
        const result = checkPurity('class MyClass { }');

        expect(result.violations[0].message).toContain('factory functions');
      });
    });

    describe('this expression', () => {
      it('should detect this keyword in function', () => {
        const result = checkPurity('function foo() { return this.x; }');

        expect(result.valid).toBe(false);
        expect(result.violations[0].violationType).toBe('forbidden_construct');
        expect(result.violations[0].pattern).toBe('ThisExpression');
      });

      it('should detect this keyword in method', () => {
        const result = checkPurity('const obj = { method() { return this.value; } };');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('ThisExpression');
      });

      it('should include helpful message for this', () => {
        const result = checkPurity('function foo() { return this.x; }');

        expect(result.violations[0].message).toContain('closures');
      });
    });

    describe('with statement', () => {
      it('should detect with statement', () => {
        // with statements require script mode, not module
        const ast = parse('with (obj) { x = 1; }', { sourceType: 'script' });
        const result = validatePurity(ast, 'with (obj) { x = 1; }');

        expect(result.valid).toBe(false);
        expect(result.violations.some((v) => v.pattern === 'WithStatement')).toBe(true);
      });
    });
  });

  describe('mutation patterns', () => {
    describe('assignment expressions', () => {
      it('should detect property assignment on external object', () => {
        const result = checkPurity('obj.prop = 42;');

        expect(result.valid).toBe(false);
        expect(result.violations[0].violationType).toBe('mutation');
        expect(result.violations[0].pattern).toBe('property assignment');
      });

      it('should detect nested property assignment', () => {
        const result = checkPurity('obj.nested.prop = 42;');

        expect(result.valid).toBe(false);
        expect(result.violations[0].violationType).toBe('mutation');
      });

      it('should detect computed property assignment', () => {
        const result = checkPurity('obj[key] = 42;');

        expect(result.valid).toBe(false);
        expect(result.violations[0].violationType).toBe('mutation');
      });

      it('should detect array index assignment', () => {
        const result = checkPurity('arr[0] = 42;');

        expect(result.valid).toBe(false);
        expect(result.violations[0].violationType).toBe('mutation');
      });

      it('should allow local variable assignment within function', () => {
        const result = checkPurity(`
          const fn = () => {
            let x = 1;
            x = 2;
            return x;
          };
        `);

        expect(result.valid).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it('should allow local object mutation within function', () => {
        const result = checkPurity(`
          const fn = () => {
            const obj = {};
            obj.x = 1;
            return obj;
          };
        `);

        expect(result.valid).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it('should allow parameter reassignment within function scope', () => {
        // Parameters are local to the function, so reassignment is allowed
        // This is a local mutation that doesn't affect external state
        const result = checkPurity('const fn = (x) => { x = 10; return x; };');

        expect(result.valid).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it('should detect outer scope variable reassignment', () => {
        const result = checkPurity(`
          let counter = 0;
          const increment = () => { counter = counter + 1; };
        `);

        expect(result.valid).toBe(false);
        expect(result.violations.some((v) => v.pattern.includes('variable reassignment'))).toBe(
          true
        );
      });

      it('should include helpful message for property assignment', () => {
        const result = checkPurity('obj.prop = 42;');

        expect(result.violations[0].message).toContain('spread operator');
      });
    });

    describe('update expressions', () => {
      it('should detect ++ on external variable', () => {
        const result = checkPurity('counter++;');

        expect(result.valid).toBe(false);
        expect(result.violations[0].violationType).toBe('mutation');
        expect(result.violations[0].pattern).toContain('update expression');
      });

      it('should detect -- on external variable', () => {
        const result = checkPurity('counter--;');

        expect(result.valid).toBe(false);
        expect(result.violations[0].violationType).toBe('mutation');
      });

      it('should detect prefix ++', () => {
        const result = checkPurity('++counter;');

        expect(result.valid).toBe(false);
        expect(result.violations[0].violationType).toBe('mutation');
      });

      it('should detect update on property', () => {
        const result = checkPurity('obj.count++;');

        expect(result.valid).toBe(false);
        expect(result.violations[0].violationType).toBe('mutation');
        expect(result.violations[0].pattern).toBe('update expression on property');
      });

      it('should allow local variable update within function', () => {
        const result = checkPurity(`
          const fn = () => {
            let i = 0;
            i++;
            return i;
          };
        `);

        expect(result.valid).toBe(true);
        expect(result.violations).toHaveLength(0);
      });
    });

    describe('mutating array methods', () => {
      it('should detect push', () => {
        const result = checkPurity('arr.push(1);');

        expect(result.valid).toBe(false);
        expect(result.violations[0].violationType).toBe('mutation');
        expect(result.violations[0].pattern).toBe('push');
      });

      it('should detect pop', () => {
        const result = checkPurity('arr.pop();');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('pop');
      });

      it('should detect shift', () => {
        const result = checkPurity('arr.shift();');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('shift');
      });

      it('should detect unshift', () => {
        const result = checkPurity('arr.unshift(0);');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('unshift');
      });

      it('should detect splice', () => {
        const result = checkPurity('arr.splice(1, 1);');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('splice');
      });

      it('should detect sort (mutating)', () => {
        const result = checkPurity('arr.sort();');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('sort');
      });

      it('should detect reverse (mutating)', () => {
        const result = checkPurity('arr.reverse();');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('reverse');
      });

      it('should detect fill', () => {
        const result = checkPurity('arr.fill(0);');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('fill');
      });

      it('should detect copyWithin', () => {
        const result = checkPurity('arr.copyWithin(0, 3, 4);');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('copyWithin');
      });

      it('should allow mutating methods on local array', () => {
        const result = checkPurity(`
          const fn = () => {
            const arr = [3, 1, 2];
            arr.sort();
            return arr;
          };
        `);

        expect(result.valid).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it('should include suggestion for immutable alternatives', () => {
        const result = checkPurity('arr.sort();');

        expect(result.violations[0].message).toContain('toSorted');
      });
    });

    describe('mutating object methods', () => {
      it('should detect Object.assign with mutation target', () => {
        const result = checkPurity('Object.assign(target, source);');

        expect(result.valid).toBe(false);
        expect(result.violations[0].violationType).toBe('mutation');
        expect(result.violations[0].pattern).toBe('Object.assign');
      });

      it('should detect Object.defineProperty', () => {
        const result = checkPurity('Object.defineProperty(obj, "prop", { value: 42 });');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('Object.defineProperty');
      });

      it('should detect Object.setPrototypeOf', () => {
        const result = checkPurity('Object.setPrototypeOf(obj, proto);');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('Object.setPrototypeOf');
      });

      it('should detect Reflect.set', () => {
        const result = checkPurity('Reflect.set(obj, "prop", 42);');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('Reflect.set');
      });

      it('should detect Reflect.deleteProperty', () => {
        const result = checkPurity('Reflect.deleteProperty(obj, "prop");');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('Reflect.deleteProperty');
      });
    });
  });

  describe('side effects', () => {
    describe('console methods', () => {
      it('should detect console.log', () => {
        const result = checkPurity('console.log("hello");');

        expect(result.valid).toBe(false);
        expect(result.violations[0].violationType).toBe('side_effect');
        expect(result.violations[0].pattern).toBe('console.log');
      });

      it('should detect console.error', () => {
        const result = checkPurity('console.error("error");');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('console.error');
      });

      it('should detect console.warn', () => {
        const result = checkPurity('console.warn("warning");');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('console.warn');
      });

      it('should detect console.info', () => {
        const result = checkPurity('console.info("info");');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('console.info');
      });

      it('should detect console.debug', () => {
        const result = checkPurity('console.debug("debug");');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('console.debug');
      });

      it('should detect console.table', () => {
        const result = checkPurity('console.table(data);');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('console.table');
      });

      it('should include helpful message for console', () => {
        const result = checkPurity('console.log("hello");');

        expect(result.violations[0].message).toContain('console');
        expect(result.violations[0].message).toContain('logging');
      });
    });

    describe('file system operations', () => {
      it('should detect fs.readFile', () => {
        const result = checkPurity('fs.readFile("file.txt", callback);');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('fs.readFile');
      });

      it('should detect fs.readFileSync', () => {
        const result = checkPurity('fs.readFileSync("file.txt");');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('fs.readFileSync');
      });

      it('should detect fs.writeFile', () => {
        const result = checkPurity('fs.writeFile("file.txt", data, callback);');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('fs.writeFile');
      });

      it('should detect fs.writeFileSync', () => {
        const result = checkPurity('fs.writeFileSync("file.txt", data);');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('fs.writeFileSync');
      });

      it('should include helpful message for fs operations', () => {
        const result = checkPurity('fs.readFile("file.txt", callback);');

        expect(result.violations[0].message).toContain('file');
        expect(result.violations[0].message).toContain('I/O');
      });
    });

    describe('timer functions', () => {
      it('should detect setTimeout', () => {
        const result = checkPurity('setTimeout(() => {}, 1000);');

        expect(result.valid).toBe(false);
        expect(result.violations[0].violationType).toBe('side_effect');
        expect(result.violations[0].pattern).toBe('setTimeout');
      });

      it('should detect setInterval', () => {
        const result = checkPurity('setInterval(() => {}, 1000);');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('setInterval');
      });

      it('should detect setImmediate', () => {
        const result = checkPurity('setImmediate(() => {});');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('setImmediate');
      });

      it('should detect clearTimeout', () => {
        const result = checkPurity('clearTimeout(timerId);');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('clearTimeout');
      });

      it('should detect clearInterval', () => {
        const result = checkPurity('clearInterval(intervalId);');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('clearInterval');
      });
    });

    describe('network operations', () => {
      it('should detect fetch', () => {
        const result = checkPurity('fetch("https://api.example.com");');

        expect(result.valid).toBe(false);
        expect(result.violations[0].violationType).toBe('side_effect');
        expect(result.violations[0].pattern).toBe('fetch');
      });

      it('should detect XMLHttpRequest', () => {
        const result = checkPurity('new XMLHttpRequest();');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('XMLHttpRequest');
      });

      it('should detect WebSocket', () => {
        const result = checkPurity('new WebSocket("ws://example.com");');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('WebSocket');
      });
    });

    describe('non-deterministic functions', () => {
      it('should detect Math.random', () => {
        const result = checkPurity('const r = Math.random();');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('Math.random');
      });

      it('should detect Date constructor', () => {
        const result = checkPurity('const now = new Date();');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('Date');
      });

      it('should include message about determinism', () => {
        const result = checkPurity('const r = Math.random();');

        expect(result.violations[0].message).toContain('deterministic');
      });
    });

    describe('browser storage', () => {
      it('should detect localStorage.setItem', () => {
        const result = checkPurity('localStorage.setItem("key", "value");');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('localStorage.setItem');
      });

      it('should detect localStorage.getItem', () => {
        const result = checkPurity('localStorage.getItem("key");');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('localStorage.getItem');
      });

      it('should detect sessionStorage.setItem', () => {
        const result = checkPurity('sessionStorage.setItem("key", "value");');

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('sessionStorage.setItem');
      });
    });
  });

  describe('global access', () => {
    it('should detect window access', () => {
      const result = checkPurity('const w = window;');

      expect(result.valid).toBe(false);
      expect(result.violations[0].violationType).toBe('global_access');
      expect(result.violations[0].pattern).toBe('window');
    });

    it('should detect global access', () => {
      const result = checkPurity('const g = global;');

      expect(result.valid).toBe(false);
      expect(result.violations[0].violationType).toBe('global_access');
      expect(result.violations[0].pattern).toBe('global');
    });

    it('should detect globalThis access', () => {
      const result = checkPurity('const gt = globalThis;');

      expect(result.valid).toBe(false);
      expect(result.violations[0].violationType).toBe('global_access');
      expect(result.violations[0].pattern).toBe('globalThis');
    });

    it('should detect document access', () => {
      const result = checkPurity('const d = document;');

      expect(result.valid).toBe(false);
      expect(result.violations[0].violationType).toBe('global_access');
      expect(result.violations[0].pattern).toBe('document');
    });

    it('should detect process.exit', () => {
      const result = checkPurity('process.exit(1);');

      expect(result.valid).toBe(false);
      expect(result.violations[0].pattern).toBe('process.exit');
    });

    it('should detect history.pushState', () => {
      const result = checkPurity('history.pushState({}, "", "/new");');

      expect(result.valid).toBe(false);
      expect(result.violations[0].pattern).toBe('history.pushState');
    });

    it('should detect location.reload', () => {
      const result = checkPurity('location.reload();');

      expect(result.valid).toBe(false);
      expect(result.violations[0].pattern).toBe('location.reload');
    });

    it('should include helpful message for global access', () => {
      const result = checkPurity('const w = window;');

      expect(result.violations[0].message).toContain('global');
    });
  });

  describe('violation details', () => {
    it('should include line and column in violation location', () => {
      const code = 'const x = 1;\nconsole.log("test");\nconst y = 2;';
      const result = checkPurity(code);

      expect(result.violations[0].location).toBeDefined();
      expect(result.violations[0].location.line).toBe(2);
      expect(typeof result.violations[0].location.column).toBe('number');
    });

    it('should include violationType field', () => {
      const result = checkPurity('console.log("test");');

      expect(result.violations[0].violationType).toBe('side_effect');
    });

    it('should include pattern field', () => {
      const result = checkPurity('console.log("test");');

      expect(result.violations[0].pattern).toBe('console.log');
    });

    it('should include message field', () => {
      const result = checkPurity('console.log("test");');

      expect(result.violations[0].message).toBeDefined();
      expect(typeof result.violations[0].message).toBe('string');
      expect(result.violations[0].message.length).toBeGreaterThan(0);
    });

    it('should include code snippet in violation', () => {
      const result = checkPurity('console.log("test");');

      expect(result.violations[0].code).toBeDefined();
      expect(typeof result.violations[0].code).toBe('string');
    });

    it('should include file in location when filename option is provided', () => {
      const result = checkPurity('console.log("test");', { filename: 'test.js' });

      expect(result.violations[0].location.file).toBe('test.js');
    });
  });

  describe('options', () => {
    describe('filename option', () => {
      it('should include filename in violation locations', () => {
        const result = checkPurity('console.log("test");', { filename: 'myfile.js' });

        expect(result.violations[0].location.file).toBe('myfile.js');
      });
    });

    describe('allowedGlobals option', () => {
      it('should allow specified globals', () => {
        const result = checkPurity('const x = fetch("url");', {
          allowedGlobals: ['fetch'],
        });

        expect(result.valid).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it('should still detect other forbidden globals', () => {
        const result = checkPurity('const x = fetch("url"); setTimeout(() => {}, 100);', {
          allowedGlobals: ['fetch'],
        });

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('setTimeout');
      });
    });

    describe('allowedMethods option', () => {
      it('should allow specified member expressions', () => {
        const result = checkPurity('console.log("debug");', {
          allowedMethods: ['console.log'],
        });

        expect(result.valid).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it('should still detect other forbidden methods', () => {
        const result = checkPurity('console.log("ok"); console.error("fail");', {
          allowedMethods: ['console.log'],
        });

        expect(result.valid).toBe(false);
        expect(result.violations[0].pattern).toBe('console.error');
      });
    });
  });

  describe('multiple violations', () => {
    it('should collect all violations', () => {
      const code = `
        console.log("test");
        for (let i = 0; i < 10; i++) {}
        class Foo {}
      `;
      const result = checkPurity(code);

      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThanOrEqual(3);
    });

    it('should report different violation types', () => {
      const code = `
        console.log("test");
        obj.prop = 42;
        class Foo {}
      `;
      const result = checkPurity(code);

      const types = result.violations.map((v) => v.violationType);
      expect(types).toContain('side_effect');
      expect(types).toContain('mutation');
      expect(types).toContain('forbidden_construct');
    });
  });

  describe('edge cases', () => {
    it('should handle empty code', () => {
      const result = checkPurity('');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should handle whitespace only', () => {
      const result = checkPurity('   \n\t\n   ');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should handle comments only', () => {
      const result = checkPurity('// This is a comment\n/* Block comment */');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should handle complex nested expressions', () => {
      const result = checkPurity(`
        const result = items
          .filter(x => x.active)
          .map(x => ({ ...x, value: x.value * 2 }))
          .reduce((acc, x) => ({ ...acc, [x.id]: x }), {});
      `);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should handle IIFE patterns', () => {
      const result = checkPurity(`
        const result = ((x) => {
          const doubled = x * 2;
          return doubled + 1;
        })(5);
      `);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should handle optional chaining', () => {
      const result = checkPurity('const value = obj?.foo?.bar?.baz;');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should handle nullish coalescing', () => {
      const result = checkPurity('const value = input ?? defaultValue;');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });
});

describe('createPurityViolation', () => {
  it('should create a valid violation object', () => {
    const violation = createPurityViolation({
      violationType: 'side_effect',
      pattern: 'console.log',
      location: { line: 1, column: 0 },
      code: 'console.log("test");',
      message: 'Test message',
    });

    expect(violation.violationType).toBe('side_effect');
    expect(violation.pattern).toBe('console.log');
    expect(violation.location.line).toBe(1);
    expect(violation.location.column).toBe(0);
    expect(violation.code).toBe('console.log("test");');
    expect(violation.message).toBe('Test message');
  });

  it('should throw for invalid violation type', () => {
    expect(() => {
      createPurityViolation({
        violationType: 'invalid_type',
        pattern: 'test',
        location: { line: 1, column: 0 },
        message: 'Test',
      });
    }).toThrow('Invalid violation type');
  });

  it('should accept all valid violation types', () => {
    const types = ['mutation', 'side_effect', 'global_access', 'forbidden_construct'];

    types.forEach((type) => {
      const violation = createPurityViolation({
        violationType: type,
        pattern: 'test',
        location: { line: 1, column: 0 },
        message: 'Test',
      });
      expect(violation.violationType).toBe(type);
    });
  });

  it('should include optional file in location', () => {
    const violation = createPurityViolation({
      violationType: 'side_effect',
      pattern: 'test',
      location: { line: 1, column: 0, file: 'test.js' },
      message: 'Test',
    });

    expect(violation.location.file).toBe('test.js');
  });

  it('should include optional endLine and endColumn', () => {
    const violation = createPurityViolation({
      violationType: 'side_effect',
      pattern: 'test',
      location: { line: 1, column: 0, endLine: 1, endColumn: 10 },
      message: 'Test',
    });

    expect(violation.location.endLine).toBe(1);
    expect(violation.location.endColumn).toBe(10);
  });

  it('should default code to empty string', () => {
    const violation = createPurityViolation({
      violationType: 'side_effect',
      pattern: 'test',
      location: { line: 1, column: 0 },
      message: 'Test',
    });

    expect(violation.code).toBe('');
  });

  it('should default column to 0 if not provided', () => {
    const violation = createPurityViolation({
      violationType: 'side_effect',
      pattern: 'test',
      location: { line: 1 },
      message: 'Test',
    });

    expect(violation.location.column).toBe(0);
  });
});

describe('getNodeLocation', () => {
  it('should extract location from AST node', () => {
    const ast = parseCode('const x = 42;');
    const node = ast.program.body[0];
    const location = getNodeLocation(node);

    expect(location.line).toBe(1);
    expect(typeof location.column).toBe('number');
  });

  it('should include filename when provided', () => {
    const ast = parseCode('const x = 42;');
    const node = ast.program.body[0];
    const location = getNodeLocation(node, 'test.js');

    expect(location.file).toBe('test.js');
  });

  it('should include end location when available', () => {
    const ast = parseCode('const x = 42;');
    const node = ast.program.body[0];
    const location = getNodeLocation(node);

    expect(location.endLine).toBeDefined();
    expect(location.endColumn).toBeDefined();
  });

  it('should default to line 1, column 0 for node without loc', () => {
    const node = { type: 'Identifier', name: 'x' };
    const location = getNodeLocation(node);

    expect(location.line).toBe(1);
    expect(location.column).toBe(0);
  });
});

describe('getMemberExpressionString', () => {
  it('should return string for simple member expression', () => {
    const ast = parseCode('console.log;');
    const node = ast.program.body[0].expression;
    const result = getMemberExpressionString(node);

    expect(result).toBe('console.log');
  });

  it('should return string for nested member expression', () => {
    const ast = parseCode('a.b.c.d;');
    const node = ast.program.body[0].expression;
    const result = getMemberExpressionString(node);

    expect(result).toBe('a.b.c.d');
  });

  it('should handle string literal property', () => {
    const ast = parseCode('obj["prop"];');
    const node = ast.program.body[0].expression;
    const result = getMemberExpressionString(node);

    expect(result).toBe('obj.prop');
  });

  it('should return null for computed property with variable', () => {
    const ast = parseCode('obj[key];');
    const node = ast.program.body[0].expression;
    const result = getMemberExpressionString(node);

    expect(result).toBeNull();
  });

  it('should return null for call expression as object', () => {
    const ast = parseCode('getObj().prop;');
    const node = ast.program.body[0].expression;
    const result = getMemberExpressionString(node);

    expect(result).toBeNull();
  });
});

describe('matchesForbiddenMemberExpression', () => {
  const forbiddenPatterns = ['console.log', 'console.error', 'fs.*', 'process.exit'];

  it('should match exact pattern', () => {
    expect(matchesForbiddenMemberExpression('console.log', forbiddenPatterns)).toBe('console.log');
  });

  it('should match wildcard pattern', () => {
    expect(matchesForbiddenMemberExpression('fs.readFile', forbiddenPatterns)).toBe('fs.*');
    expect(matchesForbiddenMemberExpression('fs.writeFile', forbiddenPatterns)).toBe('fs.*');
  });

  it('should return null for non-matching pattern', () => {
    expect(matchesForbiddenMemberExpression('Math.floor', forbiddenPatterns)).toBeNull();
  });

  it('should not match partial prefix without wildcard', () => {
    expect(matchesForbiddenMemberExpression('console.trace', forbiddenPatterns)).toBeNull();
  });
});

describe('getMutatingArrayMethod', () => {
  it('should detect push', () => {
    const ast = parseCode('arr.push(1);');
    const node = ast.program.body[0].expression;
    expect(getMutatingArrayMethod(node)).toBe('push');
  });

  it('should detect pop', () => {
    const ast = parseCode('arr.pop();');
    const node = ast.program.body[0].expression;
    expect(getMutatingArrayMethod(node)).toBe('pop');
  });

  it('should detect sort', () => {
    const ast = parseCode('arr.sort();');
    const node = ast.program.body[0].expression;
    expect(getMutatingArrayMethod(node)).toBe('sort');
  });

  it('should return null for non-mutating method', () => {
    const ast = parseCode('arr.map(x => x);');
    const node = ast.program.body[0].expression;
    expect(getMutatingArrayMethod(node)).toBeNull();
  });

  it('should return null for non-method call', () => {
    const ast = parseCode('foo();');
    const node = ast.program.body[0].expression;
    expect(getMutatingArrayMethod(node)).toBeNull();
  });
});

describe('getMutatingObjectMethod', () => {
  it('should detect Object.assign', () => {
    const ast = parseCode('Object.assign(target, source);');
    const node = ast.program.body[0].expression;
    expect(getMutatingObjectMethod(node)).toBe('Object.assign');
  });

  it('should detect Object.defineProperty', () => {
    const ast = parseCode('Object.defineProperty(obj, "prop", {});');
    const node = ast.program.body[0].expression;
    expect(getMutatingObjectMethod(node)).toBe('Object.defineProperty');
  });

  it('should detect Reflect.set', () => {
    const ast = parseCode('Reflect.set(obj, "prop", value);');
    const node = ast.program.body[0].expression;
    expect(getMutatingObjectMethod(node)).toBe('Reflect.set');
  });

  it('should return null for non-mutating method', () => {
    const ast = parseCode('Object.keys(obj);');
    const node = ast.program.body[0].expression;
    expect(getMutatingObjectMethod(node)).toBeNull();
  });
});

describe('isAllowedPurePattern', () => {
  it('should return true for map', () => {
    const ast = parseCode('arr.map(x => x);');
    const node = ast.program.body[0].expression;
    expect(isAllowedPurePattern(node)).toBe(true);
  });

  it('should return true for filter', () => {
    const ast = parseCode('arr.filter(x => x);');
    const node = ast.program.body[0].expression;
    expect(isAllowedPurePattern(node)).toBe(true);
  });

  it('should return true for reduce', () => {
    const ast = parseCode('arr.reduce((a, b) => a + b, 0);');
    const node = ast.program.body[0].expression;
    expect(isAllowedPurePattern(node)).toBe(true);
  });

  it('should return true for Object.keys', () => {
    const ast = parseCode('Object.keys(obj);');
    const node = ast.program.body[0].expression;
    expect(isAllowedPurePattern(node)).toBe(true);
  });

  it('should return true for Object.values', () => {
    const ast = parseCode('Object.values(obj);');
    const node = ast.program.body[0].expression;
    expect(isAllowedPurePattern(node)).toBe(true);
  });

  it('should return false for push (mutating)', () => {
    const ast = parseCode('arr.push(1);');
    const node = ast.program.body[0].expression;
    expect(isAllowedPurePattern(node)).toBe(false);
  });

  it('should return false for non-method call', () => {
    const ast = parseCode('foo();');
    const node = ast.program.body[0].expression;
    expect(isAllowedPurePattern(node)).toBe(false);
  });
});
