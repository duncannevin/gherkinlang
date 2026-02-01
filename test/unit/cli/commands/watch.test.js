/**
 * Unit tests for the watch command.
 *
 * @module test/unit/cli/commands/watch
 */

import { jest } from '@jest/globals';

// Import the functions to test directly
import {
  createWatchState,
  createDebouncer,
  getFilesToRecompile,
} from '../../../../src/cli/commands/watch.js';

describe('watch command', () => {
  describe('createWatchState', () => {
    it('should create initial watch state', () => {
      const state = createWatchState();

      expect(state.isCompiling).toBe(false);
      expect(state.pendingFiles).toBeInstanceOf(Set);
      expect(state.pendingFiles.size).toBe(0);
      expect(state.lastCompiled).toBeInstanceOf(Map);
      expect(state.lastCompiled.size).toBe(0);
      expect(state.summary).toBeDefined();
      expect(state.summary.compilations).toBe(0);
      expect(state.summary.succeeded).toBe(0);
      expect(state.summary.failed).toBe(0);
      expect(typeof state.summary.startTime).toBe('number');
    });

    it('should set startTime to current time', () => {
      const before = Date.now();
      const state = createWatchState();
      const after = Date.now();

      expect(state.summary.startTime).toBeGreaterThanOrEqual(before);
      expect(state.summary.startTime).toBeLessThanOrEqual(after);
    });

    it('should create independent state objects', () => {
      const state1 = createWatchState();
      const state2 = createWatchState();

      state1.pendingFiles.add('/file1.feature');
      state1.summary.compilations = 5;

      expect(state2.pendingFiles.size).toBe(0);
      expect(state2.summary.compilations).toBe(0);
    });
  });

  describe('createDebouncer', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should accumulate files and call function after delay', async () => {
      const fn = jest.fn().mockResolvedValue(undefined);
      const debouncer = createDebouncer(fn, 100);

      debouncer.add('/path/to/file1.feature');
      debouncer.add('/path/to/file2.feature');

      // Function should not be called immediately
      expect(fn).not.toHaveBeenCalled();

      // Fast-forward past debounce delay
      jest.advanceTimersByTime(100);
      await Promise.resolve(); // Flush promises

      expect(fn).toHaveBeenCalledTimes(1);
      const calledWith = fn.mock.calls[0][0];
      expect(calledWith).toBeInstanceOf(Set);
      expect(calledWith.has('/path/to/file1.feature')).toBe(true);
      expect(calledWith.has('/path/to/file2.feature')).toBe(true);
    });

    it('should reset timer on new additions', async () => {
      const fn = jest.fn().mockResolvedValue(undefined);
      const debouncer = createDebouncer(fn, 100);

      debouncer.add('/path/to/file1.feature');

      // Advance 50ms
      jest.advanceTimersByTime(50);
      expect(fn).not.toHaveBeenCalled();

      // Add another file (resets timer)
      debouncer.add('/path/to/file2.feature');

      // Advance another 50ms (not enough after reset)
      jest.advanceTimersByTime(50);
      expect(fn).not.toHaveBeenCalled();

      // Advance to complete the debounce
      jest.advanceTimersByTime(50);
      await Promise.resolve();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should cancel pending debounce', async () => {
      const fn = jest.fn().mockResolvedValue(undefined);
      const debouncer = createDebouncer(fn, 100);

      debouncer.add('/path/to/file1.feature');
      debouncer.cancel();

      jest.advanceTimersByTime(200);
      await Promise.resolve();

      expect(fn).not.toHaveBeenCalled();
    });

    it('should return pending files', () => {
      const fn = jest.fn().mockResolvedValue(undefined);
      const debouncer = createDebouncer(fn, 100);

      debouncer.add('/path/to/file1.feature');
      debouncer.add('/path/to/file2.feature');

      const pending = debouncer.getPending();
      expect(pending.size).toBe(2);
      expect(pending.has('/path/to/file1.feature')).toBe(true);
      expect(pending.has('/path/to/file2.feature')).toBe(true);
    });

    it('should clear pending after execution', async () => {
      const fn = jest.fn().mockResolvedValue(undefined);
      const debouncer = createDebouncer(fn, 100);

      debouncer.add('/path/to/file1.feature');

      jest.advanceTimersByTime(100);
      await Promise.resolve();

      const pending = debouncer.getPending();
      expect(pending.size).toBe(0);
    });

    it('should handle multiple debounce cycles', async () => {
      const fn = jest.fn().mockResolvedValue(undefined);
      const debouncer = createDebouncer(fn, 100);

      // First cycle
      debouncer.add('/path/to/file1.feature');
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      expect(fn).toHaveBeenCalledTimes(1);

      // Second cycle
      debouncer.add('/path/to/file2.feature');
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('getFilesToRecompile', () => {
    it('should return just the changed file if no project context', () => {
      const files = getFilesToRecompile('/project/features/test.feature', null);

      expect(files).toEqual(['/project/features/test.feature']);
    });

    it('should return just the changed file if project context has no graph', () => {
      const projectContext = {
        _fileToModule: new Map(),
        _graph: null,
      };

      const files = getFilesToRecompile(
        '/project/features/test.feature',
        projectContext
      );

      expect(files).toEqual(['/project/features/test.feature']);
    });

    it('should return just the changed file if file not in module map', () => {
      const projectContext = {
        _fileToModule: new Map(), // Empty map
        _graph: {
          reverseEdges: new Map(),
        },
        getModule: jest.fn(),
      };

      const files = getFilesToRecompile(
        '/project/features/unknown.feature',
        projectContext
      );

      expect(files).toEqual(['/project/features/unknown.feature']);
    });

    it('should include dependent files from reverse edges', () => {
      const projectContext = {
        _fileToModule: new Map([
          ['/project/features/math.feature', 'Mathematics'],
        ]),
        _graph: {
          reverseEdges: new Map([['Mathematics', new Set(['Calculator'])]]),
        },
        getModule: jest.fn((name) => {
          if (name === 'Calculator') {
            return { file: '/project/features/calculator.feature' };
          }
          return null;
        }),
      };

      const files = getFilesToRecompile(
        '/project/features/math.feature',
        projectContext
      );

      expect(files).toContain('/project/features/math.feature');
      expect(files).toContain('/project/features/calculator.feature');
      expect(files.length).toBe(2);
    });

    it('should handle multiple dependents', () => {
      const projectContext = {
        _fileToModule: new Map([
          ['/project/features/utils.feature', 'Utils'],
        ]),
        _graph: {
          reverseEdges: new Map([
            ['Utils', new Set(['FeatureA', 'FeatureB', 'FeatureC'])],
          ]),
        },
        getModule: jest.fn((name) => {
          const files = {
            FeatureA: '/project/features/a.feature',
            FeatureB: '/project/features/b.feature',
            FeatureC: '/project/features/c.feature',
          };
          return { file: files[name] };
        }),
      };

      const files = getFilesToRecompile(
        '/project/features/utils.feature',
        projectContext
      );

      expect(files).toContain('/project/features/utils.feature');
      expect(files).toContain('/project/features/a.feature');
      expect(files).toContain('/project/features/b.feature');
      expect(files).toContain('/project/features/c.feature');
      expect(files.length).toBe(4);
    });

    it('should handle dependents with no file info', () => {
      const projectContext = {
        _fileToModule: new Map([
          ['/project/features/math.feature', 'Mathematics'],
        ]),
        _graph: {
          reverseEdges: new Map([['Mathematics', new Set(['Calculator'])]]),
        },
        getModule: jest.fn(() => null), // No module info
      };

      const files = getFilesToRecompile(
        '/project/features/math.feature',
        projectContext
      );

      // Should only have the original file since dependent has no file
      expect(files).toEqual(['/project/features/math.feature']);
    });

    it('should handle empty reverse edges', () => {
      const projectContext = {
        _fileToModule: new Map([
          ['/project/features/leaf.feature', 'LeafModule'],
        ]),
        _graph: {
          reverseEdges: new Map([['LeafModule', new Set()]]), // Empty set
        },
        getModule: jest.fn(),
      };

      const files = getFilesToRecompile(
        '/project/features/leaf.feature',
        projectContext
      );

      expect(files).toEqual(['/project/features/leaf.feature']);
    });
  });
});
