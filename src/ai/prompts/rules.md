# GherkinLang Compilation Rules

This document defines the syntax and semantics of GherkinLang, a purely functional programming language that uses Gherkin syntax. These rules are target-language agnostic and describe what GherkinLang constructs mean, not how they compile to any specific language.

## Philosophy

GherkinLang is built on the principle that **compilation is learned rather than programmed**. The rules in this document serve simultaneously as:
- Human-readable documentation
- The language specification
- The compiler's "brain"
- The AST in natural language form

Every change to these rules changes the language itself. **The specification is the compiler, and the compiler is the specification.**

---

## Module Definition

### Feature Declaration
- `Feature:` declares a module/namespace
- The word(s) following `Feature:` become the module name
- Module names should be PascalCase or snake_case depending on target convention

**Example:**
```gherkin
Feature: UserManagement
```

### Background (Shared Context)
- `Background:` at the start of a Feature defines shared setup
- Used for imports, constants, or context shared across all scenarios
- Background steps execute conceptually before each scenario

**Example:**
```gherkin
Feature: Mathematics
  Background:
    Given import standard math functions
    And constant PI = 3.14159265359
    And constant MAX_ITERATIONS = 1000
```

---

## Function Definition

### Scenario as Function
- `Scenario:` declares a function within the module
- Format: `Scenario: <name> defines a function`
- The function name is extracted from `<name>`
- Function names should be snake_case

**Example:**
```gherkin
Scenario: calculate_area defines a function
```

### Recursive Functions
- `Scenario: <name> defines a recursive function`
- Indicates the function may call itself
- Base case should be defined first using pattern matching
- Compiler should optimize for tail recursion where possible

**Example:**
```gherkin
Scenario: factorial defines a recursive function
```

---

## Function Parameters

### Parameter Declaration
- `Given function <name> accepts <params>`
- Single parameter: `accepts users`
- Multiple parameters: `accepts name and email and age`
- Typed parameters: `accepts users as Array`
- Parameters separated by `and`

**Examples:**
```gherkin
Given function filter_adults accepts users
Given function create_user accepts name and email and age
Given function process_items accepts items as Array and threshold as Number
```

### Parameter Types
When types are specified, they serve as documentation and may enable static analysis:
- Primitives: `String`, `Number`, `Boolean`
- Collections: `Array`, `List`, `Object`, `Map`, `Set`
- Custom types: User-defined names (e.g., `User`, `Product`)
- Union/Result types: Indicate success/failure patterns

---

## Function Calls

### Simple Application
- `When apply <function> to <arg>`
- Calls function with a single argument
- Result available as `result` in next step

**Example:**
```gherkin
When apply validate to user
```

### Named Application
- `When call <function> with <args> storing result as <var>`
- Multiple args: `with arg1 and arg2 and arg3`
- Result stored in named variable

**Example:**
```gherkin
When call send_email with recipient and subject and body storing result as email_result
```

### Pipeline Operations
- `When pipe <value> through` followed by a table of functions
- Chains single-argument functions in sequence
- Each function receives the output of the previous

**Example:**
```gherkin
When pipe users through
  | filter_active   |
  | sort_by_name    |
  | take_first_ten  |
```

### Let Binding
- `When let <var> = <expression>`
- Direct assignment of any valid expression
- Allows inline function calls and complex expressions

**Example:**
```gherkin
When let total = sum(prices)
When let doubled = value * 2
```

### Store Intermediate Result
- `And store result as <var>`
- Captures the result of the previous operation
- Makes the value available by name in subsequent steps

---

## Built-in Collection Operations

### Filter
- `When filter <collection> where <condition>`
- Selects elements matching the condition
- The implicit item variable refers to each element

**Example:**
```gherkin
When filter users where age >= 18
When filter products where price < budget and in_stock
```

### Map (Transform)
- `When map <collection> to <transformation>`
- Transforms each element
- "get" keyword extracts a property

