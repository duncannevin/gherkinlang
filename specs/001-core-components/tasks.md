# Tasks: Core Components

**Input**: Design documents from `/specs/001-core-components/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL and not explicitly requested in the specification. Focus on implementation tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single Node.js library project**: `src/compiler/`, `test/unit/compiler/`, `test/integration/compiler/`
- Paths follow the structure defined in plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create test directory structure: test/unit/compiler/ and test/integration/compiler/
- [X] T002 [P] Install production dependencies: glob (^10.x.x) in package.json
- [X] T003 [P] Install development dependencies: jest (^29.7.x) and fast-check (^3.15.x) in package.json
- [X] T004 [P] Configure Jest test framework in jest.config.js
- [X] T005 [P] Create .gherkin-cache directory structure documentation in README.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Create error classes in src/compiler/errors.js for RulesLoadError, ParseError, ContextBuildError, CacheError
- [X] T007 [P] Create utility module for SHA256 hashing in src/compiler/utils/hash.js
- [X] T008 [P] Create utility module for file system operations in src/compiler/utils/fs.js
- [X] T009 Create base types/interfaces file in src/compiler/types.js for shared TypeScript-style type definitions

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Language Rules Define Compilation Behavior (Priority: P1) 🎯 MVP

**Goal**: Implement language rules loader that reads and parses rules.md for target-specific compilation instructions. This enables the compiler to understand how to transform GherkinLang syntax.

**Independent Test**: Create a minimal rules.md file with one rule (e.g., "Feature: maps to module") and verify the compiler can read and use it during compilation. Delivers the ability to define language semantics.

### Implementation for User Story 1

- [X] T010 [US1] Create RulesLoader class in src/ai/rules-loader.js with load() method
- [X] T011 [US1] Implement file reading logic in RulesLoader.load() to read rules.md from file path
- [X] T012 [US1] Implement SHA256 content hashing in RulesLoader.load() using crypto module
- [X] T013 [US1] Implement target-specific rule extraction in RulesLoader.load() to filter sections by target
- [X] T014 [US1] Implement in-memory caching in RulesLoader with getCached() method
- [X] T015 [US1] Implement hasChanged() method in RulesLoader to detect file modifications using fs.stat
- [X] T016 [US1] Add error handling in RulesLoader for missing files, unreadable files, and invalid targets
- [X] T017 [US1] Create LanguageRules type definition in src/compiler/types.js with content, target, contentHash, loadedAt, filePath fields
- [X] T018 [US1] Export RulesLoader from src/ai/transformer.js (or create separate export file)

**Checkpoint**: At this point, User Story 1 should be fully functional. Can load rules.md, compute hash, and make rules available to AI transformer.

---

## Phase 4: User Story 2 - Gherkin Parser Extracts Source Structure (Priority: P1)

**Goal**: Implement Gherkin parser that extracts structure from .feature files to identify features, scenarios, dependencies, and basic syntax. This enables dependency resolution and project context building.

**Independent Test**: Parse a simple .feature file and verify it correctly extracts the feature name, scenario names, and basic structure. Delivers the ability to analyze source code structure.

### Implementation for User Story 2

- [X] T019 [US2] Create GherkinParser class in src/compiler/parser.js with parse() method
- [X] T020 [US2] Implement feature name extraction in GherkinParser.parse() to extract from "Feature:" line
- [X] T021 [US2] Implement scenario extraction in GherkinParser.parse() to find all "Scenario:" lines with names and line numbers
- [X] T022 [US2] Implement import detection in GherkinParser.parse() to find "Given import <moduleName>" statements
- [X] T023 [US2] Implement error collection in GherkinParser.parse() to track syntax, structure, and missing feature errors
- [X] T024 [US2] Implement line/column tracking in GherkinParser.parse() for accurate error reporting
- [X] T025 [US2] Implement parseMany() method in GherkinParser to parse multiple files and return Map
- [X] T026 [US2] Create ParsedFeature type definition in src/compiler/types.js with featureName, filePath, scenarios, imports, dependencies, errors, lineCount fields
- [X] T027 [US2] Create ScenarioInfo and ParseError nested types in src/compiler/types.js
- [X] T028 [US2] Add validation logic in GherkinParser.parse() to ensure featureName is valid identifier
- [X] T029 [US2] Export GherkinParser from src/compiler/parser.js
- [X] T029.1 [US2] Write unit tests for the GherkinParser class

**Checkpoint**: At this point, User Story 2 should be fully functional. Can parse .feature files and extract structure with error reporting.

---

## Phase 5: User Story 3 - Project Context Manages Multi-File Compilation (Priority: P1)

**Goal**: Implement project context manager that builds module registry and dependency graphs for multi-file projects. This enables the compiler to handle cross-module references and ensure correct compilation order.

**Independent Test**: Provide a directory with two .feature files where one depends on the other, and verify the context manager builds a dependency graph and determines correct compile order. Delivers the ability to compile multi-file projects.

### Implementation for User Story 3

- [ ] T030 [US3] Create ProjectContext class in src/compiler/context.js with build() method
- [ ] T031 [US3] Implement file discovery in ProjectContext.build() using glob to find all .feature files recursively
- [ ] T032 [US3] Integrate GherkinParser in ProjectContext.build() to parse all discovered .feature files
- [ ] T033 [US3] Implement module registry building in ProjectContext.build() to create Map of feature names to ModuleInfo
- [ ] T034 [US3] Implement file-to-module reverse mapping in ProjectContext.build() for efficient lookups
- [ ] T035 [US3] Implement dependency graph construction in ProjectContext.build() using adjacency list structure
- [ ] T036 [US3] Implement cycle detection algorithm in ProjectContext.detectCycles() using depth-first search
- [ ] T037 [US3] Implement topological sort in ProjectContext.getCompileOrder() using Kahn's algorithm
- [ ] T038 [US3] Implement configuration loading in ProjectContext.build() to read and parse .gherkinrc.json
- [ ] T039 [US3] Implement configuration validation in ProjectContext.build() to validate required fields and types
- [ ] T040 [US3] Implement default configuration application in ProjectContext.build() for missing optional fields
- [ ] T041 [US3] Implement duplicate feature name detection in ProjectContext.build() and throw ContextBuildError
- [ ] T042 [US3] Create ModuleInfo type definition in src/compiler/types.js with file, exports, dependencies, parsedAt fields
- [ ] T043 [US3] Create DependencyGraph type definition in src/compiler/types.js with nodes, edges, reverseEdges, compileOrder fields
- [ ] T044 [US3] Create ProjectConfiguration type definition in src/compiler/types.js with all config sections
- [ ] T045 [US3] Create Cycle type definition in src/compiler/types.js with modules and message fields
- [ ] T046 [US3] Implement getModule() method in ProjectContext to retrieve module by name
- [ ] T047 [US3] Implement getDependencies() method in ProjectContext to get dependencies for a module
- [ ] T048 [US3] Implement getConfig() method in ProjectContext to return loaded configuration
- [ ] T049 [US3] Export ProjectContext from src/compiler/context.js

**Checkpoint**: At this point, User Story 3 should be fully functional. Can discover files, build dependency graph, detect cycles, and determine compilation order.

---

## Phase 6: User Story 4 - Cache System Enables Fast Incremental Builds (Priority: P2)

**Goal**: Implement cache system using content-addressed storage (SHA256) with LRU eviction for fast incremental builds. This enables the compiler to avoid recompiling unchanged files.

**Independent Test**: Compile a file, then compile again without changes, and verify the second compilation uses cached results and completes in under 100ms. Delivers the ability to skip unnecessary recompilation.

### Implementation for User Story 4

- [ ] T050 [US4] Create CacheManager class in src/compiler/cache.js with generateKey() method
- [ ] T051 [US4] Implement cache key generation in CacheManager.generateKey() using SHA256(source + rules + compilerVersion + target)
- [ ] T052 [US4] Implement cache directory initialization in CacheManager constructor to create .gherkin-cache/ if needed
- [ ] T053 [US4] Implement manifest loading in CacheManager to read .gherkin-cache/manifest.json
- [ ] T054 [US4] Implement manifest creation in CacheManager if manifest.json doesn't exist
- [ ] T055 [US4] Implement cache entry storage in CacheManager.set() to write JSON file to .gherkin-cache/{key}.cache
- [ ] T056 [US4] Implement cache entry retrieval in CacheManager.get() to read and parse cache file
- [ ] T057 [US4] Implement cache entry validation in CacheManager.isValid() to check file exists and is not corrupted
- [ ] T058 [US4] Implement manifest update in CacheManager.set() to add entry to manifest with size and lastAccessed
- [ ] T059 [US4] Implement manifest update in CacheManager.get() to update lastAccessed timestamp
- [ ] T060 [US4] Implement cache clearing in CacheManager.clear() to remove specific entry or all entries
- [ ] T061 [US4] Implement LRU eviction in CacheManager.evict() to remove oldest entries when size exceeds limit
- [ ] T062 [US4] Implement size calculation in CacheManager to track total cache size from manifest
- [ ] T063 [US4] Implement size string parsing in CacheManager to convert "100MB" to bytes
- [ ] T064 [US4] Implement cache invalidation logic in CacheManager to detect source/rules/version/target changes
- [ ] T065 [US4] Create CacheEntry type definition in src/compiler/types.js with key, sourceHash, rulesHash, compiledCode, generatedTests, metadata fields
- [ ] T066 [US4] Create CacheMetadata type definition in src/compiler/types.js with timestamp, duration, model, compilerVersion, target fields
- [ ] T067 [US4] Create CacheManifest type definition in src/compiler/types.js with entries, totalSize, maxSize, lastUpdated fields
- [ ] T068 [US4] Create ManifestEntry type definition in src/compiler/types.js with key, file, size, lastAccessed fields
- [ ] T069 [US4] Create CacheStats type definition in src/compiler/types.js with entries, totalSize, hits, misses, hitRate fields
- [ ] T070 [US4] Implement getStats() method in CacheManager to return cache statistics
- [ ] T071 [US4] Implement error handling in CacheManager for read/write errors without failing compilation
- [ ] T072 [US4] Export CacheManager from src/compiler/cache.js

**Checkpoint**: At this point, User Story 4 should be fully functional. Can generate cache keys, store/retrieve entries, evict LRU entries, and handle errors gracefully.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T073 [P] Add JSDoc comments to all public methods in src/compiler/cache.js
- [ ] T074 [P] Add JSDoc comments to all public methods in src/compiler/parser.js
- [ ] T075 [P] Add JSDoc comments to all public methods in src/compiler/context.js
- [ ] T076 [P] Add JSDoc comments to all public methods in src/ai/rules-loader.js
- [ ] T077 [P] Create integration test in test/integration/compiler/core-components.test.js to test all components together
- [ ] T078 [P] Update README.md with usage examples from quickstart.md
- [ ] T079 [P] Validate performance targets: rules loading <50ms, parser 95% success rate, context <2s for 100 files, cache <10ms hits
- [ ] T080 Add error message improvements with actionable suggestions and documentation links
- [ ] T081 [P] Code cleanup and refactoring: remove unused code, improve naming consistency
- [ ] T082 Run quickstart.md validation to ensure all examples work correctly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User Story 1 (RulesLoader): Can start immediately after Foundational - No dependencies
  - User Story 2 (GherkinParser): Can start immediately after Foundational - No dependencies
  - User Story 3 (ProjectContext): Depends on User Story 2 (GherkinParser) - Uses parser to parse files
  - User Story 4 (CacheManager): Can start immediately after Foundational - No dependencies
  - User Stories 1, 2, and 4 can proceed in parallel (if staffed)
  - User Story 3 must wait for User Story 2 completion
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - RulesLoader**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1) - GherkinParser**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P1) - ProjectContext**: Depends on User Story 2 (GherkinParser) - Must use parser to parse .feature files
- **User Story 4 (P2) - CacheManager**: Can start after Foundational (Phase 2) - No dependencies on other stories

### Within Each User Story

- Core implementation before integration
- Error handling after core functionality
- Type definitions can be created in parallel with implementation
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002, T003, T004, T005)
- All Foundational tasks marked [P] can run in parallel (T007, T008)
- Once Foundational phase completes:
  - User Stories 1, 2, and 4 can start in parallel (different files, no dependencies)
  - User Story 3 must wait for User Story 2
- Type definitions within a story marked [P] can run in parallel with implementation
- Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all parallel tasks for User Story 1 together:
Task: "Create RulesLoader class in src/ai/rules-loader.js with load() method"
Task: "Create LanguageRules type definition in src/compiler/types.js with content, target, contentHash, loadedAt, filePath fields"
```

