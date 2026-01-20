# API Contract: AI Transformer

**Component**: AI Transformation Engine  
**File**: `src/ai/transformer.js`  
**Phase**: 1 - Design & Contracts

## Interface

```typescript
interface AITransformer {
  /**
   * Transform GherkinLang source code to JavaScript using AI
   * @param source - Parsed source code (from parser)
   * @param rules - Language rules (from rules-loader)
   * @param context - Project context (from context manager)
   * @param tools - Available MCP tools (from MCP client)
   * @returns Transformation result with generated code or error
   */
  transform(
    source: ParsedFeature,
    rules: LanguageRules,
    context: ProjectContext,
    tools: MCPTool[]
  ): Promise<TransformResult>;

  /**
   * Build compilation prompt from source, rules, and context
   * @param source - Source code to compile
   * @param rules - Language rules
   * @param context - Project context
   * @param tools - Available tools
   * @returns Structured compilation prompt
   */
  buildPrompt(
    source: ParsedFeature,
    rules: LanguageRules,
    context: ProjectContext,
    tools: MCPTool[]
  ): CompilationPrompt;

  /**
   * Call Claude API with prompt and handle tool invocations
   * @param prompt - Compilation prompt
   * @param tools - Available tools for invocation
   * @returns AI API response
   */
  callAPI(
    prompt: CompilationPrompt,
    tools: MCPTool[]
  ): Promise<AIAPIResponse>;

  /**
   * Extract JavaScript code from AI response
   * @param response - AI API response
   * @returns Extracted JavaScript code or null if not found
   */
  extractCode(response: AIAPIResponse): string | null;

  /**
   * Handle invalid code response with retry
   * @param response - AI response that doesn't contain valid code
   * @param prompt - Original prompt
   * @param tools - Available tools
   * @returns Transform result (retry or failure)
   */
  handleInvalidResponse(
    response: AIAPIResponse,
    prompt: CompilationPrompt,
    tools: MCPTool[]
  ): Promise<TransformResult>;
}
```

## Types

```typescript
interface TransformResult {
  success: boolean;
  code?: string; // Generated JavaScript code
  error?: string; // Error message if failed
  toolCalls?: ToolCall[]; // Tool invocations made
  metadata: TransformMetadata;
}

interface TransformMetadata {
  model: string; // AI model used
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  duration: number; // Milliseconds
  retryCount: number;
  cacheHit: boolean;
}

interface CompilationPrompt {
  systemMessage: string; // Role + rules
  userMessage: string; // Source code + context
  tools: ClaudeTool[]; // Available tools
  model: string; // Claude model
  temperature: number; // Always 0.0
  maxTokens: number;
}

interface ClaudeTool {
  name: string;
  description: string;
  input_schema: object; // JSON Schema
}
```

## Transformation Behavior

1. **Build Prompt**: Construct system message (role + rules) and user message (source + context)
2. **Register Tools**: Convert MCP tools to Claude tool format
3. **Call API**: Send prompt to Claude API with tools
4. **Handle Response**:
   - If code present: Extract and validate
   - If tool_use present: Invoke tools, continue conversation
   - If invalid: Retry once with clarification (if configurable)
5. **Return Result**: TransformResult with code or error

## Multi-Turn Conversation Flow

1. Initial API call with prompt
2. If response contains `tool_use`:
   - Extract tool invocations
   - Invoke tools via MCP client
   - Add tool results to messages array
   - Continue conversation with Claude
3. Repeat until code is generated or max turns reached
4. Extract final code from response

## Error Handling

- **API Errors**: Retry with exponential backoff (rate limits, timeouts)
- **Invalid Code**: Retry once with clarification prompt (configurable), then fail
- **Tool Failures**: Fail entire compilation (timeout = 5s per tool)
- **Network Errors**: Retry with exponential backoff, fail after max retries

## Performance Requirements

- **Prompt Construction**: <10ms
- **API Call**: <30 seconds for typical single-file (excluding API latency)
- **Code Extraction**: <100ms
- **Multi-Turn**: Up to 5 rounds, 90% success rate

## Configuration

- **Model**: From config or default ('claude-sonnet-4-5')
- **Temperature**: Always 0.0 (deterministic)
- **Max Tokens**: Configurable, default based on expected output
- **Retry Config**: Max 3 retries, exponential backoff with jitter (2s base)

## Usage Example

```javascript
const transformer = new AITransformer({
  apiKey: process.env.API_KEY,
  model: 'claude-sonnet-4-5',
  maxRetries: 3
});

const result = await transformer.transform(
  parsedSource,
  rules,
  projectContext,
  mcpTools
);

if (result.success) {
  console.log('Generated code:', result.code);
  console.log('Tokens used:', result.metadata.tokens.total);
} else {
  console.error('Transformation failed:', result.error);
}
```
