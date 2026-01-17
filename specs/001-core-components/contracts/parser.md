# API Contract: Gherkin Parser

**Component**: Gherkin Parser  
**File**: `src/compiler/parser.js`  
**Phase**: 1 - Design & Contracts

## Interface

```typescript
interface GherkinParser {
  /**
   * Parse a .feature file and extract structure
   * @param filePath - Path to .feature file
   * @param content - Optional file content (if not provided, reads from filePath)
   * @returns Parsed feature structure
   */
  parse(filePath: string, content?: string): Promise<ParsedFeature>;

  /**
   * Parse multiple .feature files
   * @param filePaths - Array of file paths
   * @returns Map of file path to parsed feature
   */
  parseMany(filePaths: string[]): Promise<Map<string, ParsedFeature>>;
}
```

## Types

```typescript
interface ParsedFeature {
  featureName: string;
  filePath: string;
  scenarios: ScenarioInfo[];
  imports: string[]; // Module names imported
  dependencies: string[]; // Resolved dependency names
  errors: ParseError[];
  lineCount: number;
}

interface ScenarioInfo {
  name: string;
  lineNumber: number;
}

interface ParseError {
  message: string;
  line: number; // 1-indexed
  column: number; // 1-indexed
  type: 'syntax' | 'structure' | 'missing_feature';
}
```

## Parsing Rules

### Feature Name Extraction
- Extract from line starting with `Feature:`
- Feature name is text after `Feature:` keyword, trimmed
- Must be valid identifier (alphanumeric + underscore)

### Scenario Extraction
- Extract from lines starting with `Scenario:`
- Scenario name is text after `Scenario:` keyword, trimmed
- Track line number for error reporting

### Import Detection
- Look for import statements: `Given import <moduleName>`
- Extract module names from import statements
- Module names must be valid identifiers

### Error Reporting
- Syntax errors: Invalid Gherkin syntax (missing keywords, malformed steps)
- Structure errors: Missing Feature declaration, no scenarios
- Missing feature: Feature name cannot be extracted

## Error Handling

- `parse()`: Returns `ParsedFeature` with `errors` array (never throws)
- Empty `errors` array indicates successful parse
- Non-empty `errors` array indicates parsing issues (but partial structure may be extracted)

## Performance Requirements

- `parse()`: <50ms for typical .feature files (<500 lines)
- `parseMany()`: <2 seconds for 100 files

## Usage Example

```javascript
const parser = new GherkinParser();

// Parse single file
const parsed = await parser.parse('features/mathematics.feature');

if (parsed.errors.length > 0) {
  console.error('Parse errors:', parsed.errors);
  // Handle errors
}

console.log('Feature:', parsed.featureName);
console.log('Scenarios:', parsed.scenarios.map(s => s.name));
console.log('Imports:', parsed.imports);

// Parse multiple files
const filePaths = ['features/math.feature', 'features/utils.feature'];
const parsedMap = await parser.parseMany(filePaths);

for (const [path, feature] of parsedMap) {
  console.log(`${path}: ${feature.featureName}`);
}
```
