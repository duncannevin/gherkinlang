# Data Model: AI Transformation

**Feature**: AI Transformation  
**Date**: 2026-01-19  
**Phase**: 1 - Design & Contracts

## Overview

Data models for AI transformation engine with Claude API integration and MCP (Model Context Protocol) client support. These models define the structure of data flowing through the AI compilation pipeline.

## Entities

### CompilationPrompt

Structured input sent to the AI API for compilation.

**Fields**:
- `systemMessage` (string): System prompt with role definition and language rules
- `userMessage` (string): User prompt with source code and compilation context
- `tools` (Array<ClaudeTool>): Available tools for AI to use during compilation
- `model` (string): Claude model identifier (e.g., 'claude-sonnet-4-5')
- `temperature` (number): Temperature setting (0.0 for deterministic)
- `maxTokens` (number): Maximum tokens in response

**Nested Types**:
- `ClaudeTool`:
  - `name` (string): Tool name
  - `description` (string): Tool description for AI
  - `input_schema` (object): JSON Schema for tool parameters

**Relationships**:
- Created by: Prompt Builder
- Used by: AI Transformer (sent to Claude API)
- Contains: Language Rules (from rules-loader), Source Code (from parser), Project Context

**Validation Rules**:
- `systemMessage` must be non-empty and include rules content
- `userMessage` must contain source code
- `tools` array must contain valid tool schemas
- `temperature` must be 0.0 (constitution requirement for deterministic builds)
- `maxTokens` must be positive integer

**State Transitions**:
- `building` → `ready` (prompt constructed with all required components)

---

### TransformResult

Output from AI transformation containing generated code and metadata.

**Fields**:
- `success` (boolean): Whether transformation succeeded
- `code` (string, optional): Generated JavaScript code
- `error` (string, optional): Error message if transformation failed
- `toolCalls` (Array<ToolCall>, optional): Tool invocations made during compilation
- `metadata` (TransformMetadata): Transformation metadata

**Nested Types**:
- `ToolCall`:
  - `toolName` (string): Name of tool invoked
  - `arguments` (object): Tool invocation arguments
  - `result` (object, optional): Tool result
  - `duration` (number): Tool invocation duration in milliseconds
  - `success` (boolean): Whether tool invocation succeeded
- `TransformMetadata`:
  - `model` (string): AI model used
  - `tokens` (TokenUsage): Token consumption
  - `duration` (number): Total transformation duration in milliseconds
  - `retryCount` (number): Number of retries attempted
  - `cacheHit` (boolean): Whether result came from cache
- `TokenUsage`:
  - `input` (number): Input tokens consumed
  - `output` (number): Output tokens consumed
  - `total` (number): Total tokens consumed

**Relationships**:
- Created by: AI Transformer
- Used by: Cache Manager (for storage), Validation (for code validation)
- Referenced by: Compiler Orchestrator (for compilation results)

**Validation Rules**:
- `success` true requires non-empty `code`
- `success` false requires non-empty `error`
- `metadata.tokens` must have positive values
- `metadata.duration` must be positive
- `code` must be valid JavaScript syntax (if present)

**State Transitions**:
- `transforming` → `success` (code generated) or `error` (transformation failed)

---

### ToolInvocation

Request from AI to execute a specific tool with parameters.

**Fields**:
- `id` (string): Unique invocation ID (from Claude tool_use)
- `toolName` (string): Name of tool to invoke
- `arguments` (object): Tool invocation parameters
- `status` (string): Invocation status ('pending' | 'executing' | 'completed' | 'failed' | 'timeout')
- `result` (object, optional): Tool execution result
- `error` (string, optional): Error message if invocation failed
- `startedAt` (Date): When invocation started
- `completedAt` (Date, optional): When invocation completed
- `duration` (number, optional): Invocation duration in milliseconds

**Relationships**:
- Created by: AI Transformer (from Claude tool_use response)
- Processed by: MCP Client (executes tool)
- Returned to: AI Transformer (as tool_result for next API call)

**Validation Rules**:
- `toolName` must match registered MCP tool name
- `arguments` must match tool input schema
- `status` must be valid state
- `duration` must be positive if completed
- Timeout occurs if duration exceeds 5 seconds

**State Transitions**:
- `pending` → `executing` → `completed` (success) or `failed` (error) or `timeout` (exceeded 5s)

---

### MCPTool

Registered capability available during compilation.

**Fields**:
- `name` (string): Tool name (unique identifier)
- `description` (string): Tool description for AI
- `inputSchema` (object): JSON Schema for tool parameters
- `mcpName` (string): MCP tool name (may differ from name)
- `timeout` (number): Timeout in milliseconds (default: 5000)
- `enabled` (boolean): Whether tool is enabled

**Relationships**:
- Discovered by: MCP Client (from MCP server)
- Registered with: AI Transformer (for Claude API tools parameter)
- Invoked by: MCP Client (when AI requests tool use)

