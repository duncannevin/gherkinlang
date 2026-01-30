# Research: AI Transformation

**Feature**: AI Transformation  
**Date**: 2026-01-19  
**Phase**: 0 - Outline & Research

## Overview

Research for implementing AI transformation engine with Claude API integration and MCP (Model Context Protocol) client support. The AI transformer processes GherkinLang source code using natural language rules to generate pure functional JavaScript, with tool-assisted compilation enabled through MCP client.

## Research Tasks & Findings

### 1. Claude API Integration and SDK

**Task**: Determine Claude API SDK and integration patterns for Node.js

**Decision**: Use official `@anthropic-ai/sdk` package for Claude API integration:
- Official TypeScript/JavaScript SDK from Anthropic
- Supports multi-turn conversations with messages array
- Automatic HTTP header handling (x-api-key, anthropic-version, content-type)
- Built-in support for tool calling (tools parameter in messages.create)
- Supports streaming responses if needed
- Reads API key from `ANTHROPIC_API_KEY` environment variable by default

**Rationale**: 
- Official SDK is well-maintained and officially supported
- Simplifies API interaction (no manual HTTP requests needed)
- Handles authentication, headers, and error handling automatically
- Supports tool calling required for MCP integration
- TypeScript types available for better development experience

**Alternatives Considered**:
- Direct HTTP requests with fetch/axios: Rejected - adds complexity, SDK handles authentication and headers automatically
- Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`): Considered but standard SDK is sufficient for our use case, Agent SDK is for more complex agent workflows

**Implementation Notes**:
- Install: `npm install @anthropic-ai/sdk`
- Initialize client: `new Anthropic({ apiKey: process.env.API_KEY })`
- Call API: `client.messages.create({ model, messages, tools, max_tokens, temperature: 0.0 })`
- Handle responses: Extract `content` array from response, look for tool calls in `content` with `type: 'tool_use'`
- Track metadata: `response.usage` (input_tokens, output_tokens), response model, duration
- Error handling: Catch APIError, RateLimitError, and handle with exponential backoff

---

### 2. MCP Protocol Implementation for Local Process Communication

**Task**: Determine MCP implementation approach for local process (stdin/stdout) communication

**Decision**: Use MCP protocol over stdio (stdin/stdout) with JSON-RPC 2.0:
- Communication via JSON-RPC 2.0 over process standard input/output
- Newline-delimited JSON messages (no embedded newlines)
- Client spawns server as subprocess, writes to stdin, reads from stdout
- Server reads from stdin, writes responses to stdout
- Logging/diagnostics must go to stderr (not stdout)

**Rationale**:
- Standard MCP transport pattern for local processes
- No network dependencies - simple subprocess communication
- JSON-RPC 2.0 is well-understood protocol
- Fits our use case (local MCP server with tools)

**Alternatives Considered**:
- HTTP/WebSocket transport: Rejected - adds network complexity, local process is sufficient
- Custom protocol: Rejected - JSON-RPC 2.0 is standard and well-documented
- Official MCP TypeScript SDK: Considered but we can implement basic client ourselves for Phase 1

**Implementation Notes**:
- Use Node.js `child_process.spawn()` to start MCP server subprocess
- Use `readline` interface to read newline-delimited messages from stdout
- Send messages by writing JSON-stringified objects + newline to stdin
- MCP protocol steps:
  1. Initialize: `{ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion, clientInfo, capabilities } }`
  2. List tools: `{ jsonrpc: "2.0", id: 2, method: "tools/list" }`
  3. Call tool: `{ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name, arguments } }`
  4. Shutdown: `{ jsonrpc: "2.0", id: 4, method: "shutdown" }`
- Handle responses: Parse JSON from stdout, match by request id
- Error handling: Parse error responses, timeout handling (5 seconds per tool)
- Keep subprocess alive during compilation, cleanup on completion

---

### 3. Tool Invocation and Response Handling

**Task**: Determine how to integrate MCP tools with Claude API tool calling

**Decision**: Bridge MCP tool invocations with Claude API tool definitions:
- Register MCP tools with Claude API by converting MCP tool schemas to Claude tool format
- When Claude requests tool use, map to MCP tool invocation
- Invoke MCP tool via client, get response, return to Claude as tool result
- Support multi-turn conversations: Claude → tool → Claude → tool → Claude → final code

**Rationale**:
- Claude API supports tool calling natively (tools parameter)
- MCP provides the actual tool implementations
- Bridge pattern allows using MCP tools with Claude API seamlessly
- Multi-turn support enables iterative refinement and validation

**Alternatives Considered**:
- Pre-process all tool calls before Claude: Rejected - AI decides which tools to use dynamically
- Post-process tool calls after Claude: Rejected - tools need to inform Claude's decision-making
- Custom tool protocol: Rejected - use standard MCP and Claude tool calling

**Implementation Notes**:
- Convert MCP tool schema to Claude tool format:
  - MCP: `{ name, description, inputSchema }`
  - Claude: `{ name, description, input_schema: { type: "object", properties: {...}, required: [...] } }`
- Tool invocation flow:
  1. Claude returns tool_use in response content
  2. Extract tool name and arguments
  3. Call MCP client tool invocation
  4. Get tool result
  5. Add tool result to messages array (role: 'user', content: [{ type: 'tool_result', tool_use_id, content }])
  6. Continue conversation with Claude
- Timeout handling: 5 seconds per tool, fail entire compilation on timeout
- Error handling: Return error in tool_result, let Claude handle or retry

---

### 4. Exponential Backoff with Jitter Implementation

**Task**: Determine retry strategy implementation for API rate limiting and transient errors

**Decision**: Implement exponential backoff with jitter:
- Base delay: 2 seconds
- Maximum retries: 3 attempts
- Formula: `delay = (2^attempt) * baseDelay + jitter`
- Jitter: Random value between 0 and baseDelay (reduces thundering herd)
- Retry on: RateLimitError, timeout errors, 5xx server errors
- Don't retry on: 4xx client errors (except rate limit), authentication errors

**Rationale**:
- Exponential backoff prevents overwhelming API during rate limits
- Jitter spreads out retry attempts (avoids synchronized retries)
- 3 retries is reasonable balance (not too aggressive, not too passive)
- 2s base delay is standard starting point

**Alternatives Considered**:
- Fixed delay retry: Rejected - doesn't scale well, exponential is standard
- Linear backoff: Rejected - exponential is better for rate limiting scenarios
- No retry: Rejected - transient errors are common, retry improves success rate

**Implementation Notes**:
- Calculate delay: `Math.pow(2, attempt) * 2000 + Math.random() * 2000`
- Use `setTimeout` or async delay for retry wait
- Track retry count and max retries
- After max retries, fail with clear error message
- Log retry attempts for debugging

---

### 5. Prompt Construction for Compilation

**Task**: Determine how to construct effective compilation prompts for Claude API

**Decision**: Multi-part prompt structure:
- **System message**: Role definition ("You are a compiler for GherkinLang...") + full rules.md content
- **User message**: Compilation request with source code, project context, and target language
- **Tools**: List of available tools (converted from MCP tools)
- **Temperature**: 0.0 for deterministic code generation (constitution requirement)
- **Max tokens**: Configurable, default based on expected output size

**Rationale**:
- System message sets context and rules (AI interprets rules faithfully)
- User message provides specific compilation task
- Tools enable AI to validate, check dependencies, read files
- Temperature 0.0 ensures deterministic outputs (supports caching)

**Alternatives Considered**:
- Single prompt with everything: Rejected - system/user separation is clearer for AI
- Separate prompts for rules: Rejected - rules should be part of system context
- Temperature > 0.0: Rejected - violates constitution requirement for deterministic builds

**Implementation Notes**:
- System prompt structure:
  ```
  "You are a compiler for GherkinLang, a programming language where compilation rules are expressed in natural language. 
  
  Language Rules:
  [Full rules.md content]
  
  Your task is to transform GherkinLang source code into pure functional JavaScript following these rules exactly."
  ```
- User prompt structure:
  ```
  "Compile this GherkinLang source code to JavaScript:
  
  [Source code]
  
  Project context:
  [Dependencies, module information]
  
  Target: JavaScript (ES2020+)"
  ```
- Include available tools in messages.create `tools` parameter
- Track prompt construction time for metadata

---

### 6. Code Extraction from AI Responses

**Task**: Determine how to extract JavaScript code from Claude API responses

**Decision**: Parse response content for code blocks:
- Claude may return code in markdown code blocks: ` ```javascript ... ``` `
- Claude may return code directly in text content
- Search for code blocks with language identifier (javascript, js)
- Extract code between code fence markers
- If no code blocks found, check if entire response is valid JavaScript
- Validate extracted code is valid JavaScript syntax

**Rationale**:
- AI often formats code in markdown code blocks
- Need to handle both formatted and unformatted responses
- Validation ensures we extract actual JavaScript code

**Alternatives Considered**:
- Always expect code blocks: Rejected - AI may return unformatted code
- Never expect code blocks: Rejected - AI often formats code nicely
- Use regex to find code: Rejected - parsing markdown is more reliable

**Implementation Notes**:
- Regex pattern: `/```(?:javascript|js)?\n([\s\S]*?)```/`
- If no code blocks, check if response.trim() is valid JavaScript
- Parse with esprima/@babel/parser to validate syntax
- If invalid JavaScript, retry once with clarification prompt (configurable)
- If still invalid after retry, fail with clear error

---

### 7. Transformation Metadata Tracking

**Task**: Determine what metadata to track for transformation operations

**Decision**: Track comprehensive metadata for all transformations:
- Model used (e.g., "claude-sonnet-4-5")
- Token usage (input_tokens, output_tokens from response.usage)
- Duration (wall-clock time from start to end)
- Tool invocations (tool names, invocation count, duration)
- Retry attempts (if retries occurred)
- Cache hit/miss status

**Rationale**:
- Metadata enables monitoring, debugging, and cost tracking
- Token usage helps understand API costs
- Duration helps identify performance issues
- Tool invocation tracking shows tool usage patterns

**Alternatives Considered**:
- Minimal metadata (just model): Rejected - insufficient for debugging and monitoring
- Extensive metadata (including full prompts): Rejected - too verbose, keep essential info

**Implementation Notes**:
- Start timer at transformation start
- Track all tool invocations with timestamps
- Extract metadata from Claude API response
- Include in TransformResult object
- Pass to cache system for storage
- Don't store in separate database (metadata is transient, cache handles persistence)

---

### 8. Error Handling and Recovery Strategies

**Task**: Determine error handling approach for AI transformation failures

**Decision**: Comprehensive error handling with clear messages:
- **API errors**: RateLimitError → retry with exponential backoff, APIError → fail with error details
- **Invalid code response**: Retry once with clarification prompt (configurable), then fail
- **Tool invocation failures**: Fail tool invocation, fail entire compilation (timeout = 5s)
- **MCP connection failures**: Fail with clear error about MCP server not available
- **Timeout errors**: Fail with timeout error message

**Rationale**:
- Clear error messages help developers fix issues
- Retry logic handles transient errors
- Fail-fast on non-recoverable errors
- Constitution requires graceful degradation

**Alternatives Considered**:
- Always retry on errors: Rejected - some errors are non-recoverable (auth, invalid input)
- Never retry: Rejected - transient errors (rate limits) should be retried
- Continue on tool failures: Rejected - tools are critical for quality, failures should fail compilation

**Implementation Notes**:
- Categorize errors: recoverable (rate limit, timeout) vs non-recoverable (auth, invalid)
- Retry only recoverable errors
- Include context in error messages: what failed, why it failed, how to fix
- Don't expose internal details (API keys, internal paths)
- Log errors to stderr for debugging

---

## Technology Choices Summary

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Claude API Client | `@anthropic-ai/sdk` | Official SDK, supports tool calling, handles auth |
| MCP Communication | JSON-RPC 2.0 over stdio | Standard protocol, local process communication |
| Subprocess Management | Node.js `child_process.spawn()` | Built-in, no dependencies |
| Message Parsing | `readline` interface | Handles newline-delimited JSON |
| Retry Logic | Custom exponential backoff with jitter | Standard pattern for rate limiting |
| Code Extraction | Regex + AST validation | Handles markdown code blocks and raw code |
| Metadata Tracking | Built-in tracking | Transient data, no storage needed |

## Performance Considerations

- **API Latency**: Primary bottleneck, not controllable by our code. Typical Claude API response: 5-30 seconds depending on code size.
- **Tool Invocations**: Each tool adds 1-5 seconds. Limit tool usage to essential operations.
- **Prompt Size**: Larger prompts (with full rules) consume more tokens but improve accuracy. Balance between completeness and cost.
- **Token Usage**: Track tokens to monitor costs. Typical compilation: 10K-50K tokens depending on rules and source size.
- **MCP Communication**: JSON-RPC overhead is minimal (<10ms per message). Bottleneck is tool execution time.

## Open Questions Resolved

All technical questions resolved. No NEEDS CLARIFICATION items remain.

## Next Steps

Proceed to Phase 1: Design & Contracts
- Generate data-model.md with entity definitions (CompilationPrompt, TransformResult, ToolInvocation, etc.)
- Generate API contracts for AI transformer and MCP client interfaces
- Generate quickstart.md with usage examples
