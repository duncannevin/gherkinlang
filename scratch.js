// Run: node
// Then paste this script

const { generate, wrapWithExports, resolveImports, computeOutputPath } = require('./src/generation/generator');
const { generateFunctionJSDoc, generateModuleJSDoc, inferTypeFromName } = require('./src/generation/formatters/jsdoc');
const { formatCode, getDefaultConfig } = require('./src/generation/formatters/javascript');

async function demo() {
  console.log('=== GherkinLang Code Generator Demo ===\n');

  // 1. JSDoc Generation
  console.log('1. JSDoc Generation:');
  const moduleDoc = generateModuleJSDoc('MathUtils', 'Pure mathematical utility functions');
  console.log(moduleDoc);
  console.log();

  const funcDoc = generateFunctionJSDoc('add', {
    description: 'Adds two numbers together',
    params: [
      { name: 'a', type: 'number', description: 'First number' },
      { name: 'b', type: 'number', description: 'Second number' },
    ],
    returnType: 'number',
    returnDescription: 'The sum of a and b',
    examples: [{
      name: 'Basic usage',
      rows: [
        { a: 1, b: 2, result: 3 },
        { a: 10, b: 20, result: 30 },
      ],
    }],
  });
  console.log('Function JSDoc:');
  console.log(funcDoc);
  console.log();

  // 2. Type Inference
  console.log('2. Type Inference from Parameter Names:');
  const names = ['count', 'name', 'isValid', 'items', 'callback'];
  names.forEach((n) => console.log(`  ${n} => ${inferTypeFromName(n)}`));
  console.log();

  // 3. Module Exports
  console.log('3. Module Export Wrapping:');
  const code = 'const add = (a, b) => a + b;\nconst multiply = (x, y) => x * y;';
  const exports = [
    { name: 'add', exportType: 'named' },
    { name: 'multiply', exportType: 'named' },
  ];

  console.log('CommonJS:');
  console.log(wrapWithExports(code, exports, 'cjs'));
  console.log();

  console.log('ES Modules:');
  console.log(wrapWithExports(code, exports, 'esm'));
  console.log();

  // 4. Import Resolution
  console.log('4. Import Resolution:');
  const deps = [
    { modulePath: './utils', named: ['helper', 'validate'] },
    { modulePath: 'lodash', default: '_' },
  ];
  console.log('CommonJS imports:');
  console.log(resolveImports(deps, 'cjs'));
  console.log();
  console.log('ESM imports:');
  console.log(resolveImports(deps, 'esm'));
  console.log();

  // 5. Output Path Computation
  console.log('5. Output Path Computation:');
  console.log(`  math.feature => ${computeOutputPath('features/math.feature', 'dist')}`);
  console.log(`  project/utils.feature => ${computeOutputPath('features/project/utils.feature', 'output')}`);
  console.log();

  // 6. Full Generation Pipeline (dry run)
  console.log('6. Full Generation Pipeline:');
  const validatedCode = `
const add = (a, b) => a + b;
const subtract = (a, b) => a - b;
const multiply = (a, b) => a * b;
  `.trim();

  const context = {
    sourcePath: 'features/math.feature',
    featureName: 'MathOperations',
    scenarios: [
      { name: 'Add two numbers', description: 'Adds two numbers together' },
    ],
    dependencies: [
      { modulePath: './helpers', named: ['validate'] },
    ],
  };

  const result = await generate(validatedCode, context, {
    outputDir: '/tmp/gherkin-demo',
    moduleFormat: 'cjs',
    dryRun: true, // Don't write to disk
  });

  console.log('Generated Module:');
  console.log('  Source:', result.sourcePath);
  console.log('  Output:', result.outputPath);
  console.log('  Exports:', result.exports.map((e) => e.name).join(', '));
  console.log('  Formatted:', result.formatted);
  console.log();
  console.log('Generated Code:');
  console.log('---');
  console.log(result.formattedCode);
  console.log('---');

  // 7. Prettier Config
  console.log('\n7. Default Prettier Config:');
  const config = getDefaultConfig();
  console.log(JSON.stringify(config, null, 2));

  console.log('\n=== Demo Complete ===');
}

demo().catch(console.error);