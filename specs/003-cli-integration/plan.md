# Implementation Plan: CLI & Integration

**Branch**: `003-cli-integration` | **Date**: 2026-01-30 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/003-cli-integration/spec.md`

## Summary

Implement the command-line interface for the GherkinLang compiler, providing three core commands: `compile` (transform .feature files to JavaScript), `watch` (auto-recompile on file changes), and `init` (scaffold new projects). The CLI orchestrates existing compiler components (parser, AI transformer, validator, generator) through a unified entry point with consistent argument parsing, progress feedback, and error reporting.

## Technical Context

**Language/Version**: JavaScript ES2020+ / Node.js 18+  
**Primary Dependencies**: commander (CLI parsing), chokidar (file watching), chalk (colors), ora (spinners)  
**Storage**: File-system based (.gherkin-cache/ for compilation cache)  
**Testing**: Jest (unit tests), manual CLI testing  
**Target Platform**: macOS, Linux, Windows (cross-platform Node.js)  
**Project Type**: Single CLI application  
**Performance Goals**: <10s compile (excluding AI), <200ms watch detection, <2s init  
**Constraints**: Memory-safe watch mode (handle 100+ rapid changes), graceful SIGINT handling  
**Scale/Scope**: Projects with <200 .feature files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applicable | Status | Notes |
|-----------|------------|--------|-------|
| Purity Above All | Partial | ✅ Pass | CLI is inherently side-effectful (I/O, console); orchestrates pure compiler components |
| Deterministic Builds | Yes | ✅ Pass | CLI invokes deterministic compiler pipeline; no randomness in CLI layer |
| Human Readability | Yes | ✅ Pass | Help text, error messages must be clear and actionable |
| AI as Interpreter | No | N/A | CLI layer doesn't interact with AI directly |
| Graceful Degradation | Yes | ✅ Pass | Must handle errors, SIGINT, and partial failures cleanly |

**Gate Result**: ✅ PASS - No violations. CLI is the user interface layer that orchestrates pure compiler components.

## Project Structure

### Documentation (this feature)

```text
specs/003-cli-integration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── cli-entry.md     # CLI entry point contract
│   ├── compile-command.md
│   ├── watch-command.md
│   └── init-command.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── cli/
│   ├── index.js              # CLI entry point, command routing
│   ├── commands/
│   │   ├── compile.js        # Compile command handler
│   │   ├── watch.js          # Watch command handler
│   │   ├── init.js           # Init command handler
│   │   ├── cache.js          # (out of scope - stub only)
│   │   ├── validate.js       # (out of scope - stub only)
│   │   └── test.js           # (out of scope - stub only)
│   └── utils/
│       ├── logger.js         # Colored logging, stderr/stdout handling
│       └── progress.js       # Spinners, progress indicators
├── compiler/                  # (Phase 1 - already implemented)
├── ai/                        # (Phase 3 - already implemented)
├── validation/                # (Phase 4 - already implemented)
└── generation/                # (Phase 4 - already implemented)

test/
├── unit/
│   └── cli/
│       ├── index.test.js
│       ├── commands/
│       │   ├── compile.test.js
│       │   ├── watch.test.js
│       │   └── init.test.js
│       └── utils/
│           ├── logger.test.js
│           └── progress.test.js
└── integration/
    └── cli/
        ├── compile-flow.test.js
        ├── watch-flow.test.js
        └── init-flow.test.js

bin/
└── gherkin.js                 # Executable entry point (shebang + require)
```

**Structure Decision**: Single project structure. CLI commands live in `src/cli/commands/` and integrate with existing compiler modules in `src/compiler/`, `src/ai/`, `src/validation/`, and `src/generation/`.

## Complexity Tracking

No violations to justify - CLI follows established patterns and integrates with existing architecture.
