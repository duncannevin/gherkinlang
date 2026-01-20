/**
 * Cache manager for GherkinLang compiler.
 * 
 * Provides content-addressed caching to ensure deterministic, incremental
 * builds. Generates cache keys from source content, rules, compiler version,
 * and target language. Manages cache storage, retrieval, validation, and
 * LRU eviction.
 * 
 * @module compiler/cache
 */

const path = require('path');
const { CacheError } = require('./errors');
const { sha256Concat } = require('./utils/hash');
const { readFile, writeFile, exists, mkdir, rm, stat } = require('./utils/fs');

/**
 * @typedef {import('./types').CacheManagerOptions} CacheManagerOptions
 */

/**
 * Cache manager for GherkinLang compiler.
 * 
 * @param {CacheManagerOptions} [options={}] - Configuration options
 */
class CacheManager {
    constructor(options = {}) {
        this.cacheDir = options.cacheDir || '.gherkin-cache';
        this.maxSize = this.parseSize(options.maxSize || '100MB');
        this.compilerVersion = options.compilerVersion || '1.0.0'
        this.manifestPath = path.join(this.cacheDir, 'manifest.json');
        this.stats = {
            hits: 0,
            misses: 0,
        };

        // Initialize manifest structure (will be created in Step 4)
        this.manifest = {
            entries: [],
            totalSize: 0,
            maxSize: 0,
            lastUpdated: new Date().toISOString(),
        };
    }

    async get(key) {
        try {
            await this._getOrInitializeManifest();

            // Check if manifest is initialized
            const manifestEntry = this._findManifestEntry(key);

            if (!manifestEntry) {
                this.stats.misses++;
                return null;
            }

            // Read cache file
            const cachePath = this._getCacheEntryPath(key);

            if (!(await exists(cachePath))) {
                // Entry in manifest but file missing - remove from manifest
                await this._removeManifestEntry(key);
                this.stats.misses++;
                return null;
            }

            // Read cache file content
            const content = await readFile(cachePath);
            const entry = JSON.parse(content);

            // Validate entry structure
            if (!entry.key || !entry.sourceHash || !entry.compiledCode || !entry.metadata) {
                await this.clear(key);
                this.stats.misses++;
                return null;
            }

            manifestEntry.lastAccessed = new Date().toISOString();
            this.manifest.lastUpdated = new Date().toISOString();
            await this._saveManifest();

            this.stats.hits++;
            return entry;
        } catch (error) {
            console.warn(`Warning: Cache get failed for key: ${error.message}`);
            throw new CacheError(`Failed to retrieve cache entry: ${error.message}`, {
                key,
                operation: 'get',
                code: error.code,
            });
        }
    }

