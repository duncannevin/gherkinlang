/**
 * Unit tests for DependencyChecker MCP tool.
 * 
 * @module test/unit/mcp/tools/dependencies
 */

const { DependencyChecker } = require('../../../../src/mcp/tools/dependencies');
const https = require('https');

// Mock https module
jest.mock('https');

describe('DependencyChecker', () => {
  let checker;

  beforeEach(() => {
    checker = new DependencyChecker();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should have correct name', () => {
      expect(checker.name).toBe('dependencies');
    });

    test('should have description', () => {
      expect(checker.description).toBeDefined();
      expect(typeof checker.description).toBe('string');
      expect(checker.description).toContain('npm');
    });

    test('should have valid inputSchema', () => {
      expect(checker.inputSchema).toEqual({
        type: 'object',
        properties: {
          packageName: {
            type: 'string',
            description: 'npm package name to check',
          },
        },
        required: ['packageName'],
      });
    });
  });

  describe('execute - input validation', () => {
    test('should return error when packageName is missing', async () => {
      const result = await checker.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('packageName parameter is required and must be a string');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('should return error when packageName is not a string', async () => {
      const result = await checker.execute({ packageName: 123 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('packageName parameter is required and must be a string');
    });

    test('should return error when packageName is empty', async () => {
      const result = await checker.execute({ packageName: '   ' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Package name cannot be empty');
    });
  });

  describe('execute - npm registry check', () => {
    test('should return package info when package exists', async () => {
      const mockPackageData = {
        'dist-tags': { latest: '1.2.3' },
        description: 'A test package',
        homepage: 'https://example.com',
        repository: { url: 'https://github.com/test/repo' },
        versions: { '1.2.3': {} },
      };

      mockHttpsGet(200, mockPackageData);

      const result = await checker.execute({ packageName: 'lodash' });

      expect(result.success).toBe(true);
      expect(result.content).toEqual({
        exists: true,
        packageName: 'lodash',
        version: '1.2.3',
        description: 'A test package',
        homepage: 'https://example.com',
        repository: 'https://github.com/test/repo',
      });
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('should return exists: false when package not found', async () => {
      mockHttpsGet(404, {});

      const result = await checker.execute({ packageName: 'non-existent-package-xyz' });

      expect(result.success).toBe(true);
      expect(result.content).toEqual({
        exists: false,
        packageName: 'non-existent-package-xyz',
      });
    });

    test('should handle scoped packages', async () => {
      const mockPackageData = {
        'dist-tags': { latest: '2.0.0' },
        description: 'Scoped package',
        homepage: '',
        repository: {},
        versions: { '2.0.0': {} },
      };

      mockHttpsGet(200, mockPackageData);

      const result = await checker.execute({ packageName: '@babel/core' });

      expect(result.success).toBe(true);
      expect(result.content.exists).toBe(true);
      expect(result.content.packageName).toBe('@babel/core');
      expect(result.content.version).toBe('2.0.0');
    });

    test('should handle package without dist-tags', async () => {
      const mockPackageData = {
        description: 'Package without dist-tags',
        versions: { '0.1.0': {}, '0.2.0': {} },
      };

      mockHttpsGet(200, mockPackageData);

      const result = await checker.execute({ packageName: 'some-package' });

      expect(result.success).toBe(true);
      expect(result.content.exists).toBe(true);
      expect(result.content.version).toBe('0.1.0');
    });

    test('should handle registry error response', async () => {
      mockHttpsGet(500, {});

      const result = await checker.execute({ packageName: 'test-package' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('npm registry returned status 500');
    });

    test('should handle network error', async () => {
      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Network error')), 0);
          }
          return mockRequest;
        }),
        setTimeout: jest.fn(),
        destroy: jest.fn(),
      };

      https.get.mockReturnValue(mockRequest);

      const result = await checker.execute({ packageName: 'test-package' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    test('should handle timeout', async () => {
      const mockRequest = {
        on: jest.fn().mockReturnThis(),
        setTimeout: jest.fn((timeout, callback) => {
          setTimeout(callback, 0);
          return mockRequest;
        }),
        destroy: jest.fn(),
      };

      https.get.mockReturnValue(mockRequest);

      const result = await checker.execute({ packageName: 'test-package' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    test('should handle malformed JSON response', async () => {
      mockHttpsGetRaw(200, 'not valid json');

      const result = await checker.execute({ packageName: 'test-package' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse npm registry response');
    });

    test('should trim whitespace from package name', async () => {
      const mockPackageData = {
        'dist-tags': { latest: '1.0.0' },
        description: 'Test',
        versions: { '1.0.0': {} },
      };

      mockHttpsGet(200, mockPackageData);

      const result = await checker.execute({ packageName: '  lodash  ' });

      expect(result.success).toBe(true);
      expect(result.content.packageName).toBe('lodash');
    });
  });

  describe('execute - duration tracking', () => {
    test('should include duration in successful result', async () => {
      mockHttpsGet(200, { 'dist-tags': { latest: '1.0.0' }, versions: {} });

      const result = await checker.execute({ packageName: 'lodash' });

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('should include duration in error result', async () => {
      const result = await checker.execute({});

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
    });
  });
});

// Helper functions for mocking https.get
function mockHttpsGet(statusCode, data) {
  const mockResponse = {
    statusCode,
    on: jest.fn((event, callback) => {
      if (event === 'data') {
        setTimeout(() => callback(JSON.stringify(data)), 0);
      }
      if (event === 'end') {
        setTimeout(callback, 10);
      }
      return mockResponse;
    }),
  };

  const mockRequest = {
    on: jest.fn().mockReturnThis(),
    setTimeout: jest.fn().mockReturnThis(),
    destroy: jest.fn(),
  };

  https.get.mockImplementation((url, callback) => {
    setTimeout(() => callback(mockResponse), 0);
    return mockRequest;
  });
}

function mockHttpsGetRaw(statusCode, data) {
  const mockResponse = {
    statusCode,
    on: jest.fn((event, callback) => {
      if (event === 'data') {
        setTimeout(() => callback(data), 0);
      }
      if (event === 'end') {
        setTimeout(callback, 10);
      }
      return mockResponse;
    }),
  };

  const mockRequest = {
    on: jest.fn().mockReturnThis(),
    setTimeout: jest.fn().mockReturnThis(),
    destroy: jest.fn(),
  };

  https.get.mockImplementation((url, callback) => {
    setTimeout(() => callback(mockResponse), 0);
    return mockRequest;
  });
}
