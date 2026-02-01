# Contract: Init Command

**Module**: `src/cli/commands/init.js`

## Overview

The init command scaffolds a new GherkinLang project with configuration files, directory structure, and example feature files based on a selected template.

## Public Interface

### Command Signature

```text
gherkin init [options] [name]

Arguments:
  name                     Project name (creates new directory)

Options:
  -t, --template <type>    Template: basic, library, api
  -y, --yes                Accept all defaults without prompts
  --force                  Overwrite existing files
  -h, --help               Display help
```

### Exported Functions

```javascript
/**
 * Register the init command with the program.
 * @param {Command} program - Commander program instance
 */
export const register = (program) => { ... };

/**
 * Execute the init command.
 * @param {string|undefined} name - Project name (optional)
 * @param {InitOptions} options - Command options
 * @param {CommandContext} context - Command context
 * @returns {Promise<void>}
 */
export const execute = async (name, options, context) => { ... };

/**
 * Prompt user for template selection.
 * @returns {Promise<string>} Selected template name
 */
export const promptTemplate = async () => { ... };

/**
 * Get template definition by name.
 * @param {string} name - Template name: 'basic' | 'library' | 'api'
 * @returns {ProjectTemplate}
 */
export const getTemplate = (name) => { ... };

/**
 * Create project from template.
 * @param {string} targetDir - Target directory
 * @param {ProjectTemplate} template - Template to use
 * @param {InitOptions} options - Init options
 * @returns {Promise<string[]>} Created file paths
 */
export const createProject = async (targetDir, template, options) => { ... };

/**
 * Display next steps after initialization.
 * @param {string} projectDir - Created project directory
 * @param {ProjectTemplate} template - Used template
 */
export const displayNextSteps = (projectDir, template) => { ... };
```

## Behavior Specifications

### Directory Handling

| Scenario | Behavior |
|----------|----------|
| `gherkin init` | Initialize in current directory |
| `gherkin init my-project` | Create `my-project/` and initialize |
| Directory has `.gherkinrc.json` | Warn and prompt to confirm (unless `--force`) |
| Directory has other files | Proceed with warning |

### Template Selection

If `--template` not provided and not `--yes`:
1. Display template choices
2. Wait for user selection
3. Use selected template

If `--yes` without `--template`:
- Use `basic` template as default

### Templates

#### Basic Template
```text
my-project/
├── .gherkinrc.json
└── features/
    └── example.feature
```

#### Library Template
```text
my-project/
├── .gherkinrc.json
└── features/
    ├── math.feature
    └── strings.feature
```

#### API Template
```text
my-project/
├── .gherkinrc.json
└── features/
    ├── users.feature
    └── health.feature
```

### Configuration Content

`.gherkinrc.json` for all templates:
```json
{
  "target": "javascript",
  "moduleFormat": "commonjs",
  "output": {
    "dir": "dist",
    "testDir": "test/generated"
  },
  "cache": {
    "enabled": true,
    "dir": ".gherkin-cache"
  },
  "validation": {
    "syntax": true,
    "purity": true,
    "lint": true
  },
  "generation": {
    "jsdoc": true,
    "tests": true
  }
}
```

### Display

```text
Creating new GherkinLang project...

? Choose a project template:
❯ Basic - Minimal setup with one example
  Library - Function exports and utilities
  API - Request/response patterns

✔ Created .gherkinrc.json
✔ Created features/example.feature
✔ Created features/ directory

🎉 Project initialized successfully!

Next steps:
  cd my-project
  gherkin compile features/
  
Learn more: https://gherkinlang.dev/getting-started
```

### Error Handling

| Scenario | Behavior |
|----------|----------|
| No write permission | Error with path |
| Disk full | Error with suggestion |
| Existing config (no --force) | Prompt to confirm |
| User declines overwrite | Exit with message |

## Dependencies

- `@inquirer/prompts`: Interactive prompts
- `fs/promises`: File system operations
- `path`: Path utilities
- `src/cli/utils/logger.js`: Logging

## Example Usage

```bash
# Initialize in current directory with prompts
gherkin init

# Initialize with specific template
gherkin init --template library

# Initialize in new directory
gherkin init my-project

# Initialize with all defaults (no prompts)
gherkin init my-project --yes

# Force overwrite existing config
gherkin init --force
```

## Template File Contents

### example.feature (basic)
```gherkin
Feature: Example
  A simple example to get started with GherkinLang.

  Scenario: Add two numbers
    Given the first number is 5
    And the second number is 3
    When I add them together
    Then the result should be 8
```

### math.feature (library)
```gherkin
Feature: Math
  Mathematical utility functions.

  Scenario: Calculate factorial
    Given a number n
    When I calculate factorial of n
    Then the result is n! (n factorial)

  Scenario: Check if prime
    Given a number n
    When I check if n is prime
    Then the result is true if n has exactly 2 divisors
```

### users.feature (api)
```gherkin
Feature: Users
  User management operations.

  Scenario: Create a new user
    Given user data with name and email
    When I create the user
    Then a user record is returned with an id

  Scenario: Get user by id
    Given a user id
    When I fetch the user
    Then the user data is returned or null if not found
```
