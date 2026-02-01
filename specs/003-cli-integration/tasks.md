# Tasks: CLI & Integration

**Input**: Design documents from `/specs/003-cli-integration/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create project structure

- [x] T001 Add CLI dependencies to package.json (commander, chokidar, chalk, ora, @inquirer/prompts)
- [x] T002 [P] Create CLI types file with JSDoc typedefs in src/cli/types.js
- [x] T003 [P] Create default configuration constants in src/cli/constants.js

---

## Phase 2: Foundational (CLI Entry Point & Utilities)

**Purpose**: Core CLI infrastructure that MUST be complete before ANY command can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Utilities

- [x] T004 Implement logger utility with color support in src/cli/utils/logger.js
- [x] T005 [P] Implement progress utility with spinners in src/cli/utils/progress.js

### CLI Entry Point (User Story 4 - P1)

- [x] T006 Implement config file search (upward traversal) in src/cli/index.js
- [x] T007 Implement config loading and merging with defaults in src/cli/index.js
- [x] T008 Implement createProgram() with commander setup in src/cli/index.js
- [x] T009 Implement createContext() for command handlers in src/cli/index.js
- [x] T010 Implement run() function with error handling in src/cli/index.js
- [x] T011 Implement global options (--version, --help, --no-color, -v, -q) in src/cli/index.js
- [x] T012 Register subcommand stubs (compile, watch, init, cache, validate, test) in src/cli/index.js
- [x] T013 Update bin/gherkin.js to import and run CLI entry point

**Checkpoint**: CLI entry point ready - `gherkin --help` and `gherkin --version` work

---

## Phase 3: User Story 1 - Compile Command (Priority: P1) 🎯 MVP

**Goal**: Transform .feature files to JavaScript via CLI command

**Independent Test**: Run `gherkin compile features/example.feature` and verify JavaScript output in dist/

### Implementation for User Story 1

- [x] T014 [US1] Implement register() function with command signature in src/cli/commands/compile.js
- [x] T015 [US1] Implement discoverFiles() for file/directory resolution in src/cli/commands/compile.js
- [x] T016 [US1] Implement sortByDependency() using project context in src/cli/commands/compile.js
- [x] T017 [US1] Implement compileFile() orchestrating parser→transformer→validator→generator in src/cli/commands/compile.js
- [x] T018 [US1] Implement error aggregation (continue on failure, collect all errors) in src/cli/commands/compile.js
- [x] T019 [US1] Implement progress display (spinner for single, counter for multiple) in src/cli/commands/compile.js
- [x] T020 [US1] Implement summary display (files compiled, cache hits, errors, time) in src/cli/commands/compile.js
- [x] T021 [US1] Implement execute() orchestrating full compile flow in src/cli/commands/compile.js
- [x] T022 [US1] Add compile command options (--output, --format, --target, --no-cache, --no-tests) in src/cli/commands/compile.js
- [x] T023 [US1] Wire compile command registration in src/cli/index.js

**Checkpoint**: User Story 1 complete - `gherkin compile features/` works end-to-end

---

## Phase 4: User Story 2 - Watch Command (Priority: P2)

**Goal**: Auto-recompile on file changes with real-time feedback

**Independent Test**: Run `gherkin watch features/`, modify a file, verify auto-recompilation

### Implementation for User Story 2

- [ ] T024 [US2] Implement register() function with command signature in src/cli/commands/watch.js
- [ ] T025 [US2] Implement createWatcher() with chokidar setup in src/cli/commands/watch.js
- [ ] T026 [US2] Implement debounce logic for rapid file changes in src/cli/commands/watch.js
- [ ] T027 [US2] Implement getFilesToRecompile() using dependency graph in src/cli/commands/watch.js
- [ ] T028 [US2] Implement handleEvent() for add/change/unlink events in src/cli/commands/watch.js
- [ ] T029 [US2] Implement WatchState tracking (pending files, statistics) in src/cli/commands/watch.js
- [ ] T030 [US2] Implement signal handling (SIGINT/SIGTERM) with graceful shutdown in src/cli/commands/watch.js
- [ ] T031 [US2] Implement shutdown() with summary display in src/cli/commands/watch.js
- [ ] T032 [US2] Implement execute() orchestrating watch loop in src/cli/commands/watch.js
- [ ] T033 [US2] Add watch command options (--initial, --debounce, plus compile options) in src/cli/commands/watch.js
- [ ] T034 [US2] Wire watch command registration in src/cli/index.js

**Checkpoint**: User Story 2 complete - `gherkin watch features/` auto-recompiles on changes

---

## Phase 5: User Story 3 - Init Command (Priority: P2)

**Goal**: Scaffold new GherkinLang projects with templates

**Independent Test**: Run `gherkin init my-project --template basic`, verify project structure created

### Implementation for User Story 3

- [ ] T035 [US3] Define project templates (basic, library, api) with config and example files in src/cli/commands/init.js
- [ ] T036 [US3] Implement register() function with command signature in src/cli/commands/init.js
- [ ] T037 [US3] Implement getTemplate() to retrieve template by name in src/cli/commands/init.js
- [ ] T038 [US3] Implement promptTemplate() with @inquirer/prompts select in src/cli/commands/init.js
- [ ] T039 [US3] Implement directory creation and validation in src/cli/commands/init.js
- [ ] T040 [US3] Implement overwrite warning and confirmation prompt in src/cli/commands/init.js
- [ ] T041 [US3] Implement createProject() to write config and example files in src/cli/commands/init.js
- [ ] T042 [US3] Implement displayNextSteps() with post-init instructions in src/cli/commands/init.js
- [ ] T043 [US3] Implement execute() orchestrating init flow in src/cli/commands/init.js
- [ ] T044 [US3] Add init command options (--template, --yes, --force) in src/cli/commands/init.js
- [ ] T045 [US3] Wire init command registration in src/cli/index.js

**Checkpoint**: User Story 3 complete - `gherkin init` creates project with templates

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, error handling, and refinements

- [ ] T046 [P] Add edge case handling for missing file arguments in compile command
- [ ] T047 [P] Add edge case handling for non-existent directories in watch command
- [ ] T048 [P] Add edge case handling for invalid JSON in config files
- [ ] T049 [P] Add CI environment detection (disable colors/spinners when CI=true)
- [ ] T050 Implement --quiet and --verbose flags across all commands
- [ ] T051 [P] Add helpful error messages with suggestions and docs links
- [ ] T052 Run quickstart.md validation (manual test of all documented commands)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2)
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) + reuses compile logic from US1
- **User Story 3 (Phase 5)**: Depends on Foundational (Phase 2) only - independent of US1/US2
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (Compile)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (Watch)**: Can start after Foundational - Uses compile logic from US1 but can stub initially
- **User Story 3 (Init)**: Can start after Foundational - Fully independent of US1/US2

### Within Each User Story

- Core functions before orchestration (execute)
- Options/registration after core implementation
- Wire into CLI entry point last

### Parallel Opportunities

**Phase 1 (Setup)**:
```
T002 (types) || T003 (constants)
```

**Phase 2 (Foundational)**:
```
T004 (logger) || T005 (progress)
Then sequentially: T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013
```

**User Stories (after Foundational)**:
```
US1 (Compile) can run in parallel with US3 (Init)
US2 (Watch) should follow US1 to reuse compile logic
```

---

## Parallel Example: User Story 1

```bash
# Cannot parallelize within US1 - tasks are sequential (build on each other)
# But US1 can run in parallel with US3 (Init) if team capacity allows
```

---

## Parallel Example: After Foundational

```bash
# With two developers:
# Developer A: User Story 1 (Compile) → User Story 2 (Watch)
# Developer B: User Story 3 (Init) → Polish tasks

