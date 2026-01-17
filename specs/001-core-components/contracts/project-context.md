# API Contract: Project Context Manager

**Component**: Project Context Manager  
**File**: `src/compiler/context.js`  
**Phase**: 1 - Design & Contracts

## Interface

```typescript
interface ProjectContext {
  /**
   * Build project context from directory
   * @param rootDir - Root directory containing .feature files
   * @param configPath - Optional path to .gherkinrc.json (default: rootDir/.gherkinrc.json)
   * @returns Project context with modules, config, and compile order
   */
  build(rootDir: string, configPath?: string): Promise<ProjectContextData>;

  /**
   * Get module information by name
   * @param moduleName - Feature/module name
   * @returns Module info or null if not found
   */
  getModule(moduleName: string): ModuleInfo | null;

  /**
   * Get dependencies for a module
   * @param moduleName - Feature/module name
   * @returns Array of dependency module names
   */
  getDependencies(moduleName: string): string[];

  /**
   * Get compilation order (topologically sorted)
   * @returns Array of module names in compilation order
   */
  getCompileOrder(): string[];

  /**
   * Check for circular dependencies
   * @returns Array of cycles found (empty if no cycles)
   */
  detectCycles(): Cycle[];

  /**
   * Get project configuration
   * @returns Loaded and validated configuration
   */
  getConfig(): ProjectConfiguration;
}
```

## Types

```typescript
interface ProjectContextData {
  modules: Map<string, ModuleInfo>;
  config: ProjectConfiguration;
  compileOrder: string[];
  cycles: Cycle[];
}

interface ModuleInfo {
  file: string; // Path to .feature file
  exports: string[]; // Function names exported
  dependencies: string[]; // Module names this depends on
  parsedAt: Date;
}

interface Cycle {
  modules: string[]; // Module names in cycle
  message: string; // Human-readable description
}

interface ProjectConfiguration {
  target: 'javascript' | 'elixir';
  moduleFormat: 'commonjs' | 'esm';
  output: {
    dir: string;
    testDir: string;
    docsDir: string;
  };
  cache: {
    enabled: boolean;
    dir: string;
    maxSize: string; // e.g., '100MB'
    ttl: string; // e.g., '7d'
  };
  validation: {
    syntax: boolean;
    purity: boolean;
    lint: boolean;
    lintConfig: string;
  };
  ai: {
    model: string;
    maxRetries: number;
    timeout: number;
  };
  generation: {
    jsdoc: boolean;
    tests: boolean;
    docs: boolean;
    prettier: boolean;
  };
  watch?: {
    debounce: number;
    ignore: string[];
  };
}
```

## Building Process

1. **File Discovery**: Scan `rootDir` for all `.feature` files (recursive)
2. **Parsing**: Parse all discovered files using GherkinParser
3. **Module Registry**: Build map of feature names → module info
4. **Dependency Graph**: Construct graph from parsed dependencies
5. **Cycle Detection**: Detect circular dependencies
6. **Topological Sort**: Determine compilation order (if no cycles)
7. **Configuration**: Load and validate .gherkinrc.json

## Error Handling

- `build()`: Throws `ContextBuildError` if:
  - Root directory not found
  - Configuration file invalid
  - Duplicate feature names found
  - Circular dependencies detected (unless configured to allow)
- `getModule()`: Returns `null` if module not found (not an error)
- `getDependencies()`: Returns empty array if module not found
- `detectCycles()`: Returns empty array if no cycles (not an error)

## Performance Requirements

- `build()`: <2 seconds for projects with up to 100 files
- `getModule()`: <1ms (in-memory lookup)
- `getDependencies()`: <1ms (in-memory lookup)
- `getCompileOrder()`: <1ms (pre-computed)
- `detectCycles()`: <100ms for typical dependency graphs

## Usage Example

```javascript
const context = new ProjectContext();

// Build context
const contextData = await context.build('./features');

// Check for cycles
const cycles = context.detectCycles();
if (cycles.length > 0) {
  throw new Error(`Circular dependencies detected: ${cycles[0].message}`);
}

// Get compilation order
const order = context.getCompileOrder();
// ['Mathematics', 'UserManagement'] - dependencies first

// Get module info
const mathModule = context.getModule('Mathematics');
console.log('Math module file:', mathModule.file);
console.log('Math exports:', mathModule.exports);
console.log('Math dependencies:', mathModule.dependencies);

// Get configuration
const config = context.getConfig();
console.log('Target:', config.target);
console.log('Output dir:', config.output.dir);
```
