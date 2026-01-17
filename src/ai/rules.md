# GherkinLang Language Rules

This file serves as the AST (Abstract Syntax Tree) for GherkinLang. It defines the language specification in natural language, which is used by the AI transformer to compile GherkinLang source code to JavaScript.

## Purpose

This rules file serves three purposes simultaneously:
1. Human documentation - readable by non-programmers
2. AI instructions - tells Claude how to compile
3. Cache key component - changes invalidate cache

## Rule Categories

### Module Rules
- Feature: → Module definition

### Function Rules
- Scenario: → Function definition

### Parameter Rules
- Given accepts → Parameters

### Operation Rules
- When filter/map/reduce → Collection operations

### Control Flow Rules
- When matches → Pattern matching

### Return Rules
- Then return → Function output

### Target-Specific Rules
- JavaScript idioms and patterns

---

*This file is not yet implemented. Rules will be defined here.*
