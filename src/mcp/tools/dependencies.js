/**
 * Dependency checker MCP tool for GherkinLang compiler.
 * 
 * Checks npm package availability and versions, suggests alternatives when
 * appropriate. Helps the AI transformer make informed decisions about
 * external dependencies during code generation.
 * 
 * @module mcp/tools/dependencies
 */

const https = require('https');

/**
 * @typedef {import('../types').ToolResult} ToolResult
 */

/**
 * Dependency checker tool for verifying npm package availability.
 */
class DependencyChecker {
  constructor() {
    this.name = 'dependencies';
    this.description = 'Checks npm package availability and versions. Verifies if a package exists in the npm registry and returns version information.';
    this.inputSchema = {
      type: 'object',
      properties: {
        packageName: {
          type: 'string',
          description: 'npm package name to check',
        },
      },
      required: ['packageName'],
    };
  }

  /**
   * Execute the dependency checker tool.
   * 
   * @param {Object} args - Tool invocation parameters
   * @param {string} args.packageName - npm package name to check
   * @returns {Promise<ToolResult>} Package check result
   */
  async execute(args) {
    const startTime = Date.now();

    try {
      // Validate input
      if (!args.packageName || typeof args.packageName !== 'string') {
        return {
          success: false,
          error: 'packageName parameter is required and must be a string',
          duration: Date.now() - startTime,
        };
      }

      const packageName = args.packageName.trim();

      // Validate package name format (basic check)
      if (!packageName || packageName.length === 0) {
        return {
          success: false,
          error: 'Package name cannot be empty',
          duration: Date.now() - startTime,
        };
      }

      // Check npm registry
      const result = await this._checkNpmRegistry(packageName);

      return {
        success: true,
        content: result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: `Dependency check failed: ${error.message}`,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Check npm registry for package.
   * 
   * @private
   * @param {string} packageName - Package name to check
   * @returns {Promise<Object>} Package information
   */
  async _checkNpmRegistry(packageName) {
    return new Promise((resolve, reject) => {
      const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;

      const request = https.get(url, (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          if (response.statusCode === 404) {
            resolve({
              exists: false,
              packageName,
            });
            return;
          }

          if (response.statusCode !== 200) {
            reject(new Error(`npm registry returned status ${response.statusCode}`));
            return;
          }

          try {
            const packageInfo = JSON.parse(data);
            const latestVersion = packageInfo['dist-tags']?.latest || Object.keys(packageInfo.versions || {})[0];

            resolve({
              exists: true,
              packageName,
              version: latestVersion,
              description: packageInfo.description || '',
              homepage: packageInfo.homepage || '',
              repository: packageInfo.repository?.url || '',
            });
          } catch (error) {
            reject(new Error(`Failed to parse npm registry response: ${error.message}`));
          }
        });
      });

      request.on('error', (error) => {
        reject(new Error(`Network error checking npm registry: ${error.message}`));
      });

      request.setTimeout(2000, () => {
        request.destroy();
        reject(new Error('Request timeout checking npm registry'));
      });
    });
  }
}

module.exports = { DependencyChecker };
