# GherkinLang Compiler

GherkinLang is an experimental programming language where compilation rules are expressed in natural language rather than traditional parsing logic. This compiler transforms Gherkin-syntax source code into clean, functional JavaScript using AI-powered transformation.

## Features

- AI-native compilation using natural language rules
- Pure functional JavaScript output
- Deterministic builds with content-addressed caching
- Human-readable source code and documentation

## Installation

```bash
npm install
```

## Usage

```bash
# Compile a feature file
gherkin compile features/mathematics.feature -o dist

# Watch mode for development
gherkin watch features/ -o dist

# Initialize a new project
gherkin init my-project --template library
```

## Documentation

See [architecture.md](./architecture.md) for detailed architecture documentation.
