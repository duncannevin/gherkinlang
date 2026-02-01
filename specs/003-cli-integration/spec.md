# Feature Specification: CLI & Integration

**Feature Branch**: `003-cli-integration`  
**Created**: 2026-01-30  
**Status**: Draft  
**Input**: User description: "Phase 5: CLI & Integration - Compile command, Watch command, Init command"

## Clarifications

### Session 2026-01-30

- Q: When compiling multiple files, should compile stop at first error or continue? → A: Continue compiling all files, collect all errors, report at end
- Q: When a file changes in watch mode, should dependent files also be recompiled? → A: Recompile changed file and all files that import it (dependents)
- Q: How far up the directory tree should CLI search for .gherkinrc.json? → A: Search up to filesystem root, stop at first config found

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compile Command Transforms Feature Files to JavaScript (Priority: P1)

A developer needs to compile one or more GherkinLang .feature files into JavaScript modules using a simple command-line interface. The compile command orchestrates the full pipeline: parsing, AI transformation, validation, and code generation. It provides clear progress feedback and reports success or failure with actionable error messages.

**Why this priority**: The compile command is the core functionality that enables developers to use GherkinLang. Without it, there is no way to transform .feature files into usable JavaScript code. This is the primary use case for the entire compiler.

**Independent Test**: Can be fully tested by running `gherkin compile features/example.feature` and verifying it produces a valid JavaScript file in the output directory with correct module exports. Delivers the ability to compile GherkinLang to JavaScript.

**Acceptance Scenarios**:

1. **Given** a valid .feature file exists, **When** the user runs `gherkin compile <file>`, **Then** the file is compiled and JavaScript is written to the output directory
2. **Given** multiple .feature files are specified, **When** the user runs `gherkin compile <file1> <file2>`, **Then** all files are compiled in dependency order
3. **Given** a directory path is specified, **When** the user runs `gherkin compile <dir>`, **Then** all .feature files in the directory (recursively) are compiled
4. **Given** the --output option is provided, **When** the user runs `gherkin compile --output ./lib <file>`, **Then** output is written to the specified directory instead of the default
5. **Given** the --format option is provided, **When** the user runs `gherkin compile --format esm <file>`, **Then** output uses ES Module syntax instead of CommonJS
6. **Given** the --no-cache option is provided, **When** the user runs `gherkin compile --no-cache <file>`, **Then** the cache is bypassed and fresh compilation occurs
7. **Given** compilation fails due to validation errors, **When** the compile command runs, **Then** clear error messages are displayed with line numbers and suggestions
8. **Given** compilation succeeds, **When** the compile command completes, **Then** a summary is displayed showing files compiled, time taken, and cache hits

---

### User Story 2 - Watch Command Enables Development Workflow (Priority: P2)

A developer making iterative changes to .feature files needs the compiler to automatically detect changes and recompile affected files. The watch command monitors directories, debounces rapid changes, and performs incremental builds using the cache system. It provides real-time feedback as files are modified.

**Why this priority**: While not required for basic compilation, watch mode significantly improves the development experience by eliminating manual recompilation. This enables a tight feedback loop during feature development.

**Independent Test**: Can be fully tested by running `gherkin watch features/`, modifying a .feature file, and verifying the file is automatically recompiled within 500ms. Delivers the ability to iterate rapidly during development.

**Acceptance Scenarios**:

1. **Given** a directory is being watched, **When** the user runs `gherkin watch <dir>`, **Then** the command starts monitoring and displays a "watching" status message
2. **Given** the watch command is running, **When** a .feature file is modified, **Then** the file is automatically recompiled and results are displayed
3. **Given** the watch command is running, **When** a new .feature file is created, **Then** the file is detected and compiled
4. **Given** the watch command is running, **When** a .feature file is deleted, **Then** a message indicates the file was removed (output file is not automatically deleted)
5. **Given** rapid file changes occur (save multiple times quickly), **When** the debounce period elapses, **Then** only one compilation occurs for the latest version
6. **Given** the --initial option is provided, **When** the user runs `gherkin watch --initial <dir>`, **Then** all files are compiled before watching begins
7. **Given** compilation fails in watch mode, **When** errors occur, **Then** errors are displayed but watching continues (does not exit)
8. **Given** the user presses Ctrl+C, **When** in watch mode, **Then** the watcher gracefully shuts down and displays a summary

---

### User Story 3 - Init Command Creates New Projects (Priority: P2)

A developer starting a new GherkinLang project needs a quick way to scaffold the project structure with configuration files, directories, and example feature files. The init command provides interactive prompts or accepts options to customize the project setup based on the project type (library, API, application).

**Why this priority**: While developers can manually create projects, the init command significantly reduces onboarding friction and ensures projects follow best practices. It helps new users get started quickly with a working example.

