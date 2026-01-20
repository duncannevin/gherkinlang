# Feature Specification: AI Transformation

**Feature Branch**: `001-ai-transformation`  
**Created**: 2026-01-19  
**Status**: Draft  
**Input**: User description: "Phase 3: AI Transformation - AI transformer with Claude API integration - MCP client and tools"

## Clarifications

### Session 2026-01-19

- Q: How are API authentication credentials managed and validated? → A: Environment variables only (API_KEY, MCP_SERVER_URL)
- Q: What retry and backoff strategy should be used for API rate limiting and transient failures? → A: Exponential backoff with jitter (2s base delay, max 3 retries)
- Q: How should the MCP client connect to the MCP server? → A: Local process (stdin/stdout communication)
- Q: How should the system handle AI responses that don't contain valid JavaScript code? → A: Retry once with clarification prompt, then fail (configurable)
- Q: What should happen when tool invocations exceed timeout limits? → A: Fail the tool invocation and fail the entire compilation

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AI Transforms GherkinLang Source to JavaScript (Priority: P1)

A developer needs the compiler to transform GherkinLang source code into JavaScript using AI-powered natural language interpretation. The AI transformer takes parsed source code, language rules, and project context, then generates pure functional JavaScript code that implements the intended behavior.

**Why this priority**: This is the core compilation capability. Without AI transformation, the compiler cannot produce output code, making all other components (parser, cache, context) meaningless. This is the essential value proposition of GherkinLang.

**Independent Test**: Can be fully tested by providing a simple .feature file with one scenario, language rules, and project context, then verifying the transformer produces valid JavaScript code that implements the scenario. Delivers the ability to compile GherkinLang source code.

**Acceptance Scenarios**:

1. **Given** parsed GherkinLang source code, language rules, and project context, **When** the AI transformer processes the source, **Then** it generates valid JavaScript code that implements the intended behavior
2. **Given** source code with multiple scenarios, **When** the AI transformer processes it, **Then** it generates JavaScript code with corresponding functions for each scenario
3. **Given** source code with cross-module dependencies, **When** the AI transformer processes it, **Then** it generates JavaScript code with correct import statements referencing dependent modules
4. **Given** language rules specify target-specific transformations, **When** the AI transformer processes source, **Then** it applies the correct rules for the target language
5. **Given** the AI transformation fails or times out, **When** the transformer handles the error, **Then** it reports a clear error message with context about what failed

---

### User Story 2 - MCP Client Enables Tool-Assisted Compilation (Priority: P1)

A developer needs the AI transformer to access external tools during compilation to validate code, check dependencies, read files, and perform other operations that improve compilation quality and accuracy.

**Why this priority**: Tool-assisted compilation enables the AI to verify its output, access project context, and make informed decisions. Without MCP client support, the AI cannot use tools, limiting compilation quality and preventing validation of generated code.

**Independent Test**: Can be fully tested by configuring the MCP client with available tools, then verifying the transformer can invoke tools during compilation and receive results. Delivers the ability to use external tools during compilation.

**Acceptance Scenarios**:

1. **Given** an MCP server is configured with available tools, **When** the MCP client connects, **Then** it discovers and registers all available tools
2. **Given** the AI transformer needs to validate generated code, **When** it invokes a validation tool via the MCP client, **Then** it receives validation results indicating code correctness
3. **Given** the AI transformer needs to read a dependent module file, **When** it invokes a file system tool via the MCP client, **Then** it receives the file contents
4. **Given** a tool invocation fails, **When** the MCP client handles the error, **Then** it reports the error to the transformer without crashing the compilation
5. **Given** multiple tools are invoked sequentially, **When** the MCP client processes them, **Then** it maintains proper state and returns results in the correct order

---

### User Story 3 - MCP Tools Provide Compilation Support Services (Priority: P2)

A developer needs specific tools available during compilation to validate generated code, check dependencies, read project files, and generate tests. These tools improve compilation quality and enable the AI to make better decisions.

**Why this priority**: While the MCP client infrastructure is critical (P1), the specific tools are supporting capabilities that enhance compilation quality. They enable validation, dependency checking, and other quality improvements but are not strictly required for basic compilation to work.

**Independent Test**: Can be fully tested by implementing one tool (e.g., code analyzer), then verifying the transformer can invoke it and receive meaningful results. Delivers the ability to validate and improve compilation quality.

**Acceptance Scenarios**:

1. **Given** a code analyzer tool is available, **When** the AI transformer invokes it with generated JavaScript code, **Then** it receives syntax validation results and purity checks
2. **Given** a dependency checker tool is available, **When** the AI transformer invokes it with a package name, **Then** it receives information about whether the package exists and is available
3. **Given** a file system tool is available, **When** the AI transformer invokes it to read a project file, **Then** it receives the file contents for use in compilation
4. **Given** a test generator tool is available, **When** the AI transformer invokes it with generated code, **Then** it receives test code that can validate the generated implementation
5. **Given** a tool receives invalid input, **When** the tool processes it, **Then** it returns a clear error message explaining what was wrong

---

### Edge Cases

