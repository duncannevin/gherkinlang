/**
 * Main library entry point for the GherkinLang compiler.
 * 
 * Exports the core compiler API for programmatic use of the GherkinLang
 * compiler. This module provides the primary interface for compiling
 * GherkinLang source files to JavaScript using AI-powered transformation.
 * 
 * @module gherkinlang
 */

// AI Transformation
const { AITransformer } = require('./ai/transformer');
const { PromptBuilder } = require('./ai/prompt-builder');
const { ResponseParser } = require('./ai/response-parser');
const { RetryHandler } = require('./ai/retry-handler');
const {
  TransformationError,
  APIError,
  RateLimitError,
  InvalidCodeError,
  ToolTimeoutError,
} = require('./ai/errors');

// MCP Client
const { MCPClient } = require('./mcp/client');
const { ToolRegistry } = require('./mcp/tool-registry');
const { ToolInvoker } = require('./mcp/tool-invoker');

// MCP Tools
const {
  getAllTools,
  getToolInstance,
  CodeAnalyzer,
  DependencyChecker,
  FileSystem,
  TestGenerator,
} = require('./mcp/tools');

// Compiler Core
const { GherkinParser } = require('./compiler/parser');
const { ProjectContext } = require('./compiler/context');
const { CacheManager } = require('./compiler/cache');
const { ParseError, ContextBuildError, CacheError } = require('./compiler/errors');

module.exports = {
  // AI Transformation
  AITransformer,
  PromptBuilder,
  ResponseParser,
  RetryHandler,

  // AI Errors
  TransformationError,
  APIError,
  RateLimitError,
  InvalidCodeError,
  ToolTimeoutError,

  // MCP Client
  MCPClient,
  ToolRegistry,
  ToolInvoker,

  // MCP Tools
  getAllTools,
  getToolInstance,
  CodeAnalyzer,
  DependencyChecker,
  FileSystem,
  TestGenerator,

  // Compiler Core
  GherkinParser,
  ProjectContext,
  CacheManager,

  // Compiler Errors
  ParseError,
  ContextBuildError,
  CacheError,
};
