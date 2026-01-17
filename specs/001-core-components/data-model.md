# Data Model: Core Components

**Feature**: Core Components  
**Date**: 2025-01-17  
**Phase**: 1 - Design & Contracts

## Overview

Data models for the four core components: language rules loader, Gherkin parser, project context manager, and cache system. These models define the structure of data flowing through the compiler infrastructure.

## Entities

### LanguageRules

Represents the loaded and parsed language rules from rules.md.

**Fields**:
- `content` (string): Raw markdown content of rules.md
- `target` (string): Target language identifier ('javascript' | 'elixir')
- `contentHash` (string): SHA256 hash of content for cache invalidation
- `loadedAt` (Date): Timestamp when rules were loaded
- `filePath` (string): Path to rules.md file

**Relationships**:
- Used by: AI Transformer (for compilation)
- Referenced by: Cache Manager (for cache key generation and invalidation)

**Validation Rules**:
- `content` must be non-empty string
- `target` must be one of supported targets
- `contentHash` must be 64-character hex string (SHA256)

**State Transitions**:
- `unloaded` → `loaded` (when rules.md is read)
- `loaded` → `invalidated` (when rules.md file changes)

---

### ParsedFeature

Structured representation of a parsed .feature file.

**Fields**:
- `featureName` (string): Name extracted from `Feature:` line
- `filePath` (string): Path to the .feature file
- `scenarios` (Array<ScenarioInfo>): List of scenarios found
- `imports` (Array<string>): List of imported module names (from import statements)
- `dependencies` (Array<string>): Resolved dependency module names
- `errors` (Array<ParseError>): Any parsing errors encountered
- `lineCount` (number): Total lines in file

**Nested Types**:
- `ScenarioInfo`: `{ name: string, lineNumber: number }`
- `ParseError`: `{ message: string, line: number, column: number, type: 'syntax' | 'structure' }`

**Relationships**:
- Used by: Project Context Manager (for dependency resolution)
- Referenced by: Cache Manager (source content is part of cache key)

**Validation Rules**:
- `featureName` must be non-empty, valid identifier
- `scenarios` array must contain at least one scenario for valid feature
- `imports` must be array of non-empty strings
- `errors` array empty for successfully parsed files

**State Transitions**:
- `unparsed` → `parsing` → `parsed` (success) or `error` (failure)

---

### ModuleRegistry

Mapping of feature names to module information.

**Fields**:
- `modules` (Map<string, ModuleInfo>): Feature name → module info mapping
- `fileToModule` (Map<string, string>): File path → feature name reverse mapping

**Nested Types**:
- `ModuleInfo`: 
  - `file` (string): Path to .feature file
  - `exports` (Array<string>): Function names exported by module
  - `dependencies` (Array<string>): Module names this module depends on
  - `parsedAt` (Date): When module was parsed

**Relationships**:
- Built by: Project Context Manager
- Used by: Dependency Graph (for compilation order)
- Referenced by: Cache Manager (dependencies affect cache invalidation)

**Validation Rules**:
- No duplicate feature names (each feature name maps to exactly one file)
- All dependencies must exist in modules map (validated during graph construction)
- `exports` array may be empty (module with no functions)

**State Transitions**:
- `empty` → `building` → `complete` (all modules discovered and registered)

---

### DependencyGraph

Directed graph representing module dependencies.

**Fields**:
- `nodes` (Set<string>): Set of module names (nodes)
- `edges` (Map<string, Set<string>>): Adjacency list (module → set of dependencies)
- `reverseEdges` (Map<string, Set<string>>): Reverse adjacency list (module → set of dependents)
- `compileOrder` (Array<string>): Topologically sorted module names

**Relationships**:
- Built from: ModuleRegistry
- Used by: Compiler Orchestrator (determines compilation order)
- Validated by: Cycle detection algorithm

**Validation Rules**:
- Graph must be acyclic (no circular dependencies)
- All nodes in edges must exist in nodes set
- `compileOrder` must contain all nodes when graph is acyclic
- `compileOrder` length equals nodes size when valid

**State Transitions**:
- `empty` → `building` → `valid` (acyclic) or `invalid` (circular dependency detected)

---

### CacheEntry

Stored compilation result in cache.

**Fields**:
- `key` (string): SHA256 cache key
- `sourceHash` (string): SHA256 hash of source content
- `rulesHash` (string): SHA256 hash of rules content
- `compiledCode` (string): Generated JavaScript code
- `generatedTests` (string, optional): Generated test file content
- `metadata` (CacheMetadata): Compilation metadata

**Nested Types**:
- `CacheMetadata`:
  - `timestamp` (string): ISO 8601 timestamp
  - `duration` (number): Compilation duration in milliseconds
  - `model` (string): AI model used (e.g., 'claude-3-opus-20240229')
  - `compilerVersion` (string): Compiler version string
  - `target` (string): Target language