    async isValid(key) {
        try {
            // Check if entry exists in manifest
            const manifestEntry = this._findManifestEntry(key);
            if (!manifestEntry) {
                return false;
            }

            // Check if cache file exists
            const cachePath = this._getCacheEntryPath(key);
            if (!(await exists(cachePath))) {
                return false;
            }

            // Try to read and parse cache file
            const content = await readFile(cachePath);
            const entry = JSON.parse(content);

            // Validate entry structure
            if (!entry.key || !entry.sourceHash || !entry.compiledCode || !entry.metadata) {
                return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    async _getOrInitializeManifest() {
        if (await exists(this.manifestPath)) {
            await this._loadManifest();
        } else {
            await this._initializeManifest();
        }
    }

    async set(key, entry) {
        try {
            await this._getOrInitializeManifest();

            await this._initializeCacheDir();

            const cachePath = this._getCacheEntryPath(key);
            const content = JSON.stringify(entry, null, 2);
            await writeFile(cachePath, content);

            const entrySize = Buffer.byteLength(content, 'utf8');

            const existingEntry = this._findManifestEntry(key);

            if (existingEntry) {
                // Update existing entry
                this.manifest.totalSize = this.manifest.totalSize - existingEntry.size + entrySize;
                existingEntry.size = entrySize;
                existingEntry.lastAccessed = new Date();
            } else {
                // Add new entry
                this.manifest.entries.push({
                    key,
                    file: cachePath,
                    size: entrySize,
                    lastAccessed: new Date(),
                });
                this.manifest.totalSize += entrySize;
            }

            this.manifest.lastUpdated = new Date().toISOString();

            await this._saveManifest();
            // await this.evict(this.maxSize);
        } catch (error) {
            console.warn(`Warning: Cache set failed for key: ${error.message}`);
            throw new CacheError(`Failed to store cache entry: ${error.message}`, {
                key,
                operation: 'set',
                code: error.code,
            });
        }
    }

    async evict(maxSize) {
        try {
            // Sort entries by lastAccessed (oldest first)
            this.manifest.entries.sort((a, b) => {
                const aTime = a.lastAccessed instanceof Date
                    ? a.lastAccessed.getTime()
                    : new Date(a.lastAccessed).getTime();
                const bTime = b.lastAccessed instanceof Date
                    ? b.lastAccessed.getTime()
                    : new Date(b.lastAccessed).getTime();
                return aTime - bTime;
            });

            // Remove entries until under size limit
            while (this.manifest.totalSize > maxSize && this.manifest.entries.length > 0) {
                const oldest = this.manifest.entries.shift();
                this.manifest.totalSize -= oldest.size;

                try {
                    await rm(oldest.file);
                } catch (error) {
                    // Ignore errors when removing individual files
                }
            }

            this.manifest.lastUpdated = new Date().toISOString();
            await this._saveManifest();
        } catch (error) {
            throw new CacheError(`Failed to evict cache entries: ${error.message}`, {
                operation: 'evict',
                code: error.code,
            });
        }
    }

    async invalidate(sourceHash, rulesHash, compilerVersion, target) {
        const keysToInvalidate = [];

        for (const entry of this.manifest.entries) {
            try {
                const cachePath = this._getCacheEntryPath(entry.key);
                if (await exists(cachePath)) {
                    const content = await readFile(cachePath);
                    const cacheEntry = JSON.parse(content);

                    // Check if entry is invalid
                    if (
                        cacheEntry.sourceHash !== sourceHash ||
                        cacheEntry.rulesHash !== rulesHash ||
                        cacheEntry.metadata.compilerVersion !== compilerVersion ||
                        cacheEntry.metadata.target !== target
                    ) {
                        keysToInvalidate.push(entry.key);
                    }
                }
            } catch (error) {
                // If we can't read entry, mark it for invalidation
                keysToInvalidate.push(entry.key);
            }
        }

        // Clear invalid entries
        for (const key of keysToInvalidate) {
            await this.clear(key);
        }
    }

    async getStats() {
        await this._getOrInitializeManifest();

        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? this.stats.hits / total : 0;

        return {
            entries: this.manifest.entries.length,
            totalSize: this.manifest.totalSize,
            hits: this.stats.hits,
            misses: this.stats.misses,
            hitRate: hitRate,
        };
    }

    calculateSize() {
        return this.manifest.totalSize;
    }

    generateKey(source, rules, compilerVersion, target) {
        return sha256Concat(source, rules, compilerVersion, target);
    }

    parseSize(sizeString) {
        const match = sizeString.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB|B)?$/i);

        if (!match) {
            throw new CacheError(`Invalid size string: ${sizeString}`);
        }

        const value = parseFloat(match[1]);
        const unit = (match[2] || 'B').toUpperCase();

        const multipliers = {
            B: 1,
            KB: 1024,
            MB: 1024 * 1024,
            GB: 1024 * 1024 * 1024,
        };

        return Math.floor(value * multipliers[unit]);
    }

    // Helper method for removing manifest entry
    async _removeManifestEntry(key) {
        const index = this.manifest.entries.findIndex(entry => entry.key === key);
        if (index !== -1) {
            const entry = this.manifest.entries[index];
            this.manifest.totalSize -= entry.size;
            this.manifest.entries.splice(index, 1);
            this.manifest.lastUpdated = new Date().toISOString();
        }
    }

    async clear(key) {
        try {
            if (key) {
                // Clear specific entry
                const cachePath = this._getCacheEntryPath(key);
                await rm(cachePath);
                await this._removeManifestEntry(key);
                await this._saveManifest();
            } else {
                // Clear all entries
                for (const entry of this.manifest.entries) {
                    try {
                        await rm(entry.file);
                    } catch (error) {
                        // Ignore errors when removing individual files
                    }
                }
                this.manifest.entries = [];
                this.manifest.totalSize = 0;
                this.manifest.lastUpdated = new Date().toISOString();
                await this._saveManifest();
            }
        } catch (error) {
            throw new CacheError(`Failed to clear cache: ${error.message}`, {
                key,
                operation: 'clear',
                code: error.code,
            });
        }
    }

    // Helper method for removing manifest entry
    async _removeManifestEntry(key) {
        const index = this.manifest.entries.findIndex(entry => entry.key === key);
        if (index !== -1) {
            const entry = this.manifest.entries[index];
            this.manifest.totalSize -= entry.size;
            this.manifest.entries.splice(index, 1);
            this.manifest.lastUpdated = new Date().toISOString();
        }
    }

    async _initializeCacheDir() {
        try {
            await mkdir(this.cacheDir);
        } catch (error) {
            // Check if directory already exists - if mkdir is recursive, EEXIST shouldn't happen
            // But if it does, that's fine - directory exists
            if (error.code !== 'EEXIST' && !(await exists(this.cacheDir))) {
                console.warn(`Warning: Could not create cache directory: ${this.cacheDir} - ${error.message}`);
            }
        }
    }

    async _loadManifest() {
        try {
            if (!(await exists(this.manifestPath))) {
                console.warn(`Warning: Cache manifest not found: ${this.manifestPath}`);
                return false;
            }

            const content = await readFile(this.manifestPath);
            const manifest = JSON.parse(content);

            // Convert ISO strings back to Date objects
            manifest.entries = manifest.entries.map(entry => ({
                ...entry,
                lastAccessed: new Date(entry.lastAccessed),
            }));

            // IMPORTANT: Assign the loaded manifest to this.manifest
            this.manifest = manifest;

            // Also ensure maxSize is set
            if (!this.manifest.maxSize) {
                this.manifest.maxSize = this.maxSize;
            }

            return true;
        } catch (error) {
            console.warn(`Could not load cache manifest: ${error.message}`);
            return false;
        }
    }

    async _saveManifest() {
        try {
            const entries = this._copyEntries();
            const content = JSON.stringify({
                ...this.manifest,
                lastUpdated: new Date().toISOString(),
                entries,
            }, null, 2);

            await writeFile(this.manifestPath, content);
        } catch (error) {
            console.warn(`Warning: Could not save cache manifest: ${error.message}`);
        }
    }

    async _initializeManifest() {
        await this._initializeCacheDir();

        const loaded = await this._loadManifest();

        if (!loaded) {
            // Create new manifest
            this.manifest = {
                entries: [],
                totalSize: 0,
                maxSize: this.maxSize,
                lastUpdated: new Date().toISOString(),
            };

            await this._saveManifest();
        }
    }

    _copyEntries() {
        return this.manifest.entries.map((entry) => ({
            ...entry,
            lastAccessed: entry.lastAccessed instanceof Date
                ? entry.lastAccessed.toISOString()
                : new Date(entry.lastAccessed).toISOString(),
        }));
    }

    _getCacheEntryPath(key) {
        return path.join(this.cacheDir, `${key}.cache`);
    }

    _findManifestEntry(key) {
        return this.manifest.entries.find((entry) => entry.key === key);
    }
}

module.exports = { CacheManager };
