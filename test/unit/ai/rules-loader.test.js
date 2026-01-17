const { RulesLoader } = require('../../../src/ai/rules-loader');

describe('RulesLoader', () => {
  it('should load rules for JavaScript target', async () => {
    const loader = new RulesLoader();
    const rules = await loader.load('javascript', 'src/ai/rules.md');
    expect(rules).toBeDefined();
    expect(rules.content).toBeDefined();
    expect(rules.target).toBe('javascript');
    expect(rules.contentHash).toBeDefined();
    expect(rules.loadedAt).toBeDefined();
    expect(rules.filePath).toBe('src/ai/rules.md');
  });
});
