<div align="center">
  <a href="https://vitejs.dev/">
    <img width="200" height="200" hspace="10" src="https://raw.githubusercontent.com/mrOttoW/vite-wordpress/ef6f4b84aa9da549e9908d8c21513d53dfe020bc/vite-logo.svg" alt="vite logo" />
  </a>
  <h1>⚡️Vite 6 Config for Traditional WordPress Development</h1>
  <p>
Providing an opinionated & "Go To" Vite configuration for building WordPress blocks & traditional WordPress development.
</p>
  <img src="https://img.shields.io/github/v/release/mrOttoW/vite-wordpress" alt="GitHub release" />
  <img src="https://img.shields.io/npm/dependency-version/vite-wordpress/peer/vite" alt="npm peer dependency version" />
  <img alt="Node Current" src="https://img.shields.io/node/v/vite-wordpress">
  <img src="https://img.shields.io/github/last-commit/mrOttoW/vite-wordpress" alt="GitHub last commit"/>
  <img src="https://img.shields.io/npm/l/vite-wordpress" alt="licence" />
</div>

## Features

- Compiles and outputs JavaScript, CSS, and other assets directly into WordPress-ready formats.
- Glob options to configure input paths.
- Automatically externalizes WordPress globals like `wp` and libraries like `React` to reduce bundle sizes.
  - Includes a preset of globals for wp dependencies and other common libraries in WordPress like react, react-dom, jquery, lodash etc.. (see src/globals.ts) with the option to add additional globals.
  - Uses `rollup-plugin-external-globals` plugin under the hood to ensure globals are NOT using "import" in compiled (block) files but are defined externally.
- JSX/React code supported in `.js` files instead of using `.jsx`.
- Paths in (block).json files like `file:./index.js` will be resolved with hashed file names when `manifest` is enabled.
- Automatically reloads PHP files during development.
- Preserved folder structure in the output directory.
- Use vite `development` mode to compile unminified with sourcemaps (sourcemaps are also included during `serve` command)
- All configurations can be overridden using Vite's default configuration options.

## Installation

Install the plugin via npm:

```bash
npm install --save-dev vite-wordpress
```

or yarn

```bash
yarn add -D vite-wordpress
```

## Usage

### Basic Setup

Add the plugin to your `vite.config.js` (no other Vite configurations needed):

```javascript
import { ViteWordPress } from 'vite-wordpress';

export default {
  plugins: [
    ViteWordPress({
      input: ['main.js'],
    }),
  ],
};
```

### Options

The plugin supports the following options:

| Option         | Type                        | Default                    | Description                                                                                                                                                                   |
|----------------|-----------------------------|----------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `outDir`       | `string`                    | `'build'`                  | Directory for output files.                                                                                                                                                   |
| `srcDir`       | `string`                    | `'src'`                    | Directory for source files.                                                                                                                                                   |
| `base`         | `string`                    | `''`                       | Sets base public path for generating URLs for assets in CSS/JS. It will be appended with the `outDir` in `build` command if set (e.g., /wp-content/themes/my-theme/{outDir}). |
| `input`        | `string[]`                  | `[]`                       | List of input files relative to `srcDir` with glob options.                                                                                                                   |
| `css`          | `string`                    | `'pcss'`                   | CSS extension used for uncompiled files.                                                                                                                                      |
| `manifest`     | `boolean \| string`         | `false`                    | Generate a manifest file. Accepts `true`, `false`, or a custom path (this will also add hash to all compiled files).                                                          |
| `preserveDirs` | `boolean`                   | `true`                     | Preserve folder structure in the output. If `false`, all files are flattened into a single directory.                                                                         |
| `globals`      | `object`                    | `{}`                       | Maps module names to global variables to mark them as external dependencies (in addition to preset globals).                                                                  |
| `alias`        | `object`                    | `{}`                       | Define path aliases.                                                                                                                                                          |
| `target`       | `string \| string[] \| false` | `'es2017'`                   | Esbuild target.                                                                                                                                                               |
| `wrapper`      | `boolean`                   | `true`                     | Enable or disable code wrappers for JavaScript chunks.                                                                                                                        |
| `banner`       | `string \| function`        | `'(() => {'use strict';'`  | Banner to prepend to output JS files.                                                                                                                                         |
| `footer`       | `string \| function`        | `'})();'`                  | Footer to append to output JS files.                                                                                                                                          |

## Example Project Structure

```
project-root/
├── src/
│   ├── js
│   │   └── main.js
│   ├── css
│   │   └── main.pcss
│   └── blocks
│       └── example-block
│           ├─ style.pcss (imported into index.js)
│           └─ index.js
├── build/
│   ├── js
│   │   └── main.js
│   ├── css
│   │   └── main.css
│   └── blocks
│       └── example-block
│           ├─ index.css
│           └─ index.js
├── vite.config.js
└── package.json
```

Vite config for the given example.

```javascript
import { ViteWordPress } from 'vite-wordpress';

export default {
  plugins: [
    ViteWordPress({
      input: ['js/*.js', 'css/*.pcss', 'blocks/*/index.js'],
    }),
  ],
};
```

## Asset File & Cache busting

Use https://github.com/mrOttoW/vite-php-asset-file to include a hash, manage dependencies identified in the code, and handle imported CSS assets.

Example project structure:

```
project-root/
├── src/
│    ├─ custom-slider.pcss (imported into custom-slider.js)
│    └─ custom-slider.js
├── build/
│    ├─ custom-slider.css
│    ├─ custom-slider.js
│    └─ custom-slider.asset.php
...
```

Example of registering and enqueueing the asset file based on the given example within a theme.

```php

  $asset_file = require get_stylesheet_directory() . 'build/custom-slider.asset.php';

  wp_register_script(
    'my-custom-slider',
    get_stylesheet_directory_uri() . 'build/custom-slider.js',
    $asset_file['dependencies'],
    $asset_file['version'],
  );

  foreach ( $asset_file['assets'] as $css_handle => $css_path ) {
    wp_register_style(
      $css_handle,
      get_stylesheet_directory_uri() . "build/{$css_path}",
      [],
      $asset_file['version']
    );
  }

  wp_enqueue_script('my-custom-slider')

```
