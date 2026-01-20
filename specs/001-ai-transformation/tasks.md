# Tasks: AI Transformation

**Input**: Design documents from `/specs/001-ai-transformation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL and not explicitly requested in the specification. Focus on implementation tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single Node.js library project**: `src/ai/`, `src/mcp/`, `test/unit/`, `test/integration/`
- Paths follow the structure defined in plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create test directory structure: test/unit/ai/ and test/unit/mcp/ and test/integration/ai/
- [X] T002 [P] Install production dependency: @anthropic-ai/sdk in package.json
- [X] T003 [P] Configure environment variable documentation for API_KEY and MCP_SERVER_URL in README.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create error classes in src/ai/errors.js for TransformationError, APIError, RateLimitError, InvalidCodeError, ToolTimeoutError
- [X] T005 [P] Create base types/interfaces file in src/ai/types.js for CompilationPrompt, TransformResult, TransformMetadata, ToolCall, TokenUsage
- [X] T006 [P] Create base types/interfaces file in src/mcp/types.js for MCPTool, ToolResult, MCPClientConnection, PendingRequest
- [X] T007 [P] Create utility module for exponential backoff calculation in src/ai/utils/backoff.js

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - AI Transforms GherkinLang Source to JavaScript (Priority: P1) 🎯 MVP

**Goal**: Enable core compilation capability that transforms GherkinLang source code into JavaScript using AI-powered natural language interpretation.

**Independent Test**: Can be fully tested by providing a simple .feature file with one scenario, language rules, and project context, then verifying the transformer produces valid JavaScript code that implements the scenario. Delivers the ability to compile GherkinLang source code.

### Implementation for User Story 1

- [X] T008 [US1] Implement prompt builder that constructs compilation prompts in src/ai/prompt-builder.js
- [X] T009 [US1] Implement response parser that extracts JavaScript code from AI responses in src/ai/response-parser.js
- [X] T010 [US1] Implement retry handler with exponential backoff and jitter in src/ai/retry-handler.js
- [X] T011 [US1] Implement AI transformer main entry point with transform method in src/ai/transformer.js
- [X] T012 [US1] Integrate AI transformer with Claude API client (@anthropic-ai/sdk) in src/ai/transformer.js
- [X] T013 [US1] Implement metadata tracking (model, tokens, duration) in src/ai/transformer.js
- [X] T014 [US1] Implement error handling for API errors and timeouts in src/ai/transformer.js
- [X] T015 [US1] Implement invalid code response handling with retry and clarification prompt in src/ai/transformer.js

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. The transformer can compile GherkinLang source to JavaScript without tool support.

---

## Phase 4: User Story 2 - MCP Client Enables Tool-Assisted Compilation (Priority: P1)

**Goal**: Enable AI transformer to access external tools during compilation to validate code, check dependencies, read files, and perform other operations that improve compilation quality and accuracy.

**Independent Test**: Can be fully tested by configuring the MCP client with available tools, then verifying the transformer can invoke tools during compilation and receive results. Delivers the ability to use external tools during compilation.

### Implementation for User Story 2

- [ ] T016 [US2] Implement MCP client connection management (spawn subprocess, stdin/stdout) in src/mcp/client.js
- [ ] T017 [US2] Implement MCP protocol initialization and tool discovery in src/mcp/client.js
- [ ] T018 [US2] Implement tool registry that manages discovered tools in src/mcp/tool-registry.js
- [ ] T019 [US2] Implement tool invoker that executes tool calls via MCP protocol in src/mcp/tool-invoker.js
- [ ] T020 [US2] Implement tool invocation timeout handling (5 seconds per tool) in src/mcp/tool-invoker.js
- [ ] T021 [US2] Implement tool result formatting for Claude API tool_result format in src/mcp/tool-invoker.js
- [ ] T022 [US2] Integrate MCP client with AI transformer for tool-assisted compilation in src/ai/transformer.js
- [ ] T023 [US2] Implement multi-turn conversation support when tools are invoked in src/ai/transformer.js
- [ ] T024 [US2] Implement error handling for MCP connection failures and tool invocation errors in src/mcp/client.js

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. The transformer can use tools during compilation to improve quality.

---

## Phase 5: User Story 3 - MCP Tools Provide Compilation Support Services (Priority: P2)

**Goal**: Provide specific tools available during compilation to validate generated code, check dependencies, read project files, and generate tests. These tools improve compilation quality and enable the AI to make better decisions.

**Independent Test**: Can be fully tested by implementing one tool (e.g., code analyzer), then verifying the transformer can invoke it and receive meaningful results. Delivers the ability to validate and improve compilation quality.

### Implementation for User Story 3

- [ ] T025 [P] [US3] Implement code analyzer tool that validates JavaScript syntax and purity in src/mcp/tools/analyzer.js
- [ ] T026 [P] [US3] Implement dependency checker tool that verifies package availability in src/mcp/tools/dependencies.js
- [ ] T027 [P] [US3] Implement file system tool that reads project files for cross-module references in src/mcp/tools/filesystem.js
- [ ] T028 [P] [US3] Implement test generator tool that creates test code for generated implementations in src/mcp/tools/test-generator.js
- [ ] T029 [US3] Create tool registry export that registers all tools in src/mcp/tools/index.js
- [ ] T030 [US3] Implement tool input validation and error handling for all tools in src/mcp/tools/analyzer.js, src/mcp/tools/dependencies.js, src/mcp/tools/filesystem.js, src/mcp/tools/test-generator.js
- [ ] T031 [US3] Integrate all tools with MCP client tool registry in src/mcp/tool-registry.js

**Checkpoint**: All user stories should now be independently functional. The complete AI transformation system with tool support is operational.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T032 [P] Update main library entry point to export AI transformer and MCP client in src/index.js
- [ ] T033 [P] Add JSDoc documentation to all public interfaces in src/ai/transformer.js, src/mcp/client.js, src/mcp/tools/*.js
- [ ] T034 Code cleanup and refactoring across all AI transformation components
- [ ] T035 Performance optimization for prompt construction and response parsing
- [ ] T036 [P] Update README.md with AI transformation usage examples
- [ ] T037 Run quickstart.md validation to ensure all examples work correctly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (P1) can start after Foundational - No dependencies on other stories
  - User Story 2 (P1) can start after Foundational - Requires US1 for integration but should be independently testable
  - User Story 3 (P2) can start after Foundational - Requires US2 for tool infrastructure but should be independently testable
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories. This is the MVP.
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Integrates with US1 (uses transformer) but should be independently testable. MCP client can work standalone.
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Requires US2 (MCP client infrastructure) but tools can be implemented independently. Each tool is independently testable.

### Within Each User Story

- Core components before integration
- Base functionality before error handling
- Single-turn conversations before multi-turn
- Basic tools before advanced tools
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002, T003)
- All Foundational tasks marked [P] can run in parallel (T005, T006, T007)
- Once Foundational phase completes:
  - User Story 1 can start (MVP)
  - User Story 2 can start in parallel with US1 (different components)
  - User Story 3 tools marked [P] can run in parallel (T025, T026, T027, T028)
- All tools in US3 marked [P] can run in parallel (different files, no dependencies)
- Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# User Story 1 components can be built in this order:
# 1. Prompt builder (T008) - no dependencies
# 2. Response parser (T009) - no dependencies  
# 3. Retry handler (T010) - no dependencies
# 4. AI transformer (T011) - depends on T008, T009, T010
# 5. Integration and error handling (T012-T015) - depends on T011
```

---

## Parallel Example: User Story 3

```bash
# All tools can be implemented in parallel:
Task: "Implement code analyzer tool in src/mcp/tools/analyzer.js"
Task: "Implement dependency checker tool in src/mcp/tools/dependencies.js"
Task: "Implement file system tool in src/mcp/tools/filesystem.js"
Task: "Implement test generator tool in src/mcp/tools/test-generator.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently - can compile GherkinLang to JavaScript
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP! Core compilation works)
3. Add User Story 2 → Test independently → Deploy/Demo (Tool-assisted compilation enabled)
4. Add User Story 3 → Test independently → Deploy/Demo (All tools available)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (AI Transformer) - MVP
   - Developer B: User Story 2 (MCP Client) - Can work in parallel with A
   - Developer C: User Story 3 (MCP Tools) - Can work in parallel, implements tools independently
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- User Story 1 is the MVP - core compilation capability
- User Story 2 adds tool infrastructure - enables tool-assisted compilation
- User Story 3 adds specific tools - enhances compilation quality
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
