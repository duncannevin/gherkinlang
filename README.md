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

## Cache Directory

The compiler uses a content-addressed cache stored in `.gherkin-cache/` directory:

```
.gherkin-cache/
├── manifest.json          # Cache index with metadata
└── *.cache                # Individual cache entry files (SHA256 keys)
```

Cache entries are stored as JSON files with compilation results. The cache uses LRU (Least Recently Used) eviction when the cache size exceeds the configured limit (default: 100MB).

To clear the cache:
```bash
rm -rf .gherkin-cache/
```

## Documentation

See [architecture.md](./architecture.md) for detailed architecture documentation.
