export const config = {
  root: `playground`,
  plugins: [],
};

const manifestEnv = process.env.MANIFEST; // Access the environment variable

export const pluginOptions = {
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
