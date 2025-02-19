const { execSync } = require('child_process');
const { readdirSync, statSync } = require('fs');
const { join } = require('path');

// Get all TypeScript files in src directory
const getTypeScriptFiles = (dir) => {
  const files = [];
  const entries = readdirSync(dir);

  entries.forEach(entry => {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getTypeScriptFiles(fullPath));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  });

  return files;
};

// Build each file individually
const buildFiles = () => {
  const files = getTypeScriptFiles('./src');
  
  // Clean dist directory
  execSync('rm -rf dist');
  execSync('mkdir -p dist');

  // Compile each file
  files.forEach(file => {
    const command = `npx tsc ${file} --outDir dist --declaration --declarationMap --sourceMap --target ES2020 --module CommonJS --moduleResolution Node --esModuleInterop --skipLibCheck`;
    try {
      execSync(command, { stdio: 'inherit' });
    } catch (error) {
      console.error(`Error compiling ${file}:`, error.message);
      process.exit(1);
    }
  });
};

buildFiles(); 