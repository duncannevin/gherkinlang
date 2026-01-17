# Feature Specification: Core Components

**Feature Branch**: `001-core-components`  
**Created**: 2025-01-17  
**Status**: Draft  
**Input**: User description: "Core Components - Language rules (rules.md) - The \"AST\", Gherkin parser, Project context manager, Cache system"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Language Rules Define Compilation Behavior (Priority: P1)

A developer needs the compiler to understand how to transform GherkinLang source code into JavaScript. The language rules file serves as the specification that guides compilation decisions, making it readable by both humans and the AI compiler.

**Why this priority**: Without language rules, the compiler cannot interpret GherkinLang syntax or generate correct output. This is the foundation that enables all compilation.

**Independent Test**: Can be fully tested by creating a minimal rules.md file with one rule (e.g., "Feature: maps to module") and verifying the compiler can read and use it during compilation. Delivers the ability to define language semantics.

**Acceptance Scenarios**:

1. **Given** a rules.md file exists with language rules, **When** the compiler loads rules for a target language, **Then** the rules are available for the AI transformer to use during compilation
2. **Given** rules.md is modified, **When** a compilation is triggered, **Then** the cache is invalidated and new rules are used
3. **Given** rules.md contains target-specific rules (JavaScript vs Elixir), **When** compiling for a specific target, **Then** only relevant rules are loaded

---

### User Story 2 - Gherkin Parser Extracts Source Structure (Priority: P1)

A developer needs the compiler to understand the structure of GherkinLang source files to identify features, scenarios, dependencies, and basic syntax before AI transformation.

**Why this priority**: The parser enables dependency resolution, project context building, and basic validation. Without it, the compiler cannot determine what needs to be compiled or in what order.

**Independent Test**: Can be fully tested by parsing a simple .feature file and verifying it correctly extracts the feature name, scenario names, and basic structure. Delivers the ability to analyze source code structure.

**Acceptance Scenarios**:

1. **Given** a .feature file with valid GherkinLang syntax, **When** the parser processes it, **Then** it extracts feature name, scenarios, and structural information
2. **Given** a .feature file with syntax errors, **When** the parser processes it, **Then** it reports specific errors with line/column information
3. **Given** multiple .feature files, **When** the parser processes them, **Then** it identifies cross-module references and dependencies

---

### User Story 3 - Project Context Manages Multi-File Compilation (Priority: P1)

A developer working with multiple GherkinLang files needs the compiler to understand the full project structure, resolve dependencies, and determine the correct compilation order.

**Why this priority**: Real projects have multiple modules with interdependencies. Without project context, the compiler cannot handle cross-module references or ensure correct compilation order.

**Independent Test**: Can be fully tested by providing a directory with two .feature files where one depends on the other, and verifying the context manager builds a dependency graph and determines correct compile order. Delivers the ability to compile multi-file projects.

**Acceptance Scenarios**:

1. **Given** a directory with multiple .feature files, **When** building project context, **Then** it discovers all files, maps feature names to file paths, and builds a module registry
2. **Given** modules with dependencies, **When** building project context, **Then** it constructs a dependency graph and determines topological sort order for compilation
3. **Given** circular dependencies exist, **When** building project context, **Then** it detects and reports the circular dependency error
4. **Given** a .gherkinrc.json configuration file, **When** building project context, **Then** it loads and validates the configuration with appropriate defaults

---

### User Story 4 - Cache System Enables Fast Incremental Builds (Priority: P2)

A developer making iterative changes needs the compiler to avoid recompiling unchanged files, significantly reducing build times during development.

**Why this priority**: While not required for basic functionality, caching dramatically improves developer experience by enabling fast incremental builds. This becomes critical as projects grow.

**Independent Test**: Can be fully tested by compiling a file, then compiling again without changes, and verifying the second compilation uses cached results and completes in under 100ms. Delivers the ability to skip unnecessary recompilation.

**Acceptance Scenarios**:

1. **Given** a file was previously compiled, **When** compiling the same file with identical source and rules, **Then** the cache is used and compilation completes without AI transformation
2. **Given** source file content changes, **When** compiling, **Then** cache is invalidated and fresh compilation occurs
3. **Given** rules.md changes, **When** compiling any file, **Then** all cached entries are invalidated
4. **Given** cache exceeds size limit, **When** storing new entries, **Then** least recently used entries are evicted to stay within limit

### Edge Cases

