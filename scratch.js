/**
 * Test script for AITransformer.
 * Run with: node scratch.js
 * 
 * Note: Requires ANTHROPIC_API_KEY environment variable to be set.
 */

const { AITransformer } = require('./src/ai/transformer');
const { readFile } = require('./src/compiler/utils/fs');

const path = require('path');

async function testTransformer() {
  console.log('=== Testing AITransformer ===\n');

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('✗ Error: ANTHROPIC_API_KEY environment variable is required');
    console.error('  Set it with: export ANTHROPIC_API_KEY=your_key_here\n');
    process.exit(1);
  }

  try {
    const resolvedPath = path.join(__dirname, 'features', 'examples', 'data_pipeline.feature');
    const content = await readFile(resolvedPath);
    // Create transformer instance
    const transformer = new AITransformer({
      model: 'claude-sonnet-4-5',
      maxRetries: 2,
      maxTokens: 4096,
    });

    console.log('✓ AITransformer created successfully');
    console.log('  Model:', transformer._model);
    console.log('  Max retries:', transformer._maxRetries);
    console.log('  Max tokens:', transformer._maxTokens);
    console.log();

    // Test transformation with simple GherkinLang source
    const source = content;

    const context = {
      dependencies: [],
      imports: [],
    };

    console.log('Transforming GherkinLang source...');
    console.log('Source:');
    console.log(source);
    console.log();

    const result = await transformer.transform(source, context, {
      target: 'javascript',
    });

    console.log('✓ Transformation successful!\n');
    console.log('Result:');
    console.log('  Success:', result.success);
    console.log('  Code length:', result.code?.length || 0);
    console.log('  Tool calls:', result.toolCalls?.length || 0);
    console.log('  Metadata:');
    console.log('    Model:', result.metadata.model);
    console.log('    Duration:', result.metadata.duration + 'ms');
    console.log('    Tokens:', result.metadata.tokens);
    console.log('      Input:', result.metadata.tokens.input);
    console.log('      Output:', result.metadata.tokens.output);
    console.log('      Total:', result.metadata.tokens.total);
    console.log('    Retry count:', result.metadata.retryCount);
    console.log('    Cache hit:', result.metadata.cacheHit);
    console.log();
    console.log('Generated code:');
    console.log('─'.repeat(60));
    console.log(result.code);
    console.log('─'.repeat(60));
    console.log();

  } catch (error) {
    console.error('✗ Transformation failed:');
    console.error('  Error type:', error.name);
    console.error('  Message:', error.message);
    
    if (error.statusCode) {
      console.error('  Status code:', error.statusCode);
    }
    
    if (error.retryCount !== undefined) {
      console.error('  Retry count:', error.retryCount);
    }
    
    if (error.response) {
      console.error('  Response:', JSON.stringify(error.response, null, 2));
    }
    
    console.error();
    process.exit(1);
  }
}

// Run test
testTransformer().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