**Example:**
```gherkin
When map users to get email
When map numbers to double
When map items to format_currency(price)
```

### Map with Function
- `When map <collection> with <function_call>`
- Applies a function to each element

**Example:**
```gherkin
When map emails with send_notification(email, message)
```

### Sort
- `When sort <collection> by <field>`
- Optional: `by <field> ascending` or `by <field> descending`
- Default is ascending
- For strings, uses lexicographic comparison

**Example:**
```gherkin
When sort users by last_name
When sort products by price descending
```

### Reduce
- `When reduce <collection> with <accumulator> and <function>`
- Folds collection into single value
- Accumulator is initial value

**Example:**
```gherkin
When reduce numbers with 0 and add
When reduce items with empty_cart and add_to_cart
```

### Group
- `When group <collection> by <field>`
- Groups elements by a common property
- Returns a mapping of field values to element lists

**Example:**
```gherkin
When group users by department
When group orders by status
```

### Zip
- `When zip <collection1> with <collection2>`
- Combines two collections element-wise into pairs

**Example:**
```gherkin
When zip names with scores
```

### Flatten
- `When flatten <nested_collection>`
- Converts nested collection to flat collection
- Deep flatten removes all nesting levels

---

## Pattern Matching

### Match Expression
- `When <var> matches` followed by a pattern table
- Each row: `| pattern | result |`
- Patterns evaluated in order, first match wins
- Use `_` for wildcard (catch-all)

**Example:**
```gherkin
When status matches
  | "success"  | return data        |
  | "error"    | return handle_error(message) |
  | _          | return default_value |
```

### Destructuring Patterns
- Object patterns: `{ok: value}`, `{error: reason}`
- List patterns: `[]`, `[head|tail]`, `[first, second, ...rest]`
- Literal patterns: strings, numbers, booleans

**Example:**
```gherkin
When result matches
  | {ok: value}     | return value              |
  | {error: msg}    | return handle_error(msg)  |

When list matches
  | []              | return 0                  |
  | [head|tail]     | return head + sum(tail)   |
```

---

## Control Flow

### Conditional
- `When <condition>` introduces a conditional block
- `Otherwise` provides the alternative branch

**Example:**
```gherkin
When age >= 18
  Then return "adult"
Otherwise
  Then return "minor"
```

---

## Function Composition

### Compose Functions
- `When compose <name> as` followed by function table
- Creates a new function from pipeline of others
- Functions apply left-to-right (first to last)

**Example:**
```gherkin
When compose process_user as
  | validate     |
  | normalize    |
  | save         |
```

### Apply Composition
- `And apply <composed_fn> to <value>`
- Invokes the composed function

---

## Higher-Order Functions

### Apply to Each
- `When apply <function> to each in <collection> using <higher_order_fn>`
- Explicit higher-order function application

**Example:**
```gherkin
When apply uppercase to each in names using map
When apply is_valid to each in items using filter
```

---

## Return Values

### Return Statement
- `Then return <expression>`
- Specifies the function's return value
- Always the last step in a scenario
- The expression can be a variable, literal, or computation

**Example:**
```gherkin
Then return filtered_users
Then return total * tax_rate
Then return {success: true, data: result}
```

---

## Comments

- Lines starting with `#` are comments
- Comments are preserved as documentation in output
- Use comments to explain complex logic or business rules

**Example:**
```gherkin
# This filter excludes users who haven't verified their email
When filter users where email_verified is true
```

---

## Language Principles

### Purity Requirements
All GherkinLang functions must be pure:
- No side effects (I/O, mutations, global state)
- Same inputs always produce same outputs
- No reliance on external state or time

### Immutability
- All data is immutable
- Operations return new values, never modify existing ones
- Collections are never mutated in place

### Composition Over Complexity
- Small, focused functions that do one thing
- Complex behavior emerges from composition
- Pipelines preferred over nested calls

### Readability
- Natural language syntax for non-programmer accessibility
- Self-documenting through descriptive names
- Clear mapping between intent and implementation