**Relationships**:
- Stored by: Cache Manager
- Retrieved by: Cache Manager (for cache hits)
- Referenced by: Cache Manifest (for LRU tracking)

**Validation Rules**:
- `key` must match SHA256(sourceHash + rulesHash + compilerVersion + target)
- `sourceHash` and `rulesHash` must be 64-character hex strings
- `compiledCode` must be non-empty valid JavaScript
- `metadata.timestamp` must be valid ISO 8601 string

**State Transitions**:
- `new` → `stored` (written to cache)
- `stored` → `accessed` (read from cache, updates lastAccessed)
- `stored` → `evicted` (removed during LRU eviction)
- `stored` → `invalidated` (removed due to source/rules change)

---

### CacheManifest

Index of all cache entries for size tracking and LRU eviction.

**Fields**:
- `entries` (Array<ManifestEntry>): List of all cache entries
- `totalSize` (number): Total size of all cache entries in bytes
- `maxSize` (number): Maximum cache size in bytes (from config)
- `lastUpdated` (Date): When manifest was last updated

**Nested Types**:
- `ManifestEntry`:
  - `key` (string): Cache key
  - `file` (string): Path to cache file
  - `size` (number): Size of cache entry in bytes
  - `lastAccessed` (Date): When entry was last read

**Relationships**:
- Maintained by: Cache Manager
- Used by: LRU eviction algorithm

**Validation Rules**:
- `totalSize` must equal sum of all entry sizes
- `totalSize` must not exceed `maxSize` (after eviction)
- `entries` array must contain exactly one entry per cache file

**State Transitions**:
- `empty` → `initialized` (first cache entry)
- `updated` → `updated` (entry added/removed/accessed)

---

### ProjectConfiguration

Loaded and validated configuration from .gherkinrc.json.

**Fields**:
- `target` (string): Target language ('javascript' | 'elixir')
- `moduleFormat` (string): Module format ('commonjs' | 'esm')
- `output` (OutputConfig): Output directory configuration
- `cache` (CacheConfig): Cache configuration
- `validation` (ValidationConfig): Validation settings
- `ai` (AIConfig): AI model configuration
- `generation` (GenerationConfig): Code generation settings
- `watch` (WatchConfig, optional): Watch mode settings

**Nested Types**:
- `OutputConfig`: `{ dir: string, testDir: string, docsDir: string }`
- `CacheConfig`: `{ enabled: boolean, dir: string, maxSize: string, ttl: string }`
- `ValidationConfig`: `{ syntax: boolean, purity: boolean, lint: boolean, lintConfig: string }`
- `AIConfig`: `{ model: string, maxRetries: number, timeout: number }`
- `GenerationConfig`: `{ jsdoc: boolean, tests: boolean, docs: boolean, prettier: boolean }`
- `WatchConfig`: `{ debounce: number, ignore: Array<string> }`

**Relationships**:
- Loaded by: Project Context Manager
- Used by: All components (for configuration)

**Validation Rules**:
- `target` must be supported target
- `moduleFormat` must be 'commonjs' or 'esm'
- `output.dir` must be valid directory path
- `cache.maxSize` must be parseable size string (e.g., '100MB')
- All required fields must be present or have defaults

**State Transitions**:
- `unloaded` → `loading` → `loaded` (with defaults applied) or `error` (validation failure)

---

## Data Flow

### Rules Loading Flow
```
rules.md file → LanguageRules (content + hash) → AI Transformer
                                      ↓
                              Cache Manager (for invalidation)
```

### Parsing Flow
```
.feature file → ParsedFeature → ModuleRegistry → DependencyGraph
                                      ↓
                              Cache Manager (source hash)
```

### Cache Flow
```
Compilation Request → Generate Cache Key (SHA256) → Check Manifest
                                                           ↓
                                                    Cache Hit? → Return Entry
                                                           ↓
                                                    Cache Miss → Compile → Store Entry
```

### Context Building Flow
```
Directory Scan → Parse All .feature Files → Build ModuleRegistry
                                                      ↓
                                              Build DependencyGraph
                                                      ↓
                                              Validate (cycle detection)
                                                      ↓
                                              Return Compile Order
```

## Validation Summary

| Entity | Key Validations |
|--------|----------------|
| LanguageRules | Non-empty content, valid target, valid hash |
| ParsedFeature | Valid feature name, at least one scenario, no errors |
| ModuleRegistry | No duplicate names, all dependencies exist |
| DependencyGraph | Acyclic, all nodes in edges exist |
| CacheEntry | Key matches hash components, valid JavaScript code |
| CacheManifest | Total size accurate, within max size |
| ProjectConfiguration | Required fields present, valid values, defaults applied |
