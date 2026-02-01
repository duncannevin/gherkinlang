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
        content: `Feature: DatabaseService
  In-memory database service for storing application data.
  Uses state management for persistent storage across operations.
  Provides CRUD operations with automatic ID generation and timestamps.

Background:
  Given import date-fns as dateFns
  And initial state is { collections: {}, nextId: 1 }
  And state accepts messages:
    | insert    | add record to collection with auto id       |
    | findById  | return record by id from collection         |
    | findAll   | return all records from collection          |
    | findWhere | return records matching filter criteria     |
    | update    | update record by id in collection           |
    | delete    | remove record by id from collection         |
    | clear     | remove all records from collection          |

Scenario: insert defines a message handler
  Given state contains collections and nextId
  When receive insert message with collection, data, and timestamp
  Then create record with id from nextId and createdAt from timestamp
  And add record to the collection array
  And increment nextId
  And return new state with the created record

Scenario: findById defines a message handler
  Given state contains collections
  When receive findById message with collection and id
  Then search the collection for record with matching id
  And return the record or null if not found

Scenario: findAll defines a message handler
  Given state contains collections
  When receive findAll message with collection name
  Then return array of all records in that collection
  And return empty array if collection does not exist

Scenario: findWhere defines a message handler
  Given state contains collections
  When receive findWhere message with collection and filter
  Then filter records where all filter properties match
  And return array of matching records

Scenario: update defines a message handler
  Given state contains collections
  When receive update message with collection, id, data, and timestamp
  Then find record by id in collection
  And merge data into record with updatedAt timestamp
  And return new state with updated record or null if not found

Scenario: delete defines a message handler
  Given state contains collections
  When receive delete message with collection and id
  Then remove record with matching id from collection
  And return new state with true if deleted, false if not found

Scenario: clear defines a message handler
  Given state contains collections
  When receive clear message with collection name
  Then remove all records from that collection
  And return new state with empty collection
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
        content: `Feature: UsersService
  User management service for the API.
  Handles CRUD operations for user records using Database Service.

Background:
  Given import DatabaseService as db
  And import Validation as validation
  And import date-fns as dateFns

Scenario: createUser defines a function
  Given function createUser accepts db, userData, and currentTimestamp
  When I validate the user input with Validation
  And the validation fails
  Then return error result with validation messages
  Otherwise
  When send insert message to db with collection "users", userData, and currentTimestamp
  Then return the created user record

Scenario: getUserById defines a function
  Given function getUserById accepts db and userId
  When send findById message to db with collection "users" and userId
  Then return the user record or null

Scenario: getAllUsers defines a function
  Given function getAllUsers accepts db
  When send findAll message to db with collection "users"
  Then return array of all user records

Scenario: updateUser defines a function
  Given function updateUser accepts db, userId, updateData, and currentTimestamp
  When I validate the update data with Validation
  And the validation fails
  Then return error result with validation messages
  Otherwise
  When send update message to db with collection "users", userId, updateData, and currentTimestamp
  Then return the updated user record or null

Scenario: deleteUser defines a function
  Given function deleteUser accepts db and userId
  When send delete message to db with collection "users" and userId
  Then return true if deleted, false otherwise

Scenario: findUsersByEmail defines a function
  Given function findUsersByEmail accepts db and email
  When send findWhere message to db with collection "users" and filter { email }
  Then return array of matching users
`,
      },
      {
        path: 'features/products.feature',
        content: `Feature: ProductsService
  Product catalog service for the API.
  Handles CRUD operations for product records using Database Service.

Background:
  Given import DatabaseService as db
  And import Validation as validation
  And import date-fns as dateFns

Scenario: createProduct defines a function
  Given function createProduct accepts db, productData, and currentTimestamp
  When I validate the product input with Validation
  And the validation fails
  Then return error result with validation messages
  Otherwise
  When send insert message to db with collection "products", productData, and currentTimestamp
  Then return the created product record

Scenario: getProductById defines a function
  Given function getProductById accepts db and productId
  When send findById message to db with collection "products" and productId
  Then return the product record or null

Scenario: getAllProducts defines a function
  Given function getAllProducts accepts db
  When send findAll message to db with collection "products"
  Then return array of all product records

Scenario: updateProduct defines a function
  Given function updateProduct accepts db, productId, updateData, and currentTimestamp
  When I validate the update data with Validation
  And the validation fails
  Then return error result with validation messages
  Otherwise
  When send update message to db with collection "products", productId, updateData, and currentTimestamp
  Then return the updated product record or null

Scenario: deleteProduct defines a function
  Given function deleteProduct accepts db and productId
  When send delete message to db with collection "products" and productId
  Then return true if deleted, false otherwise

Scenario: findProductsByPriceRange defines a function
  Given function findProductsByPriceRange accepts db, minPrice, and maxPrice
  When send findAll message to db with collection "products"
  And filter results where price >= minPrice and price <= maxPrice
  Then return array of matching products

Scenario: searchProductsByName defines a function
  Given function searchProductsByName accepts db and searchTerm
  When send findAll message to db with collection "products"
  And filter results where name contains searchTerm (case insensitive)
  Then return array of matching products
`,
      },
      {
        path: 'features/auth.feature',
        content: `Feature: AuthService
  Authentication service for the API.
  Handles password hashing, token generation, and user authentication.
  Uses Database Service for persisting user credentials.