## Parallel Example: User Story 2

```bash
# Launch all parallel tasks for User Story 2 together:
Task: "Create GherkinParser class in src/compiler/parser.js with parse() method"
Task: "Create ParsedFeature type definition in src/compiler/types.js with featureName, filePath, scenarios, imports, dependencies, errors, lineCount fields"
Task: "Create ScenarioInfo and ParseError nested types in src/compiler/types.js"
```

## Parallel Example: User Story 4

```bash
# Launch all parallel tasks for User Story 4 together:
Task: "Create CacheManager class in src/compiler/cache.js with generateKey() method"
Task: "Create CacheEntry type definition in src/compiler/types.js with key, sourceHash, rulesHash, compiledCode, generatedTests, metadata fields"
Task: "Create CacheMetadata type definition in src/compiler/types.js with timestamp, duration, model, compilerVersion, target fields"
Task: "Create CacheManifest type definition in src/compiler/types.js with entries, totalSize, maxSize, lastUpdated fields"
Task: "Create ManifestEntry type definition in src/compiler/types.js with key, file, size, lastAccessed fields"
Task: "Create CacheStats type definition in src/compiler/types.js with entries, totalSize, hits, misses, hitRate fields"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (RulesLoader)
4. **STOP and VALIDATE**: Test User Story 1 independently - can load rules.md and make available to compiler
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (RulesLoader) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (GherkinParser) → Test independently → Deploy/Demo
4. Add User Story 3 (ProjectContext) → Test independently → Deploy/Demo (depends on US2)
5. Add User Story 4 (CacheManager) → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (RulesLoader)
   - Developer B: User Story 2 (GherkinParser)
   - Developer C: User Story 4 (CacheManager) - can start in parallel
3. After User Story 2 completes:
   - Developer B: User Story 3 (ProjectContext) - uses parser from US2
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- User Story 3 (ProjectContext) requires User Story 2 (GherkinParser) - this is the only cross-story dependency
- All other user stories (1, 2, 4) can be implemented in parallel after Foundational phase
