# Feature Specification: Validation & Generation

**Feature Branch**: `002-validation-generation`  
**Created**: 2026-01-29  
**Status**: Draft  
**Input**: User description: "Phase 4: Validation & Generation - Code validator (syntax, purity, lint), Code generator, Test generator"

## Clarifications

### Session 2026-01-29

- Q: What happens when validation fails? Should the system auto-fix or require AI retry? → A: Validation failures always require AI retry (no auto-fix)
- Q: When syntax validation fails, should the system report all errors or stop at first? → A: Report all syntax errors up to a limit (max 10 errors)
- Q: How should concurrent generation requests for the same file be handled? → A: File locking to serialize writes (second request waits)
- Q: What should test generator do when functions lack type annotations? → A: Infer types from function name/context, generate tests with best-guess types
- Q: What should happen when Prettier formatting fails? → A: Write unformatted code with warning in output

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Code Validator Ensures Generated Code Quality (Priority: P1)

A developer needs the compiler to validate AI-generated JavaScript code before it is written to the output directory. The validation pipeline checks syntax correctness, ensures the code is pure (no side effects), and verifies it follows linting best practices. This prevents invalid or impure code from entering the codebase.

**Why this priority**: Without validation, AI-generated code could contain syntax errors, side effects, or quality issues that break the application. Validation is the safety gate between AI transformation and code generation, ensuring only correct, pure code is produced.

**Independent Test**: Can be fully tested by providing a snippet of JavaScript code to the validator and verifying it returns correct validation results (pass/fail with specific error details). Delivers the ability to catch errors in AI-generated code before output.

**Acceptance Scenarios**:

1. **Given** valid JavaScript code with correct syntax, **When** the syntax checker validates it, **Then** it returns success with no syntax errors
2. **Given** JavaScript code with syntax errors, **When** the syntax checker validates it, **Then** it returns failure with line/column information and error description
3. **Given** pure JavaScript code with no side effects, **When** the purity checker validates it, **Then** it returns success confirming the code is pure
4. **Given** JavaScript code with side effects (console.log, file I/O, mutations), **When** the purity checker validates it, **Then** it returns failure identifying the impure operations
5. **Given** JavaScript code that violates linting rules, **When** the linter validates it, **Then** it returns warnings or errors with specific rule violations
6. **Given** the full validation pipeline runs, **When** all checks pass, **Then** the code is marked as validated and ready for generation

---

### User Story 2 - Code Generator Writes Validated Code to Output (Priority: P1)

A developer needs the compiler to write validated JavaScript code to the output directory with proper formatting, module structure, and documentation. The generator handles both CommonJS and ES Module formats, integrates with Prettier for consistent formatting, and adds JSDoc comments.

**Why this priority**: Code generation is the final step that produces usable output. Without it, validated code remains in memory with no tangible artifact. Generation creates the actual JavaScript files that developers can use, import, and deploy.

**Independent Test**: Can be fully tested by providing validated JavaScript code and verifying the generator writes correctly formatted files to the output directory with proper module exports and JSDoc comments. Delivers the ability to produce usable JavaScript modules.

**Acceptance Scenarios**:

1. **Given** validated JavaScript code, **When** the code generator writes it, **Then** the output file is created in the correct output directory
2. **Given** the project is configured for CommonJS, **When** generating output, **Then** the code uses module.exports and require() syntax
3. **Given** the project is configured for ES Modules, **When** generating output, **Then** the code uses export and import syntax
4. **Given** validated code with function signatures, **When** generating output, **Then** JSDoc comments are added with parameter types and return types
5. **Given** output code needs formatting, **When** the generator writes it, **Then** the code is formatted according to Prettier configuration
6. **Given** multiple modules are being generated, **When** the generator writes them, **Then** cross-module imports are correctly resolved

---

### User Story 3 - Test Generator Creates Automated Tests (Priority: P2)

A developer needs the compiler to automatically generate Jest test suites for compiled functions. The test generator extracts function signatures, creates tests for edge cases, validates types, and generates example-based tests from Gherkin examples.

**Why this priority**: While not required for basic compilation, test generation significantly improves code quality and developer confidence. It automates the tedious task of writing boilerplate tests and ensures generated code has baseline test coverage.

