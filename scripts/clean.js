const { rimraf } = require('rimraf');
const { join } = require('path');

const cleanPaths = [
  // Build outputs
  'shared/dist',
  'websocket-server/dist',
  'webapp/.next',
  'webapp/out',
  // TypeScript incremental build info
  'shared/*.tsbuildinfo',
  'websocket-server/*.tsbuildinfo',
  'webapp/*.tsbuildinfo',
  // Test coverage
  'coverage',
  '.nyc_output',
  // Cache
  '.eslintcache',
  '.tscache'
];

async function clean() {
  try {
    const root = process.cwd();
    const paths = cleanPaths.map(p => join(root, p));
    
    console.log('Cleaning build artifacts...');
    await Promise.all(paths.map(path => rimraf(path)));
    console.log('Clean completed successfully!');
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

clean(); 