import { VitePhpAssetFile } from 'vite-php-asset-file';

const config = {
  root: `playground`,
  plugins: [],
};

// Access the environment variables
const manifestEnv = process.env.MANIFEST;
const assetFileEnv = process.env.ASSET_FILE;
const preserveEnv = process.env.PRESERVE;

const pluginOptions = {
  manifest: !!manifestEnv,
  preserveDirs: preserveEnv === undefined ? true : preserveEnv === 'true',
  base: '/wp-content/themes/my-theme',
  input: [
    'vanilla/*/*',
    'bundle/*.js',
    'typescript/typescript.ts',
    'jquery/jquery.js',
    'blocks/*/index.js',
    'blocks/*/view.js',
    'blocks/*/render.php',
    'blocks/*/block.json',
    'blocks/*/style.pcss',
  ],
  alias: {
    '@svg': `${__dirname}/src/assets/svg`,
    '@images': `${__dirname}/src/assets/images`,
  },
};

const additionalPlugins = [];

if (assetFileEnv !== undefined) {
  additionalPlugins.push(VitePhpAssetFile());
}

export { config, pluginOptions, additionalPlugins };
