import { VitePhpAssetFile } from 'vite-php-asset-file';

const config = {
  root: `playground`,
  plugins: [],
};

// Access the environment variables
const manifestEnv = process.env.MANIFEST;
const assetFileEnv = process.env.ASSET_FILE;

const pluginOptions = {
  manifest: !!manifestEnv,
  base: '/wp-content/themes/my-theme',
  input: [
    'main.js',
    'css/*.pcss',
    'blocks/example-block/index.js',
    'blocks/example-block/view.js',
    'blocks/example-block/render.php',
    'blocks/example-block/block.json',
    'blocks/example-block/style.pcss',
  ],
};

const additionalPlugins = [];

if (assetFileEnv !== undefined) {
  additionalPlugins.push(VitePhpAssetFile());
}

export { config, pluginOptions, additionalPlugins };
