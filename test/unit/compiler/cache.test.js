/**
 * Unit tests for CacheManager class.
 * 
 * @module test/unit/compiler/cache
 */

const { CacheManager } = require('../../../src/compiler/cache');
const { CacheError } = require('../../../src/compiler/errors');
const { readFile, writeFile, exists, mkdir, rm } = require('../../../src/compiler/utils/fs');
const { sha256Concat } = require('../../../src/compiler/utils/hash');
const path = require('path');

// Mock dependencies
jest.mock('../../../src/compiler/utils/fs', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  exists: jest.fn(),
  mkdir: jest.fn(),
  rm: jest.fn(),
  stat: jest.fn(),
}));

jest.mock('../../../src/compiler/utils/hash', () => ({
  sha256Concat: jest.fn(),
}));

describe('CacheManager', () => {
  let cache;
  const testCacheDir = '/test-cache';
  const testManifestPath = path.join(testCacheDir, 'manifest.json');

  beforeEach(() => {
    cache = new CacheManager({ cacheDir: testCacheDir });
    jest.clearAllMocks();
    
    // Default mocks - assume directory doesn't exist initially
    exists.mockResolvedValue(false);
    mkdir.mockResolvedValue();
    readFile.mockResolvedValue('');
    writeFile.mockResolvedValue();
    rm.mockResolvedValue();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const defaultCache = new CacheManager();
      
      expect(defaultCache.cacheDir).toBe('.gherkin-cache');
      expect(defaultCache.maxSize).toBe(100 * 1024 * 1024); // 100MB
      expect(defaultCache.compilerVersion).toBe('1.0.0');
      expect(defaultCache.stats.hits).toBe(0);
      expect(defaultCache.stats.misses).toBe(0);
      expect(defaultCache.manifest.entries).toEqual([]);
      expect(defaultCache.manifest.totalSize).toBe(0);
    });

    it('should initialize with custom options', () => {
      const customCache = new CacheManager({
        cacheDir: '/custom-cache',
        maxSize: '50MB',
        compilerVersion: '2.0.0',
      });

      expect(customCache.cacheDir).toBe('/custom-cache');
      expect(customCache.maxSize).toBe(50 * 1024 * 1024); // 50MB
      expect(customCache.compilerVersion).toBe('2.0.0');
    });
  });

  describe('generateKey', () => {
    it('should generate deterministic cache key', () => {
      const mockHash = 'a1b2c3d4e5f6' + '0'.repeat(52); // 64 chars
      sha256Concat.mockReturnValue(mockHash);

      const key = cache.generateKey('source', 'rules', '1.0.0', 'javascript');

      expect(sha256Concat).toHaveBeenCalledWith('source', 'rules', '1.0.0', 'javascript');
      expect(key).toBe(mockHash);
      expect(key).toHaveLength(64);
    });

    it('should generate same key for same inputs', () => {
      const mockHash = 'a1b2c3d4e5f6' + '0'.repeat(52);
      sha256Concat.mockReturnValue(mockHash);

      const key1 = cache.generateKey('source', 'rules', '1.0.0', 'javascript');
      const key2 = cache.generateKey('source', 'rules', '1.0.0', 'javascript');

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', () => {
      sha256Concat.mockReturnValueOnce('key1' + '0'.repeat(60));
      sha256Concat.mockReturnValueOnce('key2' + '0'.repeat(60));

      const key1 = cache.generateKey('source1', 'rules', '1.0.0', 'javascript');
      const key2 = cache.generateKey('source2', 'rules', '1.0.0', 'javascript');

      expect(key1).not.toBe(key2);
    });
  });

  describe('parseSize', () => {
    it('should parse bytes correctly', () => {
      expect(cache.parseSize('100')).toBe(100);
      expect(cache.parseSize('100B')).toBe(100);
    });

    it('should parse KB correctly', () => {
      expect(cache.parseSize('100KB')).toBe(100 * 1024);
      expect(cache.parseSize('1.5KB')).toBe(Math.floor(1.5 * 1024));
    });

    it('should parse MB correctly', () => {
      expect(cache.parseSize('100MB')).toBe(100 * 1024 * 1024);
      expect(cache.parseSize('50MB')).toBe(50 * 1024 * 1024);
    });

    it('should parse GB correctly', () => {
      expect(cache.parseSize('1GB')).toBe(1024 * 1024 * 1024);
      expect(cache.parseSize('2.5GB')).toBe(Math.floor(2.5 * 1024 * 1024 * 1024));
    });

    it('should throw CacheError for invalid size string', () => {
      expect(() => cache.parseSize('invalid')).toThrow(CacheError);
      expect(() => cache.parseSize('100TB')).toThrow(CacheError);
      expect(() => cache.parseSize('')).toThrow(CacheError);
    });
  });

  describe('set', () => {
    const testKey = 'test-key-123';
    const testEntry = {
      key: testKey,
      sourceHash: 'source-hash',
      rulesHash: 'rules-hash',
      compiledCode: 'console.log("test");',
      metadata: {
        timestamp: new Date().toISOString(),
        duration: 100,
        model: 'test-model',
        compilerVersion: '1.0.0',
        target: 'javascript',
      },
    };

    beforeEach(async () => {
      // Mock manifest doesn't exist initially
      exists.mockImplementation((path) => {
        if (path === testManifestPath) return false;
        if (path === testCacheDir) return false;
        return false;
      });
      
      await cache._initializeManifest();
      jest.clearAllMocks();
    });

    it('should store new cache entry', async () => {
      const cachePath = path.join(testCacheDir, `${testKey}.cache`);
      exists.mockResolvedValue(false); // Entry doesn't exist

      await cache.set(testKey, testEntry);

      expect(writeFile).toHaveBeenCalledWith(cachePath, expect.stringContaining(testKey));
      expect(cache.manifest.entries).toHaveLength(1);
      expect(cache.manifest.entries[0].key).toBe(testKey);
      expect(cache.manifest.totalSize).toBeGreaterThan(0);
    });

    it('should update existing cache entry', async () => {
      const cachePath = path.join(testCacheDir, `${testKey}.cache`);
      
      // Add existing entry
      cache.manifest.entries.push({
        key: testKey,
        file: cachePath,
        size: 100,
        lastAccessed: new Date(),
      });
      cache.manifest.totalSize = 100;
      exists.mockResolvedValue(false);

      const updatedEntry = { ...testEntry, compiledCode: 'console.log("updated");' };
      await cache.set(testKey, updatedEntry);

      expect(cache.manifest.entries).toHaveLength(1);
      expect(cache.manifest.entries[0].size).not.toBe(100);
      expect(writeFile).toHaveBeenCalled();
    });

    it('should throw CacheError on write failure', async () => {
      writeFile.mockRejectedValue(new Error('Write failed'));

      await expect(cache.set(testKey, testEntry)).rejects.toThrow(CacheError);
    });

    it('should initialize manifest if not loaded', async () => {
      cache.manifest.entries = [];
      exists.mockImplementation((path) => {
        if (path === testManifestPath) return false;
        return false;
      });

      await cache.set(testKey, testEntry);

      expect(writeFile).toHaveBeenCalled(); // Should save manifest
    });
  });

  describe('get', () => {
    const testKey = 'test-key-123';
    const testEntry = {
      key: testKey,
      sourceHash: 'source-hash',
      rulesHash: 'rules-hash',
      compiledCode: 'console.log("test");',
      metadata: {
        timestamp: new Date().toISOString(),
        duration: 100,
        model: 'test-model',
        compilerVersion: '1.0.0',
        target: 'javascript',
      },
    };

    it('should return null for missing entry', async () => {
      exists.mockResolvedValue(false);
      await cache._initializeManifest();

      const result = await cache.get(testKey);

      expect(result).toBeNull();
      expect(cache.stats.misses).toBe(1);
    });

    it('should retrieve existing cache entry', async () => {
      const cachePath = path.join(testCacheDir, `${testKey}.cache`);
      
      // Set up manifest entry
      cache.manifest.entries.push({
        key: testKey,
        file: cachePath,
        size: 100,
        lastAccessed: new Date(),
      });

      exists.mockImplementation((path) => {
        if (path === cachePath) return true;
        if (path === testManifestPath) return true;
        return false;
      });
      
      readFile.mockResolvedValue(JSON.stringify(testEntry));

      const result = await cache.get(testKey);

      expect(result).toEqual(testEntry);
      expect(cache.stats.hits).toBe(1);
      expect(readFile).toHaveBeenCalledWith(cachePath);
    });

    it('should return null for corrupted entry', async () => {
      const cachePath = path.join(testCacheDir, `${testKey}.cache`);
      
      cache.manifest.entries.push({
        key: testKey,
        file: cachePath,
        size: 100,
        lastAccessed: new Date(),
      });

      exists.mockResolvedValue(true);
      readFile.mockResolvedValue(JSON.stringify({ invalid: 'entry' })); // Missing required fields
      rm.mockResolvedValue(); // Mock clear() operations

      const result = await cache.get(testKey);

      expect(result).toBeNull();
      expect(cache.stats.misses).toBe(1);
    });

    it('should return null when manifest entry exists but file is missing', async () => {
      const cachePath = path.join(testCacheDir, `${testKey}.cache`);
      
      cache.manifest.entries.push({
        key: testKey,
        file: cachePath,
        size: 100,
        lastAccessed: new Date(),
      });

      exists.mockImplementation((path) => {
        if (path === cachePath) return false; // File missing
        if (path === testManifestPath) return true;
        return false;
      });

      const result = await cache.get(testKey);

      expect(result).toBeNull();
      expect(cache.stats.misses).toBe(1);
      expect(cache.manifest.entries).toHaveLength(0); // Entry removed
    });

    it('should throw CacheError on read failure', async () => {
      const cachePath = path.join(testCacheDir, `${testKey}.cache`);
      
      cache.manifest.entries.push({
        key: testKey,
        file: cachePath,
        size: 100,
        lastAccessed: new Date(),
      });

      exists.mockResolvedValue(true);
      readFile.mockRejectedValue(new Error('Read failed'));

      await expect(cache.get(testKey)).rejects.toThrow(CacheError);
    });
  });

  describe('isValid', () => {
    const testKey = 'test-key-123';
    const testEntry = {
      key: testKey,
      sourceHash: 'source-hash',
      rulesHash: 'rules-hash',
      compiledCode: 'console.log("test");',
      metadata: {
        timestamp: new Date().toISOString(),
        duration: 100,
        model: 'test-model',
        compilerVersion: '1.0.0',
        target: 'javascript',
      },
    };

    it('should return false for missing entry', async () => {
      exists.mockResolvedValue(false);
      await cache._initializeManifest();

      const result = await cache.isValid(testKey);

      expect(result).toBe(false);
    });

    it('should return true for valid entry', async () => {
      const cachePath = path.join(testCacheDir, `${testKey}.cache`);
      
      cache.manifest.entries.push({
        key: testKey,
        file: cachePath,
        size: 100,
        lastAccessed: new Date(),
      });

      exists.mockResolvedValue(true);
      readFile.mockResolvedValue(JSON.stringify(testEntry));

      const result = await cache.isValid(testKey);

      expect(result).toBe(true);
    });

    it('should return false for corrupted entry', async () => {
      const cachePath = path.join(testCacheDir, `${testKey}.cache`);
      
      cache.manifest.entries.push({
        key: testKey,
        file: cachePath,
        size: 100,
        lastAccessed: new Date(),
      });

      exists.mockResolvedValue(true);
      readFile.mockResolvedValue(JSON.stringify({ invalid: 'entry' }));

      const result = await cache.isValid(testKey);

      expect(result).toBe(false);
    });

    it('should return false on read error', async () => {
      const cachePath = path.join(testCacheDir, `${testKey}.cache`);
      
      cache.manifest.entries.push({
        key: testKey,
        file: cachePath,
        size: 100,
        lastAccessed: new Date(),
      });

      exists.mockResolvedValue(true);
      readFile.mockRejectedValue(new Error('Read failed'));

      const result = await cache.isValid(testKey);

      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    const testKey1 = 'key1';
    const testKey2 = 'key2';

    beforeEach(async () => {
      await cache._initializeManifest();
      
      // Add some entries
      cache.manifest.entries.push(
        {
          key: testKey1,
          file: path.join(testCacheDir, `${testKey1}.cache`),
          size: 100,
          lastAccessed: new Date(),
        },
        {
          key: testKey2,
          file: path.join(testCacheDir, `${testKey2}.cache`),
          size: 200,
          lastAccessed: new Date(),
        }
      );
      cache.manifest.totalSize = 300;
    });

    it('should clear specific entry', async () => {
      const cachePath = path.join(testCacheDir, `${testKey1}.cache`);
      exists.mockResolvedValue(true);
      rm.mockResolvedValue();

      await cache.clear(testKey1);

      expect(rm).toHaveBeenCalledWith(cachePath);
      expect(cache.manifest.entries).toHaveLength(1);
      expect(cache.manifest.entries[0].key).toBe(testKey2);
      expect(cache.manifest.totalSize).toBe(200);
    });

    it('should clear all entries when no key provided', async () => {
      const cachePath1 = path.join(testCacheDir, `${testKey1}.cache`);
      const cachePath2 = path.join(testCacheDir, `${testKey2}.cache`);
      exists.mockResolvedValue(true);
      rm.mockResolvedValue();

      await cache.clear();

      expect(rm).toHaveBeenCalledWith(cachePath1);
      expect(rm).toHaveBeenCalledWith(cachePath2);
      expect(cache.manifest.entries).toHaveLength(0);
      expect(cache.manifest.totalSize).toBe(0);
    });

    it('should throw CacheError on clear failure', async () => {
      rm.mockRejectedValue(new Error('Remove failed'));

      await expect(cache.clear(testKey1)).rejects.toThrow(CacheError);
    });
  });

  describe('evict', () => {
    beforeEach(async () => {
      await cache._initializeManifest();
    });

    it('should not evict when under size limit', async () => {
      cache.manifest.entries = [
        { key: 'key1', file: 'file1', size: 100, lastAccessed: new Date() },
      ];
      cache.manifest.totalSize = 100;

      await cache.evict(1000);

      expect(cache.manifest.entries).toHaveLength(1);
      expect(rm).not.toHaveBeenCalled();
    });

    it('should evict oldest entries when over size limit', async () => {
      const oldDate = new Date('2020-01-01');
      const newDate = new Date('2024-01-01');
      
      cache.manifest.entries = [
        { key: 'key1', file: 'file1', size: 400, lastAccessed: oldDate },
        { key: 'key2', file: 'file2', size: 400, lastAccessed: newDate },
      ];
      cache.manifest.totalSize = 800;

      exists.mockResolvedValue(true);
      rm.mockResolvedValue();

      await cache.evict(500);

      expect(cache.manifest.entries).toHaveLength(1);
      expect(cache.manifest.entries[0].key).toBe('key2');
      expect(cache.manifest.totalSize).toBe(400);
      expect(rm).toHaveBeenCalledWith('file1');
    });

    it('should evict multiple entries to stay under limit', async () => {
      const dates = [
        new Date('2020-01-01'),
        new Date('2021-01-01'),
        new Date('2022-01-01'),
        new Date('2023-01-01'),
      ];
      
      cache.manifest.entries = dates.map((date, i) => ({
        key: `key${i + 1}`,
        file: `file${i + 1}`,
        size: 300,
        lastAccessed: date,
      }));
      cache.manifest.totalSize = 1200;

      exists.mockResolvedValue(true);
      rm.mockResolvedValue();

      await cache.evict(500);

      expect(cache.manifest.entries.length).toBeLessThanOrEqual(2);
      expect(cache.manifest.totalSize).toBeLessThanOrEqual(500);
    });

    it('should handle eviction errors gracefully', async () => {
      cache.manifest.entries = [
        { key: 'key1', file: 'file1', size: 1000, lastAccessed: new Date() },
      ];
      cache.manifest.totalSize = 1000;

      exists.mockResolvedValue(true);
      rm.mockRejectedValue(new Error('Eviction failed'));

      // Evict should continue even if individual file removal fails
      await cache.evict(100);

      expect(cache.manifest.entries).toHaveLength(0);
      expect(cache.manifest.totalSize).toBe(0);
    });
  });

  describe('invalidate', () => {
    const testEntry1 = {
      key: 'key1',
      sourceHash: 'hash1',
      rulesHash: 'rules1',
      metadata: { compilerVersion: '1.0.0', target: 'javascript' },
    };
    const testEntry2 = {
      key: 'key2',
      sourceHash: 'hash2',
      rulesHash: 'rules2',
      metadata: { compilerVersion: '1.0.0', target: 'javascript' },
    };

    beforeEach(async () => {
      await cache._initializeManifest();
      
      cache.manifest.entries.push(
        { key: 'key1', file: 'file1', size: 100, lastAccessed: new Date() },
        { key: 'key2', file: 'file2', size: 100, lastAccessed: new Date() }
      );
      
      rm.mockResolvedValue();
    });

    it('should invalidate entries with mismatched source hash', async () => {
      exists.mockResolvedValue(true);
      readFile.mockImplementation((path) => {
        if (path === 'file1') return Promise.resolve(JSON.stringify(testEntry1));
        if (path === 'file2') return Promise.resolve(JSON.stringify(testEntry2));
        return Promise.resolve('{}');
      });

      await cache.invalidate('new-hash', 'rules1', '1.0.0', 'javascript');

      expect(rm).toHaveBeenCalled(); // Should clear invalid entries
    });

    it('should invalidate entries with mismatched rules hash', async () => {
      exists.mockResolvedValue(true);
      readFile.mockResolvedValue(JSON.stringify(testEntry1));

      await cache.invalidate('hash1', 'new-rules', '1.0.0', 'javascript');

      expect(rm).toHaveBeenCalled();
    });

    it('should invalidate entries with mismatched compiler version', async () => {
      exists.mockResolvedValue(true);
      readFile.mockResolvedValue(JSON.stringify(testEntry1));

      await cache.invalidate('hash1', 'rules1', '2.0.0', 'javascript');

      expect(rm).toHaveBeenCalled();
    });

    it('should invalidate entries with mismatched target', async () => {
      exists.mockResolvedValue(true);
      readFile.mockResolvedValue(JSON.stringify(testEntry1));

      await cache.invalidate('hash1', 'rules1', '1.0.0', 'elixir');

      expect(rm).toHaveBeenCalled();
    });

    it('should keep valid entries', async () => {
      exists.mockResolvedValue(true);
      readFile.mockResolvedValue(JSON.stringify(testEntry1));

      await cache.invalidate('hash1', 'rules1', '1.0.0', 'javascript');

      expect(rm).not.toHaveBeenCalled(); // No invalid entries
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await cache._initializeManifest();
    });

    it('should return correct stats for empty cache', async () => {
      const stats = await cache.getStats();

      expect(stats).toEqual({
        entries: 0,
        totalSize: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
      });
    });

    it('should return correct stats with entries', async () => {
      // Set up manifest entries before calling getStats
      cache.manifest.entries = [
        { key: 'key1', file: 'file1', size: 100, lastAccessed: new Date() },
        { key: 'key2', file: 'file2', size: 200, lastAccessed: new Date() },
      ];
      cache.manifest.totalSize = 300;
      cache.stats.hits = 5;
      cache.stats.misses = 2;

      // Mock that manifest exists and return current state so it doesn't get reset
      exists.mockImplementation((path) => {
        if (path === testManifestPath) return true;
        return false;
      });
      readFile.mockResolvedValue(JSON.stringify({
        entries: [
          {
            key: 'key1',
            file: 'file1',
            size: 100,
            lastAccessed: cache.manifest.entries[0].lastAccessed.toISOString(),
          },
          {
            key: 'key2',
            file: 'file2',
            size: 200,
            lastAccessed: cache.manifest.entries[1].lastAccessed.toISOString(),
          },
        ],
        totalSize: 300,
        maxSize: 104857600,
        lastUpdated: new Date().toISOString(),
      }));

      const stats = await cache.getStats();

      expect(stats.entries).toBe(2);
      expect(stats.totalSize).toBe(300);
      expect(stats.hits).toBe(5);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBeCloseTo(5 / 7, 5);
    });

    it('should calculate hit rate correctly', async () => {
      cache.stats.hits = 10;
      cache.stats.misses = 5;

      const stats = await cache.getStats();

      expect(stats.hitRate).toBeCloseTo(10 / 15, 5);
    });
  });

  describe('calculateSize', () => {
    it('should return total size from manifest', () => {
      cache.manifest.totalSize = 12345;

      expect(cache.calculateSize()).toBe(12345);
    });

    it('should return 0 for empty cache', () => {
      cache.manifest.totalSize = 0;

      expect(cache.calculateSize()).toBe(0);
    });
  });

  describe('manifest operations', () => {
    it('should load existing manifest', async () => {
      const manifestData = {
        entries: [
          {
            key: 'test-key',
            file: 'test-file',
            size: 100,
            lastAccessed: new Date().toISOString(),
          },
        ],
        totalSize: 100,
        maxSize: 104857600,
        lastUpdated: new Date().toISOString(),
      };

      exists.mockResolvedValue(true);
      readFile.mockResolvedValue(JSON.stringify(manifestData));

      await cache._loadManifest();

      expect(cache.manifest.entries).toHaveLength(1);
      expect(cache.manifest.totalSize).toBe(100);
      expect(cache.manifest.entries[0].lastAccessed).toBeInstanceOf(Date);
    });

    it('should create new manifest if none exists', async () => {
      exists.mockImplementation((path) => {
        if (path === testManifestPath) return false;
        return false;
      });

      await cache._initializeManifest();

      expect(writeFile).toHaveBeenCalledWith(testManifestPath, expect.any(String));
      expect(cache.manifest.entries).toEqual([]);
      expect(cache.manifest.totalSize).toBe(0);
    });

    it('should save manifest correctly', async () => {
      cache.manifest.entries = [
        {
          key: 'test-key',
          file: 'test-file',
          size: 100,
          lastAccessed: new Date('2024-01-01'),
        },
      ];
      cache.manifest.totalSize = 100;
      cache.manifest.maxSize = 104857600;

      await cache._saveManifest();

      expect(writeFile).toHaveBeenCalledWith(testManifestPath, expect.any(String));
      const savedContent = JSON.parse(writeFile.mock.calls[0][1]);
      expect(savedContent.entries).toHaveLength(1);
      expect(savedContent.entries[0].lastAccessed).toMatch(/^\d{4}-\d{2}-\d{2}/); // ISO string
    });
  });

  describe('error handling', () => {
    it('should handle directory creation errors gracefully', async () => {
      mkdir.mockRejectedValue(new Error('Permission denied'));

      // Should not throw
      await expect(cache._initializeCacheDir()).resolves.not.toThrow();
    });

    it('should handle manifest load errors gracefully', async () => {
      exists.mockResolvedValue(true);
      readFile.mockRejectedValue(new Error('Read failed'));

      const result = await cache._loadManifest();

      expect(result).toBe(false);
      expect(cache.manifest.entries).toEqual([]);
    });

    it('should handle manifest save errors gracefully', async () => {
      cache.manifest.entries = [{ key: 'test', file: 'test', size: 100, lastAccessed: new Date() }];
      writeFile.mockRejectedValue(new Error('Write failed'));

      // Should not throw
      await expect(cache._saveManifest()).resolves.not.toThrow();
    });
  });
});
