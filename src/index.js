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
  TestGenerator: MCPTestGenerator,
} = require('./mcp/tools');

// Compiler Core
const { GherkinParser } = require('./compiler/parser');
const { ProjectContext } = require('./compiler/context');
const { CacheManager } = require('./compiler/cache');
const { ParseError, ContextBuildError, CacheError } = require('./compiler/errors');

// Validation
const { validate, validateSyntaxOnly, isValid, validateBatch } = require('./validation/validator');
const { validateSyntax } = require('./validation/syntax');
const { validatePurity } = require('./validation/purity');
const { validateLint, createESLintConfig } = require('./validation/eslint-config');
const {
  createValidationError,
  createEmptyValidationResult,
  createSyntaxCheckResult,
  createPurityCheckResult,
  createLintCheckResult,
} = require('./validation/types');
const {
  FORBIDDEN_IDENTIFIERS,
  FORBIDDEN_MEMBER_EXPRESSIONS,
  MUTATING_ARRAY_METHODS,
  MAX_SYNTAX_ERRORS,
} = require('./validation/constants');

// Generation
const {
  generate,
  wrapWithExports,
  resolveImports,
  computeOutputPath,
  ensureOutputDir,
  acquireLock,
  releaseLock,
} = require('./generation/generator');
const { formatCode, createPrettierConfig, mergeConfig } = require('./generation/formatters/javascript');
const {
  generateModuleJSDoc,
  generateFunctionJSDoc,
  generateExampleSection,
  inferTypeFromName,
  inferReturnTypeFromName,
} = require('./generation/formatters/jsdoc');
const {
  TEST_CATEGORIES,
  EXPORT_TYPES,
  MODULE_TYPES,
  TEST_FRAMEWORKS,
  createEmptyModule,
  createEmptyTestSuite,
  createTestCase,
  createModuleExport,
} = require('./generation/types');

// Test Generation
const {
  generateTests,
  generateExampleTests,
  generateTypeTests,
  generateEdgeCaseTests,
  generateBoundaryTests,
  generateAssertion,
  generateDescribeBlock,
  generateImportStatement,
  createTestFile,
  computeTestPath,
  inferTypes,
} = require('./generation/test-generator');

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
  MCPTestGenerator,

  // Compiler Core
  GherkinParser,
  ProjectContext,
  CacheManager,

  // Compiler Errors
  ParseError,
  ContextBuildError,
  CacheError,

  // Validation - Main API
  validate,
  validateBatch,
  validateSyntaxOnly,
  isValid,

  // Validation - Individual Validators
  validateSyntax,
  validatePurity,
  validateLint,
  createESLintConfig,

  // Validation - Types & Factories
  createValidationError,
  createEmptyValidationResult,
  createSyntaxCheckResult,
  createPurityCheckResult,
  createLintCheckResult,

  // Validation - Constants
  FORBIDDEN_IDENTIFIERS,
  FORBIDDEN_MEMBER_EXPRESSIONS,
  MUTATING_ARRAY_METHODS,
  MAX_SYNTAX_ERRORS,

  // Generation - Main API
  generate,
  wrapWithExports,
  resolveImports,
  computeOutputPath,
  ensureOutputDir,
  acquireLock,
  releaseLock,

  // Generation - Formatters
  formatCode,
  createPrettierConfig,
  mergeConfig,
  generateModuleJSDoc,
  generateFunctionJSDoc,
  generateExampleSection,
  inferTypeFromName,
  inferReturnTypeFromName,

  // Generation - Types & Constants
  TEST_CATEGORIES,
  EXPORT_TYPES,
  MODULE_TYPES,
  TEST_FRAMEWORKS,
  createEmptyModule,
  createEmptyTestSuite,
  createTestCase,
  createModuleExport,

  // Test Generation
  generateTests,
  generateExampleTests,
  generateTypeTests,
  generateEdgeCaseTests,
  generateBoundaryTests,
  generateAssertion,
  generateDescribeBlock,
  generateImportStatement,
  createTestFile,
  computeTestPath,
  inferTypes,
};
