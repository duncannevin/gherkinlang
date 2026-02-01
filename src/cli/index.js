/**
 * CLI setup and initialization for GherkinLang compiler.
 *
 * Sets up the command-line interface, parses arguments, routes commands to
 * appropriate handlers, and manages CLI lifecycle. Integrates with the compiler
 * orchestrator to execute user commands.
 *
 * @module cli
 */

import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, parse as parsePath } from 'path';
import { fileURLToPath } from 'url';

import { createLogger } from './utils/logger.js';
import { CONFIG_FILE_NAME, DEFAULT_CONFIG, EXIT_CODES } from './constants.js';
import { register as registerCompile } from './commands/compile.js';
import { register as registerWatch } from './commands/watch.js';
import { register as registerInit } from './commands/init.js';

// Get package.json for version
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '../../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const { version } = packageJson;

/**
 * Search for .gherkinrc.json starting from startDir up to filesystem root.
 *
 * @param {string} startDir - Directory to start search from
 * @returns {string|null} Path to config file or null if not found
 */
export const findConfigFile = (startDir) => {
  let dir = startDir;
  const root = parsePath(dir).root;

  while (dir !== root) {
    const configPath = join(dir, CONFIG_FILE_NAME);
    if (existsSync(configPath)) {
      return configPath;
    }
    const parentDir = dirname(dir);
    if (parentDir === dir) break; // Reached root
    dir = parentDir;
  }

  // Check root directory as well
  const rootConfigPath = join(root, CONFIG_FILE_NAME);
  if (existsSync(rootConfigPath)) {
    return rootConfigPath;
  }

  return null;
};

/**
 * Load and parse configuration from .gherkinrc.json.
 *
 * @param {string} startDir - Directory to start search from
 * @returns {Promise<{config: import('./types.js').CLIConfiguration, path: string|null}>}
 */
