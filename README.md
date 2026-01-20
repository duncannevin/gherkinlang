# GherkinLang Compiler

GherkinLang is an experimental programming language where compilation rules are expressed in natural language rather than traditional parsing logic. This compiler transforms Gherkin-syntax source code into clean, functional JavaScript using AI-powered transformation.

## Features

- AI-native compilation using natural language rules
- Pure functional JavaScript output
- Deterministic builds with content-addressed caching
- Human-readable source code and documentation

## Installation

```bash
npm install
```

## Usage

### Using the Core Components

#### 1. Load Language Rules

```javascript
const { RulesLoader } = require('./src/ai/rules-loader');

const loader = new RulesLoader();

// Load rules for JavaScript target
const rules = await loader.load('javascript', 'src/ai/rules.md');

console.log('Rules loaded:', rules.contentHash);
console.log('Rules content length:', rules.content.length);
```

#### 2. Parse a .feature File

```javascript
const { GherkinParser } = require('./src/compiler/parser');

const parser = new GherkinParser();

// Parse a single file
const parsed = await parser.parse('features/mathematics.feature');

if (parsed.errors.length > 0) {
  console.error('Parse errors:', parsed.errors);
} else {
  console.log('Feature:', parsed.featureName);
  console.log('Scenarios:', parsed.scenarios.map(s => s.name));
  console.log('Imports:', parsed.imports);
}
```

#### 3. Build Project Context

```javascript
const { ProjectContext } = require('./src/compiler/context');

const context = new ProjectContext();

// Build context from features directory
await context.build('./features');

// Check for circular dependencies
const cycles = context.detectCycles();
if (cycles.length > 0) {
  throw new Error(`Circular dependencies: ${cycles[0].message}`);
}

// Get compilation order
const order = context.getCompileOrder();
console.log('Compile order:', order);

// Get module information
const module = context.getModule('Mathematics');
console.log('Module file:', module.file);
console.log('Dependencies:', module.dependencies);
```

#### 4. Use Cache System

```javascript
const { CacheManager } = require('./src/compiler/cache');
const fs = require('fs').promises;

const cache = new CacheManager({ cacheDir: '.gherkin-cache' });

// Generate cache key
const source = await fs.readFile('features/math.feature', 'utf8');
const rules = await loader.load('javascript');
const key = cache.generateKey(
  source,
  rules.content,
  '1.0.0',
  'javascript'
);

// Check cache
const cached = await cache.get(key);
if (cached) {
  console.log('Cache hit! Using cached code.');
  return cached.compiledCode;
}

// Store in cache after compilation
await cache.set(key, {
  key,
  sourceHash: hash(source),
  rulesHash: rules.contentHash,
  compiledCode: compiledCode,
  metadata: {
    timestamp: new Date().toISOString(),
    duration: 1234,
    model: 'claude-3-opus-20240229',
    compilerVersion: '1.0.0',
    target: 'javascript',
  },
});
```

### Complete Example: Compile with Caching

```javascript
const { RulesLoader } = require('./src/ai/rules-loader');
const { GherkinParser } = require('./src/compiler/parser');
const { ProjectContext } = require('./src/compiler/context');
const { CacheManager } = require('./src/compiler/cache');
const fs = require('fs').promises;

async function compileWithCache(featureFile) {
  // Initialize components
  const loader = new RulesLoader();
  const parser = new GherkinParser();
  const cache = new CacheManager({ cacheDir: '.gherkin-cache' });

  // Load rules
  const rules = await loader.load('javascript');

  // Parse feature
  const parsed = await parser.parse(featureFile);
  if (parsed.errors.length > 0) {
    throw new Error(`Parse errors: ${parsed.errors.map(e => e.message).join(', ')}`);
  }

  // Read source
  const source = await fs.readFile(featureFile, 'utf8');

  // Generate cache key
  const key = cache.generateKey(source, rules.content, '1.0.0', 'javascript');

  // Check cache
  const cached = await cache.get(key);
  if (cached) {
    console.log('Using cached compilation');
    return cached.compiledCode;
  }

  // Compile (implementation not shown)
  const compiledCode = await compileFeature(parsed, rules);

  // Store in cache
  await cache.set(key, {
    key,
    sourceHash: hashString(source),
    rulesHash: rules.contentHash,
    compiledCode,
    metadata: {
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      model: 'claude-3-opus-20240229',
      compilerVersion: '1.0.0',
      target: 'javascript',
    },
  });

  return compiledCode;
}
```

