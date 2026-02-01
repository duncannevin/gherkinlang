#!/usr/bin/env node

/**
 * CLI entry point for the GherkinLang compiler.
 *
 * This executable script provides the command-line interface for compiling
 * GherkinLang source files, managing cache, and running tests.
 *
 * @module bin/gherkin
 */

import { run } from '../src/cli/index.js';

run();