- What happens when rules.md file is missing or unreadable?
- How does system handle malformed .feature files during parsing?
- What happens when project context encounters files with duplicate feature names?
- How does cache handle corrupted cache entries?
- What happens when dependency resolution finds a missing module reference?
- How does system handle extremely large projects with hundreds of files?
- What happens when cache directory has insufficient disk space?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST load and parse language rules from rules.md file for specified target language
- **FR-002**: System MUST make language rules available to AI transformer during compilation
- **FR-003**: System MUST invalidate cache when rules.md content changes
- **FR-004**: System MUST parse .feature files to extract feature names, scenario names, and basic structure
- **FR-005**: System MUST report syntax errors in .feature files with line and column information
- **FR-006**: System MUST identify cross-module references and dependencies from parsed source files
- **FR-007**: System MUST discover all .feature files in specified directories
- **FR-008**: System MUST build a module registry mapping feature names to file paths
- **FR-009**: System MUST construct a dependency graph from parsed module information
- **FR-010**: System MUST determine topological sort order for compilation based on dependencies
- **FR-011**: System MUST detect and report circular dependencies
- **FR-012**: System MUST load and validate .gherkinrc.json configuration file
- **FR-013**: System MUST apply default configuration values when settings are missing
- **FR-014**: System MUST generate deterministic cache keys from source content, rules content, compiler version, and target language
- **FR-015**: System MUST store compilation results in cache with metadata (timestamp, duration, model used)
- **FR-016**: System MUST retrieve cached compilation results when cache key matches
- **FR-017**: System MUST invalidate cache entries when source content, rules content, compiler version, or target language changes
- **FR-018**: System MUST evict least recently used cache entries when cache size exceeds configured limit
- **FR-019**: System MUST handle cache read/write errors gracefully without failing compilation

### Key Entities *(include if feature involves data)*

- **Language Rules**: The specification that defines how GherkinLang syntax maps to target language constructs. Contains rule categories (module, function, parameter, operation, control flow, return, target-specific) and serves as both human documentation and AI instructions.

- **Parsed Feature**: The structured representation of a .feature file containing feature name, scenarios, steps, and extracted dependencies. Used for dependency resolution and project context building.

- **Module Registry**: A mapping of feature names to their file paths, exported functions, and dependencies. Enables cross-module references and dependency resolution.

- **Dependency Graph**: A directed graph representing module dependencies. Used to determine compilation order and detect circular dependencies.

- **Cache Entry**: A stored compilation result containing the generated code, tests, metadata (timestamp, duration, model), and content hashes. Identified by a deterministic cache key.

- **Project Configuration**: Settings loaded from .gherkinrc.json including target language, module format, output directories, cache settings, validation options, and AI model configuration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Language rules can be loaded and made available to compiler in under 50ms for files up to 100KB
- **SC-002**: Parser successfully extracts structure from 95% of valid .feature files on first attempt
- **SC-003**: Project context builds complete module registry and dependency graph for projects with up to 100 files in under 2 seconds
- **SC-004**: Cache retrieval completes in under 10ms for cache hits, enabling near-instantaneous rebuilds of unchanged files
- **SC-005**: Cache correctly invalidates 100% of affected entries when source or rules change
- **SC-006**: Developers can compile projects with 10+ files where 80% are unchanged, and the build completes in under 5 seconds (vs 30+ seconds without cache)
- **SC-007**: Circular dependencies are detected and reported with clear error messages in 100% of cases
- **SC-008**: Configuration file validation catches 100% of invalid settings before compilation begins

## Assumptions

- Language rules file (rules.md) follows a structured markdown format that can be parsed
- GherkinLang source files use standard Gherkin syntax (Feature, Scenario, Given/When/Then)
- Projects typically contain fewer than 200 .feature files
- Cache directory has sufficient disk space (default 100MB limit)
- File system operations are reliable (cache corruption is rare)
- Configuration file changes are infrequent compared to source file changes

## Dependencies

- File system access for reading .feature files, rules.md, and configuration
- File system access for cache storage and retrieval
- Ability to compute content hashes (SHA256) for cache keys
- Basic text parsing capabilities for Gherkin syntax

## Out of Scope

- AI transformation logic (handled by separate component)
- Code validation (handled by separate component)
- Code generation and formatting (handled by separate component)
- CLI interface (handled by separate component)
- Watch mode file system monitoring (handled by separate component)
- Test generation (handled by separate component)