- What happens when the AI API is unavailable or returns an error?
- How does system handle AI responses that don't contain valid JavaScript code? → Retries once with clarification prompt (configurable), then fails with error
- What happens when tool invocations exceed timeout limits? → Tool invocation fails and entire compilation fails with timeout error
- How does system handle MCP server connection failures?
- What happens when tools return unexpected response formats?
- How does system handle rate limiting from the AI API?
- What happens when generated code is too large for API response limits?
- How does system handle partial tool invocation failures in a multi-tool workflow?
- What happens when project context is incomplete or missing required information?
- How does system handle concurrent compilation requests that share the same MCP client?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST transform GherkinLang source code into JavaScript using AI-powered natural language interpretation
- **FR-002**: System MUST construct compilation prompts that include source code, language rules, and project context
- **FR-003**: System MUST call the AI API with properly formatted requests including system prompts, user prompts, and available tools
- **FR-022**: System MUST read authentication credentials from environment variables (API_KEY for Claude API, MCP_SERVER_URL for MCP server connection)
- **FR-004**: System MUST extract generated JavaScript code from AI API responses
- **FR-024**: System MUST handle AI responses that don't contain valid JavaScript code by retrying once with a clarification prompt, then failing with a clear error message (retry behavior configurable)
- **FR-005**: System MUST handle AI API responses that include tool invocation requests
- **FR-006**: System MUST execute tool invocations requested by the AI and return results
- **FR-007**: System MUST support multi-turn conversations with the AI when tool invocations are required
- **FR-008**: System MUST handle AI API errors and timeouts gracefully with clear error messages
- **FR-023**: System MUST retry failed API calls using exponential backoff with jitter (2s base delay, maximum 3 retries) for rate limiting and transient errors
- **FR-009**: System MUST track transformation metadata (model used, tokens consumed, duration)
- **FR-010**: System MUST connect to MCP server via local process (stdin/stdout communication) and discover available tools
- **FR-011**: System MUST register available tools with the AI transformer for use during compilation
- **FR-012**: System MUST invoke MCP tools when requested by the AI transformer
- **FR-013**: System MUST return tool results to the AI transformer in the expected format
- **FR-014**: System MUST handle tool invocation errors without crashing the compilation process
- **FR-025**: System MUST fail the entire compilation when tool invocations exceed timeout limits (5 seconds per tool)
- **FR-015**: System MUST support concurrent tool invocations when multiple tools are needed
- **FR-016**: System MUST provide a code analyzer tool that validates JavaScript syntax and purity
- **FR-017**: System MUST provide a dependency checker tool that verifies package availability
- **FR-018**: System MUST provide a file system tool that reads project files for cross-module references
- **FR-019**: System MUST provide a test generator tool that creates test code for generated implementations
- **FR-020**: System MUST handle tool input validation and return clear errors for invalid inputs
- **FR-021**: System MUST support tool configuration and customization per project needs

### Key Entities *(include if feature involves data)*

- **Compilation Prompt**: The structured input sent to the AI API containing system instructions (language rules), user request (source code to compile), and available tools. Guides the AI in generating correct JavaScript output.

- **Transform Result**: The output from AI transformation containing generated JavaScript code, metadata (model, tokens, duration), and any tool calls made during compilation. Used for validation, caching, and error reporting.

- **Tool Invocation**: A request from the AI to execute a specific tool with parameters. Contains tool name, input parameters, and expected result format. Processed by the MCP client and returned to the AI.

- **MCP Tool**: A registered capability available during compilation that can be invoked by the AI. Contains tool name, description, parameter schema, and execution logic. Examples include code analyzer, dependency checker, file system reader.

- **AI API Response**: The response from the AI API containing generated code, tool invocation requests, or error information. May require multiple round-trips when tools are invoked.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: AI transformer successfully generates valid JavaScript code for 95% of valid GherkinLang source files on first attempt
- **SC-002**: Compilation completes in under 30 seconds for typical single-file transformations (excluding API latency)
- **SC-003**: Generated JavaScript code passes syntax validation in 98% of successful compilations
- **SC-004**: MCP client successfully connects and discovers tools within 2 seconds of initialization
- **SC-005**: Tool invocations complete within 5 seconds for standard operations (file reads, code analysis)
- **SC-006**: Multi-turn compilation workflows (with tool invocations) complete successfully for 90% of cases requiring tools
- **SC-007**: Error handling provides clear, actionable error messages in 100% of failure cases
- **SC-008**: System handles API rate limiting gracefully, using exponential backoff with jitter (2s base delay, max 3 retries), and completing 95% of compilations despite transient rate limits
- **SC-009**: Transformation metadata is accurately tracked and available for all compilation operations

## Assumptions

- AI API (Claude) is available and accessible with valid authentication credentials provided via environment variables (API_KEY, MCP_SERVER_URL)
- MCP server is available as a local process and properly configured with required tools
- Network connectivity is reliable for API calls and MCP server communication
- Language rules are comprehensive enough for the AI to generate correct code
- Project context provides sufficient information for cross-module compilation
- Generated code size is within API response limits (typically under 100KB per response)
- Tool responses are returned in a timely manner (under 5 seconds for standard operations)
- AI API supports tool calling capabilities as required
- Rate limits are reasonable and allow for typical compilation workloads

## Dependencies

- Language rules loaded and available (from Phase 1: Core Components)
- Parsed source code from Gherkin parser (from Phase 1: Core Components)
- Project context with dependency information (from Phase 1: Core Components)
- Cache system for storing transformation results (from Phase 1: Core Components)
- AI API access (Claude API) with authentication
- MCP server implementation with tool support
- Network connectivity for API calls

## Out of Scope

- AI model training or fine-tuning
- Custom AI model development
- MCP server implementation (assumed to exist)
- Tool implementation details beyond interface requirements
- Code validation and linting (handled by separate validation component)
- Code formatting and generation (handled by separate generation component)
- Error recovery strategies beyond basic retry logic
- Compilation result caching (handled by Phase 1: Core Components)
- CLI interface for compilation (handled by separate component)