**Validation Rules**:
- `name` must be unique across all tools
- `inputSchema` must be valid JSON Schema
- `timeout` must be positive (default: 5000ms)
- `mcpName` must match tool name in MCP server

**State Transitions**:
- `discovered` → `registered` (with AI transformer) → `available` (ready for use)

---

### AIAPIResponse

Response from Claude API containing generated code or tool requests.

**Fields**:
- `content` (Array<ContentBlock>): Response content blocks
- `usage` (TokenUsage): Token consumption
- `model` (string): Model used
- `stopReason` (string): Why generation stopped ('end_turn' | 'max_tokens' | 'stop_sequence')
- `id` (string): Response ID

**Nested Types**:
- `ContentBlock`:
  - `type` (string): Content type ('text' | 'tool_use')
  - `text` (string, optional): Text content (if type is 'text')
  - `tool_use` (ToolUse, optional): Tool use request (if type is 'tool_use')
- `ToolUse`:
  - `id` (string): Tool use ID
  - `name` (string): Tool name
  - `input` (object): Tool arguments

**Relationships**:
- Received from: Claude API
- Processed by: Response Parser (extracts code or tool calls)
- Used by: AI Transformer (for multi-turn conversations)

**Validation Rules**:
- `content` array must be non-empty
- `usage` must have positive token values
- `model` must be valid Claude model identifier
- Content blocks must have correct type-specific fields

**State Transitions**:
- `received` → `parsed` (code extracted or tool calls identified)

---

### MCPClientConnection

Connection state for MCP client-server communication.

**Fields**:
- `serverProcess` (ChildProcess): MCP server subprocess
- `connected` (boolean): Whether connection is established
- `tools` (Map<string, MCPTool>): Discovered tools
- `protocolVersion` (string): MCP protocol version
- `requestId` (number): Next request ID for JSON-RPC
- `pendingRequests` (Map<number, PendingRequest>): Outstanding requests

**Nested Types**:
- `PendingRequest`:
  - `id` (number): Request ID
  - `method` (string): MCP method name
  - `resolve` (function): Promise resolve function
  - `reject` (function): Promise reject function
  - `timeout` (Timeout, optional): Timeout timer

**Relationships**:
- Manages: MCP Server subprocess
- Discovers: MCP Tools
- Processes: Tool Invocations

**Validation Rules**:
- `serverProcess` must be active when `connected` is true
- `tools` map must contain all discovered tools
- `requestId` must increment for each request
- `pendingRequests` must be cleaned up after response or timeout

**State Transitions**:
- `disconnected` → `connecting` → `connected` (initialized) → `disconnected` (shutdown)

---

### RetryState

State tracking for exponential backoff retry logic.

**Fields**:
- `attempt` (number): Current retry attempt (0 = first attempt)
- `maxRetries` (number): Maximum retry attempts (default: 3)
- `baseDelay` (number): Base delay in milliseconds (default: 2000)
- `lastError` (Error, optional): Last error encountered
- `nextRetryAt` (Date, optional): When next retry should occur

**Relationships**:
- Used by: Retry Handler (manages retry logic)
- Tracks: API call retries

**Validation Rules**:
- `attempt` must be non-negative and <= `maxRetries`
- `baseDelay` must be positive
- `nextRetryAt` must be in future if set

**State Transitions**:
- `idle` → `retrying` (attempt < maxRetries) → `succeeded` (success) or `failed` (max retries reached)

---

## Data Flow

### AI Transformation Flow
```
Source Code + Rules + Context → CompilationPrompt → Claude API
                                                          ↓
                                                    AIAPIResponse
                                                          ↓
                                              (Has tool_use?) → ToolInvocation → MCP Client
                                                          ↓                              ↓
                                                    (Continue conversation)      Tool Result
                                                          ↓                              ↓
                                                    TransformResult ←───────────────────┘
                                                          ↓
                                                    Cache Manager
```

### MCP Tool Discovery Flow
```
MCP Client → Initialize → MCP Server
                ↓
         List Tools Request
                ↓
         Tools Response → MCPTool[] → Register with AI Transformer
```

### Tool Invocation Flow
```
AIAPIResponse (tool_use) → ToolInvocation → MCP Client
                                              ↓
                                    Execute Tool (timeout: 5s)
                                              ↓
                                    Tool Result → AI Transformer
                                              ↓
                                    Continue Conversation
```

### Retry Flow
```
API Call → Error? → RetryState → Calculate Delay (exponential + jitter)
                                    ↓
                              Wait → Retry → Success or Max Retries
```

## Validation Summary

| Entity | Key Validations |
|--------|----------------|
| CompilationPrompt | Non-empty messages, temperature 0.0, valid tools |
| TransformResult | Success requires code, failure requires error |
| ToolInvocation | Valid tool name, matching schema, timeout < 5s |
| MCPTool | Unique name, valid schema, positive timeout |
| AIAPIResponse | Non-empty content, valid token usage |
| MCPClientConnection | Active process when connected, valid request IDs |
| RetryState | Attempt <= maxRetries, positive delays |
