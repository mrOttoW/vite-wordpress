# Vite 6+ Config for traditional WordPress development

Providing an optimized, opinionated & "Go To" configuration for building WordPress blocks & traditional WordPress development.

## Features

- Compiles and outputs JavaScript, CSS, and other assets directly into WordPress-ready formats.
- Glob options to configure input paths.
- Automatically externalizes WordPress globals like `wp` and libraries like `React` to reduce bundle sizes.
  - Includes a preset of globals for wp dependencies and other common libraries in WordPress like react, react-dom, jquery, lodash etc.. (see src/globals.ts) with the option to add additional globals.
  - Uses `rollup-plugin-external-globals` plugin under the hood to ensure globals are NOT using "import" in compiled (block) files but are defined externally.
- JSX/React code supported in `.js` files instead of using `.jsx`.
- Automatically reloads PHP files during development.
- Preserved folder structure in the output directory.

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
      input: [
        'main.js',
      ],
    }),
  ],
};
```

### Options

The plugin supports the following options:

| Option     | Type                                     | Default   | Description                                                                                                        |
| ---------- | ---------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------ |
| `outDir`   | `string`                                 | `'build'` | Directory for output files.                                                                                        |
| `srcDir`   | `string`                                 | `'src'`   | Directory for source files.                                                                                        |
| `input`    | `string[]`                               | `[]`      | List of input files relative to `srcDir` with glob possibilties.                                                   |
| `manifest` | `boolean \| string`                      | `false`   | Generate a manifest file. Accepts `true`, `false`, or a custom path (this will also add hash to all compiled files). |
| `globals`  | `object`                                 | `{}`      | Maps module names to global variables to mark them as external dependencies (in addition to preset globals).       |
| `alias`    | `object`                                 | `{}`      | Define path aliases.                                                                                               |
| `target`   | `string \| string[] \| false` | `es2017`  | Esbuild target.                                                                                                    |
| `banner`   | `string \| function`                     | `''`      | Banner to prepend to output files.                                                                                 |
| `footer`   | `string \| function`                     | `''`      | Footer to append to output files.                                                                                  |

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
      input: [
        'js/*.js',
        'css/*.pcss',
        'blocks/*/index.js',
      ],
    }),
  ],
};
```