**Independent Test**: Can be fully tested by providing compiled JavaScript code with JSDoc annotations and verifying the test generator creates a valid Jest test file with appropriate test cases. Delivers the ability to automatically test generated implementations.

**Acceptance Scenarios**:

1. **Given** a compiled JavaScript function with JSDoc, **When** the test generator processes it, **Then** it creates a Jest test file with appropriate imports and describe blocks
2. **Given** a function with typed parameters, **When** generating tests, **Then** type validation tests are created (e.g., testing with wrong types throws errors)
3. **Given** Gherkin examples in the source, **When** generating tests, **Then** example-based tests are created using the example data
4. **Given** edge case scenarios are identifiable, **When** generating tests, **Then** edge case tests are created (empty inputs, boundary values, null/undefined)
5. **Given** multiple functions in a module, **When** generating tests, **Then** a single test file is created with test suites for each function

---

### Edge Cases

- What happens when syntax validation fails with multiple errors? → Report all errors up to max 10 per run
- How does the system handle code that is syntactically valid but has semantic issues?
- What happens when Prettier formatting fails due to configuration issues? → Write unformatted code with warning
- How does the system handle write permissions errors in the output directory?
- What happens when purity checking encounters advanced patterns (closures, higher-order functions)?
- How does the system handle ES Module syntax when configured for CommonJS (and vice versa)?
- What happens when test generation encounters functions without type annotations? → Infer types from function name/context and generate best-guess tests
- How does the system handle extremely large generated code files?
- What happens when the output directory doesn't exist?
- How does the system handle concurrent generation requests for the same file? → File locking serializes writes; second request waits
- What happens when validation fails? → Validation failures are never auto-fixed; the system returns detailed errors to the AI transformer for retry

## Requirements *(mandatory)*

### Functional Requirements

#### Syntax Validation
- **FR-001**: System MUST validate JavaScript syntax using a standard parser (esprima or babel)
- **FR-002**: System MUST support ES2020+ JavaScript syntax including optional chaining, nullish coalescing, and async/await
- **FR-003**: System MUST report syntax errors with line number, column number, and descriptive message
- **FR-003a**: System MUST report all syntax errors up to a maximum of 10 errors per validation run
- **FR-004**: System MUST validate both CommonJS and ES Module syntax

#### Purity Validation
- **FR-005**: System MUST detect and report side effects including console operations, file system access, network requests, and DOM manipulation
- **FR-006**: System MUST detect and report mutations of objects and arrays (forbid push, pop, splice, property assignment on non-local objects)
- **FR-007**: System MUST detect and report global state access or modification (window, global, process mutations)
- **FR-008**: System MUST allow pure functional patterns including closures, higher-order functions, and immutable operations (map, filter, reduce, spread operator)
- **FR-009**: System MUST provide clear error messages identifying the specific impure operation and its location

#### Lint Validation
- **FR-010**: System MUST validate code against configurable ESLint rules
- **FR-011**: System MUST enforce rules including no-var, prefer-const, prefer-arrow-callback, and no-unused-vars
- **FR-012**: System MUST report lint violations with severity (error/warning), rule name, and location
- **FR-013**: System MUST support project-specific ESLint configuration overrides

#### Validation Pipeline
- **FR-014**: System MUST orchestrate syntax, purity, and lint validation in correct order (syntax first, then purity, then lint)
- **FR-015**: System MUST aggregate all validation results into a unified report
- **FR-016**: System MUST fail fast on syntax errors (skip purity and lint if syntax fails)
- **FR-017**: System MUST return detailed validation results suitable for error reporting to developers
- **FR-017a**: System MUST NOT auto-fix any validation failures; all failures require AI retry with validation feedback

#### Code Generation
- **FR-018**: System MUST write validated JavaScript to the configured output directory
- **FR-019**: System MUST generate correct CommonJS exports (module.exports) when configured
- **FR-020**: System MUST generate correct ES Module exports (export default, named exports) when configured
- **FR-021**: System MUST resolve and generate correct import statements for cross-module dependencies
- **FR-022**: System MUST format output code using Prettier with project configuration
- **FR-022a**: System MUST write unformatted code with a warning when Prettier formatting fails
- **FR-023**: System MUST create output directories if they don't exist
- **FR-023a**: System MUST use file locking to serialize concurrent writes to the same output file
- **FR-024**: System MUST preserve original file structure in output (mapping .feature to .js)

