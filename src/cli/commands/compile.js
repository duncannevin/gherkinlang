/**
 * Compile command handler for GherkinLang CLI.
 *
 * Handles the `gherkin compile` command, which compiles .feature files to
 * JavaScript. Processes file arguments, applies options (target, output,
 * format, cache), and orchestrates the compilation pipeline.
 *
 * @module cli/commands/compile
 */

import { glob } from 'glob';
import { existsSync, statSync } from 'fs';
import { resolve, basename, dirname, join, relative } from 'path';

import { createLogger } from '../utils/logger.js';
import { createProgress, formatDuration } from '../utils/progress.js';
import { loadConfig, mergeOptions, createContext } from '../index.js';
import { EXIT_CODES, FEATURE_FILE_EXTENSION } from '../constants.js';

// Import compiler modules
import { GherkinParser } from '../../compiler/parser.js';
import { AITransformer } from '../../ai/transformer.js';
import { validate } from '../../validation/validator.js';
import { generate, extractExportsFromCode } from '../../generation/generator.js';
import { CacheManager } from '../../compiler/cache.js';
import { ProjectContext } from '../../compiler/context.js';
import { generateTests } from '../../generation/test-generator.js';
import { readFile } from '../../compiler/utils/fs.js';

/**
 * @typedef {import('../types.js').CompileOptions} CompileOptions
 * @typedef {import('../types.js').CommandContext} CommandContext
 * @typedef {import('../types.js').CompilationResult} CompilationResult
 * @typedef {import('../types.js').FileResult} FileResult
 * @typedef {import('../types.js').CompilationError} CompilationError
 * @typedef {import('../types.js').CompilationSummary} CompilationSummary
 */

/**
 * Discover .feature files from paths.
 * Handles both individual files and directories.
 *
 * @param {string[]} paths - File or directory paths
 * @param {string} cwd - Current working directory
 * @returns {Promise<string[]>} Resolved absolute paths
 */
export const discoverFiles = async (paths, cwd = process.cwd()) => {
  const files = new Set();

  for (const inputPath of paths) {
    const absolutePath = resolve(cwd, inputPath);

    if (!existsSync(absolutePath)) {
      throw new Error(`Path not found: ${inputPath}`);
    }

    const stat = statSync(absolutePath);

    if (stat.isFile()) {
      if (absolutePath.endsWith(FEATURE_FILE_EXTENSION)) {
        files.add(absolutePath);
      } else {
        throw new Error(`Not a .feature file: ${inputPath}`);
      }
    } else if (stat.isDirectory()) {
      // Recursively find all .feature files
      const pattern = join(absolutePath, '**/*' + FEATURE_FILE_EXTENSION);
      const matches = await glob(pattern, { nodir: true });
      matches.forEach((f) => files.add(resolve(f)));
    }
  }

  return Array.from(files).sort();
};

/**
 * Sort files by dependency order using project context.
 *
 * @param {string[]} files - Files to sort
 * @param {Object} projectContext - Project context with dependency graph
 * @returns {string[]} Files in topological order
 */
export const sortByDependency = (files, projectContext) => {
  if (!projectContext) {
    return files;
  }

  try {
    const compileOrder = projectContext.getCompilerOrder();
    if (!compileOrder || compileOrder.length === 0) {
      return files;
    }

    // Create a map of module name to file path
    const filesByModule = new Map();
    for (const file of files) {
      const module = projectContext._fileToModule?.get(file);
      if (module) {
        filesByModule.set(module, file);
      }
    }

    // Sort files according to compile order
    const sorted = [];
    for (const moduleName of compileOrder) {
      const file = filesByModule.get(moduleName);
      if (file) {
        sorted.push(file);
        filesByModule.delete(moduleName);
      }
    }

    // Add any files not in the dependency graph
    for (const file of files) {
      if (!sorted.includes(file)) {
        sorted.push(file);
      }
    }

    return sorted;
  } catch {
    return files;
  }
};

/**
 * Compile a single file through the full pipeline.
 *
 * @param {string} file - File path
 * @param {CompileOptions} options - Compile options
 * @param {CommandContext} context - Command context
 * @returns {Promise<FileResult>}
 */
