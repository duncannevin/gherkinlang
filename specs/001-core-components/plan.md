# Implementation Plan: Core Components

**Branch**: `001-core-components` | **Date**: 2025-01-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-core-components/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement the four foundational components of the GherkinLang compiler: (1) Language rules loader that reads and parses rules.md for target-specific compilation instructions, (2) Gherkin parser that extracts structure from .feature files for dependency resolution, (3) Project context manager that builds module registry and dependency graphs for multi-file projects, and (4) Cache system using content-addressed storage (SHA256) with LRU eviction for fast incremental builds. These components enable the compiler to understand source code structure, resolve dependencies, and optimize compilation performance.

## Technical Context

**Language/Version**: JavaScript ES2020+ / Node.js 18.x+  
**Primary Dependencies**: 
- `glob` (^10.x.x) - File discovery for .feature files
- `crypto` (Node.js built-in) - SHA256 hashing for cache keys
- No external parsing libraries needed for basic Gherkin structure extraction (custom parser)
- File system APIs (Node.js `fs` module) - Cache storage and configuration loading

**Storage**: File-system based cache (`.gherkin-cache/` directory) with JSON manifest and individual cache entry files. No database required.

**Testing**: Jest (^29.7.x) for unit and integration tests. fast-check (^3.15.x) for property-based testing of cache key generation and dependency resolution.

**Target Platform**: Node.js runtime (cross-platform: Linux, macOS, Windows)

**Project Type**: Single Node.js library/CLI tool (compiler)

**Performance Goals**: 
- Language rules loading: <50ms for files up to 100KB
- Parser: Extract structure from 95% of valid .feature files on first attempt
- Project context: Build registry and dependency graph for 100 files in <2 seconds
- Cache retrieval: <10ms for cache hits
- Cache storage: <100ms for storing cache entries

**Constraints**: 
- Must be pure functional (no side effects in generated code - enforced by constitution)
- Deterministic builds (content-addressed caching)
- Must handle projects with up to 200 .feature files
- Cache size limit: 100MB default (configurable)
- Must work offline (no network dependencies for core components)

**Scale/Scope**: 
- Projects typically <200 .feature files
- Cache entries: Thousands possible, but LRU eviction manages size
- Single-threaded Node.js execution (no parallel processing requirements for this phase)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle 1 — Purity Above All
✅ **PASS**: Core components (rules loader, parser, context manager, cache) are infrastructure and do not generate user code. They operate on files and data structures, which is appropriate for compiler internals. No purity violations.

### Principle 2 — Deterministic Builds
✅ **PASS**: Cache system uses SHA256 content-addressed keys (source + rules + compiler_version + target_language), ensuring identical inputs produce identical cache keys. This directly supports deterministic builds.

### Principle 3 — Human Readability of Rules
✅ **PASS**: Rules loader reads rules.md which must remain human-readable. The loader does not modify or obscure the rules file - it only reads and makes it available to the AI transformer.

### Principle 4 — AI as Interpreter, Not Oracle
✅ **PASS**: Core components do not involve AI interpretation. They provide infrastructure (rules loading, parsing, context, caching) that supports the AI transformer, which is a separate component.

### Principle 5 — Graceful Degradation
✅ **PASS**: All components must handle errors gracefully:
- Rules loader: Report clear errors if rules.md missing or unreadable
- Parser: Report syntax errors with line/column information
- Context manager: Detect and report circular dependencies, missing modules
- Cache: Handle read/write errors without failing compilation

**Gate Status**: ✅ **ALL GATES PASS** - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── compiler/
│   ├── cache.js          # Cache manager (Layer 1)
│   ├── context.js         # Project context manager (Layer 6)
│   ├── parser.js          # Basic Gherkin parser (Layer 6)
│   └── index.js           # Compiler orchestrator (Layer 6)
│
├── ai/
│   └── rules.md           # Language rules file (loaded by transformer, not implemented here)
│
└── index.js               # Main library entry point

test/
├── unit/
│   ├── compiler/
│   │   ├── cache.test.js
│   │   ├── context.test.js
│   │   └── parser.test.js
│   └── ...
└── integration/
    └── compiler/
        └── core-components.test.js
```

**Structure Decision**: Single Node.js library project. Core components are implemented in `src/compiler/` directory as specified in architecture.md. Tests are organized in `test/unit/` and `test/integration/` directories. The structure follows the existing project layout established during scaffolding.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
