# Tasks: Validation & Generation

**Input**: Design documents from `/specs/002-validation-generation/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in spec. Implementation tasks only.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and verify project structure

- [x] T001 Install validation dependencies: `npm install @babel/parser @babel/traverse`
- [x] T002 [P] Install linting dependencies: `npm install eslint eslint-plugin-functional`
- [x] T003 [P] Install generation dependencies: `npm install prettier proper-lockfile`
- [x] T004 Verify stub files exist in src/validation/ and src/generation/

**Checkpoint**: All dependencies installed, stub files confirmed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types and constants used by all user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Define shared type definitions (ValidationResult, ValidationError, ErrorLocation) in src/validation/types.js
- [x] T006 [P] Define shared constants (FORBIDDEN_IDENTIFIERS, FORBIDDEN_MEMBER_EXPRESSIONS, MAX_SYNTAX_ERRORS) in src/validation/constants.js
- [x] T007 [P] Define generation types (GeneratedModule, ModuleExport, GeneratedTestSuite, TestCase) in src/generation/types.js
- [x] T008 Create helper function createValidationError() in src/validation/types.js
- [x] T009 Create helper function getCodeSnippet() for extracting source context in src/validation/types.js

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Code Validator (Priority: P1) 🎯 MVP

**Goal**: Validate AI-generated JavaScript code for syntax correctness, purity (no side effects), and lint compliance before generation.

**Independent Test**: Provide a JavaScript code string to the validator and verify it returns correct validation results (pass/fail with specific error details).

### Implementation for User Story 1

#### Syntax Validation (FR-001 to FR-004)

- [x] T010 [P] [US1] Implement validateSyntax() function using @babel/parser in src/validation/syntax.js
- [x] T011 [US1] Add ES2020+ plugin configuration (optionalChaining, nullishCoalescingOperator) in src/validation/syntax.js
- [x] T012 [US1] Implement error recovery mode to collect up to 10 syntax errors in src/validation/syntax.js
- [x] T013 [US1] Add support for both CommonJS and ES Module sourceType in src/validation/syntax.js

#### Purity Validation (FR-005 to FR-009)

- [ ] T014 [P] [US1] Implement validatePurity() function using @babel/traverse in src/validation/purity.js
- [ ] T015 [US1] Add detection for mutation patterns (AssignmentExpression, UpdateExpression) in src/validation/purity.js
- [ ] T016 [US1] Add detection for forbidden constructs (ForStatement, WhileStatement, ThisExpression, ClassDeclaration) in src/validation/purity.js
- [ ] T017 [US1] Add detection for side effects (console.*, fs.*, fetch, setTimeout) in src/validation/purity.js
- [ ] T018 [US1] Add detection for global access (window, global, process mutations) in src/validation/purity.js
- [ ] T019 [US1] Ensure pure patterns are allowed (closures, higher-order functions, map/filter/reduce, spread) in src/validation/purity.js

#### Lint Validation (FR-010 to FR-013)

- [ ] T020 [P] [US1] Implement validateLint() function using ESLint programmatic API in src/validation/eslint-config.js
- [ ] T021 [US1] Configure required rules (no-var, prefer-const, prefer-arrow-callback, no-unused-vars) in src/validation/eslint-config.js
- [ ] T022 [US1] Add eslint-plugin-functional rules (immutable-data, no-loop-statement, no-this-expression) in src/validation/eslint-config.js
- [ ] T023 [US1] Support project-specific ESLint config overrides via options in src/validation/eslint-config.js

#### Validation Pipeline (FR-014 to FR-017a)

- [ ] T024 [US1] Implement validate() orchestrator function in src/validation/validator.js
- [ ] T025 [US1] Implement fail-fast logic (skip purity/lint if syntax fails) in src/validation/validator.js
- [ ] T026 [US1] Implement aggregateErrors() to combine all validation results in src/validation/validator.js
- [ ] T027 [US1] Add duration tracking for performance metrics in src/validation/validator.js
- [ ] T028 [US1] Ensure no auto-fix behavior - return errors for AI retry in src/validation/validator.js

**Checkpoint**: User Story 1 complete - validator accepts code string and returns ValidationResult

---

## Phase 4: User Story 2 - Code Generator (Priority: P1)

**Goal**: Write validated JavaScript code to output directory with proper formatting, module structure, and JSDoc documentation.

**Independent Test**: Provide validated JavaScript code and verify the generator writes correctly formatted files with proper module exports and JSDoc comments.

### Implementation for User Story 2

#### JSDoc Generation (FR-025 to FR-028)

- [ ] T029 [P] [US2] Implement generateModuleJSDoc() for @module tags in src/generation/formatters/jsdoc.js
- [ ] T030 [US2] Implement generateFunctionJSDoc() for @param, @returns, @description in src/generation/formatters/jsdoc.js
- [ ] T031 [US2] Add type extraction from Gherkin source or inference from implementation in src/generation/formatters/jsdoc.js
- [ ] T032 [US2] Add @example sections from Gherkin Examples tables in src/generation/formatters/jsdoc.js

#### JavaScript Formatting (FR-022, FR-022a)

- [ ] T033 [P] [US2] Implement formatCode() using Prettier programmatic API in src/generation/formatters/javascript.js
- [ ] T034 [US2] Add default Prettier config with locked settings for deterministic output in src/generation/formatters/javascript.js
- [ ] T035 [US2] Implement fallback behavior (write unformatted + warning) on Prettier failure in src/generation/formatters/javascript.js
- [ ] T036 [US2] Add project .prettierrc detection and merging in src/generation/formatters/javascript.js

#### Module Export Handling (FR-019 to FR-021)

- [ ] T037 [US2] Implement wrapWithExports() for CommonJS (module.exports) in src/generation/generator.js
- [ ] T038 [US2] Implement wrapWithExports() for ES Modules (export default, named exports) in src/generation/generator.js
- [ ] T039 [US2] Implement resolveImports() for cross-module dependencies in src/generation/generator.js

#### File Generation (FR-018, FR-023, FR-023a, FR-024)

- [ ] T040 [US2] Implement generate() main function in src/generation/generator.js
- [ ] T041 [US2] Add output directory creation (ensureOutputDir) in src/generation/generator.js
- [ ] T042 [US2] Implement file locking using proper-lockfile for concurrent writes in src/generation/generator.js
- [ ] T043 [US2] Implement computeOutputPath() mapping .feature to .js in src/generation/generator.js
- [ ] T044 [US2] Integrate JSDoc generation before export wrapping in src/generation/generator.js
- [ ] T045 [US2] Integrate Prettier formatting before file write in src/generation/generator.js

**Checkpoint**: User Story 2 complete - generator writes formatted JavaScript with JSDoc to output directory

---

## Phase 5: User Story 3 - Test Generator (Priority: P2)

**Goal**: Automatically generate Jest test suites for compiled functions with example-based, type validation, and edge case tests.

**Independent Test**: Provide compiled JavaScript code with JSDoc and verify the test generator creates valid Jest test files that can run without modification.

### Implementation for User Story 3

#### Type Inference (FR-031a)

- [ ] T046 [P] [US3] Implement inferTypes() function with heuristics in src/generation/test-generator.js
- [ ] T047 [US3] Add name-based type inference (add→number, concat→string, filter→array) in src/generation/test-generator.js
- [ ] T048 [US3] Add parameter name-based inference (count→number, text→string, items→array) in src/generation/test-generator.js

#### Test Case Generation (FR-031 to FR-034)

- [ ] T049 [P] [US3] Implement generateExampleTests() from Gherkin Examples tables in src/generation/test-generator.js
- [ ] T050 [US3] Implement generateTypeTests() for type validation in src/generation/test-generator.js
- [ ] T051 [US3] Implement generateEdgeCaseTests() for common edge cases in src/generation/test-generator.js
- [ ] T052 [US3] Implement generateBoundaryTests() for numeric boundaries in src/generation/test-generator.js
- [ ] T053 [US3] Implement generateAssertion() for appropriate Jest matchers in src/generation/test-generator.js

#### Test File Generation (FR-029, FR-030, FR-035)

- [ ] T054 [US3] Implement generateTests() main function in src/generation/test-generator.js
- [ ] T055 [US3] Implement createTestFile() with proper Jest structure in src/generation/test-generator.js
- [ ] T056 [US3] Implement generateDescribeBlock() for module/function organization in src/generation/test-generator.js
- [ ] T057 [US3] Implement computeTestPath() mapping .js to .test.js in src/generation/test-generator.js
- [ ] T058 [US3] Add import statement generation for module under test in src/generation/test-generator.js

**Checkpoint**: User Story 3 complete - test generator produces valid Jest test files

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Integration, documentation, and cleanup

- [ ] T059 [P] Create integration test for full validation→generation pipeline in test/integration/validation-generation/pipeline.test.js
- [ ] T060 [P] Verify all contracts match implementation (validator.md, generator.md, test-generator.md)
- [ ] T061 Run quickstart.md verification steps to confirm setup works
- [ ] T062 Update module exports in src/index.js to expose validation and generation APIs
- [ ] T063 Add JSDoc comments to all public functions per constitution requirements

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-5)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 priority - can proceed in parallel
  - US3 (P2) can start after Foundational but benefits from US2 completion (uses GeneratedModule)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational - Independent of US1 (uses validated code as input)
- **User Story 3 (P2)**: Can start after Foundational - Uses GeneratedModule from US2 but can mock for independent testing

### Within Each User Story

- Types/constants before implementation
- Helper functions before main functions
- Individual validators before orchestrator (US1)
- Formatters before generator (US2)
- Inference before test generation (US3)

### Parallel Opportunities

**Phase 1 (Setup)**:
```
T001, T002, T003 can run in parallel (different npm install commands)
```

**Phase 2 (Foundational)**:
```
T005 → T008, T009 (types first, then helpers)
T006, T007 can run in parallel (different files)
```

**Phase 3 (US1 - Validator)**:
```
T010, T014, T020 can run in parallel (syntax, purity, lint are separate files)
```

**Phase 4 (US2 - Generator)**:
```
T029, T033 can run in parallel (jsdoc.js and javascript.js are separate)
```

**Phase 5 (US3 - Test Generator)**:
```
T046, T049 can run in parallel (inference and example tests are independent)
```

---

## Parallel Example: User Story 1

```bash
# Launch all validators in parallel (different files):
Task: "T010 [P] [US1] Implement validateSyntax() in src/validation/syntax.js"
Task: "T014 [P] [US1] Implement validatePurity() in src/validation/purity.js"  
Task: "T020 [P] [US1] Implement validateLint() in src/validation/eslint-config.js"

# Then sequentially:
Task: "T024 [US1] Implement validate() orchestrator in src/validation/validator.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (Validator)
4. **STOP and VALIDATE**: Test validator with sample code
5. Validator can be used standalone for code quality checks

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test validator → **MVP: Code validation works**
3. Add User Story 2 → Test generator → **Full compilation pipeline**
4. Add User Story 3 → Test test-generator → **Complete feature with auto-testing**

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Validator)
   - Developer B: User Story 2 (Generator)
3. After both complete: Developer C starts User Story 3 (Test Generator)
4. Stories integrate through defined contracts

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Stub files exist - replace `throw new Error()` with implementation
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Performance target: <500ms validation, <100ms generation per module
