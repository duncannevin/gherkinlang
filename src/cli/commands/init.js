/**
 * Init command handler for GherkinLang CLI.
 *
 * Handles the `gherkin init` command, which initializes a new GherkinLang
 * project. Creates project structure, configuration files, and example feature
 * files based on selected template (basic, library, api).
 *
 * @module cli/commands/init
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, join, relative, basename } from 'path';
import { select, confirm } from '@inquirer/prompts';

import { createLogger } from '../utils/logger.js';
import { loadConfig, mergeOptions, createContext } from '../index.js';
import { EXIT_CODES, VALID_TEMPLATES, CONFIG_FILE_NAME } from '../constants.js';

/**
 * @typedef {import('../types.js').InitOptions} InitOptions
 * @typedef {import('../types.js').CommandContext} CommandContext
 * @typedef {import('../types.js').ProjectTemplate} ProjectTemplate
 * @typedef {import('../types.js').TemplateFile} TemplateFile
 */

/**
 * Default configuration for new projects.
 */
const DEFAULT_PROJECT_CONFIG = {
  target: 'javascript',
  moduleFormat: 'commonjs',
  output: {
    dir: 'dist',
    testDir: 'test/generated',
  },
  cache: {
    enabled: true,
    dir: '.gherkin-cache',
  },
  validation: {
    syntax: true,
    purity: true,
    lint: true,
  },
  generation: {
    jsdoc: true,
    tests: true,
  },
};

/**
 * Template definitions for project scaffolding.
 * @type {Record<string, ProjectTemplate>}
 */