export const compileFile = async (file, options, context) => {
  const startTime = Date.now();
  const { logger, config } = context;

  /** @type {FileResult} */
  const result = {
    sourcePath: file,
    success: false,
    cached: false,
    duration: 0,
    errors: [],
    warnings: [],
  };

  try {
    // Initialize cache if enabled
    let cache = null;
    if (config.cache.enabled && !options.noCache) {
      cache = new CacheManager({ cacheDir: config.cache.dir });
    }

    // Check cache first
    if (cache) {
      const cached = await cache.get(file, config);
      if (cached) {
        result.success = true;
        result.cached = true;
        result.outputPath = cached.outputPath;
        result.duration = Date.now() - startTime;
        return result;
      }
    }

    // Read and parse the feature file
    const sourceContent = await readFile(file);
    const parser = new GherkinParser();
    const parsed = await parser.parse(file, sourceContent);

    if (parsed.errors && parsed.errors.length > 0) {
      result.errors = parsed.errors.map((e) => ({
        type: 'parse',
        code: 'PARSE_ERROR',
        message: e.message || String(e),
        file,
        line: e.line,
        column: e.column,
      }));
      result.duration = Date.now() - startTime;
      return result;
    }

    // Transform via AI
    logger.debug(`Transforming ${basename(file)} via AI...`);
    const transformer = new AITransformer({
      model: config.ai.model,
      maxRetries: config.ai.maxRetries,
    });

    // Pass the raw source content to the transformer
    const transformResult = await transformer.transform(sourceContent, parsed, {
      target: config.target,
      moduleFormat: config.moduleFormat,
    });

    if (!transformResult.success) {
      result.errors = [
        {
          type: 'transform',
          code: 'TRANSFORM_ERROR',
          message: transformResult.error || 'AI transformation failed',
          file,
        },
      ];
      result.duration = Date.now() - startTime;
      return result;
    }

    // Validate the generated code
    logger.debug(`Validating generated code...`);
    // Use 'unambiguous' to auto-detect module format from the generated code
    const validationResult = await validate(transformResult.code, {
      filename: file,
      moduleFormat: 'unambiguous',
      skipLint: !config.validation.lint,
    });

    if (!validationResult.valid) {
      result.errors = validationResult.errors.map((e) => ({
        type: 'validate',
        code: e.code || 'VALIDATION_ERROR',
        message: e.message,
        file,
        line: e.line,
        column: e.column,
        suggestion: e.suggestion,
      }));
      result.duration = Date.now() - startTime;
      return result;
    }

    // Generate output files
    const outputDir = options.output || config.output.dir;
    const relativePath = relative(process.cwd(), file);
    const moduleFormat = options.format || config.moduleFormat;
    const normalizedFormat = moduleFormat === 'commonjs' ? 'cjs' : moduleFormat;

    // Convert parsed imports to dependency objects
    // Imports are now objects: { name, alias, isExternal }
    const dependencies = (parsed.imports || []).map(imp => {
      // Handle both old string format and new object format
      if (typeof imp === 'string') {
        const snakeCase = imp.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
        return { modulePath: `./${snakeCase}`, default: imp };
      }
      
      if (imp.isExternal) {
        // External package (e.g., lodash)
        return {
          modulePath: imp.name,
          default: imp.alias,
        };
      } else {
        // Local module - convert PascalCase to snake_case
        const snakeCase = imp.name.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
        return {
          modulePath: `./${snakeCase}`,
          default: imp.alias,
        };
      }
    });
    
    // Collect external dependencies for package.json
    const externalDeps = (parsed.imports || [])
      .filter(imp => typeof imp === 'object' && imp.isExternal)
      .map(imp => imp.name);

    const generationContext = {
      sourcePath: file,
      featureName: parsed.featureName,
      scenarios: parsed.scenarios,
      examples: [],
      dependencies,
      config,
    };

    const generationResult = await generate(transformResult.code, generationContext, {
      outputDir,
      moduleFormat: normalizedFormat,
      skipFormat: !config.generation.prettier,
      externalDeps,
    });

    result.success = true;
    result.outputPath = generationResult.outputPath;

    // Generate tests if enabled
    if (config.generation.tests && !options.noTests) {
      try {
        // Extract exports from the generated code
        const extractedExports = extractExportsFromCode(transformResult.code);
        
        // Create module info for test generation
        const moduleInfo = {
          sourcePath: file,
          outputPath: result.outputPath,
          code: transformResult.code,
          exports: extractedExports,
          imports: parsed.imports || [],
          jsdoc: '',
        };
        
        // generateTests will write the test file to disk
        const testSuite = await generateTests(moduleInfo, { 
          examples: [], 
          scenarios: parsed.scenarios || [],
        }, {
          testDir: config.output.testDir,
          moduleFormat: options.format || config.moduleFormat,
        });
        result.testPath = testSuite.testPath;
      } catch (testError) {
        result.warnings.push({
          code: 'TEST_GENERATION_WARNING',
          message: `Test generation failed: ${testError.message}`,
          file,
        });
      }
    }

    // Update cache
    if (cache) {
      await cache.set(file, config, {
        outputPath: result.outputPath,
        code: transformResult.code,
      });
    }

    result.duration = Date.now() - startTime;
    return result;
  } catch (error) {
    result.errors = [
      {
        type: 'generate',
        code: 'COMPILATION_ERROR',
        message: error.message || String(error),
        file,
      },
    ];
    result.duration = Date.now() - startTime;
    return result;
  }
};

