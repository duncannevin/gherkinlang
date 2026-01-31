// Copy and paste this into Node.js REPL (run `node` from project root)

const { validateLint, listEnabledRules } = require('./src/validation/eslint-config');

// Show all enabled rules
console.log('=== Enabled Rules ===');
console.log(listEnabledRules().join('\n'));

// Test 1: Valid pure code
(async () => {
  console.log('\n=== Test 1: Valid Pure Code ===');
  const pureCode = `export const add = (a, b) => a + b;
export const double = (arr) => arr.map(x => x * 2);`;
  const result1 = await validateLint(pureCode);
  console.log('Valid:', result1.valid);
  console.log('Errors:', result1.errorCount);
  
  // Test 2: Using var (forbidden)
  console.log('\n=== Test 2: Using var ===');
  const varCode = 'var x = 1;';
  const result2 = await validateLint(varCode);
  console.log('Valid:', result2.valid);
  console.log('Rule:', result2.violations[0].rule);
  console.log('Message:', result2.violations[0].message);
  
  // Test 3: Console.log (forbidden)
  console.log('\n=== Test 3: Console.log ===');
  const consoleCode = 'console.log("hello");';
  const result3 = await validateLint(consoleCode);
  console.log('Valid:', result3.valid);
  console.log('Rule:', result3.violations[0].rule);
  
  // Test 4: For loop (forbidden by functional plugin)
  console.log('\n=== Test 4: For Loop ===');
  const loopCode = 'for (let i = 0; i < 10; i++) { }';
  const result4 = await validateLint(loopCode);
  console.log('Valid:', result4.valid);
  const loopViolation = result4.violations.find(v => v.rule.includes('loop'));
  if (loopViolation) console.log('Rule:', loopViolation.rule);
  
  // Test 5: Custom rules override
  console.log('\n=== Test 5: Custom Rules ===');
  const customResult = await validateLint('console.log("allowed");', {
    rules: { 'no-console': 'off' }
  });
  console.log('With no-console off - Valid:', customResult.valid);
  
  console.log('\n=== Done! ===');
})();