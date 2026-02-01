/**
 * Watch command handler for GherkinLang CLI.
 *
 * Handles the `gherkin watch` command, which watches a directory for changes
 * and automatically recompiles affected files. Manages file system events,
 * debouncing, and incremental compilation.
 *
 * @module cli/commands/watch
 */

import chokidar from 'chokidar';
import { existsSync, statSync } from 'fs';
import { resolve, basename, relative } from 'path';

import { createLogger } from '../utils/logger.js';
import { createProgress, formatDuration } from '../utils/progress.js';
import { loadConfig, mergeOptions, createContext } from '../index.js';
import {
  EXIT_CODES,
  FEATURE_FILE_EXTENSION,
  DEFAULT_WATCH_CONFIG,
} from '../constants.js';

// Import compile command functions for reuse
import { discoverFiles, sortByDependency, compileFile } from './compile.js';

// Import project context for dependency graph
import { ProjectContext } from '../../compiler/context.js';

/**
 * @typedef {import('../types.js').WatchOptions} WatchOptions
 * @typedef {import('../types.js').CommandContext} CommandContext
 * @typedef {import('../types.js').WatchEvent} WatchEvent
 * @typedef {import('../types.js').WatchState} WatchState
 * @typedef {import('../types.js').WatchSummary} WatchSummary
 */

/**
 * Create initial watch state.
 *
 * @returns {WatchState}
 */
export const createWatchState = () => {
  return {
    isCompiling: false,
    pendingFiles: new Set(),
    lastCompiled: new Map(),
    summary: {
      compilations: 0,
      succeeded: 0,
      failed: 0,
      startTime: Date.now(),
    },
  };
};

/**
 * Create a file watcher for .feature files.
 *
 * @param {string} dir - Directory to watch
 * @param {WatchOptions} options - Watch options
 * @returns {import('chokidar').FSWatcher} Chokidar watcher instance
 */
export const createWatcher = (dir, options) => {
  const absoluteDir = resolve(dir);

  // Determine patterns to ignore
  const ignorePatterns = [
    '**/node_modules/**',
    '**/dist/**',
    '**/.gherkin-cache/**',
    ...(options.ignore || []).map((p) =>
      p.startsWith('**/') ? p : `**/${p}/**`
    ),
  ];

  const watcher = chokidar.watch(`${absoluteDir}/**/*${FEATURE_FILE_EXTENSION}`, {
    persistent: true,
    ignoreInitial: true, // Don't emit events for existing files on startup
    ignored: ignorePatterns,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  return watcher;
};

/**
 * Create a debounced function that accumulates calls.
 *
 * @param {function(Set<string>): Promise<void>} fn - Function to debounce
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {{add: function(string): void, cancel: function(): void}}
 */
export const createDebouncer = (fn, delay) => {
  /** @type {Set<string>} */
  const pending = new Set();
  /** @type {NodeJS.Timeout | null} */
  let timer = null;

  return {
    /**
     * Add a file to the pending set and reset the timer.
     * @param {string} file - File path to add
     */
    add(file) {
      pending.add(file);

      if (timer) {
        clearTimeout(timer);
      }

      timer = setTimeout(async () => {
        const filesToProcess = new Set(pending);
        pending.clear();
        timer = null;
        await fn(filesToProcess);
      }, delay);
    },

    /**
     * Cancel any pending debounced call.
     */
    cancel() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      pending.clear();
    },

    /**
     * Get the current pending files.
     * @returns {Set<string>}
     */
    getPending() {
      return new Set(pending);
    },
  };
};

/**
 * Get files that need recompilation (changed + dependents).
 *
 * @param {string} changedFile - Path to changed file
 * @param {ProjectContext | null} projectContext - Project context
 * @returns {string[]} Files to recompile
 */
export const getFilesToRecompile = (changedFile, projectContext) => {
  const files = [changedFile];

  if (!projectContext || !projectContext._graph) {
    return files;
  }

  // Get the module name for this file
  const moduleName = projectContext._fileToModule?.get(changedFile);
  if (!moduleName) {
    return files;
  }

  // Find all files that depend on this module (reverse edges)
  const dependents = projectContext._graph.reverseEdges?.get(moduleName);
  if (!dependents || dependents.size === 0) {
    return files;
  }

  // Add dependent files
  for (const depModule of dependents) {
    const depInfo = projectContext.getModule(depModule);
    if (depInfo?.file) {
      files.push(depInfo.file);
    }
  }

  return files;
};

/**
 * Handle a file change event.
 *
 * @param {WatchEvent} event - File system event
 * @param {WatchState} state - Current watch state
 * @param {CommandContext} context - Command context
 * @param {ProjectContext | null} projectContext - Project context for dependencies
 * @param {WatchOptions} options - Watch options
 * @returns {Promise<void>}
 */
export const handleEvent = async (
  event,
  state,
  context,
  projectContext,
  options
) => {
  const { logger } = context;
  const relPath = relative(context.cwd, event.path);
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });

  switch (event.type) {
    case 'add':
      logger.info(`[${timestamp}] Added: ${relPath}`);
      break;
    case 'change':
      logger.info(`[${timestamp}] Changed: ${relPath}`);
      break;
    case 'unlink':
      logger.info(`[${timestamp}] Deleted: ${relPath}`);
      // For deleted files, we don't need to recompile
      // Just log and potentially update context
      return;
  }

  // Get all files that need recompilation
  const filesToRecompile = getFilesToRecompile(event.path, projectContext);

  // Sort by dependency order
  const sortedFiles = sortByDependency(filesToRecompile, projectContext);

  if (sortedFiles.length > 1) {
    const fileNames = sortedFiles.map((f) => basename(f)).join(', ');
    logger.info(`[${timestamp}] Recompiling: ${fileNames}`);
  }

  // Compile each file
  const progress = createProgress({ noColor: options.noColor });
  state.isCompiling = true;

  let succeeded = 0;
  let failed = 0;
  const startTime = Date.now();

  for (const file of sortedFiles) {
    const result = await compileFile(file, options, context);

    if (result.success) {
      succeeded++;
      state.lastCompiled.set(file, Date.now());
    } else {
      failed++;
      // Display errors
      for (const error of result.errors) {
        logger.formatError(error);
      }
    }
  }

  state.isCompiling = false;
  state.summary.compilations++;

  const duration = Date.now() - startTime;

  if (failed === 0) {
    state.summary.succeeded++;
    progress.succeed(
      `Compiled ${succeeded} file${succeeded !== 1 ? 's' : ''} in ${formatDuration(duration)}`
    );
  } else {
    state.summary.failed++;
    progress.fail(
      `Compiled ${succeeded} file${succeeded !== 1 ? 's' : ''}, ${failed} failed`
    );
  }
};

