# Quickstart: AI Transformation

**Feature**: AI Transformation  
**Date**: 2026-01-19  
**Phase**: 1 - Design & Contracts

## Overview

Quick start guide for using the AI transformation engine with Claude API integration and MCP (Model Context Protocol) client support for tool-assisted compilation.

## Prerequisites

- Node.js 18.x or higher
- Anthropic Claude API key (set `API_KEY` environment variable)
- MCP server implementation (for tool support)
- Core components (rules-loader, parser, context, cache) from Phase 1

## Installation

```bash
npm install @anthropic-ai/sdk
```

## Basic Usage

### 1. Setup AI Transformer

```javascript
const { AITransformer } = require('./src/ai/transformer');

const transformer = new AITransformer({
  apiKey: process.env.API_KEY,
  model: 'claude-sonnet-4-5',
  maxRetries: 3
});
```

### 2. Transform Source Code

```javascript
const { RulesLoader } = require('./src/ai/rules-loader');
const { GherkinParser } = require('./src/compiler/parser');
const { ProjectContext } = require('./src/compiler/context');
const { MCPClient } = require('./src/mcp/client');

// Load prerequisites
const loader = new RulesLoader();
const parser = new GherkinParser();
const context = new ProjectContext();

// Load rules
const rules = await loader.load('javascript');

// Parse source
const parsed = await parser.parse('features/mathematics.feature');
if (parsed.errors.length > 0) {
  throw new Error('Parse errors: ' + parsed.errors.map(e => e.message).join(', '));
}

// Build project context
await context.build('./features');

// Connect to MCP server and get tools
const mcpClient = new MCPClient();
const tools = await mcpClient.connect(['node', 'mcp-server.js']);

// Transform
const result = await transformer.transform(parsed, rules, context, tools);

if (result.success) {
  console.log('Generated code:', result.code);
  console.log('Tokens used:', result.metadata.tokens.total);
  console.log('Duration:', result.metadata.duration, 'ms');
} else {
  console.error('Transformation failed:', result.error);
}

// Cleanup
await mcpClient.disconnect();
```

### 3. Handle Tool-Assisted Compilation

```javascript
// Tools are automatically used by AI during compilation
// The transformer handles multi-turn conversations:

// 1. AI generates code
// 2. AI invokes code analyzer tool to validate
// 3. AI receives validation results
// 4. AI refines code if needed
// 5. Final code is returned

// Tool invocations are tracked in result.toolCalls
if (result.toolCalls && result.toolCalls.length > 0) {
  console.log('Tools used:');
  result.toolCalls.forEach(call => {
    console.log(`- ${call.toolName}: ${call.duration}ms`);
  });
}
```

### 4. Use MCP Client Directly

```javascript
const { MCPClient } = require('./src/mcp/client');

const client = new MCPClient();

// Connect to MCP server
const tools = await client.connect(['node', 'mcp-server.js']);
console.log('Available tools:', tools.map(t => t.name));

// Invoke a tool
const result = await client.invokeTool('analyzer', {
  code: 'const x = 1;',
  checks: ['syntax', 'purity']
});

if (result.success) {
  console.log('Analysis:', result.content);
} else {
  console.error('Tool failed:', result.error);
}

// Disconnect
await client.disconnect();
```

### 5. Use Individual Tools

```javascript
const { CodeAnalyzer } = require('./src/mcp/tools/analyzer');
const { DependencyChecker } = require('./src/mcp/tools/dependencies');
const { FileSystem } = require('./src/mcp/tools/filesystem');
const { TestGenerator } = require('./src/mcp/tools/test-generator');

// Code Analyzer
const analyzer = new CodeAnalyzer();
const analysis = await analyzer.execute({
  code: 'const add = (a, b) => a + b;',
  checks: ['syntax', 'purity']
});
console.log('Valid:', analysis.content.valid);

// Dependency Checker
const checker = new DependencyChecker();
const pkg = await checker.execute({
  packageName: 'lodash'
});
console.log('Package exists:', pkg.content.exists);

// File System
const fs = new FileSystem();
const file = await fs.execute({
  action: 'read',
  path: 'features/utils.feature'
});
console.log('File content:', file.content.content);

// Test Generator
const generator = new TestGenerator();
const tests = await generator.execute({
  code: 'const add = (a, b) => a + b;',
  testFramework: 'jest'
});
console.log('Test code:', tests.content.testCode);
```

