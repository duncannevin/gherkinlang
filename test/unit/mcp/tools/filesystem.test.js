/**
 * Unit tests for FileSystem MCP tool.
 * 
 * @module test/unit/mcp/tools/filesystem
 */

const { FileSystem } = require('../../../../src/mcp/tools/filesystem');
const path = require('path');

// Mock the fs utilities
jest.mock('../../../../src/compiler/utils/fs', () => ({
  readFile: jest.fn(),
  exists: jest.fn(),
}));

const { readFile, exists } = require('../../../../src/compiler/utils/fs');

describe('FileSystem', () => {
  let filesystem;
  const originalCwd = process.cwd();

  beforeEach(() => {
    filesystem = new FileSystem();
    jest.clearAllMocks();
    // Reset project root to a known path
    filesystem._projectRoot = '/test/project';
  });

  afterEach(() => {
    process.chdir(originalCwd);
  });

  describe('constructor', () => {
    test('should have correct name', () => {
      expect(filesystem.name).toBe('filesystem');
    });

    test('should have description', () => {
      expect(filesystem.description).toBeDefined();
      expect(typeof filesystem.description).toBe('string');
      expect(filesystem.description).toContain('file');
    });

    test('should have valid inputSchema', () => {
      expect(filesystem.inputSchema).toEqual({
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['read'],
            description: 'File system action',
          },
          path: {
            type: 'string',
            description: 'File path to read (relative to project root)',
          },
        },
        required: ['action', 'path'],
      });
    });

    test('should set project root to cwd', () => {
      const fs = new FileSystem();
      expect(fs._projectRoot).toBe(process.cwd());
    });
  });

  describe('execute - input validation', () => {
    test('should return error when action is missing', async () => {
      const result = await filesystem.execute({ path: 'test.js' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('action parameter is required and must be a string');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('should return error when action is not a string', async () => {
      const result = await filesystem.execute({ action: 123, path: 'test.js' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('action parameter is required and must be a string');
    });

    test('should return error when path is missing', async () => {
      const result = await filesystem.execute({ action: 'read' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('path parameter is required and must be a string');
    });

    test('should return error when path is not a string', async () => {
      const result = await filesystem.execute({ action: 'read', path: 123 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('path parameter is required and must be a string');
    });

    test('should return error for unsupported action', async () => {
      exists.mockResolvedValue(true);

      const result = await filesystem.execute({ action: 'write', path: 'test.js' });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unsupported action: write. Only 'read' is supported.");
    });
  });

  describe('execute - path security', () => {
    test('should reject path traversal outside project root', async () => {
      const result = await filesystem.execute({
        action: 'read',
        path: '../../../etc/passwd',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('outside project root');
    });

    test('should reject absolute path outside project root', async () => {
      const result = await filesystem.execute({
        action: 'read',
        path: '/etc/passwd',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('outside project root');
    });

    test('should accept path within project root', async () => {
      exists.mockResolvedValue(true);
      readFile.mockResolvedValue('file contents');

      const result = await filesystem.execute({
        action: 'read',
        path: 'src/file.js',
      });

      expect(result.success).toBe(true);
    });

    test('should accept nested path within project root', async () => {
      exists.mockResolvedValue(true);
      readFile.mockResolvedValue('nested file contents');

      const result = await filesystem.execute({
        action: 'read',
        path: 'src/components/deep/file.js',
      });

      expect(result.success).toBe(true);
    });

    test('should handle path with . segments correctly', async () => {
      exists.mockResolvedValue(true);
      readFile.mockResolvedValue('contents');

      const result = await filesystem.execute({
        action: 'read',
        path: './src/./file.js',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('execute - read action', () => {
    test('should return file contents when file exists', async () => {
      exists.mockResolvedValue(true);
      readFile.mockResolvedValue('const x = 1;');

      const result = await filesystem.execute({
        action: 'read',
        path: 'src/test.js',
      });

      expect(result.success).toBe(true);
      expect(result.content).toEqual({
        content: 'const x = 1;',
        path: 'src/test.js',
      });
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('should return error when file does not exist', async () => {
      exists.mockResolvedValue(false);

      const result = await filesystem.execute({
        action: 'read',
        path: 'nonexistent.js',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found: nonexistent.js');
    });

    test('should handle .feature files', async () => {
      exists.mockResolvedValue(true);
      readFile.mockResolvedValue('Feature: Test\n  Scenario: Example');

      const result = await filesystem.execute({
        action: 'read',
        path: 'features/login.feature',
      });

      expect(result.success).toBe(true);
      expect(result.content.content).toContain('Feature: Test');
    });

    test('should handle large files', async () => {
      const largeContent = 'x'.repeat(100000);
      exists.mockResolvedValue(true);
      readFile.mockResolvedValue(largeContent);

      const result = await filesystem.execute({
        action: 'read',
        path: 'large-file.txt',
      });

      expect(result.success).toBe(true);
      expect(result.content.content.length).toBe(100000);
    });

    test('should handle empty files', async () => {
      exists.mockResolvedValue(true);
      readFile.mockResolvedValue('');

      const result = await filesystem.execute({
        action: 'read',
        path: 'empty.txt',
      });

      expect(result.success).toBe(true);
      expect(result.content.content).toBe('');
    });

    test('should handle read errors', async () => {
      exists.mockResolvedValue(true);
      readFile.mockRejectedValue(new Error('Permission denied'));

      const result = await filesystem.execute({
        action: 'read',
        path: 'protected.js',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });
  });

  describe('execute - duration tracking', () => {
    test('should include duration in successful result', async () => {
      exists.mockResolvedValue(true);
      readFile.mockResolvedValue('content');

      const result = await filesystem.execute({
        action: 'read',
        path: 'test.js',
      });

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('should include duration in error result', async () => {
      const result = await filesystem.execute({});

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
    });
  });

  describe('_resolvePath', () => {
    test('should resolve relative path', () => {
      const resolved = filesystem._resolvePath('src/file.js');
      expect(resolved).toBe(path.normalize('/test/project/src/file.js'));
    });

    test('should return null for path outside project', () => {
      const resolved = filesystem._resolvePath('../outside.js');
      expect(resolved).toBeNull();
    });

    test('should normalize path segments', () => {
      const resolved = filesystem._resolvePath('src/../src/file.js');
      expect(resolved).toBe(path.normalize('/test/project/src/file.js'));
    });
  });
});
