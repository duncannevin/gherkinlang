# API Contract: Cache Manager

**Component**: Cache Manager  
**File**: `src/compiler/cache.js`  
**Phase**: 1 - Design & Contracts

## Interface

```typescript
interface CacheManager {
  /**
   * Generate deterministic cache key from compilation inputs
   * @param source - Source file content
   * @param rules - Rules file content
   * @param compilerVersion - Compiler version string
   * @param target - Target language ('javascript' | 'elixir')
   * @returns SHA256 hash as hex string (64 characters)
   */
  generateKey(
    source: string,
    rules: string,
    compilerVersion: string,
    target: string
  ): string;

  /**
   * Retrieve cached compilation result
   * @param key - Cache key
   * @returns Cache entry or null if not found
   */
  get(key: string): Promise<CacheEntry | null>;

  /**
   * Store compilation result in cache
   * @param key - Cache key
   * @param entry - Cache entry to store
   */
  set(key: string, entry: CacheEntry): Promise<void>;

  /**
   * Check if cache entry is valid (exists and not corrupted)
   * @param key - Cache key
   * @returns true if valid, false otherwise
   */
  isValid(key: string): Promise<boolean>;

  /**
   * Clear cache entries
   * @param key - Optional specific key to clear, or undefined to clear all
   */
  clear(key?: string): Promise<void>;

  /**
   * Evict least recently used entries to stay within size limit
   * @param maxSize - Maximum cache size in bytes
   */
  evict(maxSize: number): Promise<void>;

  /**
   * Get cache statistics
   * @returns Cache statistics including entry count, size, hit/miss rates
   */
  getStats(): Promise<CacheStats>;
}
```

## Types

```typescript
interface CacheEntry {
  key: string;
  sourceHash: string;
  rulesHash: string;
  compiledCode: string;
  generatedTests?: string;
  metadata: {
    timestamp: string; // ISO 8601
    duration: number; // milliseconds
    model: string;
    compilerVersion: string;
    target: string;
  };
}

interface CacheStats {
  entries: number;
  totalSize: number; // bytes
  hits: number;
  misses: number;
  hitRate: number; // 0.0 to 1.0
}
```

## Error Handling

- `get()`: Returns `null` if entry not found (not an error)
- `set()`: Throws `CacheWriteError` if write fails
- `isValid()`: Returns `false` if entry corrupted or missing
- `clear()`: Throws `CacheError` if clear operation fails
- `evict()`: Throws `CacheError` if eviction fails

## Performance Requirements

- `generateKey()`: <1ms
- `get()`: <10ms for cache hits
- `set()`: <100ms for storing entries
- `isValid()`: <5ms
- `clear()`: <500ms for clearing all entries
- `evict()`: <1000ms for typical cache sizes

## Usage Example

```javascript
const cache = new CacheManager({ cacheDir: '.gherkin-cache' });

// Generate key
const key = cache.generateKey(source, rules, '1.0.0', 'javascript');

// Check cache
const cached = await cache.get(key);
if (cached) {
  return cached.compiledCode;
}

// Compile (not shown)...
const compiledCode = await compile(source, rules);

// Store in cache
await cache.set(key, {
  key,
  sourceHash: hashSource(source),
  rulesHash: hashRules(rules),
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
