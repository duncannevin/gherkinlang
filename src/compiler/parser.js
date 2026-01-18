/**
 * Basic Gherkin parser for structure analysis.
 * 
 * Parses GherkinLang source files to extract structural information such as
 * feature names, scenarios, and basic syntax validation. Used for dependency
 * resolution and project context building before AI transformation.
 * 
 * @module compiler/parser
 */

/**
 * @typedef {import('./types').ParsedFeature} ParsedFeature
 * @typedef {import('./types').ScenarioInfo} ScenarioInfo
 */

const { readFile, findFiles } = require('./utils/fs');
const path = require('path');
const { ParseError } = require('./errors');

class GherkinParser {
    /**
      * Parse a .feature file and extract structure.
      * @param {string} filePath - Path to .feature file
      * @param {string} [content] - Optional file content (if omitted, reads from filePath)
      * @returns {Promise<ParsedFeature>}
      */
    async parse(filePath, content) {
        const text = content !== null && typeof content === 'string' ? content : await readFile(filePath);

        if (!text) {
            throw new Error(`Failed to read file: ${filePath}`);
        }

        const lines = text.split(/\r?\n/);
        const { featureName, errors: featureErrors } = this._extractFeatureName(lines);
        const { imports, errors: importErrors } = this._extractImports(lines);
        const { scenarios, errors: scenarioErrors } = this._extractScenarios(lines);

        const errors = [...featureErrors, ...importErrors, ...scenarioErrors];

        return {
            featureName,
            imports,
            scenarios,
            dependencies: [], // TODO: Implement dependency extraction
            errors,
            lineCount: lines.length,
            filePath,
        };
    }

    /**
     * Parse multiple .feature files.
     * @param {string[]} filePaths - Array of file paths to parse
     * @returns {Promise<Map<string, ParsedFeature>>} Map of file path to parsed feature
     */
    async parseMany(filePaths) {
        const results = new Map();

        // Parse each file (can be parallelized later, but sequential for now)
        for (const filePath of filePaths) {
            try {
                const parsed = await this.parse(filePath);
                results.set(filePath, parsed);
            } catch (error) {
                // Create error result for failed parse
                results.set(filePath, {
                    featureName: '',
                    filePath,
                    scenarios: [],
                    imports: [],
                    dependencies: [],
                    errors: [
                        new ParseError(error.message, {
                            type: 'system',
                        }),
                    ],
                    lineCount: 0
                });
            }
        }

        return results;
    }

    /**
     * Parse all .feature files in a directory recursively.
     * @param {string} dirPath - Path to directory to search
     * @param {string} [pattern='*.feature'] - File pattern to match (default: '*.feature')
     * @returns {Promise<Map<string, ParsedFeature>>} Map of file path to parsed feature
     */
    async parseDirectory(dirPath, pattern = '*.feature') {
        const filePaths = await findFiles(dirPath, pattern);
        return await this.parseMany(filePaths);
    }

    _extractImports(lines) {
        const imports = [];

        for (const l of lines) {
            const line = l.trim();
            const importMatch = line.match(/^Given\s+import\s+(\w+)$/i);
            if (importMatch) {
                imports.push(importMatch[1]); // Remove "Given import <moduleName>" prefix
            }
        }
        return {
            imports,
            errors: [],
        };
    }

    /**
     * @param {string[]} lines 
     * @returns {{scenarios: ScenarioInfo[], errors: ParseError[]}}
     */
    _extractScenarios(lines) {
        const scenarios = [];
        let lineNumber = 1;
        const errors = [];

        for (lineNumber; lineNumber <= lines.length; lineNumber++) {
            const line = lines[lineNumber - 1].trim();
            if (line.startsWith('Scenario:')) {
                const scenarioName = line.substring(9).trim(); // Remove "Scenario:" prefix
                scenarios.push({
                    name: scenarioName,
                    lineNumber,
                });
            }
        }

        // Check for missing scenarios
        if (scenarios.length === 0) {
            errors.push(
                new ParseError(`Missing scenarios`, {
                    type: 'structure',
                })
            )
        }

        return {
            scenarios,
            errors,
        };
    }

    /**
     * @param {string[]} lines 
     * @returns {{featureName: string, errors: ParseError[]}}
     */
    _extractFeatureName(lines) {
        const featureName = lines[0].trim();
        const errors = [];

        if (!featureName || !featureName.startsWith('Feature:')) {
            errors.push(
                new ParseError(`Missing feature name`, {
                    type: 'structure',
                    line: 1,
                })
            )

            return {
                featureName: '',
                errors,
            }
        }

        const justFeatureName = featureName.substring(8).trim();

        if (!/^[a-zA-Z_]*$/.test(justFeatureName)) {
            errors.push(
                new ParseError(
                    `Invalid feature name: "${justFeatureName}". Must be a valid identifier (alphanumeric and underscore only)`,
                    {
                        type: 'syntax',
                        line: 1,
                    }),
            );
        }

        return {
            featureName: justFeatureName,
            errors,
        };
    }
}

module.exports = { GherkinParser };
