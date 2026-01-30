/**
 * Phase 5 manual test script for MCP tools.
 * Run from repo root: node scratch-phase5.js
 */

const { getToolInstance, getAllTools } = require('./src/mcp/tools');
const { ToolRegistry } = require('./src/mcp/tool-registry');

async function runTests() {
  console.log('=== Phase 5 MCP Tools – Manual Tests ===\n');

  // -------------------------------------------------------------------------
  // 1. Tool registry: getAllTools + getToolInstance
  // -------------------------------------------------------------------------
  console.log('1. Tool registry');
  const tools = getAllTools();
  console.log('   getAllTools() count:', tools.length);
  console.log('   Tool names:', tools.map(t => t.name).join(', '));

  const registry = new ToolRegistry();
  registry.registerAllTools();
  console.log('   Registry after registerAllTools():', registry.getAllTools().length);
  console.log('   toClaudeTools() count:', registry.toClaudeTools().length);
  console.log('');

  // -------------------------------------------------------------------------
  // 2. Analyzer – syntax + purity
  // -------------------------------------------------------------------------
  console.log('2. Analyzer tool');
  const analyzer = getToolInstance('analyzer');

  if (!analyzer) {
    console.error('Analyzer tool not found');
    return;
  }

  const validCode = 'const add = (a, b) => a + b;';
  const analyzerValid = await analyzer.execute({ code: validCode, checks: ['syntax', 'purity'] });
  console.log('   Valid code (syntax + purity):', analyzerValid.success, analyzerValid.content?.valid);

  const invalidCode = 'function broken( {';
  const analyzerInvalid = await analyzer.execute({ code: invalidCode, checks: ['syntax'] });
  console.log('   Invalid syntax:', !analyzerInvalid.content?.valid, 'errors:', analyzerInvalid.content?.errors?.length);

  const impureCode = 'console.log("hi");';
  const analyzerImpure = await analyzer.execute({ code: impureCode, checks: ['purity'] });
  console.log('   Impure code:', !analyzerImpure.content?.valid, 'errors:', analyzerImpure.content?.errors?.length);

  const badInput = await analyzer.execute({ code: '' });
  console.log('   Bad input (no code):', !badInput.success, badInput.error?.slice(0, 40));
  console.log('');

  // -------------------------------------------------------------------------
  // 3. Dependencies – npm package check
  // -------------------------------------------------------------------------
  console.log('3. Dependencies tool');
  const dependencies = getToolInstance('dependencies');

  if (!dependencies) {
    console.error('Dependencies tool not found');
    return;
  }

  const lodash = await dependencies.execute({ packageName: 'lodash' });
  console.log('   lodash exists:', lodash.success && lodash.content?.exists);

  const fakePkg = await dependencies.execute({ packageName: 'this-package-does-not-exist-xyz-123' });
  console.log('   Fake package exists:', fakePkg.content?.exists === false);

  const noName = await dependencies.execute({ packageName: '' });
  console.log('   Empty packageName:', !noName.success);
  console.log('');

  // -------------------------------------------------------------------------
  // 4. Filesystem – read file
  // -------------------------------------------------------------------------
  console.log('4. Filesystem tool');
  const filesystem = getToolInstance('filesystem');

  if (!filesystem) {
    console.error('Filesystem tool not found');
    return;
  }

  const readReal = await filesystem.execute({ action: 'read', path: 'package.json' });
  console.log('   Read package.json:', readReal.success, readReal.content?.path === 'package.json');

  const readMissing = await filesystem.execute({ action: 'read', path: 'nonexistent-file-12345.txt' });
  console.log('   Read missing file:', !readMissing.success);

  const badAction = await filesystem.execute({ action: 'write', path: 'x' });
  console.log('   Unsupported action:', !badAction.success);
  console.log('');

  // -------------------------------------------------------------------------
  // 5. Test generator – Jest test from code
  // -------------------------------------------------------------------------
  console.log('5. Test generator tool');
  const testGenerator = getToolInstance('test-generator');

  if (!testGenerator) {
    console.error('Test generator tool not found');
    return;
  }

  const codeWithExport = `
    function add(a, b) { return a + b; }
    module.exports = { add };
  `;
  const gen = await testGenerator.execute({ code: codeWithExport });
  console.log('   Generate tests:', gen.success);
  console.log('   testCode contains describe:', gen.content?.testCode?.includes('describe'));
  console.log('   coverage:', gen.content?.coverage);

  const noCode = await testGenerator.execute({ code: '' });
  console.log('   Empty code:', noCode.success); // may still succeed with placeholder
  console.log('');

  console.log(gen.content?.testCode);

  console.log('=== Done ===');
}

runTests().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});