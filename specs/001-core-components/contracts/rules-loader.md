# API Contract: Language Rules Loader

**Component**: Language Rules Loader  
**File**: `src/ai/transformer.js` (rules loading functionality)  
**Phase**: 1 - Design & Contracts

## Interface

```typescript
interface RulesLoader {
  /**
   * Load language rules for target language
   * @param target - Target language ('javascript' | 'elixir')
   * @param rulesPath - Optional path to rules.md (default: 'src/ai/rules.md')
   * @returns Loaded language rules
   */
  load(target: string, rulesPath?: string): Promise<LanguageRules>;

  /**
   * Get cached rules if available and still valid
   * @param target - Target language
   * @returns Cached rules or null if not cached or invalid
   */
  getCached(target: string): LanguageRules | null;

  /**
   * Check if rules file has changed since last load
   * @param target - Target language
   * @returns true if rules file modified, false otherwise
   */
  hasChanged(target: string): Promise<boolean>;
}
```

## Types

```typescript
interface LanguageRules {
  content: string; // Raw markdown content
  target: string; // Target language identifier
  contentHash: string; // SHA256 hash of content
  loadedAt: Date; // When rules were loaded
  filePath: string; // Path to rules.md file
}
```

## Loading Behavior

1. Read rules.md file from specified path
2. Compute SHA256 hash of content
3. Optionally filter for target-specific sections (if rules.md contains sections)
4. Return LanguageRules object with content and metadata
5. Cache in memory for subsequent requests (until file changes)

## Target-Specific Rules

If rules.md contains target-specific sections (e.g., `## JavaScript Rules`, `## Elixir Rules`), the loader should:
- Extract only the relevant section for the target
- Include common rules (if any) plus target-specific rules
- Maintain human readability of extracted content

## Error Handling

- `load()`: Throws `RulesLoadError` if:
  - Rules file not found
  - Rules file unreadable
  - Invalid target specified
- `getCached()`: Returns `null` if not cached (not an error)
- `hasChanged()`: Throws `RulesLoadError` if file cannot be accessed

## Performance Requirements

- `load()`: <50ms for files up to 100KB
- `getCached()`: <1ms (in-memory lookup)
- `hasChanged()`: <10ms (file stat check)

## Usage Example

```javascript
const loader = new RulesLoader();

// Load rules for JavaScript target
const rules = await loader.load('javascript', 'src/ai/rules.md');

console.log('Rules content hash:', rules.contentHash);
console.log('Rules loaded at:', rules.loadedAt);

// Check if rules changed
if (await loader.hasChanged('javascript')) {
  // Reload rules
  const newRules = await loader.load('javascript');
  // Invalidate cache
}

// Get cached rules (if available)
const cached = loader.getCached('javascript');
if (cached && cached.contentHash === rules.contentHash) {
  // Use cached rules
}
```