**Independent Test**: Can be fully tested by running `gherkin init my-project` in an empty directory and verifying it creates the expected directory structure, configuration file, and example .feature file. Delivers the ability to quickly start new GherkinLang projects.

**Acceptance Scenarios**:

1. **Given** an empty directory, **When** the user runs `gherkin init`, **Then** a .gherkinrc.json configuration file is created with sensible defaults
2. **Given** the init command runs, **When** no template is specified, **Then** the user is prompted to choose a template (basic, library, api)
3. **Given** the --template option is provided, **When** the user runs `gherkin init --template library`, **Then** the project is scaffolded using the library template without prompts
4. **Given** the basic template is selected, **When** init completes, **Then** a simple example.feature file is created demonstrating basic syntax
5. **Given** the library template is selected, **When** init completes, **Then** example files demonstrate module exports and function definitions
6. **Given** the api template is selected, **When** init completes, **Then** example files demonstrate request/response handling patterns
7. **Given** a project name is provided, **When** the user runs `gherkin init my-project`, **Then** a new directory is created with that name containing the project
8. **Given** the directory already contains .gherkinrc.json, **When** init runs, **Then** the user is warned and prompted to confirm before overwriting
9. **Given** the --yes option is provided, **When** init runs, **Then** all prompts are skipped using default values

---

### User Story 4 - CLI Entry Point Provides Unified Interface (Priority: P1)

A developer needs a single entry point (`gherkin`) that routes to appropriate subcommands (compile, watch, init, etc.). The CLI provides help text, version information, and consistent argument parsing across all commands.

**Why this priority**: The CLI entry point is required for any command to work. It provides the user-facing interface that ties all functionality together and ensures a consistent developer experience.

**Independent Test**: Can be fully tested by running `gherkin --help` and verifying it displays available commands with descriptions. Delivers the ability to discover and use all CLI functionality.

**Acceptance Scenarios**:

1. **Given** the user runs `gherkin`, **When** no command is provided, **Then** help text is displayed showing available commands
2. **Given** the user runs `gherkin --version`, **When** executed, **Then** the current version number is displayed
3. **Given** the user runs `gherkin --help`, **When** executed, **Then** detailed help text is displayed with all commands and global options
4. **Given** the user runs `gherkin <command> --help`, **When** executed, **Then** command-specific help is displayed with options and examples
5. **Given** an unknown command is provided, **When** the user runs `gherkin unknown`, **Then** an error message is displayed with suggestions for similar commands
6. **Given** invalid options are provided, **When** the user runs a command, **Then** a clear error message indicates which option is invalid

---

### Edge Cases

- What happens when compile is run without any file arguments? → Display usage help and exit with error
- How does the system handle files that don't exist? → Clear error message indicating file not found
- What happens when watch is started on a directory that doesn't exist? → Error message and exit (no silent failure)
- How does the system handle permission errors when writing output? → Clear error message with the specific path and permission issue
- What happens when init is run in a non-empty directory without a config file? → Proceed but warn about existing files that may be overwritten
- How does the system handle SIGINT (Ctrl+C) during long-running compilation? → Graceful shutdown with cleanup and summary of completed work
- What happens when the configuration file has invalid JSON? → Clear parsing error with line number
- How does the system handle circular dependencies detected during multi-file compilation? → Report error with the dependency cycle path
- What happens when a .feature file imports a module that hasn't been compiled yet? → Compile dependencies first (topological sort)
- How does the system handle when the AI service is unavailable? → Retry with exponential backoff, then fail with clear message

## Requirements *(mandatory)*

### Functional Requirements

#### CLI Entry Point
- **FR-001**: System MUST provide a `gherkin` command as the main entry point
- **FR-002**: System MUST support subcommands: compile, watch, init, cache, validate, test
- **FR-003**: System MUST display help text when run without arguments or with --help
- **FR-004**: System MUST display version information when run with --version
- **FR-005**: System MUST provide command-specific help when `<command> --help` is used
- **FR-006**: System MUST return appropriate exit codes (0 for success, non-zero for errors)
- **FR-007**: System MUST load configuration from .gherkinrc.json by searching current directory, then parent directories up to filesystem root, stopping at first config found

#### Compile Command
- **FR-010**: System MUST accept file paths and directory paths as arguments
- **FR-011**: System MUST recursively discover .feature files when given a directory
- **FR-012**: System MUST compile files in dependency order using topological sort
- **FR-013**: System MUST support --output option to specify output directory
- **FR-014**: System MUST support --format option with values: commonjs, esm
- **FR-015**: System MUST support --no-cache option to bypass compilation cache
- **FR-016**: System MUST support --no-tests option to skip test generation
- **FR-017**: System MUST support --target option to specify target language (javascript, elixir)
- **FR-018**: System MUST display progress during compilation (files processed, current file)
- **FR-019**: System MUST display summary on completion (files compiled, cache hits, errors, time)
- **FR-020**: System MUST display clear error messages with file path, line number, and description
- **FR-020a**: System MUST continue compiling remaining files when one file fails, collecting all errors and reporting them at the end
- **FR-021**: System MUST support --verbose option for detailed output including AI transformer logs
- **FR-022**: System MUST support --quiet option to suppress non-error output

