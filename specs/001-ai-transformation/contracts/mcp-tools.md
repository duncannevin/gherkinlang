# API Contract: MCP Tools

**Component**: MCP Tools (Code Analyzer, Dependency Checker, File System, Test Generator)  
**Files**: `src/mcp/tools/*.js`  
**Phase**: 1 - Design & Contracts

## Tool Interface

All MCP tools implement a common interface:

```typescript
interface MCPToolImplementation {
  /**
   * Tool name (unique identifier)
   */
  name: string;

  /**
   * Tool description for AI
   */
  description: string;

  /**
   * JSON Schema for tool parameters
   */
  inputSchema: object;

  /**
   * Execute tool with parameters
   * @param arguments - Tool invocation parameters
   * @returns Tool result
   */
  execute(arguments: object): Promise<ToolResult>;
}
```

## Tool: Code Analyzer

**File**: `src/mcp/tools/analyzer.js`

### Purpose
Validates generated JavaScript code for syntax correctness and purity compliance.

### Input Schema
```json
{
  "type": "object",
  "properties": {
    "code": {
      "type": "string",
      "description": "JavaScript code to analyze"
    },
    "checks": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["syntax", "purity"]
      },
      "description": "Types of checks to perform"
    }
  },
  "required": ["code", "checks"]
}
```

### Output
```json
{
  "success": true,
  "valid": true,
  "errors": [],
  "warnings": []
}
```

### Behavior
1. **Syntax Check**: Parse code with esprima/@babel/parser
2. **Purity Check**: AST analysis for forbidden patterns (mutations, side effects)
3. **Return Results**: Validation results with errors/warnings

### Error Handling
- Invalid code: Return `{ success: true, valid: false, errors: [...] }`
- Parse errors: Return syntax errors with line/column information

---

## Tool: Dependency Checker

**File**: `src/mcp/tools/dependencies.js`

### Purpose
Verifies npm package availability and existence.

### Input Schema
```json
{
  "type": "object",
  "properties": {
    "packageName": {
      "type": "string",
      "description": "npm package name to check"
    }
  },
  "required": ["packageName"]
}
```

### Output
```json
{
  "success": true,
  "exists": true,
  "version": "1.0.0",
  "description": "Package description"
}
```

### Behavior
1. Check npm registry for package existence
2. Return package information if available
3. Return `exists: false` if package not found

### Error Handling
- Network errors: Return error result
- Invalid package name: Return `exists: false`

---

## Tool: File System

**File**: `src/mcp/tools/filesystem.js`

### Purpose
Reads project files for cross-module references during compilation.

### Input Schema
```json
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "enum": ["read"],
      "description": "File system action"
    },
    "path": {
      "type": "string",
      "description": "File path to read (relative to project root)"
    }
  },
  "required": ["action", "path"]
}
```

### Output
```json
{
  "success": true,
  "content": "file contents...",
  "path": "features/utils.feature"
}
```

### Behavior
1. Validate path is within project root (security)
2. Read file contents
3. Return file content

### Error Handling
- File not found: Return error result
- Path outside project: Return security error
- Read errors: Return error result

---

## Tool: Test Generator

**File**: `src/mcp/tools/test-generator.js`

### Purpose
Generates test code for generated JavaScript implementations.

### Input Schema
```json
{
  "type": "object",
  "properties": {
    "code": {
      "type": "string",
      "description": "Generated JavaScript code to test"
    },
    "testFramework": {
      "type": "string",
      "enum": ["jest"],
      "default": "jest",
      "description": "Test framework to use"
    }
  },
  "required": ["code"]
}
```

### Output
```json
{
  "success": true,
  "testCode": "describe('...', () => { ... });",
  "coverage": {
    "lines": 85,
    "branches": 80
  }
}
```

### Behavior
1. Analyze code structure (functions, exports)
2. Generate Jest test cases
3. Return test code with coverage estimates

### Error Handling
- Invalid code: Return error result
- Generation failures: Return error with details

---

## Tool Registry

**File**: `src/mcp/tools/index.js`

### Purpose
Registers and manages all available MCP tools.

### Interface
```typescript
interface ToolRegistry {
  /**
   * Register a tool
   */
  register(tool: MCPToolImplementation): void;

  /**
   * Get tool by name
   */
  getTool(name: string): MCPToolImplementation | null;

  /**
   * Get all registered tools
   */
  getAllTools(): MCPToolImplementation[];

  /**
   * Convert tools to Claude tool format
   */
  toClaudeTools(): ClaudeTool[];
}
```

## Common Tool Result Format

```typescript
interface ToolResult {
  success: boolean;
  content?: object; // Tool-specific result
  error?: string; // Error message if failed
  duration: number; // Execution time in milliseconds
}
```

## Error Handling Standards

All tools must:
- Return `success: false` on errors (don't throw)
- Include clear error messages
- Validate input parameters against schema
- Handle timeouts (5 seconds max)
- Log errors to stderr (not stdout)

## Performance Requirements

- **Code Analyzer**: <1 second for typical code (<1000 lines)
- **Dependency Checker**: <2 seconds (network call)
- **File System**: <100ms for file reads
- **Test Generator**: <2 seconds for typical code

## Usage Example

```javascript
// Register tools
const registry = new ToolRegistry();
registry.register(new CodeAnalyzer());
registry.register(new DependencyChecker());
registry.register(new FileSystem());
registry.register(new TestGenerator());

// Get tool
const analyzer = registry.getTool('analyzer');
const result = await analyzer.execute({
  code: 'const x = 1;',
  checks: ['syntax', 'purity']
});
```