export const loadConfig = async (startDir) => {
  const configPath = findConfigFile(startDir);

  if (!configPath) {
    return { config: { ...DEFAULT_CONFIG }, path: null };
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const userConfig = JSON.parse(content);

    // Deep merge user config with defaults
    const config = {
      ...DEFAULT_CONFIG,
      ...userConfig,
      output: { ...DEFAULT_CONFIG.output, ...userConfig.output },
      cache: { ...DEFAULT_CONFIG.cache, ...userConfig.cache },
      validation: { ...DEFAULT_CONFIG.validation, ...userConfig.validation },
      ai: { ...DEFAULT_CONFIG.ai, ...userConfig.ai },
      generation: { ...DEFAULT_CONFIG.generation, ...userConfig.generation },
      watch: { ...DEFAULT_CONFIG.watch, ...userConfig.watch },
    };

    return { config, path: configPath };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${configPath}: ${error.message}`);
    }
    throw error;
  }
};

/**
 * Merge CLI options with loaded configuration.
 * CLI options take precedence over config file.
 *
 * @param {import('./types.js').CLIConfiguration} config - Loaded config
 * @param {Object} options - CLI options
 * @returns {import('./types.js').CLIConfiguration}
 */
export const mergeOptions = (config, options) => {
  const merged = { ...config };

  if (options.output) {
    merged.output = { ...merged.output, dir: options.output };
  }
  if (options.format) {
    merged.moduleFormat = options.format;
  }
  if (options.target) {
    merged.target = options.target;
  }
  if (options.noCache !== undefined) {
    merged.cache = { ...merged.cache, enabled: !options.noCache };
  }
  if (options.noTests !== undefined) {
    merged.generation = { ...merged.generation, tests: !options.noTests };
  }

  return merged;
};

/**
 * Create command context for a handler.
 *
 * @param {import('./types.js').CLIConfiguration} config - Merged configuration
 * @param {string|null} configPath - Path to config file
 * @param {Object} options - Parsed CLI options
 * @param {string[]} args - Positional arguments
 * @returns {import('./types.js').CommandContext}
 */
export const createContext = (config, configPath, options, args = []) => {
  const logger = createLogger({
    noColor: options.noColor || options.parent?.noColor,
    verbose: options.verbose || options.parent?.verbose,
    quiet: options.quiet || options.parent?.quiet,
  });

  const abortController = new AbortController();

  return {
    config,
    configPath,
    cwd: process.cwd(),
    logger,
    options,
    args,
    abortController,
  };
};

/**
 * Create and configure the CLI program.
 *
 * @returns {Command} Configured commander program
 */
export const createProgram = () => {
  const program = new Command();

  program
    .name('gherkin')
    .version(version, '-V, --version', 'Output version number')
    .description('GherkinLang compiler for JavaScript')
    .option('--no-color', 'Disable colored output')
    .option('-v, --verbose', 'Enable verbose output')
    .option('-q, --quiet', 'Suppress non-error output')
    .configureOutput({
      writeErr: (str) => process.stderr.write(str),
      writeOut: (str) => process.stdout.write(str),
    });

  // Compile command
  registerCompile(program);

  // Watch command
  registerWatch(program);

  // Start command - convenience for compile + watch on features/
  program
    .command('start')
    .description('Compile and watch the features directory')
    .option('-d, --dir <dir>', 'Directory to watch', 'features')
    .option('-o, --output <dir>', 'Output directory')
    .option('-f, --format <format>', 'Module format: commonjs, esm')
    .option('-t, --target <lang>', 'Target language: javascript, elixir')
    .option('--no-cache', 'Bypass compilation cache')
    .option('--no-tests', 'Skip test generation')
    .option('--debounce <ms>', 'Debounce delay in milliseconds', '100')
    .action(async (options, command) => {
      const globalOpts = command.parent?.opts() || {};
      const { execute } = await import('./commands/watch.js');

      try {
        // Load configuration
        const { config, path: configPath } = await loadConfig(process.cwd());
        const mergedConfig = mergeOptions(config, { ...globalOpts, ...options });

        // Create context
        const context = createContext(
          mergedConfig,
          configPath,
          { ...globalOpts, ...options },
          [options.dir]
        );

        // Execute watch with initial compile
        await execute(options.dir, { ...globalOpts, ...options, initial: true }, context);

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

  // Init command
  registerInit(program);

  // Cache command (out of scope - stub only)
  program
    .command('cache')
    .description('Manage compilation cache')
    .action(async () => {
      const logger = createLogger({ noColor: program.opts().noColor });
      logger.warn('Cache command not implemented in this phase.');
      process.exit(EXIT_CODES.ERROR);
    });

  // Validate command (out of scope - stub only)
  program
    .command('validate')
    .description('Validate .feature files')
    .action(async () => {
      const logger = createLogger({ noColor: program.opts().noColor });
      logger.warn('Validate command not implemented in this phase.');
      process.exit(EXIT_CODES.ERROR);
    });

  // Test command (out of scope - stub only)
  program
    .command('test')
    .description('Run generated tests')
    .action(async () => {
      const logger = createLogger({ noColor: program.opts().noColor });
      logger.warn('Test command not implemented in this phase.');
      process.exit(EXIT_CODES.ERROR);
    });

  // Handle unknown commands
  program.on('command:*', (operands) => {
    const logger = createLogger({ noColor: program.opts().noColor });
    logger.error(`Unknown command: ${operands[0]}`);
    
    const availableCommands = program.commands.map((cmd) => cmd.name());
    const similar = availableCommands.find((cmd) => 
      cmd.startsWith(operands[0][0]) || operands[0].startsWith(cmd[0])
    );
    
    if (similar) {
      console.error(`Did you mean: gherkin ${similar}?`);
    }
    
    console.error('');
    console.error('Run "gherkin --help" for usage information.');
    process.exit(EXIT_CODES.USAGE_ERROR);
  });

  return program;
};

/**
 * Run the CLI with given arguments.
 *
 * @param {string[]} [args=process.argv] - Command-line arguments
 * @returns {Promise<void>}
 */
export const run = async (args = process.argv) => {
  const program = createProgram();

  try {
    await program.parseAsync(args);

    // If no command was provided, show help
    if (args.length <= 2) {
      program.help();
    }
  } catch (error) {
    const logger = createLogger({});
    
    if (error.code === 'commander.helpDisplayed' || error.code === 'commander.version') {
      process.exit(EXIT_CODES.SUCCESS);
    }

    logger.error(error.message);
    
    if (logger.level === 0) {
      // Verbose mode - show stack trace
      console.error(error.stack);
    }

    process.exit(EXIT_CODES.ERROR);
  }
};

export { version };
