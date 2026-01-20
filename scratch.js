const { CacheManager } = require('./src/compiler/cache');

async function test() {
  const cache = new CacheManager({ cacheDir: '.test-cache' });
  
  const key = cache.generateKey('source', 'rules', '1.0.0', 'javascript');
  console.log('Generated key:', key);
  
  const entry = {
    key,
    sourceHash: 'abc123',
    rulesHash: 'def456',
    compiledCode: 'console.log("test");',
    metadata: {
      timestamp: new Date().toISOString(),
      duration: 100,
      model: 'test',
      compilerVersion: '1.0.0',
      target: 'javascript',
    },
  };
  
  await cache.set(key, entry);
  const retrieved = await cache.get(key);
  console.log('Retrieved:', retrieved);
  
  const stats = await cache.getStats();
  console.log('Stats:', stats);
  
  await cache.clear();
}

test().catch(console.error);