#### JSDoc Generation
- **FR-025**: System MUST generate module-level JSDoc comments with @module tag
- **FR-026**: System MUST generate function-level JSDoc with @param, @returns, and @description tags
- **FR-027**: System MUST extract type information from Gherkin source or infer types from implementation
- **FR-028**: System MUST include @example sections when Gherkin examples are available

#### Test Generation
- **FR-029**: System MUST generate Jest test files for compiled modules
- **FR-030**: System MUST create describe blocks matching module and function structure
- **FR-031**: System MUST generate type validation tests for functions with typed parameters
- **FR-031a**: System MUST infer types from function name and context when explicit type annotations are missing
- **FR-032**: System MUST generate edge case tests (empty strings, zero values, null/undefined, boundary values)
- **FR-033**: System MUST generate example-based tests from Gherkin Examples tables
- **FR-034**: System MUST generate appropriate assertions based on expected return types
- **FR-035**: System MUST create test file names matching source file names (e.g., math.feature.js → math.test.js)

### Key Entities

- **Validation Result**: The output from the validation pipeline containing pass/fail status, list of errors/warnings, and metadata for each check type (syntax, purity, lint). Used to determine if code can proceed to generation.

- **Syntax Error**: A specific error from syntax validation containing error message, line number, column number, and source snippet. Provides actionable feedback for fixing code.

- **Purity Violation**: A specific error from purity checking containing violation type (mutation, side effect, global access), location, and the offending code pattern. Enables targeted fixes.

- **Lint Report**: Collection of lint violations with rule name, severity, location, and suggested fix. Supports both auto-fixable and manual-fix issues.

- **Generated Module**: The output JavaScript file containing validated code, JSDoc comments, and proper exports. Represents the final compilation artifact.

- **Test Suite**: The generated Jest test file containing imports, describe blocks, and test cases. Provides automated validation of generated code.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Syntax validation correctly identifies 100% of syntax errors in invalid JavaScript code
- **SC-002**: Purity checking correctly identifies 95% of side effects in impure code patterns
- **SC-003**: Validation pipeline completes in under 500ms for typical single-module validation
- **SC-004**: Generated code passes syntax validation in 100% of cases (we don't generate invalid code)
- **SC-005**: Generated code is correctly formatted according to project Prettier configuration
- **SC-006**: Generated test suites are valid Jest tests that can run without modification
- **SC-007**: Test generation produces tests that achieve 70%+ code coverage for generated functions
- **SC-008**: JSDoc comments are generated for 100% of exported functions with correct type annotations
- **SC-009**: Cross-module imports are correctly resolved in 100% of multi-file compilations

## Assumptions

- AI-generated code follows JavaScript ES2020+ syntax
- Projects have or can use a default Prettier configuration
- Jest is the testing framework for generated test files
- ESLint configuration is available or sensible defaults can be applied
- Output directory is writable and has sufficient disk space
- Generated code size is reasonable (under 1MB per module)
- Purity violations are limited to common patterns (console.log, fs, mutations) and exotic patterns may not be detected

## Dependencies

- AI Transformer output (from Phase 3: AI Transformation)
- Project configuration (from Phase 1: Core Components)
- Parsed Gherkin source with examples (from Phase 1: Core Components)
- Cache system for storing validation results (from Phase 1: Core Components)
- File system access for writing output files
- Prettier library for code formatting
- ESLint library for lint validation
- JavaScript parser (esprima or babel) for syntax validation and AST traversal

## Out of Scope

- AI transformation (handled by Phase 3: AI Transformation)
- Parsing GherkinLang source files (handled by Phase 1: Core Components)
- Cache key generation and storage (handled by Phase 1: Core Components)
- CLI interface for validation/generation commands (handled by CLI component)
- Watch mode file system monitoring (handled by CLI component)
- Documentation generation beyond JSDoc comments (handled separately if needed)
- Property-based testing (may be added in future phase)
- Custom assertion library support (Jest assertions only)
