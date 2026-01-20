/**
 * Project context manager for GherkinLang compiler.
 * 
 * Manages awareness of the full project during compilation, including file
 * discovery, module registry, dependency graph construction, and configuration
 * loading. Enables cross-module references and determines compilation order.
 * 
 * @module compiler/context
 */

const { GherkinParser } = require('./parser');
const { ContextBuildError } = require('./errors');
const { findFiles, readFile, exists } = require('./utils/fs');
const path = require('path');

/**
 * @typedef {import('./types').ModuleInfo} ModuleInfo
 * @typedef {import('./types').DependencyGraph} DependencyGraph
 * @typedef {import('./types').ProjectConfiguration} ProjectConfiguration
 */

class ProjectContext {
    /**
     * Creates a new ProjectContext instance.
     * 
     * @constructor
     */
    constructor() {
        /** @type {Map<string, ModuleInfo>} */
        this._modules = new Map();
        /** @type {Map<string, string>} */
        this._fileToModule = new Map();
        /** @type {DependencyGraph | null} */
        this._graph = null;
        /** @type {ProjectConfiguration | null} */
        this._config = null;
    }

    /**
     * Build project context by discovering files, parsing features, and constructing dependency graph.
     * 
     * @param {string} rootDir - Root directory to search for .feature files
     * @param {string} [configPath] - Path to configuration file (default: rootDir/.gherkinrc.json)
     * @returns {Promise<void>}
     * @throws {ContextBuildError} If root directory not found or context building fails
     */
    async build(rootDir, configPath = path.join(rootDir, '.gherkinrc.json')) {
        // Normalize paths
        const root = path.resolve(rootDir);
        const configFile = path.resolve(configPath);

        this._config = await this._loadConfig(configFile);

        if (!await exists(root)) {
            throw new ContextBuildError(`Root directory not found: ${root}`, {
                rootDir: root,
            });
        }

        const featureFiles = await findFiles(root);
        const parser = new GherkinParser();
        const parsedFeatures = await parser.parseMany(featureFiles);

        this._buildModuleRegistry(parsedFeatures, root);
        this._buildAdjacentList(parsedFeatures, root);
    }

    /**
     * Get topological sort order for compilation using Kahn's algorithm.
     * 
     * @returns {string[]} Array of module names in compilation order
     */
    getCompilerOrder() {
        if (!this._graph) {
            return [];
        }
    
        if (this._graph.compileOrder.length > 0) {
            return this._graph.compileOrder;
        }
    
        const inDegree = new Map();
        const queue = [];
        const result = [];
    
        for (const node of this._graph.nodes) {
            inDegree.set(node, this._graph.reverseEdges.get(node)?.size || 0);
            if (inDegree.get(node) === 0) {
                queue.push(node);
            }
        }
    
        while (queue.length > 0) {
            const node = queue.shift();

            if (!node) {
                continue;
            }

            result.push(node); // FIX: Add node to result
    
            for (const dep of this._graph.edges.get(node) || []) {
                const newInDegree = inDegree.get(dep) - 1;
                inDegree.set(dep, newInDegree);
                if (newInDegree === 0) {
                    queue.push(dep);
                }
            }
        }
    
        // If result doesn't contain all nodes, there's a cycle
        if (result.length !== this._graph.nodes.size) {
            return [];
        }
    
        this._graph.compileOrder = result;
        return result;
    }

    /**
     * Detect circular dependencies in the dependency graph.
     * 
     * @returns {import('./types').Cycle[]} Array of detected cycles
     */
    detectCycles() {
        if (!this._graph) {
            return [];
        }

        const _graph = this._graph;
        const cycles = [];
        const visited = new Set();
        const recursionStack = new Set();
        const path = [];

        const dfs = (moduleName) => {
            // Mark current node as visited and add to recursion stack/path
            visited.add(moduleName);
            recursionStack.add(moduleName);
            path.push(moduleName);

            const deps = _graph.edges.get(moduleName);
            if (!deps) {
                return;
            }

            // Check all dependencies
            for (const dep of deps) {
                if (!visited.has(dep)) {
                    // Not visited yet - recurse
                    dfs(dep);
                } else if (recursionStack.has(dep)) {
                    // Found cycle! This dependency is on the current path
                    const cycleStart = path.indexOf(dep);
                    const cycleModules = path.slice(cycleStart).concat(dep);
                    cycles.push({
                        modules: cycleModules,
                        message: `Circular dependency: ${cycleModules.join(' -> ')}`,
                    });
                }
                // If visited but not in recursion stack, it's already fully processed - skip
            }

            // Done processing this node - remove from recursion stack and path
            recursionStack.delete(moduleName);
            path.pop();
        };

        // Check all components of graph
        for (const node of this._graph.nodes) {
            if (!visited.has(node)) {
                dfs(node);
            }
        }

        return cycles;
    }

