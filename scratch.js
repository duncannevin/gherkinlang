// Run in Node.js REPL: node
// Or copy-paste the entire block below

const { validate, isValid, validateSyntaxOnly } = require('./src/validation/validator');

async function demo() {
  console.log('=== GherkinLang Validator Demo ===\n');

  // Test 1: Valid pure code
  console.log('1. Valid pure code:');
  const validCode = `
const add = (a, b) => a + b;
const multiply = (x, y) => x * y;
const compose = (f, g) => (x) => f(g(x));
`;
  const result1 = await validate(validCode, { skipLint: true });
  console.log('   Valid:', result1.valid);
  console.log('   Duration:', result1.duration + 'ms');
  console.log('   Syntax valid:', result1.syntax.valid);
  console.log('   Purity valid:', result1.purity.valid);
  console.log();

  // Test 2: Syntax error (fail-fast)
  console.log('2. Syntax error (fail-fast):');
  const syntaxError = 'const x = ;';
  const result2 = await validate(syntaxError);
  console.log('   Valid:', result2.valid);
  console.log('   Purity check ran:', result2.purity !== null);
  console.log('   Lint check ran:', result2.lint !== null);
  console.log('   Error:', result2.errors[0].message);
  console.log();

  // Test 3: Purity violation (console.log)
  console.log('3. Purity violation (side effect):');
  const impureCode = 'const fn = () => { console.log("hello"); return 42; };';
  const result3 = await validate(impureCode, { skipLint: true });
  console.log('   Valid:', result3.valid);
  console.log('   Purity errors:', result3.purity?.violations.length);
  console.log('   Error:', (result3.errors ?? []).find(e => e.type === 'purity')?.message);
  console.log();

  // Test 4: Mutation detection
  console.log('4. Mutation detection:');
  const mutationCode = 'const fn = (arr) => { arr.push(1); return arr; };';
  const result4 = await validate(mutationCode, { skipLint: true });
  console.log('   Valid:', result4.valid);
  console.log('   Pattern detected:', result4.purity?.violations[0].pattern);
  console.log('   Suggestion:', result4.errors[0].suggestion);
  console.log();

  // Test 5: Lint violation (no-var)
  console.log('5. Lint violation:');
  const lintViolation = 'var x = 1;';
  const result5 = await validate(lintViolation);
  console.log('   Valid:', result5.valid);
  console.log('   Lint errors:', result5.lint?.errorCount);
  console.log('   Rule:', result5.errors.find(e => e.type === 'lint')?.rule);
  console.log();

  // Test 6: Complex pure functional code
  console.log('6. Complex pure functional code:');
  const functionalCode = `
const curry = (fn) => {
  const arity = fn.length;
  const curried = (...args) =>
    args.length >= arity ? fn(...args) : (...more) => curried(...args, ...more);
  return curried;
};

const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x);
const map = (fn) => (arr) => arr.map(fn);
const filter = (pred) => (arr) => arr.filter(pred);
`;
  const result6 = await validate(functionalCode, { skipLint: true });
  console.log('   Valid:', result6.valid);
  console.log('   Duration:', result6.duration + 'ms');
  console.log('   Syntax valid:', result6.syntax.valid);
  console.log('   Purity valid:', result6.purity.valid);
  console.log();

  // Test 7: Quick validity check
  console.log('7. Quick validity check (isValid):');
  console.log('   Pure code:', await isValid('(() => 42)();'));
  console.log('   Impure code:', await isValid('console.log("hi");', { skipLint: true }));
  console.log();

  console.log('=== Demo Complete ===');
}

demo().catch(console.error);