#### Watch Command
- **FR-030**: System MUST monitor specified directory for file system changes
- **FR-031**: System MUST detect file creation, modification, and deletion events
- **FR-031a**: System MUST recompile changed files and all files that depend on them (import the changed file)
- **FR-032**: System MUST debounce rapid changes using configurable delay (default 100ms)
- **FR-033**: System MUST ignore configured directories (node_modules, dist, .gherkin-cache by default)
- **FR-034**: System MUST support --initial option to compile all files before watching
- **FR-035**: System MUST continue watching after compilation errors (display error, keep running)
- **FR-036**: System MUST gracefully shutdown on SIGINT/SIGTERM signals
- **FR-037**: System MUST display real-time feedback when files change and compile
- **FR-038**: System MUST support all compile options (--output, --format, --target, etc.)

#### Init Command
- **FR-040**: System MUST create .gherkinrc.json with sensible defaults
- **FR-041**: System MUST support --template option with values: basic, library, api
- **FR-042**: System MUST prompt for template selection when not specified (unless --yes)
- **FR-043**: System MUST create features/ directory with example .feature files based on template
- **FR-044**: System MUST create output directories specified in configuration
- **FR-045**: System MUST warn before overwriting existing configuration files
- **FR-046**: System MUST support --yes option to accept all defaults without prompts
- **FR-047**: System MUST support project name argument to create project in new directory
- **FR-048**: System MUST display next steps after successful initialization

#### Progress and Logging
- **FR-050**: System MUST use color-coded output for success (green), warning (yellow), error (red)
- **FR-051**: System MUST support --no-color option to disable colored output
- **FR-052**: System MUST display spinners or progress indicators for long-running operations
- **FR-053**: System MUST respect CI environment (auto-disable colors and spinners in CI)
- **FR-054**: System MUST log errors to stderr and normal output to stdout

### Key Entities

- **CLI Configuration**: Settings loaded from .gherkinrc.json that configure compilation behavior, output paths, cache settings, and watch mode options. Merged with command-line options where CLI options take precedence.

- **Command Context**: The runtime context for a command including parsed arguments, resolved configuration, logger instance, and signal handlers. Passed to command handlers for consistent behavior.

- **Compilation Result**: The outcome of compiling one or more files including success/failure status, output file paths, errors/warnings, cache hits, and timing information.

- **Watch Event**: A file system event (create, modify, delete) with debounce tracking. Contains the file path, event type, and timestamp.

- **Project Template**: A predefined project structure including .gherkinrc.json content, example .feature files, and directory structure. Templates: basic (minimal), library (function exports), api (request/response patterns).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can compile a single .feature file with `gherkin compile` in under 10 seconds for typical files (excluding AI processing time)
- **SC-002**: Watch mode detects and starts recompilation within 200ms of file save
- **SC-003**: Init command creates a working project structure in under 2 seconds
- **SC-004**: CLI provides help text that enables new users to run their first compilation without reading external documentation
- **SC-005**: Error messages are clear enough that 90% of users can fix issues without searching for solutions
- **SC-006**: Progress feedback is updated at least once per second during long compilations
- **SC-007**: Watch mode correctly handles 100 file changes in rapid succession without memory leaks or crashes
- **SC-008**: Exit codes correctly indicate success (0) or failure (1) for all commands

## Assumptions

- Node.js 18+ is available in the user's environment
- Users have basic familiarity with command-line tools
- Terminal supports ANSI color codes (or --no-color is used)
- File system events are reliable on the target platform (macOS, Linux, Windows)
- Configuration file changes are infrequent compared to source file changes
- Projects typically have fewer than 200 .feature files
- Debounce delay of 100ms is suitable for most development workflows

## Dependencies

- Core Components (Phase 1): Parser, Project Context, Cache System, Configuration
- AI Transformation (Phase 3): AI Transformer for compiling .feature to JavaScript
- Validation & Generation (Phase 4): Validator, Code Generator, Test Generator
- File system access for reading source files and writing output
- File system watching capability (chokidar or similar)
- Terminal input/output with color support (chalk, ora, or similar)
- Command-line argument parsing (commander, yargs, or similar)

## Out of Scope

- GUI or web-based interface (CLI only)
- Language server protocol (LSP) integration
- Remote compilation or cloud build services
- Package publishing commands (npm publish workflows)
- IDE plugins or extensions
- Test running (the `test` command is a separate feature)
- Cache management (the `cache` command is a separate feature)
- Validation without compilation (the `validate` command is a separate feature)
