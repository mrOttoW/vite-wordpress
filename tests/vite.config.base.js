export const config = {
  root: `tests`,
  plugins: [],
};

export const pluginOptions = {
  base: '/wp-content/themes/my-theme',
  input: [
    'main.js',
    'css/*.pcss',
    'blocks/example-block/index.js',
    'blocks/example-block/view.js',
    'blocks/example-block/block.json',
    'blocks/example-block/style.pcss',
  ],
};
