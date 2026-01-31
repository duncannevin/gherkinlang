# Implementation Plan: Validation & Generation

**Branch**: `002-validation-generation` | **Date**: 2026-01-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-validation-generation/spec.md`

## Summary

Implement the validation pipeline and code generation system for the GherkinLang compiler. The validation pipeline checks AI-generated JavaScript for syntax correctness, purity (no side effects), and lint compliance. The code generator writes validated code to output with proper formatting, module structure, and JSDoc comments. The test generator creates Jest test suites automatically.

## Technical Context

**Language/Version**: JavaScript ES2020+ / Node.js 18.x+  
**Primary Dependencies**: @babel/parser (syntax), eslint (linting), prettier (formatting), proper-lockfile (file locking)  
**Storage**: File system only (output directory for generated code)  
**Testing**: Jest with fast-check for property-based tests  
**Target Platform**: Node.js CLI tool  
**Project Type**: Single project (compiler component)  
**Performance Goals**: <500ms validation per module, <100ms generation per module  
**Constraints**: Must produce deterministic output (byte-for-byte identical), no auto-fix of validation failures  
**Scale/Scope**: Typical modules under 1MB, max 10 syntax errors reported per run

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **Principle 1 — Purity Above All** | ✅ PASS | Validation pipeline enforces purity via AST analysis. Detects all forbidden patterns listed in constitution. |
| **Principle 2 — Deterministic Builds** | ✅ PASS | Prettier with locked config ensures deterministic formatting. File locking prevents race conditions. |
| **Principle 3 — Human Readability of Rules** | ✅ PASS | N/A for this component (validation/generation, not rules) |
| **Principle 4 — AI as Interpreter** | ✅ PASS | Validation ensures AI output conforms to rules; no auto-correction. |
| **Principle 5 — Graceful Degradation** | ✅ PASS | Clear error messages with location, multi-error reporting (max 10), warnings for non-critical failures (Prettier). |
| **JavaScript Code Standards** | ✅ PASS | Purity checker validates all forbidden features. Lint validates required features (const/let, arrow functions). |
| **Validation & Testing Requirements** | ✅ PASS | Direct implementation of syntax, purity, and lint validation per constitution. Jest test generation included. |

**Gate Result**: PASS - All constitution principles satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/002-validation-generation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── validator.md
│   ├── generator.md
│   └── test-generator.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── validation/
│   ├── validator.js       # Main validation orchestrator (FR-014 to FR-017a)
│   ├── syntax.js          # Syntax checker using @babel/parser (FR-001 to FR-004)
│   ├── purity.js          # Purity checker via AST analysis (FR-005 to FR-009)
│   └── eslint-config.js   # ESLint configuration and runner (FR-010 to FR-013)
├── generation/
│   ├── generator.js       # Code generator (FR-018 to FR-024)
│   ├── test-generator.js  # Jest test generator (FR-029 to FR-035)
│   ├── doc-generator.js   # Documentation generator (future)
│   └── formatters/
│       ├── javascript.js  # JS formatter with Prettier (FR-022, FR-022a)
│       └── jsdoc.js       # JSDoc comment generator (FR-025 to FR-028)
└── ...

test/
├── unit/
│   ├── validation/
│   │   ├── validator.test.js
│   │   ├── syntax.test.js
│   │   ├── purity.test.js
│   │   └── eslint-config.test.js
│   └── generation/
│       ├── generator.test.js
│       ├── test-generator.test.js
│       └── formatters/
│           ├── javascript.test.js
│           └── jsdoc.test.js
└── integration/
    └── validation-generation/
        └── pipeline.test.js
```

**Structure Decision**: Single project structure. Files already exist as stubs in `src/validation/` and `src/generation/`. Implementation will replace stub `throw new Error()` statements with actual logic.

## Complexity Tracking

No constitution violations requiring justification. Implementation follows existing project patterns.
