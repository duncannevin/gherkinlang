# Implementation Plan: AI Transformation

**Branch**: `001-ai-transformation` | **Date**: 2026-01-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-ai-transformation/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement AI transformation engine with Claude API integration and MCP (Model Context Protocol) client support for tool-assisted compilation. The AI transformer processes GherkinLang source code using natural language rules to generate pure functional JavaScript. MCP client enables the AI to invoke tools during compilation for code validation, dependency checking, file reading, and test generation. This phase enables the core compilation capability that transforms source code into executable JavaScript.

## Technical Context

**Language/Version**: JavaScript ES2020+ / Node.js 18.x+  
**Primary Dependencies**: 
- `@anthropic-ai/sdk` (or similar) - Claude API client for AI transformation
- MCP protocol implementation - Local process communication (stdin/stdout) for tool invocation
- Existing core components: rules-loader, parser, context, cache (from Phase 1)

**Storage**: N/A - No persistent storage required. Transformation results are handled by cache system (Phase 1). Metadata (model, tokens, duration) is transient and passed to cache system.

**Testing**: Jest (^29.7.x) for unit and integration tests. Mock MCP server for testing tool invocations. Mock Claude API responses for testing transformation logic.

**Target Platform**: Node.js runtime (cross-platform: Linux, macOS, Windows). MCP server runs as local subprocess.

**Project Type**: Single Node.js library/CLI tool (compiler)

**Performance Goals**: 
- AI transformation: <30 seconds for typical single-file transformations (excluding API latency)
- MCP client connection: <2 seconds to connect and discover tools
- Tool invocations: <5 seconds for standard operations (file reads, code analysis)
- Multi-turn workflows: 90% success rate for cases requiring tools
- API retry handling: 95% completion rate despite transient rate limits

**Constraints**: 
- Must use environment variables for authentication (API_KEY, MCP_SERVER_URL)
- MCP server connection via local process (stdin/stdout)
- Exponential backoff with jitter for retries (2s base, max 3 retries)
- Tool invocation timeout: 5 seconds per tool (fails entire compilation)
- Must handle invalid AI responses (retry once with clarification, then fail - configurable)
- Must maintain purity of generated code (enforced by constitution)
- Must track transformation metadata for all operations

**Scale/Scope**: 
- Typical compilation: Single .feature file per transformation
- Tool invocations: Typically 0-3 tools per compilation
- Multi-turn conversations: Up to 5 rounds when tools are required
- Concurrent compilations: Single-threaded, sequential processing

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle 1 — Purity Above All
✅ **PASS**: AI transformer generates pure functional JavaScript code. The transformer itself (Node.js implementation) operates on data structures and makes API calls, which is appropriate for compiler internals. Generated code is validated for purity by existing validation components (Phase 1).

### Principle 2 — Deterministic Builds
✅ **PASS**: AI transformer uses fixed temperature (0.0) for deterministic responses where possible. Transformation results are cached by content-addressed cache system (Phase 1), ensuring identical inputs produce identical outputs. Tool invocations are deterministic (file reads, code analysis).

### Principle 3 — Human Readability of Rules
✅ **PASS**: AI transformer reads and uses rules.md (from rules-loader, Phase 1) without modification. Rules remain human-readable and serve as the language specification.

### Principle 4 — AI as Interpreter, Not Oracle
✅ **PASS**: AI transformer interprets rules faithfully. Prompt construction ensures AI follows rules.md instructions. Tool invocations (code validation, dependency checking) provide feedback but do not change rule interpretation. AI does not invent features not in rules.

### Principle 5 — Graceful Degradation
✅ **PASS**: All error cases handled gracefully:
- AI API errors: Clear error messages with context about what failed
- Tool invocation failures: Clear error reporting without crashing
- Invalid AI responses: Retry with clarification, then fail with clear error
- Timeouts: Clear timeout error messages
- Rate limiting: Exponential backoff with jitter, graceful handling

**Gate Status**: ✅ **ALL GATES PASS** - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-transformation/
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
├── ai/
│   ├── transformer.js        # AI transformation engine (main entry point)
│   ├── prompt-builder.js     # Constructs compilation prompts
│   ├── response-parser.js    # Extracts code from AI responses
│   └── retry-handler.js      # Exponential backoff with jitter
│
├── mcp/
│   ├── client.js             # MCP client (local process communication)
│   ├── tool-registry.js      # Tool discovery and registration
│   ├── tool-invoker.js       # Executes tool invocations
│   └── tools/
│       ├── analyzer.js       # JavaScript syntax and purity validation
│       ├── dependencies.js   # Package availability checking
│       ├── filesystem.js     # File reading for cross-module references
│       ├── test-generator.js # Test code generation
│       └── index.js          # Tool registry export
│
├── compiler/                 # (Existing from Phase 1)
│   ├── cache.js
│   ├── context.js
│   ├── parser.js
│   └── index.js
│
└── index.js                  # Main library entry point

test/
├── unit/
│   ├── ai/
│   │   ├── transformer.test.js
│   │   ├── prompt-builder.test.js
│   │   ├── response-parser.test.js
│   │   └── retry-handler.test.js
│   └── mcp/
│       ├── client.test.js
│       ├── tool-registry.test.js
│       ├── tool-invoker.test.js
│       └── tools/
│           ├── analyzer.test.js
│           ├── dependencies.test.js
│           ├── filesystem.test.js
│           └── test-generator.test.js
└── integration/
    └── ai/
        └── transformation.test.js
```

**Structure Decision**: Single Node.js library project. AI transformation components are in `src/ai/` and MCP client/tools are in `src/mcp/` as specified in existing structure. Tests follow the same pattern as Phase 1 (unit and integration). The structure builds on existing components and maintains consistency with the project architecture.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | No violations | All gates passed |