# With one developer:
# Sequential: US1 (MVP) → US2 → US3 → Polish
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T013)
3. Complete Phase 3: User Story 1 - Compile (T014-T023)
4. **STOP and VALIDATE**: Test `gherkin compile features/` end-to-end
5. Deploy/demo if ready - basic compilation works!

### Incremental Delivery

1. Setup + Foundational → `gherkin --help` works
2. Add User Story 1 (Compile) → `gherkin compile` works (MVP!)
3. Add User Story 2 (Watch) → `gherkin watch` works
4. Add User Story 3 (Init) → `gherkin init` works
5. Polish → Production-ready CLI

### Task Count Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| Phase 1: Setup | 3 | Dependencies and constants |
| Phase 2: Foundational | 10 | Logger, progress, CLI entry point |
| Phase 3: US1 Compile | 10 | Compile command implementation |
| Phase 4: US2 Watch | 11 | Watch command implementation |
| Phase 5: US3 Init | 11 | Init command implementation |
| Phase 6: Polish | 7 | Edge cases and refinements |
| **Total** | **52** | |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No test tasks generated (tests not explicitly requested in spec)
- Existing compiler components (parser, transformer, validator, generator) are already implemented
- CLI layer orchestrates these components - focus is on CLI UX, not compilation logic
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