## Complete Example: Full Compilation Pipeline

```javascript
const { RulesLoader } = require('./src/ai/rules-loader');
const { GherkinParser } = require('./src/compiler/parser');
const { ProjectContext } = require('./src/compiler/context');
const { CacheManager } = require('./src/compiler/cache');
const { AITransformer } = require('./src/ai/transformer');
const { MCPClient } = require('./src/mcp/client');
const fs = require('fs').promises;

async function compileFeature(featureFile) {
  // Initialize components
  const loader = new RulesLoader();
  const parser = new GherkinParser();
  const context = new ProjectContext();
  const cache = new CacheManager({ cacheDir: '.gherkin-cache' });
  const transformer = new AITransformer({
    apiKey: process.env.API_KEY,
    model: 'claude-sonnet-4-5'
  });
  const mcpClient = new MCPClient();

  try {
    // Load rules
    const rules = await loader.load('javascript');

    // Parse feature
    const parsed = await parser.parse(featureFile);
    if (parsed.errors.length > 0) {
      throw new Error(`Parse errors: ${parsed.errors.map(e => e.message).join(', ')}`);
    }

    // Build context
    await context.build('./features');

    // Check cache
    const source = await fs.readFile(featureFile, 'utf8');
    const cacheKey = cache.generateKey(
      source,
      rules.content,
      '1.0.0',
      'javascript'
    );

    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log('Cache hit! Using cached code.');
      return cached.compiledCode;
    }

    // Connect to MCP server
    const tools = await mcpClient.connect(['node', 'mcp-server.js']);

    // Transform
    const result = await transformer.transform(parsed, rules, context, tools);

    if (!result.success) {
      throw new Error(`Transformation failed: ${result.error}`);
    }

    // Store in cache
    await cache.set(cacheKey, {
      key: cacheKey,
      sourceHash: cache.generateHash(source),
      rulesHash: rules.contentHash,
      compiledCode: result.code,
      metadata: {
        timestamp: new Date().toISOString(),
        duration: result.metadata.duration,
        model: result.metadata.model,
        compilerVersion: '1.0.0',
        target: 'javascript'
      }
    });

    console.log('Compilation successful!');
    console.log(`Tokens: ${result.metadata.tokens.total}`);
    console.log(`Duration: ${result.metadata.duration}ms`);

    return result.code;
  } finally {
    await mcpClient.disconnect();
  }
}

// Usage
compileFeature('features/mathematics.feature')
  .then(code => console.log('Generated code:', code))
  .catch(err => console.error('Error:', err));
```

## Error Handling

```javascript
try {
  const result = await transformer.transform(parsed, rules, context, tools);
  // Handle success
} catch (error) {
  if (error.name === 'APIError') {
    console.error('Claude API error:', error.message);
  } else if (error.name === 'RateLimitError') {
    console.error('Rate limit exceeded, retrying...');
  } else if (error.name === 'ToolTimeoutError') {
    console.error('Tool invocation timed out');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Configuration

### Environment Variables

```bash
export API_KEY="your-anthropic-api-key"
export MCP_SERVER_URL="node mcp-server.js"  # Optional, defaults to stdin/stdout
```

### Configuration File (.gherkinrc.json)

```json
{
  "ai": {
    "model": "claude-sonnet-4-5",
    "maxRetries": 3,
    "timeout": 60000
  },
  "mcp": {
    "serverCommand": ["node", "mcp-server.js"],
    "toolTimeout": 5000
  }
}
```

## Performance Tips

1. **Use Cache**: Always check cache before transformation to avoid unnecessary API calls
2. **Batch Operations**: Process multiple files in sequence to reuse MCP connection
3. **Tool Selection**: Only enable necessary tools to reduce invocation overhead
4. **Monitor Tokens**: Track token usage to manage API costs

## Next Steps

- See [data-model.md](./data-model.md) for entity definitions
- See [contracts/](./contracts/) for detailed API documentation
- See [research.md](./research.md) for implementation details