/**
 * Gracefully shutdown the watcher.
 *
 * @param {import('chokidar').FSWatcher} watcher - Chokidar watcher
 * @param {WatchState} state - Current state
 * @param {CommandContext} context - Command context
 * @returns {Promise<void>}
 */
export const shutdown = async (watcher, state, context) => {
  const { logger } = context;

  // Close the watcher
  await watcher.close();

  // Calculate duration
  const duration = Date.now() - state.summary.startTime;

  // Display summary
  logger.blank('');
  logger.info('Stopped watching. Summary:');
  logger.blank(`  Duration:  ${formatDuration(duration)}`);
  logger.blank(
    `  Compiles:  ${state.summary.succeeded} successful, ${state.summary.failed} failed`
  );
};

/**
 * Execute the watch command.
 *
 * @param {string} dir - Directory to watch
 * @param {WatchOptions} options - Command options
 * @param {CommandContext} context - Command context
 * @returns {Promise<void>} Resolves on graceful shutdown
 */
export const execute = async (dir, options, context) => {
  const { logger } = context;

  // Validate directory argument
  if (!dir || dir.trim() === '') {
    logger.error('No directory specified');
    logger.blank('');
    logger.info('Usage: gherkin watch <directory>');
    logger.info('');
    logger.info('Examples:');
    logger.info('  gherkin watch features/');
    logger.info('  gherkin watch src/features --initial');
    logger.info('');
    logger.info('See: https://gherkinlang.dev/cli#watch');
    return;
  }

  // Validate directory exists
  const absoluteDir = resolve(context.cwd, dir);
  if (!existsSync(absoluteDir)) {
    logger.error(`Directory not found: ${dir}`);
    logger.blank('');
    logger.info('Suggestion: Check that the directory exists and is spelled correctly');
    logger.info('');
    logger.info('To create a new project with a features directory, run:');
    logger.info('  gherkin init --template basic');
    logger.info('');
    logger.info('Or create the directory manually:');
    logger.info(`  mkdir -p ${dir}`);
    return;
  }

  const stat = statSync(absoluteDir);
  if (!stat.isDirectory()) {
    logger.error(`Not a directory: ${dir}`);
    logger.blank('');
    logger.info('Suggestion: The watch command requires a directory path');
    logger.info('');
    logger.info('To compile a single file, use the compile command:');
    logger.info(`  gherkin compile ${dir}`);
    return;
  }

  // Build project context for dependency tracking
  let projectContext = null;
  try {
    projectContext = new ProjectContext();
    await projectContext.build(absoluteDir, context.configPath);

    // Check for circular dependencies
    const cycles = projectContext.detectCycles();
    if (cycles.length > 0) {
      logger.error('Circular dependencies detected:');
      for (const cycle of cycles) {
        logger.error(`  ${cycle.message}`);
      }
      return;
    }
  } catch (error) {
    logger.debug(
      `Could not build project context: ${error.message}. Continuing without dependency tracking.`
    );
  }

  // If --initial, compile all files first
  if (options.initial) {
    logger.info('Performing initial compilation...');

    try {
      const files = await discoverFiles([absoluteDir], context.cwd);
      const sortedFiles = sortByDependency(files, projectContext);

      const progress = createProgress({ noColor: options.noColor });
      progress.start(`Compiling ${sortedFiles.length} files...`);

      let succeeded = 0;
      let failed = 0;
      const startTime = Date.now();

      for (let i = 0; i < sortedFiles.length; i++) {
        const file = sortedFiles[i];
        progress.progress(i + 1, sortedFiles.length, basename(file));

        const result = await compileFile(file, options, context);

        if (result.success) {
          succeeded++;
        } else {
          failed++;
          for (const error of result.errors) {
            logger.formatError(error);
          }
        }
      }

      const duration = Date.now() - startTime;

      if (failed === 0) {
        progress.succeed(
          `Initial compilation: ${succeeded} file${succeeded !== 1 ? 's' : ''} in ${formatDuration(duration)}`
        );
      } else {
        progress.fail(
          `Initial compilation: ${succeeded} compiled, ${failed} failed`
        );
      }

      logger.blank('');
    } catch (error) {
      logger.error(`Initial compilation failed: ${error.message}`);
      return;
    }
  }

  // Create watch state
  const state = createWatchState();

  // Create watcher
  const debounceMs = parseInt(String(options.debounce), 10) || DEFAULT_WATCH_CONFIG.debounce;
  const watcher = createWatcher(absoluteDir, options);

  // Create debouncer for handling rapid file changes
  const debouncer = createDebouncer(async (files) => {
    for (const file of files) {
      await handleEvent(
        { type: 'change', path: file, timestamp: Date.now() },
        state,
        context,
        projectContext,
        options
      );
    }
  }, debounceMs);

  // Set up event handlers
  watcher.on('add', (path) => {
    const absolutePath = resolve(path);
    debouncer.add(absolutePath);
    state.pendingFiles.add(absolutePath);
  });

  watcher.on('change', (path) => {
    const absolutePath = resolve(path);
    debouncer.add(absolutePath);
    state.pendingFiles.add(absolutePath);
  });

  watcher.on('unlink', (path) => {
    const absolutePath = resolve(path);
    const relPath = relative(context.cwd, absolutePath);
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    logger.info(`[${timestamp}] Deleted: ${relPath}`);
    // Remove from pending and last compiled
    state.pendingFiles.delete(absolutePath);
    state.lastCompiled.delete(absolutePath);
  });

  watcher.on('error', (error) => {
    logger.error(`Watcher error: ${error.message}`);
  });

  // Display watching message
  const relDir = relative(context.cwd, absoluteDir) || '.';
  logger.info(`👀 Watching ${relDir}/ for changes...`);
  logger.blank('');

  // Set up signal handling for graceful shutdown
  let isShuttingDown = false;

  const cleanup = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    debouncer.cancel();
    await shutdown(watcher, state, context);
  };

  // Handle SIGINT/SIGTERM directly with 'once' to avoid duplicate calls
  const signalHandler = async () => {
    await cleanup();
    process.exit(EXIT_CODES.SUCCESS);
  };

  process.once('SIGINT', signalHandler);
  process.once('SIGTERM', signalHandler);

  // Also handle abort signal from context
  context.abortController.signal.addEventListener('abort', () => {
    cleanup().then(() => process.exit(EXIT_CODES.SUCCESS));
  });

  // Return a promise that never resolves (keeps the process alive)
  // The process exits via signal handlers above
  return new Promise(() => {
    watcher.on('ready', () => {
      logger.debug('Watcher ready');
    });
  });
};