export const TEMPLATES = {
  basic: {
    name: 'basic',
    description: 'Minimal setup with one example',
    config: DEFAULT_PROJECT_CONFIG,
    files: [
      {
        path: 'features/example.feature',
        content: `Feature: Example
  A simple example to get started with GherkinLang.

  Scenario: Add two numbers
    Given the first number is 5
    And the second number is 3
    When I add them together
    Then the result should be 8
`,
      },
    ],
  },

  library: {
    name: 'library',
    description: 'Function exports and utilities',
    config: DEFAULT_PROJECT_CONFIG,
    files: [
      {
        path: 'features/math.feature',
        content: `Feature: Math
  Mathematical utility functions.

  Scenario: Calculate factorial
    Given a number n
    When I calculate factorial of n
    Then the result is n! (n factorial)

  Scenario: Check if prime
    Given a number n
    When I check if n is prime
    Then the result is true if n has exactly 2 divisors
`,
      },
      {
        path: 'features/strings.feature',
        content: `Feature: Strings
  String manipulation utilities.

  Scenario: Capitalize a string
    Given a string text
    When I capitalize the string
    Then the first character is uppercase and the rest lowercase

  Scenario: Reverse a string
    Given a string text
    When I reverse the string
    Then the characters are in opposite order
`,
      },
    ],
  },

  api: {
    name: 'api',
    description: 'Express.js CRUD API with users, products, and auth',
    config: {
      ...DEFAULT_PROJECT_CONFIG,
      moduleFormat: 'esm',
    },
    files: [
      {
        path: 'features/database.feature',
        content: `Feature: Database
  Import: date-fns (external)

  In-memory database for storing application data.
  Provides CRUD operations with automatic ID generation and timestamps.

  Scenario: Create a new record
    Given a collection name, record data, and current timestamp
    When I insert the record into the collection
    Then the record is stored with a unique auto-generated id
    And the record includes createdAt timestamp
    And the complete record with id and timestamps is returned

  Scenario: Find record by id
    Given a collection name and a record id
    When I query the collection for that id
    Then the matching record is returned or null if not found

  Scenario: Find all records in collection
    Given a collection name
    When I query for all records
    Then an array of all records in the collection is returned

  Scenario: Find records matching criteria
    Given a collection name and a filter object
    When I query with the filter
    Then an array of records matching all filter criteria is returned

  Scenario: Update a record
    Given a collection name, record id, update data, and current timestamp
    When I update the record
    Then the record is modified with the new data
    And the record includes updatedAt timestamp
    And the updated record is returned or null if not found

  Scenario: Delete a record
    Given a collection name and a record id
    When I delete the record
    Then the record is removed from the collection
    And true is returned if deleted, false if not found

  Scenario: Clear a collection
    Given a collection name
    When I clear the collection
    Then all records in that collection are removed
`,
      },
      {
        path: 'features/validation.feature',
        content: `Feature: Validation
  Input validation utilities for API request data.
  Returns validation results with error messages.

  Scenario: Validate required fields
    Given an object and a list of required field names
    When I validate required fields
    Then the result indicates which required fields are missing

  Scenario: Validate email format
    Given an email string
    When I validate the email format
    Then the result is true if valid email format, false otherwise

  Scenario: Validate string length
    Given a string, minimum length, and maximum length
    When I validate the string length
    Then the result is true if length is within bounds, false otherwise

  Scenario: Validate number range
    Given a number, minimum value, and maximum value
    When I validate the number range
    Then the result is true if number is within range, false otherwise

  Scenario: Validate user input
    Given user data with name, email, and optional age
    When I validate the user input
    Then the result contains isValid boolean and errors array
    And errors include messages for invalid name, email, or age

  Scenario: Validate product input
    Given product data with name, price, and optional description
    When I validate the product input
    Then the result contains isValid boolean and errors array
    And errors include messages for invalid name or price
`,
      },
      {
        path: 'features/users.feature',
        content: `Feature: Users
  Import: Database
  Import: Validation

  User management operations for the API.
  Handles CRUD operations for user records.

  Scenario: Create a new user
    Given user data with name and email
    When I validate the user input
    And the validation passes
    And I create the user in the database
    Then the new user record with id is returned

  Scenario: Create user with validation error
    Given invalid user data
    When I validate the user input
    And the validation fails
    Then an error result with validation messages is returned

  Scenario: Get user by id
    Given a user id
    When I fetch the user from the database
    Then the user data is returned or null if not found

  Scenario: Get all users
    When I fetch all users from the database
    Then an array of all user records is returned

  Scenario: Update user
    Given a user id and update data
    When I validate the update data
    And the validation passes
    And I update the user in the database
    Then the updated user record is returned or null if not found

  Scenario: Delete user
    Given a user id
    When I delete the user from the database
    Then true is returned if deleted, false if not found

  Scenario: Find users by email
    Given an email address
    When I search for users with that email
    Then an array of matching users is returned
`,
      },
      {
        path: 'features/products.feature',
        content: `Feature: Products
  Import: Database
  Import: Validation

  Product catalog management for the API.
  Handles CRUD operations for product records.

  Scenario: Create a new product
    Given product data with name, price, and description
    When I validate the product input
    And the validation passes
    And I create the product in the database
    Then the new product record with id is returned

  Scenario: Create product with validation error
    Given invalid product data
    When I validate the product input
    And the validation fails
    Then an error result with validation messages is returned

  Scenario: Get product by id
    Given a product id
    When I fetch the product from the database
    Then the product data is returned or null if not found

  Scenario: Get all products
    When I fetch all products from the database
    Then an array of all product records is returned

  Scenario: Update product
    Given a product id and update data
    When I validate the update data
    And the validation passes
    And I update the product in the database
    Then the updated product record is returned or null if not found

  Scenario: Delete product
    Given a product id
    When I delete the product from the database
    Then true is returned if deleted, false if not found

  Scenario: Find products by price range
    Given a minimum price and maximum price
    When I search for products in that price range
    Then an array of matching products is returned

  Scenario: Find products by name search
    Given a search term
    When I search for products with names containing the term
    Then an array of matching products is returned
`,
      },
      {
        path: 'features/auth.feature',
        content: `Feature: Auth
  Import: Database
  Import: Users
  Import: date-fns (external)

  Authentication utilities for the API.
  Handles password hashing, token generation, and verification.

  Scenario: Hash a password
    Given a plain text password
    When I hash the password
    Then a hashed password string is returned
    And the hash is different from the original password

  Scenario: Verify password
    Given a plain text password and a hashed password
    When I verify the password against the hash
    Then true is returned if they match, false otherwise

  Scenario: Generate auth token
    Given a user id, current timestamp, and optional expiration hours
    When I generate an auth token with expiration
    Then a token string is returned containing the user id and expiration

  Scenario: Verify auth token
    Given an auth token and current timestamp
    When I verify the token checking expiration
    Then the decoded payload with user id is returned if valid
    And null is returned if the token is invalid or expired

  Scenario: Register new user
    Given registration data with name, email, and password
    When I validate the registration data
    And the validation passes
    And no user exists with that email
    And I hash the password
    And I create the user with hashed password
    Then the new user record without password is returned
    And an auth token is generated for the user

  Scenario: Login user
    Given login credentials with email and password
    When I find the user by email
    And the user exists
    And I verify the password
    Then the user record without password is returned
    And an auth token is generated for the user

  Scenario: Login with invalid credentials
    Given login credentials with email and password
    When I find the user by email
    And the user does not exist or password is invalid
    Then an authentication error is returned
`,
      },
      {
        path: 'features/responses.feature',
        content: `Feature: Responses
  HTTP response formatting utilities for the API.
  Standardizes API response structure.

  Scenario: Create success response
    Given response data and optional message
    When I create a success response
    Then the response has status "success"
    And the response includes the data
    And the response includes the message if provided

  Scenario: Create error response
    Given an error message and optional error code
    When I create an error response
    Then the response has status "error"
    And the response includes the error message
    And the response includes the error code if provided

  Scenario: Create validation error response
    Given an array of validation errors
    When I create a validation error response
    Then the response has status "error"
    And the response has code "VALIDATION_ERROR"
    And the response includes the validation errors array

  Scenario: Create not found response
    Given a resource type and identifier
    When I create a not found response
    Then the response has status "error"
    And the response has code "NOT_FOUND"
    And the message indicates the resource was not found

  Scenario: Create unauthorized response
    Given an optional message
    When I create an unauthorized response
    Then the response has status "error"
    And the response has code "UNAUTHORIZED"
    And the message indicates authentication is required

  Scenario: Create paginated response
    Given an array of items, page number, page size, and total count
    When I create a paginated response
    Then the response has status "success"
    And the response includes the items array
    And the response includes pagination metadata
`,
      },
      {
        path: 'features/health.feature',
        content: `Feature: Health
  Import: date-fns (external)

  Health check endpoint for API monitoring.
  Provides system status and uptime information.

  Scenario: Get health status
    Given the application start timestamp and current timestamp
    When I check the health status
    Then the status is "healthy"
    And the response includes uptime in seconds
    And the response includes the formatted current timestamp
    And the response includes the application version

  Scenario: Get detailed health status
    Given the application start timestamp, current timestamp, and memory info
    When I check the detailed health status
    Then the status is "healthy" or "degraded" based on memory usage
    And the response includes memory usage information
    And the response includes uptime in seconds
    And the response includes the formatted timestamp
`,
      },
    ],
  },
};