    /**
     * Get module information by name.
     * 
     * @param {string} moduleName - Module name (feature name)
     * @returns {ModuleInfo|null} Module information or null if not found
     */
    getModule(moduleName) {
        return this._modules.get(moduleName) || null;
    }

    /**
     * Get dependencies for a module.
     * 
     * @param {string} moduleName - Module name (feature name)
     * @returns {string[]} Array of dependency module names
     */
    getDependencies(moduleName) {
        const module = this._modules.get(moduleName);
        if (!module) {
            return [];
        }
        return Array.from(module.dependencies);
    }

    /**
     * Get loaded project configuration.
     * 
     * @returns {ProjectConfiguration|null} Project configuration or null if not loaded
     */
    getConfig() {
        return this._config;
    }

    _buildModuleRegistry(parsedFeatures, root) {
        for (const [filePath, parsedFeature] of parsedFeatures.entries()) {
            if (parsedFeature.errors.length > 0) {
                continue;
            }

            if (this._modules.has(parsedFeature.featureName)) {
                const existingModule = this._modules.get(parsedFeature.featureName);
                throw new ContextBuildError(
                    `Duplicate feature name "${parsedFeature.featureName}" found in:\n` +
                    `  - ${existingModule?.file || 'unknown file'}\n` +
                    `  - ${filePath}`,
                    {
                        featureName: parsedFeature.featureName,
                        rootDir: root,
                    }
                );
            }

            this._fileToModule.set(filePath, parsedFeature.featureName);

            this._modules.set(parsedFeature.featureName, {
                file: filePath,
                exports: parsedFeature.scenarios.map(scenario => scenario.name),
                dependencies: parsedFeature.imports,
                parsedAt: new Date(),
            });
        }
    }

    _buildAdjacentList(parsedFeatures, root) {
        const nodes = new Set(this._modules.keys());
        const edges = new Map();
        const reverseEdges = new Map();

        for (const moduleName of nodes) {
            edges.set(moduleName, new Set());
            reverseEdges.set(moduleName, new Set());
        }

        for (const [moduleName, moduleInfo] of this._modules.entries()) {
            for (const dep of moduleInfo.dependencies) {
                if (!nodes.has(dep)) {
                    throw new ContextBuildError(
                        `Module "${moduleName}" depends on an unknow module "${dep}"`,
                        { rootDir: root, featureName: moduleName },
                    );
                }

                edges.get(moduleName).add(dep);
                reverseEdges.get(dep).add(moduleName);
            }
        }

        this._graph = {
            nodes,
            edges,
            reverseEdges,
            compileOrder: [],
        };
    }

    async _loadConfig(configFile) {
        // T038: Load configuration
        let configData = {};

        if (await exists(configFile)) {
            try {
                const content = await readFile(configFile);
                configData = JSON.parse(content);
            } catch (error) {
                throw new ContextBuildError(
                    `Invalid configuration file: ${configFile} - ${error.message}`,
                    { rootDir: path.dirname(configFile) }
                );
            }
        }

        // T039: Validate required fields and types
        // T040: Apply defaults for missing optional fields
        return {
            target: configData.target || 'javascript',
            moduleFormat: configData.moduleFormat || 'commonjs',
            output: {
                dir: configData.output?.dir || 'dist',
                testDir: configData.output?.testDir || 'test/generated',
                docsDir: configData.output?.docsDir || 'docs',
            },
            cache: {
                enabled: configData.cache?.enabled ?? true,
                dir: configData.cache?.dir || '.gherkin-cache',
                maxSize: configData.cache?.maxSize || '100MB',
                ttl: configData.cache?.ttl || '7d',
            },
            validation: {
                syntax: configData.validation?.syntax ?? true,
                purity: configData.validation?.purity ?? true,
                lint: configData.validation?.lint ?? false,
                lintConfig: configData.validation?.lintConfig || '.eslintrc.json',
            },
            ai: {
                model: configData.ai?.model || 'claude-3-opus-20240229',
                maxRetries: configData.ai?.maxRetries || 3,
                timeout: configData.ai?.timeout || 60000,
            },
            generation: {
                jsdoc: configData.generation?.jsdoc ?? true,
                tests: configData.generation?.tests ?? true,
                docs: configData.generation?.docs ?? false,
                prettier: configData.generation?.prettier ?? true,
            },
            ...(configData.watch && {
                watch: {
                    debounce: configData.watch.debounce || 300,
                    ignore: configData.watch.ignore || [],
                },
            }),
        };
    }
}

module.exports = { ProjectContext };
