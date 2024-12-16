import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('Test Config', () => {
  const rootDir = path.resolve(__dirname, '../'); // Root directory of the project
  const buildDir = path.join(rootDir, 'playground', 'build'); // Build output directory
  const isDist = process.env.NODE_ENV === 'dist';

  beforeAll(() => {
    execSync(isDist ? 'yarn playground-build-dist' : 'yarn playground-build', {
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

  it('block.json should be emitted as json file', () => {
    const blockJson = path.join(buildDir, 'blocks', 'example-block', 'block.json');

    expect(fs.existsSync(blockJson)).toBe(true);

    const jsonContent = fs.readFileSync(blockJson, 'utf-8');

    expect(jsonContent).toContain(`{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "create-block/example-blocks",
  "version": "0.1.0",
  "title": "Example Dynamic",
  "category": "widgets",
  "icon": "smiley",
  "description": "Example dynamic block.",
  "example": {},
  "supports": {
    "html": false
  },
  "textdomain": "example-blocks",
  "editorScript": "file:./index.js",
  "editorStyle": "file:./index.css",
  "style": "file:./style.css",
  "render": "file:./render.php",
  "viewScript": "file:./view.js"
}
`);
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