/**
 * Get template definition by name.
 *
 * @param {string} name - Template name: 'basic' | 'library' | 'api'
 * @returns {ProjectTemplate | null} Template or null if not found
 */
export const getTemplate = (name) => {
  return TEMPLATES[name] || null;
};

/**
 * Prompt user for template selection.
 *
 * @returns {Promise<string>} Selected template name
 */
export const promptTemplate = async () => {
  const choices = Object.values(TEMPLATES).map((template) => ({
    name: `${template.name.charAt(0).toUpperCase() + template.name.slice(1)} - ${template.description}`,
    value: template.name,
  }));

  const selected = await select({
    message: 'Choose a project template:',
    choices,
  });

  return selected;
};

/**
 * Prompt user to confirm overwrite.
 *
 * @param {string} targetDir - Directory that will be overwritten
 * @returns {Promise<boolean>} True if user confirms
 */
export const promptOverwrite = async (targetDir) => {
  const confirmed = await confirm({
    message: `Directory ${targetDir} already contains a ${CONFIG_FILE_NAME}. Overwrite?`,
    default: false,
  });

  return confirmed;
};

/**
 * Validate and create target directory.
 *
 * @param {string} targetDir - Target directory path
 * @param {InitOptions} options - Init options
 * @param {CommandContext} context - Command context
 * @returns {Promise<{valid: boolean, message?: string}>}
 */
export const validateDirectory = async (targetDir, options, context) => {
  const { logger } = context;

  // Check if directory exists
  if (existsSync(targetDir)) {
    const configPath = join(targetDir, CONFIG_FILE_NAME);

    // Check if it already has a config file
    if (existsSync(configPath)) {
      if (options.force) {
        logger.warn(`Overwriting existing ${CONFIG_FILE_NAME}`);
        return { valid: true };
      }

      if (options.yes) {
        // In non-interactive mode without --force, fail
        return {
          valid: false,
          message: `Directory already contains ${CONFIG_FILE_NAME}. Use --force to overwrite.`,
        };
      }

      // Prompt for confirmation
      const confirmed = await promptOverwrite(targetDir);
      if (!confirmed) {
        return { valid: false, message: 'Initialization cancelled.' };
      }
    }
  } else {
    // Create the directory
    try {
      mkdirSync(targetDir, { recursive: true });
      logger.debug(`Created directory: ${targetDir}`);
    } catch (error) {
      return {
        valid: false,
        message: `Failed to create directory: ${error.message}`,
      };
    }
  }

  return { valid: true };
};

/**
 * Create project from template.
 *
 * @param {string} targetDir - Target directory
 * @param {ProjectTemplate} template - Template to use
 * @param {CommandContext} context - Command context
 * @returns {Promise<string[]>} Created file paths
 */
