# Quickstart: Core Components

**Feature**: Core Components  
**Date**: 2025-01-17  
**Phase**: 1 - Design & Contracts

## Overview

Quick start guide for using the four core components of the GherkinLang compiler: language rules loader, Gherkin parser, project context manager, and cache system.

## Prerequisites

- Node.js 18.x or higher
- Project structure with `.feature` files
- Optional: `.gherkinrc.json` configuration file

## Basic Usage

### 1. Load Language Rules

```javascript
const { RulesLoader } = require('./src/ai/transformer');

const loader = new RulesLoader();

// Load rules for JavaScript target
const rules = await loader.load('javascript', 'src/ai/rules.md');

console.log('Rules loaded:', rules.contentHash);
console.log('Rules content length:', rules.content.length);
```

### 2. Parse a .feature File

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

### 3. Build Project Context

```javascript
const { ProjectContext } = require('./src/compiler/context');

const context = new ProjectContext();

// Build context from features directory
const contextData = await context.build('./features');

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

### 4. Use Cache System

```javascript
const { CacheManager } = require('./src/compiler/cache');

const cache = new CacheManager({ cacheDir: '.gherkin-cache' });

// Generate cache key
const source = fs.readFileSync('features/math.feature', 'utf8');
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

// Compile (not shown)...
const compiledCode = await compile(source, rules);

// Store in cache
await cache.set(key, {
  key,
  sourceHash: hash(source),
  rulesHash: rules.contentHash,
  compiledCode,
  metadata: {
    timestamp: new Date().toISOString(),
    duration: 1234,
    model: 'claude-3-opus-20240229',
    compilerVersion: '1.0.0',
    target: 'javascript',
  },
});
```

## Complete Example: Compile with Caching

```javascript
const { RulesLoader } = require('./src/ai/transformer');
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

  // Compile (AI transformation not shown - out of scope)
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

## Multi-File Project Example

```javascript
const { ProjectContext } = require('./src/compiler/context');
const { CacheManager } = require('./src/compiler/cache');

async function compileProject(rootDir) {
  // Build project context
  const context = new ProjectContext();
  const contextData = await context.build(rootDir);

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

## Error Handling

### Rules Loading Errors

```javascript
try {
  const rules = await loader.load('javascript');
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('Rules file not found');
  } else if (error.code === 'EACCES') {
    console.error('Permission denied reading rules file');
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
  const context = await context.build('./features');
} catch (error) {
  if (error.type === 'CIRCULAR_DEPENDENCY') {
    console.error('Circular dependency detected:', error.cycle);
  } else if (error.type === 'DUPLICATE_FEATURE') {
    console.error('Duplicate feature name:', error.featureName);
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
  if (error.code === 'ENOSPC') {
    console.warn('Cache directory full, evicting old entries...');
    await cache.evict(maxSize);
    await cache.set(key, entry); // Retry
  } else {
    console.error('Cache write error:', error.message);
  }
}
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

## Next Steps

- See [data-model.md](./data-model.md) for detailed entity definitions
- See [contracts/](./contracts/) for complete API documentation
- See [plan.md](./plan.md) for implementation details
