/**
 * Unit tests for the init command.
 *
 * @module test/unit/cli/commands/init
 */

import { jest } from '@jest/globals';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import {
  TEMPLATES,
  getTemplate,
  createProject,
  displayNextSteps,
  validateDirectory,
} from '../../../../src/cli/commands/init.js';

describe('init command', () => {
  describe('TEMPLATES', () => {
    it('should define basic template', () => {
      expect(TEMPLATES.basic).toBeDefined();
      expect(TEMPLATES.basic.name).toBe('basic');
      expect(TEMPLATES.basic.description).toBe('Minimal setup with one example');
      expect(TEMPLATES.basic.config).toBeDefined();
      expect(TEMPLATES.basic.files).toHaveLength(1);
      expect(TEMPLATES.basic.files[0].path).toBe('features/example.feature');
    });

    it('should define library template', () => {
      expect(TEMPLATES.library).toBeDefined();
      expect(TEMPLATES.library.name).toBe('library');
      expect(TEMPLATES.library.description).toBe('Function exports and utilities');
      expect(TEMPLATES.library.files).toHaveLength(2);
      expect(TEMPLATES.library.files[0].path).toBe('features/math.feature');
      expect(TEMPLATES.library.files[1].path).toBe('features/strings.feature');
    });

    it('should define api template', () => {
      expect(TEMPLATES.api).toBeDefined();
      expect(TEMPLATES.api.name).toBe('api');
      expect(TEMPLATES.api.description).toBe('Express.js CRUD API with users, products, and auth');
      expect(TEMPLATES.api.files.length).toBeGreaterThanOrEqual(6);
      
      const filePaths = TEMPLATES.api.files.map(f => f.path);
      expect(filePaths).toContain('features/database.feature');
      expect(filePaths).toContain('features/users.feature');
      expect(filePaths).toContain('features/products.feature');
      expect(filePaths).toContain('features/auth.feature');
      expect(filePaths).toContain('features/health.feature');
    });

    it('should have valid config in all templates', () => {
      for (const [name, template] of Object.entries(TEMPLATES)) {
        expect(template.config.target).toBe('javascript');
        expect(['commonjs', 'esm']).toContain(template.config.moduleFormat);
        expect(template.config.output).toBeDefined();
        expect(template.config.cache).toBeDefined();
        expect(template.config.validation).toBeDefined();
        expect(template.config.generation).toBeDefined();
      }
    });
  });

  describe('getTemplate', () => {
    it('should return basic template', () => {
      const template = getTemplate('basic');
      expect(template).toBe(TEMPLATES.basic);
    });

    it('should return library template', () => {
      const template = getTemplate('library');
      expect(template).toBe(TEMPLATES.library);
    });

    it('should return api template', () => {
      const template = getTemplate('api');
      expect(template).toBe(TEMPLATES.api);
    });

    it('should return null for unknown template', () => {
      const template = getTemplate('unknown');
      expect(template).toBeNull();
    });

    it('should return null for empty string', () => {
      const template = getTemplate('');
      expect(template).toBeNull();
    });
  });

  describe('createProject', () => {
    let tempDir;
    let mockContext;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'gherkin-init-test-'));
      mockContext = {
        cwd: tempDir,
        logger: {
          success: jest.fn(),
          info: jest.fn(),
          debug: jest.fn(),
          error: jest.fn(),
          blank: jest.fn(),
        },
      };
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('should create config file', async () => {
      const template = TEMPLATES.basic;
      const createdFiles = await createProject(tempDir, template, mockContext);

      const configPath = join(tempDir, '.gherkinrc.json');
      expect(existsSync(configPath)).toBe(true);
      expect(createdFiles).toContain(configPath);

      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      expect(config.target).toBe('javascript');
    });

    it('should create template files', async () => {
      const template = TEMPLATES.basic;
      const createdFiles = await createProject(tempDir, template, mockContext);

      const featurePath = join(tempDir, 'features/example.feature');
      expect(existsSync(featurePath)).toBe(true);
      expect(createdFiles).toContain(featurePath);

      const content = readFileSync(featurePath, 'utf-8');
      expect(content).toContain('Feature: Example');
    });

    it('should create features directory', async () => {
      const template = TEMPLATES.basic;
      await createProject(tempDir, template, mockContext);

      expect(existsSync(join(tempDir, 'features'))).toBe(true);
    });

    it('should create multiple files for library template', async () => {
      const template = TEMPLATES.library;
      const createdFiles = await createProject(tempDir, template, mockContext);

      expect(createdFiles).toHaveLength(3); // config + 2 feature files
      expect(existsSync(join(tempDir, 'features/math.feature'))).toBe(true);
      expect(existsSync(join(tempDir, 'features/strings.feature'))).toBe(true);
    });

    it('should log success for each created file', async () => {
      const template = TEMPLATES.basic;
      await createProject(tempDir, template, mockContext);

      expect(mockContext.logger.success).toHaveBeenCalledWith(
        'Created .gherkinrc.json'
      );
      expect(mockContext.logger.success).toHaveBeenCalledWith(
        'Created features/example.feature'
      );
    });
  });

  describe('validateDirectory', () => {
    let tempDir;
    let mockContext;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'gherkin-validate-test-'));
      mockContext = {
        cwd: tempDir,
        logger: {
          success: jest.fn(),
          info: jest.fn(),
          debug: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          blank: jest.fn(),
        },
      };
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('should return valid for empty directory', async () => {
      const result = await validateDirectory(tempDir, {}, mockContext);
      expect(result.valid).toBe(true);
    });

    it('should create directory if it does not exist', async () => {
      const newDir = join(tempDir, 'new-project');
      const result = await validateDirectory(newDir, {}, mockContext);

      expect(result.valid).toBe(true);
      expect(existsSync(newDir)).toBe(true);
    });

    it('should warn and allow with --force when config exists', async () => {
      // Create existing config
      const { writeFileSync: writeFs } = await import('fs');
      writeFs(join(tempDir, '.gherkinrc.json'), '{}');

      const result = await validateDirectory(
        tempDir,
        { force: true },
        mockContext
      );

      expect(result.valid).toBe(true);
      expect(mockContext.logger.warn).toHaveBeenCalled();
    });

    it('should fail with --yes but no --force when config exists', async () => {
      // Create existing config
      const { writeFileSync: writeFs } = await import('fs');
      writeFs(join(tempDir, '.gherkinrc.json'), '{}');

      const result = await validateDirectory(
        tempDir,
        { yes: true },
        mockContext
      );

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Use --force to overwrite');
    });
  });

  describe('displayNextSteps', () => {
    it('should display next steps with cd when in subdirectory', () => {
      const mockContext = {
        logger: {
          success: jest.fn(),
          info: jest.fn(),
          blank: jest.fn(),
        },
      };

      const originalCwd = process.cwd();
      displayNextSteps('/tmp/my-project', TEMPLATES.basic, mockContext);

      expect(mockContext.logger.success).toHaveBeenCalledWith(
        'Project initialized successfully!'
      );
      expect(mockContext.logger.info).toHaveBeenCalledWith('Next steps:');
      expect(mockContext.logger.blank).toHaveBeenCalledWith(
        '  gherkin compile features/'
      );
    });

    it('should not show cd when initializing in current directory', () => {
      const mockContext = {
        logger: {
          success: jest.fn(),
          info: jest.fn(),
          blank: jest.fn(),
        },
      };

      displayNextSteps(process.cwd(), TEMPLATES.basic, mockContext);

      // Should not have a "cd ." call
      const cdCalls = mockContext.logger.blank.mock.calls.filter((call) =>
        call[0].includes('cd ')
      );
      expect(cdCalls.length).toBe(0);
    });
  });
});