export const createProject = async (targetDir, template, context) => {
  const { logger } = context;
  const createdFiles = [];

  // Create config file
  const configPath = join(targetDir, CONFIG_FILE_NAME);
  const configContent = JSON.stringify(template.config, null, 2);

  writeFileSync(configPath, configContent, 'utf-8');
  createdFiles.push(configPath);
  logger.success(`Created ${CONFIG_FILE_NAME}`);

  // Create template files
  for (const file of template.files) {
    const filePath = join(targetDir, file.path);
    const fileDir = join(targetDir, file.path.split('/').slice(0, -1).join('/'));

    // Ensure directory exists
    if (!existsSync(fileDir)) {
      mkdirSync(fileDir, { recursive: true });
    }

    writeFileSync(filePath, file.content, 'utf-8');
    createdFiles.push(filePath);
    logger.success(`Created ${file.path}`);
  }

  return createdFiles;
};

/**
 * Display next steps after initialization.
 *
 * @param {string} projectDir - Created project directory
 * @param {ProjectTemplate} template - Used template
 * @param {CommandContext} context - Command context
 */
export const displayNextSteps = (projectDir, template, context) => {
  const { logger } = context;
  const relDir = relative(process.cwd(), projectDir) || '.';
  const isCurrentDir = relDir === '.';

  logger.blank('');
  logger.success('Project initialized successfully!');
  logger.blank('');
  logger.info('Next steps:');

  if (!isCurrentDir) {
    logger.blank(`  cd ${relDir}`);
  }

  logger.blank('  gherkin compile features/');
  logger.blank('');
  logger.blank('Learn more: https://gherkinlang.dev/getting-started');
};

/**
 * Execute the init command.
 *
 * @param {string | undefined} name - Project name (optional)
 * @param {InitOptions} options - Command options
 * @param {CommandContext} context - Command context
 * @returns {Promise<void>}
 */
export const execute = async (name, options, context) => {
  const { logger } = context;

  logger.info('Creating new GherkinLang project...');
  logger.blank('');

  // Determine target directory
  const targetDir = name ? resolve(context.cwd, name) : context.cwd;

  // Validate/create directory
  const validation = await validateDirectory(targetDir, options, context);
  if (!validation.valid) {
    logger.error(validation.message);
    return;
  }

  // Determine template
  let templateName = options.template;

  if (!templateName) {
    if (options.yes) {
      // Default to basic in non-interactive mode
      templateName = 'basic';
    } else {
      // Prompt for template
      templateName = await promptTemplate();
    }
  }

  // Validate template name
  if (!VALID_TEMPLATES.includes(templateName)) {
    logger.error(
      `Invalid template: ${templateName}. Valid options: ${VALID_TEMPLATES.join(', ')}`
    );
    return;
  }

  const template = getTemplate(templateName);
  if (!template) {
    logger.error(`Template not found: ${templateName}`);
    return;
  }

  // Create project
  logger.blank('');
  await createProject(targetDir, template, context);

  // Display next steps
  displayNextSteps(targetDir, template, context);
};

/**
 * Register the init command with the program.
 *
 * @param {import('commander').Command} program - Commander program instance
 */
export const register = (program) => {
  program
    .command('init [name]')
    .description('Initialize a new GherkinLang project')
    .option('-t, --template <type>', 'Template: basic, library, api')
    .option('-y, --yes', 'Accept all defaults without prompts')
    .option('--force', 'Overwrite existing files')
    .action(async (name, options, command) => {
      const globalOpts = command.parent?.opts() || {};

      try {
        // Load configuration (for defaults)
        const { config, path: configPath } = await loadConfig(process.cwd());
        const mergedConfig = mergeOptions(config, { ...globalOpts, ...options });

        // Create context
        const context = createContext(
          mergedConfig,
          configPath,
          { ...globalOpts, ...options },
          name ? [name] : []
        );

        // Execute init
        await execute(name, { ...globalOpts, ...options }, context);

        process.exit(EXIT_CODES.SUCCESS);
      } catch (error) {
        const logger = createLogger({ noColor: globalOpts.noColor });

        // Handle user cancellation (Ctrl+C during prompts)
        if (error.name === 'ExitPromptError') {
          logger.blank('');
          logger.info('Initialization cancelled.');
          process.exit(EXIT_CODES.SUCCESS);
        }

        logger.error(error.message);
        if (globalOpts.verbose) {
          console.error(error.stack);
        }
        process.exit(EXIT_CODES.ERROR);
      }
    });
};