/**
 * Display compilation summary.
 *
 * @param {CompilationResult} result - Compilation result
 * @param {CommandContext} context - Command context
 */
export const displaySummary = (result, context) => {
  const { logger, config } = context;
  const { summary } = result;

  logger.blank('');

  if (result.success) {
    logger.success(`Compiled ${summary.succeeded} file${summary.succeeded !== 1 ? 's' : ''} in ${formatDuration(summary.totalDuration)}`);
  } else {
    logger.error(`Compilation failed with ${summary.errorCount} error${summary.errorCount !== 1 ? 's' : ''}`);
  }

  logger.blank('');
  logger.blank(`  Files:     ${summary.succeeded} compiled, ${summary.failed} failed`);
  logger.blank(`  Cache:     ${summary.cached} hit${summary.cached !== 1 ? 's' : ''}, ${summary.total - summary.cached} miss${summary.total - summary.cached !== 1 ? 'es' : ''}`);
  logger.blank(`  Output:    ${config.output.dir}/`);

  // Display errors
  if (summary.errorCount > 0) {
    logger.blank('');
    for (const fileResult of result.files) {
      for (const error of fileResult.errors) {
        logger.formatError(error);
      }
    }
  }

  // Display warnings
  if (summary.warningCount > 0) {
    logger.blank('');
    for (const fileResult of result.files) {
      for (const warning of fileResult.warnings) {
        logger.warn(`${warning.file}: ${warning.message}`);
      }
    }
  }
};

/**
 * Execute the compile command.
 *
 * @param {string[]} files - File or directory paths to compile
 * @param {CompileOptions} options - Command options
 * @param {CommandContext} context - Command context
 * @returns {Promise<CompilationResult>}
 */
