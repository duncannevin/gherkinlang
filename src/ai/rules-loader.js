/**
 * Language rules loader for GherkinLang compiler.
 * 
 * Loads and caches language rules from rules.md file for target-specific
 * compilation instructions. Provides in-memory caching and change detection.
 * 
 * @module ai/rules-loader
 */

/**
 * @typedef {import('../compiler/types').LanguageRules} LanguageRules
 */

const { RulesLoadError } = require('../compiler/errors');
const { sha256 } = require('../compiler/utils/hash');
const { readFile, stat } = require('../compiler/utils/fs');

/**
 * Loader for language rules from rules.md file.
 * 
 * @class RulesLoader
 */
class RulesLoader {
  /**
   * Creates a new RulesLoader instance.
   */
  constructor() {
    // In-memory cache: Map<target, LanguageRules>
    this._cache = new Map();
    // Track file stats: Map<target, { mtime, size }>
    this._fileStats = new Map();
  }

  /**
   * Load language rules for target language
   * @param {string} target - Target language ('javascript' | 'elixir')
   * @param {string} [rulesPath] - Optional path to rules.md (default: 'src/ai/rules.md')
   * @returns {Promise<LanguageRules>} Loaded language rules
   * @throws {RulesLoadError} If rules file cannot be loaded
   */
  async load(target, rulesPath = 'src/ai/rules.md') {
    // Validat target
    const validTargets = ['javascript'];

    if (!validTargets.includes(target)) {
        throw new RulesLoadError(`Invalid target: ${target}`, {target});
    }

    if (!rulesPath || typeof rulesPath !== 'string') {
        throw new RulesLoadError('Invalid rules path', {target});
    }

    try {
        const content = await readFile(rulesPath);
        const contentHash = sha256(content);
        const rulesContent = this._extractTargetRules(content, target);

        // Get file stats for change detection
        const stats = await stat(rulesPath);

        // Create LanguageRules object
        const rules = {
            content: rulesContent,
            target,
            contentHash,
            loadedAt: new Date(),
            filePath: rulesPath,
        };

        this._cache.set(target, rules);
        this._fileStats.set(target, {
            mtime: stats.mtime,
            size: stats.size,
            filePath: rulesPath,
        });

        return rules;
    } catch (e) {
        if (!e.message && e.message.includes('File not found')) {
            throw new RulesLoadError(`Rules file not found: ${rulesPath}`, {filePath: rulesPath, target});
        }
        if (!e.message && e.message.includes('Permission denied')) {
            throw new RulesLoadError(`Permission denied to read rules file: ${rulesPath}`, {filePath: rulesPath, target});
        }
        throw new RulesLoadError(`Failed to read rules file: ${rulesPath}`, {filePath: rulesPath, target});
    }
  }

  /**
   * Get cached rules if available and still valid
   * @param {string} target - Target language
   * @returns {LanguageRules|null} Cached rules or null if not cached or invalid
   */
  getCached(target) {
    return this._cache.get(target) || null;
  }

  /**
   * Check if rules file has changed since last load
   * @param {string} target - Target language
   * @param {string} [rulesPath] - Optional path to rules.md
   * @returns {Promise<boolean>} true if rules file modified, false otherwise
   * @throws {RulesLoadError} If file cannot be accessed
   */
  async hasChanged(target, rulesPath = 'src/ai/rules.md') {
    const cachedState = this._fileStats.get(target);

    if (!cachedState) {
        return true;
    }

    if (cachedState.filePath !== rulesPath) {
        return true;
    }

    try {
        const currentStats = await stat(rulesPath);
        const timeChanged = currentStats.mtime.getTime() !== cachedState.mtime.getTime();
        const sizeChanged = currentStats.size !== cachedState.size;

        return timeChanged || sizeChanged;
    } catch (e) {
        throw new RulesLoadError(
            `Failed to check if rules file has changed: ${e.message || ''}`,
            {filePath: rulesPath, target},
        );
    }
  }

  /**
 * Extract target-specific rules from markdown content
 * @param {string} content - Full markdown content
 * @param {string} target - Target language
 * @returns {string} Extracted rules content
 */
_extractTargetRules(content, target) {
    // If no target-specific sections, return full content
    const targetHeader = `## ${target.charAt(0).toUpperCase() + target.slice(1)} Rules`;
    if (!content.includes(targetHeader)) {
      return content;
    }
  
    // Extract target-specific section
    const lines = content.split('\n');
    const result = [];
    let inTargetSection = false;
    let foundCommon = false;
  
    // First, look for common rules (before target sections)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Stop at first target-specific section
      if (line.startsWith('## ') && line.includes('Rules')) {
        if (line.includes(targetHeader)) {
          inTargetSection = true;
          result.push(line);
          continue;
        }
        if (inTargetSection) {
          // End of target section
          break;
        }
        continue;
      }
      
      if (inTargetSection) {
        result.push(line);
      } else if (!foundCommon && !line.startsWith('## ')) {
        // Common rules before any target section
        result.push(line);
      }
    }
  
    return result.join('\n').trim() || content;
  }
}

module.exports = { RulesLoader };