Background:
  Given import DatabaseService as db
  And import UsersService as users
  And import Validation as validation
  And import date-fns as dateFns

Scenario: hashPassword defines a function
  Given function hashPassword accepts password
  When I create a hash using a secure hashing algorithm
  Then return the hashed password string

Scenario: verifyPassword defines a function
  Given function verifyPassword accepts password and hashedPassword
  When I compare password against the hash
  Then return true if they match, false otherwise

Scenario: generateToken defines a function
  Given function generateToken accepts userId, currentTimestamp, and expirationHours
  When I create a token payload with userId and expiration
  And expiration is calculated by adding expirationHours to currentTimestamp
  Then return the encoded token string

Scenario: verifyToken defines a function
  Given function verifyToken accepts token and currentTimestamp
  When I decode and validate the token
  And check if currentTimestamp is before expiration
  Then return decoded payload with userId if valid, null if expired or invalid

Scenario: register defines a function
  Given function register accepts db, registrationData, and currentTimestamp
  When I validate registration data (name, email, password required)
  And validation fails
  Then return error result with validation messages
  Otherwise
  When send findWhere message to db with collection "users" and filter { email }
  And a user already exists with that email
  Then return error result with "Email already registered"
  Otherwise
  When I hash the password
  And send insert message to db with collection "users" and user data (without plain password)
  And generate auth token for the new user
  Then return success with user record (without password) and token

Scenario: login defines a function
  Given function login accepts db, credentials, and currentTimestamp
  When send findWhere message to db with collection "users" and filter { email }
  And no user found with that email
  Then return error result with "Invalid credentials"
  Otherwise
  When I verify the password against stored hash
  And password does not match
  Then return error result with "Invalid credentials"
  Otherwise
  When I generate auth token for the user
  Then return success with user record (without password) and token

Scenario: removePassword defines a function
  Given function removePassword accepts user object
  When I create a copy of user without password field
  Then return the sanitized user object
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
  Health check endpoint for API monitoring.
  Provides system status and uptime information.

Background:
  Given import date-fns as dateFns

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
      {
        path: 'features/app.feature',
        content: `Feature: App
  Express.js application that composes all services into a REST API.
  Provides HTTP endpoints for users, products, authentication, and health.

Background:
  Given import express as express
  And import DatabaseService as db
  And import UsersService as usersService
  And import ProductsService as productsService
  And import AuthService as authService
  And import Responses as responses
  And import Health as health
  And import date-fns as dateFns

Scenario: createApp defines a function
  Given function createApp accepts config
  When I create an express application
  And add JSON body parser middleware
  And add request logging middleware
  And register all route handlers
  Then return the configured express app

Scenario: registerRoutes defines a function
  Given function registerRoutes accepts app and services
  When I register health routes at /health
  And register auth routes at /auth
  And register user routes at /users
  And register product routes at /products
  Then all routes are configured with proper handlers

Scenario: healthRoutes defines route handlers
  Given GET /health endpoint
  When request is received with currentTimestamp
  Then respond with health status from Health service

Scenario: authRoutes defines route handlers
  Given POST /auth/register endpoint
  When request body contains name, email, password
  And currentTimestamp is provided
  Then call authService.register and respond with result

  Given POST /auth/login endpoint
  When request body contains email, password
  And currentTimestamp is provided
  Then call authService.login and respond with result

Scenario: userRoutes defines route handlers
  Given GET /users endpoint
  When request is received
  Then call usersService.getAllUsers and respond with users array

  Given GET /users/:id endpoint
  When request contains user id parameter
  Then call usersService.getUserById and respond with user or not found

  Given POST /users endpoint
  When request body contains user data and currentTimestamp
  Then call usersService.createUser and respond with created user

  Given PUT /users/:id endpoint
  When request contains id and update data with currentTimestamp
  Then call usersService.updateUser and respond with updated user or not found

  Given DELETE /users/:id endpoint
  When request contains user id
  Then call usersService.deleteUser and respond with success or not found

Scenario: productRoutes defines route handlers
  Given GET /products endpoint
  When request is received
  Then call productsService.getAllProducts and respond with products array

  Given GET /products/:id endpoint
  When request contains product id parameter
  Then call productsService.getProductById and respond with product or not found

  Given POST /products endpoint
  When request body contains product data and currentTimestamp
  Then call productsService.createProduct and respond with created product

  Given PUT /products/:id endpoint
  When request contains id and update data with currentTimestamp
  Then call productsService.updateProduct and respond with updated product or not found

  Given DELETE /products/:id endpoint
  When request contains product id
  Then call productsService.deleteProduct and respond with success or not found

Scenario: errorHandler defines middleware
  Given an error occurs in any route
  When the error handler middleware is invoked
  Then log the error
  And respond with appropriate error response from Responses service

Scenario: startServer defines a function
  Given function startServer accepts app, port, and startTimestamp
  When I start the express server on the specified port
  Then log server started message with port
  And return the server instance
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
    logger.error(`Invalid template: ${templateName}`);
    logger.blank('');
    logger.info(`Available templates: ${VALID_TEMPLATES.join(', ')}`);
    logger.blank('');
    logger.info('Template descriptions:');
    logger.info('  basic   - Minimal setup with one example');
    logger.info('  library - Utility functions for math and strings');
    logger.info('  api     - Full Express.js CRUD API with auth');
    logger.blank('');
    logger.info('See: https://gherkinlang.dev/templates');
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
