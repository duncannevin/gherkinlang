/**
 * Performance validation tests for core components.
 * 
 * Validates that all components meet their performance targets:
 * - Rules loading: <50ms for files up to 100KB
 * - Parser: 95% success rate for valid .feature files
 * - Project context: <2s for 100 files
 * - Cache retrieval: <10ms for cache hits
 * 
 * @module test/integration/compiler/performance
 */

const { PromptBuilder } = require('../../../src/ai/prompt-builder');
const { GherkinParser } = require('../../../src/compiler/parser');
const { ProjectContext } = require('../../../src/compiler/context');
const { CacheManager } = require('../../../src/compiler/cache');
const { sha256 } = require('../../../src/compiler/utils/hash');
const path = require('path');
const fs = require('fs').promises;
const { exists, rm } = require('../../../src/compiler/utils/fs');

describe('Performance Validation', () => {
  // __dirname is test/integration/compiler, so go up 3 levels to project root
  const projectRoot = path.resolve(__dirname, '../../..');
  const testProjectDir = path.join(projectRoot, 'features/examples/project');
  const testCacheDir = path.join(projectRoot, '.test-performance-cache');

  // Helper function to get rules content and hash
  async function getRules(promptBuilder) {
    const rulesContent = await promptBuilder._getGherkinLangRules();
    const contentHash = sha256(rulesContent);
    return {
      content: rulesContent,
      contentHash,
      target: 'javascript',
    };
  }

  afterEach(async () => {
    // Clean up test cache directory
    try {
      if (await exists(testCacheDir)) {
        await rm(testCacheDir);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Rules Loading Performance', () => {
    it('should load rules in under 50ms', async () => {
      const promptBuilder = new PromptBuilder();
      
      const startTime = process.hrtime.bigint();
      const rules = await getRules(promptBuilder);
      const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000; // Convert to ms

      expect(rules).toBeDefined();
      expect(rules.content).toBeTruthy();
      expect(rules.contentHash).toBeTruthy();
      expect(duration).toBeLessThan(50); // <50ms target
      
      console.log(`Rules loading: ${duration.toFixed(2)}ms (target: <50ms)`);
    });

    it('should handle repeated loads efficiently', async () => {
      const promptBuilder = new PromptBuilder();
      
      // First load
      const start1 = process.hrtime.bigint();
      await getRules(promptBuilder);
      const duration1 = Number(process.hrtime.bigint() - start1) / 1_000_000;

      // Second load
      const start2 = process.hrtime.bigint();
      await getRules(promptBuilder);
      const duration2 = Number(process.hrtime.bigint() - start2) / 1_000_000;

      expect(duration1).toBeLessThan(50);
      expect(duration2).toBeLessThan(50);
      
      console.log(`Rules loading (first): ${duration1.toFixed(2)}ms, (second): ${duration2.toFixed(2)}ms`);
    });
  });

  describe('Parser Performance', () => {
    it('should parse valid .feature files with 95% success rate', async () => {
      const parser = new GherkinParser();
      const projectDir = path.join(projectRoot, 'features/examples');
      
      // Get all feature files in examples directory
      const allFiles = [];
      async function findFeatureFiles(dir) {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              await findFeatureFiles(fullPath);
            } else if (entry.name.endsWith('.feature')) {
              allFiles.push(fullPath);
            }
          }
        } catch (error) {
          // Ignore errors
        }
      }
      
      await findFeatureFiles(projectDir);
      
      expect(allFiles.length).toBeGreaterThan(0);
      
      // Parse all files
      let successCount = 0;
      let totalErrors = 0;
      const skippedFiles = ['invalid-feature-name.feature', 'missing-feature.feature']; // Known invalid test files
      
      for (const file of allFiles) {
        const fileName = path.basename(file);
        
        // Skip known invalid test files
        if (skippedFiles.some(skip => fileName.includes(skip))) {
          continue;
        }
        
        try {
          const parsed = await parser.parse(file);
          // Consider successful if no errors OR if featureName is extracted
          if (parsed.errors.length === 0 || parsed.featureName) {
            successCount++;
          }
          totalErrors += parsed.errors.length;
        } catch (error) {
          // Parse failed completely
          totalErrors++;
        }
      }
      
      // Only calculate success rate for valid test files
      const validFiles = allFiles.filter(f => 
        !skippedFiles.some(skip => path.basename(f).includes(skip))
      );
      
      if (validFiles.length === 0) {
        // If no valid files, skip this test
        return;
      }
      
      const successRate = (successCount / validFiles.length) * 100;
      
      expect(successRate).toBeGreaterThanOrEqual(95); // 95% target
      
      console.log(`Parser success rate: ${successRate.toFixed(1)}% (${successCount}/${validFiles.length} valid files, ${allFiles.length} total) (target: >=95%)`);
      if (totalErrors > 0) {
        console.log(`Total parse errors: ${totalErrors}`);
      }
    });

    it('should parse individual files quickly', async () => {
      const parser = new GherkinParser();
      const featureFile = path.join(testProjectDir, 'mathematics.feature');
      
      const startTime = process.hrtime.bigint();
      const parsed = await parser.parse(featureFile);
      const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;

      expect(parsed).toBeDefined();
      expect(parsed.errors.length).toBe(0);
      // Individual parse should be very fast (<100ms per file)
      expect(duration).toBeLessThan(100);
      
      console.log(`Single file parse: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Project Context Performance', () => {
    it('should build context for multiple files in reasonable time', async () => {
      const context = new ProjectContext();
      
      const startTime = process.hrtime.bigint();
      await context.build(testProjectDir);
      const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;

      const modules = context.getCompilerOrder();
      const fileCount = modules.length;
      
      // For the test project (5 files), should be very fast
      // Target is <2s for 100 files, so for 5 files should be <100ms
      const normalizedTime = (duration / fileCount) * 100; // Extrapolate to 100 files
      
      expect(normalizedTime).toBeLessThan(2000); // <2s for 100 files target
      
      console.log(`Context build: ${duration.toFixed(2)}ms for ${fileCount} files (extrapolated: ${normalizedTime.toFixed(2)}ms for 100 files) (target: <2000ms for 100 files)`);
    });

    it('should detect cycles quickly', async () => {
      const context = new ProjectContext();
      await context.build(testProjectDir);
      
      const startTime = process.hrtime.bigint();
      const cycles = context.detectCycles();
      const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;

      expect(cycles).toBeInstanceOf(Array);
      // Cycle detection should be very fast (<50ms)
      expect(duration).toBeLessThan(50);
      
      console.log(`Cycle detection: ${duration.toFixed(2)}ms`);
    });

    it('should compute compilation order quickly', async () => {
      const context = new ProjectContext();
      await context.build(testProjectDir);
      
      const startTime = process.hrtime.bigint();
      const order = context.getCompilerOrder();
      const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;

      expect(order).toBeInstanceOf(Array);
      expect(order.length).toBeGreaterThan(0);
      // Compilation order should be very fast (<50ms)
      expect(duration).toBeLessThan(50);
      
      console.log(`Compilation order: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Cache Performance', () => {
    let cache;
    let promptBuilder;
    let testKey;
    let testEntry;

    beforeEach(async () => {
      cache = new CacheManager({ 
        cacheDir: testCacheDir,
        compilerVersion: '1.0.0-test'
      });
      promptBuilder = new PromptBuilder();
      
      const rules = await getRules(promptBuilder);
      const featureFile = path.join(testProjectDir, 'mathematics.feature');
      const source = await fs.readFile(featureFile, 'utf8');
      
      testKey = cache.generateKey(source, rules.content, '1.0.0-test', 'javascript');
      testEntry = {
        key: testKey,
        sourceHash: sha256(source),
        rulesHash: rules.contentHash,
        compiledCode: '// Mock compiled code',
        metadata: {
          timestamp: new Date().toISOString(),
          duration: 100,
          model: 'test-model',
          compilerVersion: '1.0.0-test',
          target: 'javascript',
        },
      };
      
      // Pre-populate cache
      await cache.set(testKey, testEntry);
    });

    it('should retrieve cache entries in under 10ms (cache hits)', async () => {
      // Warm up - first get might be slower due to manifest loading
      await cache.get(testKey);
      
      // Measure subsequent hits
      const times = [];
      for (let i = 0; i < 10; i++) {
        const startTime = process.hrtime.bigint();
        const result = await cache.get(testKey);
        const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;
        times.push(duration);
        expect(result).toBeDefined();
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      
      expect(avgTime).toBeLessThan(10); // <10ms average target
      expect(maxTime).toBeLessThan(40); // Allow some variance, but max should still be reasonable
      
      console.log(`Cache get (avg): ${avgTime.toFixed(2)}ms, (max): ${maxTime.toFixed(2)}ms (target: <10ms avg)`);
    });

    it('should generate cache keys quickly (<1ms)', async () => {
      const source = 'Feature: Test';
      const rules = 'Rules content';
      
      const times = [];
      for (let i = 0; i < 100; i++) {
        const startTime = process.hrtime.bigint();
        cache.generateKey(source, rules, '1.0.0', 'javascript');
        const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;
        times.push(duration);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      
      expect(avgTime).toBeLessThan(1); // <1ms target
      expect(maxTime).toBeLessThan(5); // Max should still be very fast
      
      console.log(`Cache key generation (avg): ${avgTime.toFixed(3)}ms, (max): ${maxTime.toFixed(3)}ms (target: <1ms)`);
    });

    it('should store cache entries in under 100ms', async () => {
      const promptBuilder = new PromptBuilder();
      const rules = await getRules(promptBuilder);
      const featureFile = path.join(testProjectDir, 'string_utils.feature');
      const source = await fs.readFile(featureFile, 'utf8');
      
      const key = cache.generateKey(source, rules.content, '1.0.0-test', 'javascript');
      const entry = {
        key,
        sourceHash: sha256(source),
        rulesHash: rules.contentHash,
        compiledCode: '// Compiled code',
        metadata: {
          timestamp: new Date().toISOString(),
          duration: 50,
          model: 'test-model',
          compilerVersion: '1.0.0-test',
          target: 'javascript',
        },
      };
      
      const startTime = process.hrtime.bigint();
      await cache.set(key, entry);
      const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;

      expect(duration).toBeLessThan(100); // <100ms target
      
      console.log(`Cache set: ${duration.toFixed(2)}ms (target: <100ms)`);
    });

    it('should validate cache entries quickly (<5ms)', async () => {
      const startTime = process.hrtime.bigint();
      const isValid = await cache.isValid(testKey);
      const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;

      expect(isValid).toBe(true);
      expect(duration).toBeLessThan(5); // <5ms target
      
      console.log(`Cache isValid: ${duration.toFixed(2)}ms (target: <5ms)`);
    });
  });

  describe('End-to-End Performance', () => {
    it('should complete full compilation workflow efficiently', async () => {
      const promptBuilder = new PromptBuilder();
      const parser = new GherkinParser();
      const context = new ProjectContext();
      const cache = new CacheManager({ 
        cacheDir: testCacheDir,
        compilerVersion: '1.0.0-test'
      });

      const startTime = process.hrtime.bigint();
      
      // Full workflow
      const rules = await getRules(promptBuilder);
      await context.build(testProjectDir);
      const compileOrder = context.getCompilerOrder();
      
      // Process each file with cache
      for (const moduleName of compileOrder) {
        const module = context.getModule(moduleName);
        const parsed = await parser.parse(module.file);
        const source = await fs.readFile(module.file, 'utf8');
        const key = cache.generateKey(source, rules.content, '1.0.0-test', 'javascript');
        
        let cached = await cache.get(key);
        if (!cached) {
          await cache.set(key, {
            key,
            sourceHash: sha256(source),
            rulesHash: rules.contentHash,
            compiledCode: `// Compiled: ${moduleName}`,
            metadata: {
              timestamp: new Date().toISOString(),
              duration: 50,
              model: 'test-model',
              compilerVersion: '1.0.0-test',
              target: 'javascript',
            },
          });
        }
      }
      
      const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;
      
      // Full workflow should complete in reasonable time (<5s for test project)
      expect(duration).toBeLessThan(5000);
      
      console.log(`Full workflow: ${duration.toFixed(2)}ms for ${compileOrder.length} files`);
    });
  });
});
