/**
 * Unit tests for hash utility module.
 * 
 * @module test/unit/compiler/utils/hash
 */

const { sha256, sha256Buffer, sha256Concat } = require('../../../../src/compiler/utils/hash');

describe('hash utility module', () => {
  describe('sha256', () => {
    it('should compute SHA256 hash of a string', () => {
      const input = 'hello world';
      const result = sha256(input);

      expect(typeof result).toBe('string');
      expect(result).toHaveLength(64); // SHA256 produces 64 hex characters
      expect(result).toMatch(/^[0-9a-f]{64}$/); // Valid hex string
    });

    it('should produce deterministic hashes (same input = same output)', () => {
      const input = 'test string';
      const hash1 = sha256(input);
      const hash2 = sha256(input);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = sha256('hello');
      const hash2 = sha256('world');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const result = sha256('');

      expect(typeof result).toBe('string');
      expect(result).toHaveLength(64);
      // Empty string hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
      expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('should handle unicode strings', () => {
      const input = '你好世界 🌍';
      const result = sha256(input);

      expect(typeof result).toBe('string');
      expect(result).toHaveLength(64);
    });

    it('should handle long strings', () => {
      const input = 'a'.repeat(10000);
      const result = sha256(input);

      expect(typeof result).toBe('string');
      expect(result).toHaveLength(64);
    });

    it('should throw TypeError for non-string input (number)', () => {
      expect(() => sha256(123)).toThrow(TypeError);
      expect(() => sha256(123)).toThrow('Input must be a string');
    });

    it('should throw TypeError for non-string input (object)', () => {
      expect(() => sha256({})).toThrow(TypeError);
      expect(() => sha256({})).toThrow('Input must be a string');
    });

    it('should throw TypeError for non-string input (null)', () => {
      expect(() => sha256(null)).toThrow(TypeError);
      expect(() => sha256(null)).toThrow('Input must be a string');
    });

    it('should throw TypeError for non-string input (undefined)', () => {
      expect(() => sha256(undefined)).toThrow(TypeError);
      expect(() => sha256(undefined)).toThrow('Input must be a string');
    });

    it('should throw TypeError for non-string input (array)', () => {
      expect(() => sha256(['hello'])).toThrow(TypeError);
      expect(() => sha256(['hello'])).toThrow('Input must be a string');
    });
  });

  describe('sha256Buffer', () => {
    it('should compute SHA256 hash of a Buffer', () => {
      const input = Buffer.from('hello world', 'utf8');
      const result = sha256Buffer(input);

      expect(typeof result).toBe('string');
      expect(result).toHaveLength(64);
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce deterministic hashes (same buffer = same output)', () => {
      const input = Buffer.from('test string', 'utf8');
      const hash1 = sha256Buffer(input);
      const hash2 = sha256Buffer(input);

      expect(hash1).toBe(hash2);
    });

    it('should produce same hash as sha256 for equivalent string', () => {
      const str = 'hello world';
      const buffer = Buffer.from(str, 'utf8');

      const strHash = sha256(str);
      const bufferHash = sha256Buffer(buffer);

      expect(strHash).toBe(bufferHash);
    });

    it('should handle empty buffer', () => {
      const input = Buffer.alloc(0);
      const result = sha256Buffer(input);

      expect(typeof result).toBe('string');
      expect(result).toHaveLength(64);
      expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('should handle binary data', () => {
      const input = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]);
      const result = sha256Buffer(input);

      expect(typeof result).toBe('string');
      expect(result).toHaveLength(64);
    });

    it('should throw TypeError for non-buffer input (string)', () => {
      expect(() => sha256Buffer('hello')).toThrow(TypeError);
      expect(() => sha256Buffer('hello')).toThrow('Input must be a Buffer');
    });

    it('should throw TypeError for non-buffer input (number)', () => {
      expect(() => sha256Buffer(123)).toThrow(TypeError);
      expect(() => sha256Buffer(123)).toThrow('Input must be a Buffer');
    });

    it('should throw TypeError for non-buffer input (object)', () => {
      expect(() => sha256Buffer({})).toThrow(TypeError);
      expect(() => sha256Buffer({})).toThrow('Input must be a Buffer');
    });

    it('should throw TypeError for non-buffer input (null)', () => {
      expect(() => sha256Buffer(null)).toThrow(TypeError);
      expect(() => sha256Buffer(null)).toThrow('Input must be a Buffer');
    });

    it('should throw TypeError for non-buffer input (undefined)', () => {
      expect(() => sha256Buffer(undefined)).toThrow(TypeError);
      expect(() => sha256Buffer(undefined)).toThrow('Input must be a Buffer');
    });
  });

  describe('sha256Concat', () => {
    it('should compute SHA256 hash of concatenated strings', () => {
      const result = sha256Concat('hello', ' ', 'world');

      expect(typeof result).toBe('string');
      expect(result).toHaveLength(64);
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce same hash as sha256 for concatenated string', () => {
      const str1 = 'hello';
      const str2 = 'world';
      const concatenated = str1 + str2;

      const concatHash = sha256Concat(str1, str2);
      const directHash = sha256(concatenated);

      expect(concatHash).toBe(directHash);
    });

    it('should handle single string input', () => {
      const input = 'single string';
      const result = sha256Concat(input);
      const expected = sha256(input);

      expect(result).toBe(expected);
    });

    it('should handle multiple string inputs', () => {
      const result = sha256Concat('a', 'b', 'c', 'd', 'e');
      const expected = sha256('abcde');

      expect(result).toBe(expected);
    });

    it('should handle empty strings in concatenation', () => {
      const result = sha256Concat('hello', '', 'world');
      const expected = sha256('helloworld');

      expect(result).toBe(expected);
    });

    it('should handle many inputs', () => {
      const inputs = Array.from({ length: 100 }, (_, i) => `part${i}`);
      const result = sha256Concat(...inputs);
      const expected = sha256(inputs.join(''));

      expect(result).toBe(expected);
    });

    it('should produce deterministic hashes', () => {
      const hash1 = sha256Concat('a', 'b', 'c');
      const hash2 = sha256Concat('a', 'b', 'c');

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different input order', () => {
      const hash1 = sha256Concat('a', 'b');
      const hash2 = sha256Concat('b', 'a');

      expect(hash1).not.toBe(hash2);
    });

    it('should throw TypeError when no inputs provided', () => {
      expect(() => sha256Concat()).toThrow(TypeError);
      expect(() => sha256Concat()).toThrow('At least one input string is required');
    });

    it('should handle mixed types by converting to strings', () => {
      // sha256Concat uses join('') which converts non-strings to strings
      const result = sha256Concat('hello', 123);
      const expected = sha256('hello123');

      expect(result).toBe(expected);
    });

    it('should handle unicode strings in concatenation', () => {
      const result = sha256Concat('你好', '世界', ' 🌍');
      const expected = sha256('你好世界 🌍');

      expect(result).toBe(expected);
    });
  });

  describe('integration tests', () => {
    it('should produce consistent results across all hash functions for equivalent data', () => {
      const str = 'test data';
      const buffer = Buffer.from(str, 'utf8');

      const strHash = sha256(str);
      const bufferHash = sha256Buffer(buffer);
      const concatHash = sha256Concat('test', ' ', 'data');

      expect(strHash).toBe(bufferHash);
      expect(strHash).toBe(concatHash);
    });

    it('should produce different hashes for similar but different inputs', () => {
      const hash1 = sha256('hello');
      const hash2 = sha256('hello ');
      const hash3 = sha256('Hello');

      expect(hash1).not.toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash2).not.toBe(hash3);
    });
  });
});
