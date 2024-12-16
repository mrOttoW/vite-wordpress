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
- Complete Vite development server & HMR (Hot Module Replacement) integration.
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
      base: '/wp-content/plugins/my-plugin',
      input: ['main.js'],
    }),
  ],
};
```

See all options <a href="#options">here</a>.

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
      base: '/wp-content/plugins/my-plugin',
      input: ['js/*.js', 'css/*.pcss', 'blocks/*/index.js'],
    }),
  ],
};
```

A project example (WordPress plugin) can be found here: https://github.com/mrOttoW/vite-wordpress-plugin-block-example

## Dev Server & HMR

This NPM package can be used in hand with the <a href="https://github.com/mrOttoW/vite-wordpress-php">vite-wordpress-php</a> composer package to integrate Vite's development server and HMR into WordPress, as well as manage the manifest file (if enabled), which can be used by simplify adding the following into your plugin or theme.

```php
(new ViteWordPress\DevServer())->register();
```

Aside to the integration, `vite-wordpress` exposes the plugin's configurations on the development server which is used by `vite-wordpress-php` to automatically detect all enqueued scripts from the project through hooks and resolves these scripts to source files served by the development server. It updates script tags from these specific scripts to use as modules and injects Vite's client to enable HMR (Hot Module Replacement).

You can read more about this on the <a href="https://github.com/mrOttoW/vite-wordpress-php#readme">repository's README</a> page.
 
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

Alternatively you can use the manifest and hashed file names for cache busting.

## Manifest & Hash

The `manifest` enabler in the plugin will add the manifest file but also add hash to file names. 

```diff
export default {
  plugins: [
    ViteWordPress({
        base: '/wp-content/plugins/my-plugin',
        input: ['main.js'],
      + manifest: true
    }),
  ],
};

```

You can use the Manifest Resolver from <a href="https://github.com/mrOttoW/vite-wordpress-php#manifest-resolver">vite-wordpress-php</a> to handle reading and accessing the Vite manifest file and additionally integrates it into the dev server.

#### Example using the facade:
```php

use ViteWordPress\DevServer;
use ViteWordPress\Manifest;

$manifest = Manifest::create( 'absolute/path/to/manifest.json' ); // Also works with a PHP manifest file.

// When using the dev server you need to include the manifest.
( new DevServer( $manifest ) )->register();

// Enqueue scripts hook.
add_action( 'wp_enqueue_scripts', function () {
	$file_name = Manifest::get_file( 'app.js' );

	wp_enqueue_script( 'my-app', get_stylesheet_directory() . "build/{$file_name}" );
} );
```

### block.json
`vite-wordpress` ensures that JSON files are emitted as assets instead of being converted into JavaScript files. 
This keeps the `block.json` file readable and compatible with functions like `register_block_type()` in WordPress. 
It is also crucial for the `block.json` file to retain its original name to remain accessible in WordPress, 
preventing it from being hashed when the `manifest` option is enabled.

Additionally, all URLs found in the `block.json` file will automatically be resolved to their corresponding hashed filenames.

For example the following `block.json` configurations:

```json
{
    "editorScript": "file:./index.js",
    "editorStyle": "file:./index.css",
    "style": "file:./style.css",
    "render": "file:./render.php",
    "viewScript": "file:./view.js"
}

```

Will convert into 
```json
{
    "editorScript": "file:./index.BFKxLtHH.js",
    "editorStyle": "file:./index.BvpkZCOy.css",
    "style": "file:./style.WLomad7Q.css",
    "render": "file:./render.Aelou6by.php",
    "viewScript": "file:./view.BQK8SocZ.js"
}
```

### manifest.php

The following plugin also allows you to generate a PHP manifest file that is compatible with the DevServer:

https://github.com/mrOttoW/vite-php-manifest

## Options


### `outDir`
*Type:* `string`

*Default:* `'build'`

Directory for output files.

---

### `srcDir`
*Type:* `string`

*Default:* `'src'`

Directory for source files.

---

### `base`
*Type:* `string`

*Default:* `''`

Sets the base public path for generating URLs for assets in CSS/JS. If set, it will be appended with the `outDir` during the `build` command (e.g., `/wp-content/themes/my-theme/{outDir}`).

---

### `input`
*Type:* `string[]`

*Default:* `[]`

List of input files relative to `srcDir` with glob options.

---

### `css`
*Type:* `string`

*Default:* `'pcss'`

CSS extension used for uncompiled files.

---

### `manifest`
*Type:* `boolean | string`

*Default:* `false`

Generate a manifest file. Accepts `true`, `false`, or a custom path (this will also add a hash to all compiled files).

---

### `preserveDirs`
*Type:* `boolean`

*Default:* `true`

Preserve folder structure in the output. If set to `false`, all files are flattened into a single directory.

---

### `globals`
*Type:* `object`

*Default:* `{}`

Maps module names to global variables to mark them as external dependencies (in addition to preset globals).

---

### `alias`
*Type:* `object`

*Default:* `{}`

Define path aliases.

---

### `target`
*Type:* `string | string[] | false`

*Default:* `'es2017'`

Esbuild target.

---

### `wrapper`
*Type:* `boolean`

*Default:* `true`

Enable or disable code wrappers for JavaScript chunks.

---

### `banner`
*Type:* `string | function`

*Default:* `'(() => {'use strict';document.addEventListener('DOMContentLoaded', () => {'`

Code wrapper banner to prepend to output JS files.

---

### `footer`
*Type:* `string | function`

*Default:* `'})})();'`

Code wrapper footer to append to output JS files.
