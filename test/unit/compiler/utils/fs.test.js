/**
 * Unit tests for file system utility module.
 * 
 * @module test/unit/compiler/utils/fs
 */

const fs = require('fs').promises;
const path = require('path');
const { readFile, writeFile, exists, stat, mkdir, rm } = require('../../../../src/compiler/utils/fs');

// Mock fs.promises
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    stat: jest.fn(),
    mkdir: jest.fn(),
    rmdir: jest.fn(),
    unlink: jest.fn(),
  },
}));

describe('fs utility module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('readFile', () => {
    it('should read a file and return its contents as UTF-8 string', async () => {
      const filePath = '/path/to/file.txt';
      const content = 'file content';
      fs.readFile.mockResolvedValue(content);

      const result = await readFile(filePath);

      expect(result).toBe(content);
      expect(fs.readFile).toHaveBeenCalledWith(filePath, 'utf8');
      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });

    it('should throw Error with message when file not found (ENOENT)', async () => {
      const filePath = '/path/to/nonexistent.txt';
      const error = new Error('File not found');
      error.code = 'ENOENT';
      fs.readFile.mockRejectedValue(error);

      await expect(readFile(filePath)).rejects.toThrow(`File not found: ${filePath}`);
      expect(fs.readFile).toHaveBeenCalledWith(filePath, 'utf8');
    });

    it('should throw Error with message when permission denied (EACCES)', async () => {
      const filePath = '/path/to/restricted.txt';
      const error = new Error('Permission denied');
      error.code = 'EACCES';
      fs.readFile.mockRejectedValue(error);

      await expect(readFile(filePath)).rejects.toThrow(`Permission denied reading file: ${filePath}`);
      expect(fs.readFile).toHaveBeenCalledWith(filePath, 'utf8');
    });

    it('should rethrow error for other error codes', async () => {
      const filePath = '/path/to/file.txt';
      const error = new Error('Other error');
      error.code = 'EIO';
      fs.readFile.mockRejectedValue(error);

      await expect(readFile(filePath)).rejects.toThrow(error);
      expect(fs.readFile).toHaveBeenCalledWith(filePath, 'utf8');
    });
  });

  describe('writeFile', () => {
    it('should write content to a file and create parent directories', async () => {
      const filePath = '/path/to/file.txt';
      const content = 'file content';
      fs.mkdir.mockResolvedValue(undefined);
      fs.writeFile.mockResolvedValue(undefined);

      await writeFile(filePath, content);

      expect(fs.mkdir).toHaveBeenCalledWith(path.dirname(filePath), { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(filePath, content, 'utf8');
    });

    it('should throw Error with message when permission denied (EACCES)', async () => {
      const filePath = '/path/to/file.txt';
      const content = 'file content';
      const error = new Error('Permission denied');
      error.code = 'EACCES';
      fs.mkdir.mockRejectedValue(error);

      await expect(writeFile(filePath, content)).rejects.toThrow(
        `Permission denied writing file: ${filePath}`
      );
    });

    it('should throw Error with message when no space left (ENOSPC)', async () => {
      const filePath = '/path/to/file.txt';
      const content = 'file content';
      const error = new Error('No space left');
      error.code = 'ENOSPC';
      fs.mkdir.mockResolvedValue(undefined);
      fs.writeFile.mockRejectedValue(error);

      await expect(writeFile(filePath, content)).rejects.toThrow(
        `No space left on device: ${filePath}`
      );
    });

    it('should rethrow error for other error codes', async () => {
      const filePath = '/path/to/file.txt';
      const content = 'file content';
      const error = new Error('Other error');
      error.code = 'EIO';
      fs.mkdir.mockResolvedValue(undefined);
      fs.writeFile.mockRejectedValue(error);

      await expect(writeFile(filePath, content)).rejects.toThrow(error);
    });
  });

  describe('exists', () => {
    it('should return true when file exists', async () => {
      const filePath = '/path/to/file.txt';
      fs.access.mockResolvedValue(undefined);

      const result = await exists(filePath);

      expect(result).toBe(true);
      expect(fs.access).toHaveBeenCalledWith(filePath);
    });

    it('should return false when file does not exist', async () => {
      const filePath = '/path/to/nonexistent.txt';
      const error = new Error('File not found');
      error.code = 'ENOENT';
      fs.access.mockRejectedValue(error);

      const result = await exists(filePath);

      expect(result).toBe(false);
      expect(fs.access).toHaveBeenCalledWith(filePath);
    });

    it('should return false for any access error', async () => {
      const filePath = '/path/to/file.txt';
      const error = new Error('Permission denied');
      error.code = 'EACCES';
      fs.access.mockRejectedValue(error);

      const result = await exists(filePath);

      expect(result).toBe(false);
      expect(fs.access).toHaveBeenCalledWith(filePath);
    });
  });

  describe('stat', () => {
    it('should return file statistics', async () => {
      const filePath = '/path/to/file.txt';
      const stats = {
        size: 1024,
        mtime: new Date(),
        isFile: () => true,
        isDirectory: () => false,
      };
      fs.stat.mockResolvedValue(stats);

      const result = await stat(filePath);

      expect(result).toBe(stats);
      expect(fs.stat).toHaveBeenCalledWith(filePath);
    });

    it('should throw Error with message when file not found (ENOENT)', async () => {
      const filePath = '/path/to/nonexistent.txt';
      const error = new Error('File not found');
      error.code = 'ENOENT';
      fs.stat.mockRejectedValue(error);

      await expect(stat(filePath)).rejects.toThrow(`File not found: ${filePath}`);
      expect(fs.stat).toHaveBeenCalledWith(filePath);
    });

    it('should throw Error with message when permission denied (EACCES)', async () => {
      const filePath = '/path/to/restricted.txt';
      const error = new Error('Permission denied');
      error.code = 'EACCES';
      fs.stat.mockRejectedValue(error);

      await expect(stat(filePath)).rejects.toThrow(
        `Permission denied accessing file: ${filePath}`
      );
      expect(fs.stat).toHaveBeenCalledWith(filePath);
    });

    it('should rethrow error for other error codes', async () => {
      const filePath = '/path/to/file.txt';
      const error = new Error('Other error');
      error.code = 'EIO';
      fs.stat.mockRejectedValue(error);

      await expect(stat(filePath)).rejects.toThrow(error);
      expect(fs.stat).toHaveBeenCalledWith(filePath);
    });
  });

  describe('mkdir', () => {
    it('should create a directory recursively', async () => {
      const dirPath = '/path/to/directory';
      fs.mkdir.mockResolvedValue(undefined);

      await mkdir(dirPath);

      expect(fs.mkdir).toHaveBeenCalledWith(dirPath, { recursive: true });
    });

    it('should throw Error with message when permission denied (EACCES)', async () => {
      const dirPath = '/path/to/directory';
      const error = new Error('Permission denied');
      error.code = 'EACCES';
      fs.mkdir.mockRejectedValue(error);

      await expect(mkdir(dirPath)).rejects.toThrow(
        `Permission denied creating directory: ${dirPath}`
      );
      expect(fs.mkdir).toHaveBeenCalledWith(dirPath, { recursive: true });
    });

    it('should rethrow error for other error codes', async () => {
      const dirPath = '/path/to/directory';
      const error = new Error('Other error');
      error.code = 'EIO';
      fs.mkdir.mockRejectedValue(error);

      await expect(mkdir(dirPath)).rejects.toThrow(error);
      expect(fs.mkdir).toHaveBeenCalledWith(dirPath, { recursive: true });
    });
  });

  describe('rm', () => {
    it('should remove a file', async () => {
      const filePath = '/path/to/file.txt';
      const stats = {
        isDirectory: () => false,
        isFile: () => true,
      };
      fs.stat.mockResolvedValue(stats);
      fs.unlink.mockResolvedValue(undefined);

      await rm(filePath);

      expect(fs.stat).toHaveBeenCalledWith(filePath);
      expect(fs.unlink).toHaveBeenCalledWith(filePath);
      expect(fs.rmdir).not.toHaveBeenCalled();
    });

    it('should remove a directory', async () => {
      const dirPath = '/path/to/directory';
      const stats = {
        isDirectory: () => true,
        isFile: () => false,
      };
      fs.stat.mockResolvedValue(stats);
      fs.rmdir.mockResolvedValue(undefined);

      await rm(dirPath);

      expect(fs.stat).toHaveBeenCalledWith(dirPath);
      expect(fs.rmdir).toHaveBeenCalledWith(dirPath);
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('should return silently when file does not exist (ENOENT)', async () => {
      const filePath = '/path/to/nonexistent.txt';
      const error = new Error('File not found');
      error.code = 'ENOENT';
      fs.stat.mockRejectedValue(error);

      await rm(filePath);

      expect(fs.stat).toHaveBeenCalledWith(filePath);
      expect(fs.unlink).not.toHaveBeenCalled();
      expect(fs.rmdir).not.toHaveBeenCalled();
    });

    it('should throw Error with message when permission denied (EACCES)', async () => {
      const filePath = '/path/to/file.txt';
      const error = new Error('Permission denied');
      error.code = 'EACCES';
      fs.stat.mockRejectedValue(error);

      await expect(rm(filePath)).rejects.toThrow(`Permission denied removing: ${filePath}`);
      expect(fs.stat).toHaveBeenCalledWith(filePath);
    });

    it('should rethrow error for other error codes', async () => {
      const filePath = '/path/to/file.txt';
      const stats = {
        isDirectory: () => false,
        isFile: () => true,
      };
      const error = new Error('Other error');
      error.code = 'EIO';
      fs.stat.mockResolvedValue(stats);
      fs.unlink.mockRejectedValue(error);

      await expect(rm(filePath)).rejects.toThrow(error);
      expect(fs.stat).toHaveBeenCalledWith(filePath);
      expect(fs.unlink).toHaveBeenCalledWith(filePath);
    });
  });
});
