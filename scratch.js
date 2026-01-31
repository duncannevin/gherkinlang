// Run: node
// Then paste this script

const {
  generateTests,
  generateExampleTests,
  generateTypeTests,
  generateEdgeCaseTests,
  generateBoundaryTests,
  generateAssertion,
  createTestFile,
  computeTestPath,
  inferTypes,
} = require('./src/generation/test-generator');

async function demo() {
  console.log('=== GherkinLang Test Generator Demo ===\n');

  // 1. Type Inference
  console.log('1. Type Inference:');
  const code = 'const add = (count, amount) => count + amount;';
  const inferred = inferTypes('add', code);
  console.log('   Function: add');
  console.log('   Inferred params:', inferred.params);
  console.log('   Inferred return:', inferred.returnType);
  console.log('   Confidence:', inferred.confidence);
  console.log();

  // 2. Example-based Tests
  console.log('2. Example-based Tests:');
  const examples = [{
    name: 'Addition examples',
    functionName: 'add',
    rows: [
      { a: 1, b: 2, result: 3 },
      { a: 10, b: 20, result: 30 },
      { a: 0, b: 0, result: 0 },
    ],
  }];
  const exampleTests = generateExampleTests('add', examples, ['a', 'b']);
  console.log(`   Generated ${exampleTests.length} example tests:`);
  exampleTests.forEach((t) => console.log(`   - ${t.name}`));
  console.log();

  // 3. Type Validation Tests
  console.log('3. Type Validation Tests:');
  const typeTests = generateTypeTests('add', { a: 'number', b: 'number' }, 'number');
  console.log(`   Generated ${typeTests.length} type tests:`);
  typeTests.slice(0, 3).forEach((t) => console.log(`   - ${t.name}`));
  console.log('   ...');
  console.log();

  // 4. Edge Case Tests
  console.log('4. Edge Case Tests:');
  const edgeTests = generateEdgeCaseTests('add', { a: 'number', b: 'number' });
  console.log(`   Generated ${edgeTests.length} edge case tests:`);
  edgeTests.slice(0, 4).forEach((t) => console.log(`   - ${t.name}`));
  console.log('   ...');
  console.log();

  // 5. Boundary Tests
  console.log('5. Boundary Tests:');
  const boundaryTests = generateBoundaryTests('add', { a: 'number', b: 'number' });
  console.log(`   Generated ${boundaryTests.length} boundary tests:`);
  boundaryTests.slice(0, 4).forEach((t) => console.log(`   - ${t.name}`));
  console.log('   ...');
  console.log();

  // 6. Assertion Generation
  console.log('6. Assertion Generation:');
  const testCases = [
    { functionName: 'add', inputs: [1, 2], expected: 3, expectsError: false },
    { functionName: 'divide', inputs: [1, 0], expected: undefined, expectsError: true },
    { functionName: 'getItems', inputs: [], expected: [1, 2, 3], expectsError: false },
  ];
  testCases.forEach((tc) => {
    console.log(`   ${generateAssertion(tc)}`);
  });
  console.log();

  // 7. Test Path Computation
  console.log('7. Test Path Computation:');
  console.log(`   math.js => ${computeTestPath('/src/math.js')}`);
  console.log(`   with testDir => ${computeTestPath('/src/math.js', '/tests/unit')}`);
  console.log();

  // 8. Full Test File Generation
  console.log('8. Full Test File Generation:');
  const allTestCases = [...exampleTests, ...edgeTests.slice(0, 2)];
  const testFile = createTestFile('math', './math.js', ['add'], allTestCases);
  console.log('   Generated test file:');
  console.log('   ---');
  console.log(testFile.split('\n').slice(0, 25).join('\n'));
  console.log('   ... (truncated)');
  console.log('   ---');
  console.log();

  // 9. Full Pipeline (dry run)
  console.log('9. Full Test Generation Pipeline:');
  const module = {
    sourcePath: 'features/calculator.feature',
    outputPath: '/tmp/calculator.js',
    code: 'const add = (a, b) => a + b;\nconst subtract = (a, b) => a - b;',
    formattedCode: 'const add = (a, b) => a + b;\nconst subtract = (a, b) => a - b;',
    formatted: true,
    exports: [
      { name: 'add', exportType: 'named', params: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }], returnType: 'number' },
      { name: 'subtract', exportType: 'named', params: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }], returnType: 'number' },
    ],
    imports: [],
  };

  const context = {
    examples: [
      { functionName: 'add', rows: [{ a: 1, b: 2, result: 3 }] },
      { functionName: 'subtract', rows: [{ a: 5, b: 3, result: 2 }] },
    ],
  };

  const result = await generateTests(module, context, {
    testDir: '/tmp',
    dryRun: true,
  });

  console.log('   Source:', result.sourcePath);
  console.log('   Test path:', result.testPath);
  console.log('   Test cases:', result.testCases.length);
  console.log('   Expected coverage:', result.expectedCoverage + '%');
  console.log();
  console.log('   Test file preview:');
  console.log('   ---');
  console.log(result.code.split('\n').slice(0, 30).join('\n'));
  console.log('   ... (truncated)');
  console.log('   ---');

  console.log('\n=== Demo Complete ===');
}

demo().catch(console.error);