### Multi-File Project Example

```javascript
const { ProjectContext } = require('./src/compiler/context');
const { CacheManager } = require('./src/compiler/cache');

async function compileProject(rootDir) {
  // Build project context
  const context = new ProjectContext();
  await context.build(rootDir);

  // Check for cycles
  const cycles = context.detectCycles();
  if (cycles.length > 0) {
    throw new Error(`Circular dependencies detected: ${cycles.map(c => c.message).join(', ')}`);
  }

  // Get compilation order
  const compileOrder = context.getCompileOrder();

  // Compile each module in order
  const cache = new CacheManager({ cacheDir: '.gherkin-cache' });
  const results = [];

  for (const moduleName of compileOrder) {
    const module = context.getModule(moduleName);
    console.log(`Compiling ${moduleName} from ${module.file}`);

    // Compile with cache (implementation not shown)
    const result = await compileWithCache(module.file);
    results.push({ moduleName, result });
  }

  return results;
}
```

## Cache Directory

The compiler uses a content-addressed cache stored in `.gherkin-cache/` directory:

```
.gherkin-cache/
├── manifest.json          # Cache index with metadata
└── *.cache                # Individual cache entry files (SHA256 keys)
```

Cache entries are stored as JSON files with compilation results. The cache uses LRU (Least Recently Used) eviction when the cache size exceeds the configured limit (default: 100MB).

To clear the cache:
```bash
rm -rf .gherkin-cache/
```

## Configuration

Create `.gherkinrc.json` in project root:

```json
{
  "target": "javascript",
  "moduleFormat": "commonjs",
  "output": {
    "dir": "dist",
    "testDir": "test/generated",
    "docsDir": "docs/generated"
  },
  "cache": {
    "enabled": true,
    "dir": ".gherkin-cache",
    "maxSize": "100MB",
    "ttl": "7d"
  },
  "validation": {
    "syntax": true,
    "purity": true,
    "lint": true,
    "lintConfig": ".eslintrc.js"
  }
}
```

## Environment Variables

The AI transformation feature requires the following environment variables:

### `API_KEY` (Required)

Anthropic Claude API key for AI-powered compilation. This key is used to authenticate with the Claude API when transforming GherkinLang source code to JavaScript.

**Example:**
```bash
export API_KEY="sk-ant-api03-..."
```

**Note:** The API key can also be set via `ANTHROPIC_API_KEY` environment variable (used by `@anthropic-ai/sdk` by default).

### `MCP_SERVER_URL` (Optional)

Path or command to the MCP (Model Context Protocol) server for tool-assisted compilation. If not provided, tool-assisted compilation features will be disabled.

**Example:**
```bash
export MCP_SERVER_URL="node ./mcp-server.js"
# or
export MCP_SERVER_URL="/usr/local/bin/mcp-server"
```

**Note:** The MCP server should be a local process that communicates via stdin/stdout using JSON-RPC 2.0 protocol.

## Error Handling

### Rules Loading Errors

```javascript
try {
  const rules = await loader.load('javascript');
} catch (error) {
  if (error.name === 'RulesLoadError') {
    console.error('Rules file not found or cannot be read');
  } else {
    console.error('Error loading rules:', error.message);
  }
}
```

### Parsing Errors

```javascript
const parsed = await parser.parse('features/invalid.feature');

if (parsed.errors.length > 0) {
  for (const error of parsed.errors) {
    console.error(
      `${error.filePath}:${error.line}:${error.column} - ${error.message}`
    );
  }
}
```

### Context Building Errors

```javascript
try {
  await context.build('./features');
} catch (error) {
  if (error.name === 'ContextBuildError') {
    console.error('Context build error:', error.message);
    if (error.cycle) {
      console.error('Circular dependency detected:', error.cycle);
    }
  } else {
    console.error('Error building context:', error.message);
  }
}
```

### Cache Errors

```javascript
try {
  await cache.set(key, entry);
} catch (error) {
  if (error.name === 'CacheError') {
    console.error('Cache error:', error.message);
    // Cache errors are non-fatal - compilation can continue
  }
}
```

## Documentation

See [architecture.md](./architecture.md) for detailed architecture documentation.

For more examples and API documentation, see:
- [quickstart.md](./specs/001-core-components/quickstart.md) - Complete usage examples
- [data-model.md](./specs/001-core-components/data-model.md) - Entity definitions
- [contracts/](./specs/001-core-components/contracts/) - API documentation