export const execute = async (files, options, context) => {
  const { logger } = context;
  const startTime = Date.now();

  // Validate files argument
  if (!files || files.length === 0) {
    logger.error('No files or directories specified');
    logger.blank('');
    logger.info('Usage: gherkin compile <files...>');
    logger.info('');
    logger.info('Examples:');
    logger.info('  gherkin compile features/');
    logger.info('  gherkin compile features/math.feature');
    logger.info('');
    logger.info('See: https://gherkinlang.dev/cli#compile');
    return {
      success: false,
      files: [],
      summary: {
        total: 0,
        succeeded: 0,
        failed: 0,
        cached: 0,
        totalDuration: Date.now() - startTime,
        errorCount: 1,
        warningCount: 0,
      },
    };
  }

  // Discover all files to compile
  let filesToCompile;
  try {
    filesToCompile = await discoverFiles(files, context.cwd);
  } catch (error) {
    logger.error(error.message);
    
    // Add helpful suggestions based on error type
    if (error.message.includes('Path not found')) {
      logger.blank('');
      logger.info('Suggestion: Check that the path exists and is spelled correctly');
      logger.info('');
      logger.info('To create a new project with example features, run:');
      logger.info('  gherkin init --template basic');
    } else if (error.message.includes('Not a .feature file')) {
      logger.blank('');
      logger.info('Suggestion: Only .feature files can be compiled');
      logger.info('');
      logger.info('Examples:');
      logger.info('  gherkin compile features/math.feature');
      logger.info('  gherkin compile features/  # compiles all .feature files');
    }
    
    return {
      success: false,
      files: [],
      summary: {
        total: 0,
        succeeded: 0,
        failed: 0,
        cached: 0,
        totalDuration: Date.now() - startTime,
        errorCount: 1,
        warningCount: 0,
      },
    };
  }

  if (filesToCompile.length === 0) {
    logger.warn('No .feature files found to compile');
    logger.blank('');
    logger.info('Suggestion: Create a .feature file or check your path');
    logger.info('');
    logger.info('To create a new project with example features, run:');
    logger.info('  gherkin init --template basic');
    return {
      success: true,
      files: [],
      summary: {
        total: 0,
        succeeded: 0,
        failed: 0,
        cached: 0,
        totalDuration: Date.now() - startTime,
        errorCount: 0,
        warningCount: 0,
      },
    };
  }

  // Build project context for dependency sorting
  let projectContext = null;
  try {
    projectContext = new ProjectContext();
    await projectContext.build(context.cwd, context.configPath);

    // Check for circular dependencies
    const cycles = projectContext.detectCycles();
    if (cycles.length > 0) {
      logger.error('Circular dependencies detected:');
      for (const cycle of cycles) {
        logger.error(`  ${cycle.message}`);
      }
      return {
        success: false,
        files: [],
        summary: {
          total: filesToCompile.length,
          succeeded: 0,
          failed: filesToCompile.length,
          cached: 0,
          totalDuration: Date.now() - startTime,
          errorCount: cycles.length,
          warningCount: 0,
        },
      };
    }
  } catch {
    // Project context is optional - continue without it
    logger.debug('Could not build project context, compiling without dependency order');
  }

  // Sort files by dependency order
  const sortedFiles = sortByDependency(filesToCompile, projectContext);

  // Create progress indicator
  const progress = createProgress({ noColor: options.noColor });
  const isSingleFile = sortedFiles.length === 1;

  if (!options.quiet) {
    if (isSingleFile) {
      progress.start(`Compiling ${basename(sortedFiles[0])}...`);
    } else {
      progress.start(`Compiling ${sortedFiles.length} files...`);
    }
  }

  // Compile each file
  /** @type {FileResult[]} */
  const results = [];

  for (let i = 0; i < sortedFiles.length; i++) {
    const file = sortedFiles[i];

    if (!options.quiet && !isSingleFile) {
      progress.progress(i + 1, sortedFiles.length, basename(file));
    }

    const result = await compileFile(file, options, context);
    results.push(result);
  }

  // Calculate summary
  const summary = {
    total: results.length,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    cached: results.filter((r) => r.cached).length,
    totalDuration: Date.now() - startTime,
    errorCount: results.reduce((sum, r) => sum + r.errors.length, 0),
    warningCount: results.reduce((sum, r) => sum + r.warnings.length, 0),
  };

  const compilationResult = {
    success: summary.failed === 0,
    files: results,
    summary,
  };

  // Stop progress and show result
  if (!options.quiet) {
    if (compilationResult.success) {
      progress.succeed(`Compiled ${summary.succeeded} file${summary.succeeded !== 1 ? 's' : ''}`);
    } else {
      progress.fail(`Compilation failed`);
    }
  }

  // Display summary
  if (!options.quiet) {
    displaySummary(compilationResult, context);
  }

  return compilationResult;
};

/**
 * Register the compile command with the program.
 *
 * @param {import('commander').Command} program - Commander program instance
 */
export const register = (program) => {
  program
    .command('compile <files...>')
    .description('Compile .feature files to JavaScript')
    .option('-o, --output <dir>', 'Output directory')
    .option('-f, --format <format>', 'Module format: commonjs, esm')
    .option('-t, --target <lang>', 'Target language: javascript, elixir')
    .option('--no-cache', 'Bypass compilation cache')
    .option('--no-tests', 'Skip test generation')
    .action(async (files, options, command) => {
      const globalOpts = command.parent?.opts() || {};
      
      try {
        // Load configuration
        const { config, path: configPath } = await loadConfig(process.cwd());
        const mergedConfig = mergeOptions(config, { ...globalOpts, ...options });

        // Create context
        const context = createContext(mergedConfig, configPath, { ...globalOpts, ...options }, files);

        // Execute compile
        const result = await execute(files, { ...globalOpts, ...options }, context);

        // Exit with appropriate code
        process.exit(result.success ? EXIT_CODES.SUCCESS : EXIT_CODES.ERROR);
      } catch (error) {
        const logger = createLogger({ noColor: globalOpts.noColor });
        logger.error(error.message);
        if (globalOpts.verbose) {
          console.error(error.stack);
        }
        process.exit(EXIT_CODES.ERROR);
      }
    });
};
