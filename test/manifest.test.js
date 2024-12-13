import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('Test Config with Manifest (incl. hash) enabled', () => {
  const rootDir = path.resolve(__dirname, '../'); // Root directory of the project
  const buildDir = path.join(rootDir, 'playground', 'build'); // Build output directory
  const manifestPath = path.join(buildDir, '.vite', 'manifest.json');
  const isDist = process.env.NODE_ENV === 'dist';
  const manifest = () => {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  };

  beforeAll(() => {
    execSync(isDist ? 'MANIFEST=true yarn playground-build-dist' : 'MANIFEST=true yarn playground-build', {
      cwd: rootDir,
      stdio: 'inherit',
    });
  });

  it('block.json should have resolved hashed file names', () => {
    const blockJson = path.join(buildDir, manifest()['src/blocks/example-block/block.json']['file']);

    expect(fs.existsSync(blockJson)).toBe(true);

    const jsonDir = path.dirname(blockJson);
    const jsonObject = JSON.parse(fs.readFileSync(blockJson, 'utf-8'));
    const blockFiles = ['editorScript', 'editorStyle', 'style', 'viewScript', 'render'];

    blockFiles.forEach(blockFile => {
      const blockFilePath = path.join(jsonDir, jsonObject[blockFile].slice(5));
      expect(fs.existsSync(blockFilePath)).toBe(true);
    });
  });

  afterAll(() => {
    // Clean up the build directory
    fs.rmSync(buildDir, { recursive: true, force: true });
  });
});
