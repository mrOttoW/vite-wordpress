import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('Test Config', () => {
  const rootDir = path.resolve(__dirname, '../'); // Root directory of the project
  const buildDir = path.join(rootDir, 'playground', 'build'); // Build output directory
  const isDist = process.env.NODE_ENV === 'dist';

  beforeAll(() => {
    try {
      execSync(isDist ? 'yarn playground-build-dist' : 'yarn playground-build', {
        cwd: rootDir,
        stdio: 'inherit',
      });
    } catch (error) {
      throw new Error('Build process failed: ' + error.message);
    }
  });

  it('imported wp block packages should be transformed into globals', () => {
    const blockScript = path.join(buildDir, 'blocks', 'example-block', 'index.js');

    expect(fs.existsSync(blockScript)).toBe(true);

    const jsContent = fs.readFileSync(blockScript, 'utf-8');

    expect(jsContent).not.toContain('@wordpress/blocks');
    expect(jsContent).not.toContain('@wordpress/i18n');
    expect(jsContent).not.toContain('@wordpress/block-editor');
  });

  it('block.json should be emitted as json file', () => {
    const blockJson = path.join(buildDir, 'blocks', 'example-block', 'block.json');

    expect(fs.existsSync(blockJson)).toBe(true);

    const jsonContent = JSON.parse(fs.readFileSync(blockJson, 'utf-8'));

    expect(jsonContent.name).toBe('create-block/example-blocks');
    expect(jsonContent.title).toBe('Example Dynamic');
    expect(jsonContent.supports.html).toBe(false);
  });

  it('async should output without commonJS dependency', () => {
    const mainScript = path.join(buildDir, 'bundle', 'bundle.js');

    expect(fs.existsSync(mainScript)).toBe(true);

    const jsContent = fs.readFileSync(mainScript, 'utf-8');

    expect(jsContent).not.toContain('__commonJS');
    expect(jsContent).not.toContain('__require');
  });

  afterAll(() => {
    // Clean up the build directory
    fs.rmSync(buildDir, { recursive: true, force: true });
  });
});
