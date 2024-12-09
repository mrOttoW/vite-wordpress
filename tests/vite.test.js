import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('Test expected generated build files & contents', () => {
  const rootDir = path.resolve(__dirname, '../'); // Root directory of the project
  const buildDir = path.join(rootDir, 'tests/build'); // Build output directory
  const isDist = process.env.NODE_ENV === 'dist';

  beforeAll(() => {
    execSync(isDist ? 'yarn test-build-dist' : 'yarn test-build', {
      cwd: rootDir,
      stdio: 'inherit',
    });
  });

  it('imported wp block packages should be transformed into globals', () => {
    const blockScript = path.join(buildDir, 'blocks', 'example-block', 'index.js');

    expect(fs.existsSync(blockScript)).toBe(true);

    const jsContent = fs.readFileSync(blockScript, 'utf-8');

    expect(jsContent).not.toContain('@wordpress/blocks');
    expect(jsContent).not.toContain('@wordpress/i18n');
    expect(jsContent).not.toContain('@wordpress/block-editor');
  });

  it('should generate the expected async output without commonJS dependency', () => {
    const mainScript = path.join(buildDir, 'main.js');

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
