# Research: Core Components

**Feature**: Core Components  
**Date**: 2025-01-17  
**Phase**: 0 - Outline & Research

## Overview

Research for implementing the four core components of the GherkinLang compiler: language rules loader, Gherkin parser, project context manager, and cache system. All technical decisions are based on the existing architecture document and tech stack specification.

## Research Tasks & Findings

### 1. Language Rules File Format and Parsing

**Task**: Determine how to parse and structure language rules from rules.md

**Decision**: Rules.md is a markdown file that serves as both human documentation and AI instructions. The loader will:
- Read the entire rules.md file as a string
- Optionally parse markdown structure to extract target-specific sections (JavaScript vs Elixir)
- Pass the rules content to the AI transformer as-is (no preprocessing required)
- Track rules content hash for cache invalidation

**Rationale**: 
- Rules.md is meant to be human-readable, so keeping it as markdown preserves that
- AI transformer can interpret natural language directly
- Simple string-based approach is sufficient for Phase 1
- Hash-based change detection enables cache invalidation

**Alternatives Considered**:
- YAML/JSON structured format: Rejected - loses human readability requirement
- Markdown parser with AST: Rejected - unnecessary complexity for Phase 1, can be added later if needed

**Implementation Notes**:
- Use Node.js `fs.readFileSync` or `fs.promises.readFile` for reading
- Use `crypto.createHash('sha256')` for content hashing
- Store rules content in memory after first load (with invalidation on file change)

---

### 2. Gherkin Syntax Parsing Strategy

**Task**: Determine approach for parsing .feature files to extract structure

**Decision**: Implement a lightweight custom parser that extracts:
- Feature name (from `Feature:` line)
- Scenario names (from `Scenario:` lines)
- Basic step structure (Given/When/Then)
- Cross-module references (import statements or feature references)

**Rationale**:
- Full Gherkin parser (like cucumber/gherkin) is overkill - we only need structure, not execution
- Custom parser is simpler and has no external dependencies
- Can be extended later if more detailed parsing is needed
- Focuses on what's needed for dependency resolution

**Alternatives Considered**:
- Use existing Gherkin parser library (cucumber/gherkin): Rejected - adds dependency and complexity for simple structure extraction
- Regex-based parsing: Rejected - too fragile, line-by-line parsing is more maintainable
- Full AST generation: Rejected - unnecessary for Phase 1 requirements

**Implementation Notes**:
- Line-by-line parsing with state machine approach
- Track line/column for error reporting
- Extract feature name, scenarios, and import statements
- Return structured object: `{ featureName, scenarios: [], imports: [], errors: [] }`

---

### 3. Dependency Graph and Topological Sort

**Task**: Determine algorithm and data structure for dependency resolution

**Decision**: Use directed graph representation with adjacency list:
- Build graph from parsed module dependencies
- Use depth-first search (DFS) for cycle detection
- Use Kahn's algorithm for topological sort (determines compilation order)

**Rationale**:
- Standard graph algorithms are well-understood and efficient
- DFS cycle detection: O(V+E) time complexity
- Kahn's algorithm: O(V+E) time complexity, produces deterministic order
- No external graph library needed - simple to implement

**Alternatives Considered**:
- Tarjan's algorithm for cycle detection: Considered but DFS is simpler and sufficient
- External graph library (e.g., graphlib): Rejected - adds dependency for simple use case
- Manual dependency tracking without graph: Rejected - graph abstraction is clearer and more maintainable

**Implementation Notes**:
- Represent graph as `Map<moduleName, Set<dependencyNames>>`
- Cycle detection: DFS with visited/visiting sets
- Topological sort: Kahn's algorithm with queue
- Return ordered list of module names for compilation

---

### 4. Cache Storage and LRU Eviction

**Task**: Determine cache storage format and eviction strategy

**Decision**: 
- Storage: File-based with JSON format for cache entries
- Structure: `.gherkin-cache/manifest.json` (index) + individual `.cache` files
- Eviction: LRU (Least Recently Used) with timestamp-based tracking
- Size tracking: Calculate total cache size, evict oldest entries when limit exceeded

**Rationale**:
- File-based storage is simple, requires no external dependencies
- JSON format is human-readable and easy to debug
- LRU is standard eviction strategy, balances recency and frequency
- Manifest enables efficient size calculation and eviction decisions

**Alternatives Considered**:
- SQLite database: Rejected - adds dependency, overkill for simple key-value cache
- In-memory cache only: Rejected - loses persistence across compiler runs
- Redis/external cache: Rejected - adds infrastructure dependency, not needed for local compiler
- FIFO eviction: Rejected - LRU better matches usage patterns (recently used files more likely to be used again)

**Implementation Notes**:
- Cache key: SHA256 hash of (source + rules + compiler_version + target)
- Cache entry format: `{ key, sourceHash, rulesHash, compiledCode, generatedTests?, metadata: { timestamp, duration, model } }`
- Manifest: `{ entries: [{ key, file, size, lastAccessed }], totalSize }`
- Eviction: Sort by lastAccessed timestamp, remove oldest until under size limit

---

### 5. Configuration File Format and Validation

**Task**: Determine .gherkinrc.json structure and validation approach

**Decision**: 
- Format: JSON configuration file (already specified in architecture)
- Validation: Schema-based validation with JSON Schema or manual validation
- Defaults: Apply defaults for missing optional fields
- Error handling: Report validation errors with clear messages

**Rationale**:
- JSON is standard, well-supported, and matches existing .gherkinrc.json structure
- Schema validation catches errors early
- Defaults ensure backward compatibility and ease of use

**Alternatives Considered**:
- YAML configuration: Rejected - JSON is already specified and simpler
- No validation: Rejected - invalid config causes runtime errors, better to catch early
- External schema library: Considered but manual validation is sufficient for Phase 1

**Implementation Notes**:
- Load JSON with `JSON.parse` and error handling
- Validate required fields: target, moduleFormat, output.dir
- Apply defaults for optional fields (cache.enabled, validation.*, etc.)
- Return validated config object with defaults applied

---

## Technology Choices Summary

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| File I/O | Node.js `fs` module | Built-in, no dependencies |
| Hashing | Node.js `crypto` module | Built-in SHA256 support |
| File Discovery | `glob` package (^10.x.x) | Standard pattern matching |
| Cache Storage | File system + JSON | Simple, persistent, debuggable |
| Graph Algorithms | Custom implementation | No external dependency needed |
| Configuration | JSON + manual validation | Simple, no schema library needed |

## Performance Considerations

- **Rules Loading**: Single file read, in-memory caching after first load → <50ms achievable
- **Parsing**: Line-by-line processing, O(n) where n = lines → Fast for typical files
- **Dependency Resolution**: Graph algorithms O(V+E) → Efficient for <200 files
- **Cache I/O**: File system operations, JSON parsing → <10ms for cache hits achievable
- **Cache Eviction**: Sort by timestamp, remove files → O(n log n) but acceptable for cache size limits

## Open Questions Resolved

All technical questions resolved. No NEEDS CLARIFICATION items remain.

## Next Steps

Proceed to Phase 1: Design & Contracts
- Generate data-model.md with entity definitions
- Generate API contracts for module interfaces
- Generate quickstart.md with usage examples
