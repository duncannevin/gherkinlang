const { AITransformer } = require('./src/ai/transformer');
const { MCPClient } = require('./src/mcp/client');

async function scratch() {
  // Example GherkinLang source code
  const gherkinSource = `
Feature: Example feature
  Scenario: Example scenario
    Given a condition
    When an action occurs
    Then a result is expected
`;

  // Example project context
  const projectContext = {
    moduleName: 'example',
    dependencies: [],
    imports: [],
  };

  // Create and connect MCP client
  const mcpClient = new MCPClient();
  const serverCommand = process.env.MCP_SERVER_URL
    ? process.env.MCP_SERVER_URL.split(' ')
    : ['node', 'mcp-server.js'];

  await mcpClient.connect(serverCommand);
  console.log('Available tools:', mcpClient.getTools().map(t => t.name));

  // Create transformer with MCP client
  const transformer = new AITransformer({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-5',
    mcpClient,
  });

  // Transform with tool support
  const result = await transformer.transform(
    gherkinSource,
    projectContext,
    { target: 'javascript', maxTurns: 5 }
  );

  console.log('Code:', result.code);
  console.log('Tool calls:', result.toolCalls);

  // Clean up
  await mcpClient.disconnect();
}

scratch().catch(console.error);