/**
 * Register the watch command with the program.
 *
 * @param {import('commander').Command} program - Commander program instance
 */
export const register = (program) => {
  program
    .command('watch <dir>')
    .description('Watch directory and recompile on changes')
    .option('--initial', 'Compile all files before watching')
    .option(
      '--debounce <ms>',
      'Debounce delay in milliseconds',
      String(DEFAULT_WATCH_CONFIG.debounce)
    )
    .option('-o, --output <dir>', 'Output directory')
    .option('-f, --format <format>', 'Module format: commonjs, esm')
    .option('-t, --target <lang>', 'Target language: javascript, elixir')
    .option('--no-cache', 'Bypass compilation cache')
    .option('--no-tests', 'Skip test generation')
    .action(async (dir, options, command) => {
      const globalOpts = command.parent?.opts() || {};

      try {
        // Load configuration
        const { config, path: configPath } = await loadConfig(process.cwd());
        const mergedConfig = mergeOptions(config, { ...globalOpts, ...options });

        // Create context
        const context = createContext(
          mergedConfig,
          configPath,
          { ...globalOpts, ...options },
          [dir]
        );

        // Execute watch
        await execute(dir, { ...globalOpts, ...options }, context);

        // Exit successfully after shutdown
        process.exit(EXIT_CODES.SUCCESS);
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
