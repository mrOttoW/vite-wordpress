import { DEFAULT_OPTIONS, VITE_PLUGIN_NAME } from './constants';
import {
  AliasOptions,
  BuildOptions,
  ConfigEnv,
  DepOptimizationConfig,
  ESBuildOptions,
  ManifestChunk,
  Plugin,
  ResolvedConfig,
  ServerOptions,
  UserConfig,
  ViteDevServer,
} from 'vite';
import {
  AddonFunction,
  EmittedAsset,
  ExternalOption,
  GlobalsOption,
  InputOption,
  NormalizedOutputOptions,
  OutputBundle,
  OutputChunk,
  OutputOptions,
  PreRenderedAsset,
  RollupOptions,
} from 'rollup';
import { IncomingMessage, ServerResponse } from 'node:http';
import { checkForInteractivity, resolveHashedBlockFilePaths, merge } from './utils';
import { fileURLToPath } from 'url';
import externalGlobals from 'rollup-plugin-external-globals';
import PluginGlobals from './globals';
import path from 'path';
import fs from 'fs';
import fg from 'fast-glob';

interface Options {
  outDir?: string;
  srcDir?: string;
  base?: string;
  target?: 'modules' | string | string[] | false;
  input?: string[];
  manifest?: boolean | string;
  globals?: GlobalsOption;
  alias?: AliasOptions;
  preserveDirs?: boolean;
  wrapper?: boolean;
  banner?: string | AddonFunction;
  footer?: string | AddonFunction;
  css?: string;
  allowedJsExtensions?: string[];
}

interface Asset {
  name: string;
  fileName: string;
  originalFileName: string;
  filePath: string;
}

function ViteWordPress(optionsParam: Options = {}): Plugin {
  const cacheDir = path.join(process.cwd(), 'node_modules/.vite/vite-wordpress');
  const buildCache = path.join(cacheDir, 'build.json');
  const options: Options = merge(DEFAULT_OPTIONS, optionsParam);
  const assets = new Set<Asset>(); // Assets to emit.
  const interactivityMap = {}; // Entries that include interactivity API.
  let externals: ExternalOption; // Resolved externals.
  let rootConfig: ResolvedConfig;
  let rootPath: string;

  /**
   * The directory of the current file.
   */
  const dirname = (): string => {
    return path.dirname(fileURLToPath(import.meta.url));
  };

  /**
   * Globed input files.
   */
  const inputFiles = async () =>
    await fg(options.input, {
      cwd: path.join(rootPath, options.srcDir),
    });

  /**
   * Add asset to emit.
   */
  const addAsset = (fileName: string, filePath: string) => {
    assets.add({
      name: path.basename(fileName),
      fileName,
      originalFileName: path.join(options.srcDir, fileName),
      filePath: filePath,
    });
    return true;
  };

  /**
   * Resolve input.
   */
  const resolveInput = async (rootPath: string): Promise<InputOption> => {
    const files = await inputFiles();
    const entries = Object.fromEntries(
      files.map(file => {
        const fileName = file.replace(/\.[^/.]+$/, '');
        const filePath = path.join(rootPath, options.srcDir, file);

        return [fileName, filePath];
      })
    );

    Object.entries(entries).forEach(([fileName, filePath]) => {
      // Ensure JSON files are emitted as assets (block.json).
      if (filePath.endsWith('.json')) {
        fileName = options.preserveDirs ? fileName : path.basename(fileName);
        addAsset(fileName.endsWith('.json') ? fileName : `${fileName}.json`, filePath);
        delete entries[fileName];
      }
      if (options.allowedJsExtensions.some(ext => filePath.endsWith(ext))) {
        // Map JS files that includes the WP Interactivity API.
        if (checkForInteractivity(filePath)) {
          interactivityMap[fileName] = filePath;
        }
      }
    });

    return options.preserveDirs ? entries : Object.values(entries);
  };

  /**
   * Resolve Asset Output.
   */
  const resolveAssetFileName = (chunkInfo: PreRenderedAsset) => {
    const extension = options.manifest === false ? '[extname]' : '.[hash][extname]';

    if (options.preserveDirs && chunkInfo.originalFileNames[0]) {
      const fileName = chunkInfo.originalFileNames[0];
      return fileName.replace(`${options.srcDir}/`, '').replace(/\.[^/.]+$/, extension);
    }

    return `[name]${extension}`;
  };

  /**
   * Resolve Vite's base.
   */
  const resolveBase = (command: 'build' | 'serve'): string => {
    if (options.base !== '' && command === 'build') {
      return path.join(options.base, options.outDir);
    }

    return options.base;
  };

  /**
   * Build manifest like file map.
   */
  const createFileMap = (bundle: OutputBundle, buildFileMap: Record<string, ManifestChunk> = {}) => {
    for (const module of Object.values(bundle)) {
      if (module.type !== 'chunk' || !('facadeModuleId' in module)) continue;

      const chunk = module as OutputChunk;
      const { facadeModuleId, fileName, viteMetadata, name } = chunk;
      const { importedCss = new Set<string>(), importedAssets = new Set<string>() } = viteMetadata || {};
      const src = facadeModuleId.replace(`${rootConfig.root}/`, '');

      const addToMap = (file: string) => {
        if (!buildFileMap[file]) {
          buildFileMap[file] = { src, name, file };
        }
      };

      if (facadeModuleId.endsWith('.php') && importedAssets.size) {
        addToMap(Array.from(importedAssets)[0]);
        continue;
      }

      if (!facadeModuleId.endsWith(`.${options.css}`)) {
        addToMap(fileName);
      }

      if (importedCss.size) {
        addToMap(Array.from(importedCss)[0]);
      }
    }
    return buildFileMap;
  };

  /**
   * Vite Plugin.
   */
  return {
    name: VITE_PLUGIN_NAME,
    enforce: 'pre',

    /**
     * Preconfigure Config.
     */
    config: (userConfig: UserConfig, { command, mode }: ConfigEnv): Promise<UserConfig> =>
      (async (): Promise<UserConfig> => {
        rootPath = userConfig.root ? path.join(process.cwd(), userConfig.root) : process.cwd();

        const base: string = resolveBase(command);
        const globals: GlobalsOption = {
          ...PluginGlobals,
          ...options.globals,
        };
        const input: InputOption = await resolveInput(rootPath);
        const output: OutputOptions = {
          entryFileNames: options.manifest === false ? '[name].js' : '[name].[hash].js',
          assetFileNames: (chunkInfo: PreRenderedAsset) => resolveAssetFileName(chunkInfo),
          globals: Object.fromEntries(Object.entries(globals).map(([key, value]) => [key.replace('@wordpress/', 'wp-'), value])),
        };
        const rollupOptions: RollupOptions = {
          input,
          output,
          external: Object.keys(globals), // Set externals based on globals.
          plugins: [],
        };
        const esbuild: ESBuildOptions = {
          loader: 'tsx', // Set loader to handle TypeScript with JSX.
          include: /.*\.(ts|tsx|jsx?)$/, // Include .ts, .tsx, .js, .jsx files
          exclude: [],
        };
        const optimizeDeps: DepOptimizationConfig = {
          esbuildOptions: {
            loader: {
              '.js': 'jsx', // JavaScript files treated as JSX (React).
              '.ts': 'tsx', // TypeScript files treated as TypeScript (with JSX support if needed).
              '.tsx': 'tsx', // Handle TypeScript React files (.tsx).
            },
          },
          exclude: Object.keys(globals), // Prevent pre-transform of globals during dev server.
        };
        const build: BuildOptions = {
          outDir: options.outDir,
          manifest: options.manifest,
          target: options.target,
          minify: mode === 'development' ? false : 'esbuild',
          sourcemap: mode === 'development' || command === 'serve' ? 'inline' : false,
          assetsInlineLimit: 0, // Make sure to not include inline assets in CSS.
          assetsDir: '', // In traditional WP, the src directory is primarily used for resources, so assets directory is unnecessary.
          rollupOptions,
        };
        const server: ServerOptions = {
          host: '0.0.0.0',
        };
        const preConfig: UserConfig = {
          assetsInclude: ['**/*.php'], // Allow PHP files as entries.
          base,
          optimizeDeps,
          esbuild,
          build,
          server,
          resolve: {
            extensions: options.allowedJsExtensions,
            alias: options.alias,
          },
        };

        userConfig = merge(preConfig, userConfig);

        const rollupPlugins = [
          externalGlobals(globals, {
            exclude: Object.values(interactivityMap), // Exclude modules (files using WP interactivity API)
          }),
        ];

        // Ensures globals are NOT using "import" in the compiled files but are defined externally for non-modules.
        if (Array.isArray(userConfig.build?.rollupOptions?.plugins)) {
          userConfig.build.rollupOptions.plugins = [...userConfig.build.rollupOptions.plugins, ...rollupPlugins];
        } else {
          userConfig.build.rollupOptions.plugins = rollupPlugins;
        }

        return userConfig;
      })(),

    /**
     * Config Resolved Hook.
     */
    configResolved(config: ResolvedConfig) {
      externals = config.build.rollupOptions.external as string[];
      rootPath = config.root ? config.root : process.cwd();
      rootConfig = config;

      /**
       * # WP Interactivity Support in Vite Dev Server
       *
       * For blocks using the WP Interactivity API, view scripts are compiled as modules and will include
       * imports such as "@wordpress/interactivity" in the compiled file. These imports will be resolved by
       * WordPress on the server using its import map.
       *
       * When using Vite's Dev Server, it will throw an error through their internal "vite:import-analysis"
       * plugin failing to resolve the import.
       *
       * eg: "[plugin:vite:import-analysis] Failed to resolve import '@wordpress/interactivity' from 'src/view.js'.
       * Does the file exist?"
       *
       * Vite will also transform the code and prefix the import with the base and @id.
       *
       * We're going to push a late plugin to rewrite the 'vite:import-analysis' prefix.
       * Inspired by {@url https://github.com/vitejs/vite/issues/6393#issuecomment-1006819717}
       */
      const VALID_ID_PREFIX = `${config.base}@id/`;
      const importRegex = new RegExp(`${VALID_ID_PREFIX}(${externals.join('|')})`, 'g');
      if (config.plugins && Array.isArray(config.plugins)) {
        config.plugins.push({
          name: 'vite-wordpress:ignore-static-import-replace-idprefix',
          transform(code) {
            if (importRegex.test(code)) {
              const transformedCode = code.replace(importRegex, (m, s1) => s1);
              const map = this.getCombinedSourcemap?.() || null;

              return { code: transformedCode, map };
            }

            return null;
          },
        });
      }
    },

    /**
     * ResolveID hook.
     */
    resolveId(id) {
      /**
       * # WP Interactivity Support in Vite Dev Server
       *
       * At this point the prefix has been rewritten with the late plugin.
       * (eg: "base/@id/@wordpress/interactivity" to "@wordpress/interactivity");
       *
       * Now we need to make sure the import ID (eg: "@wordpress/interactivity")
       * from our static imports are set as external before the 'vite:resolve' plugin
       * transform it to 'node_modules/...' during dev server.
       *
       * Inspired by {@url https://github.com/vitejs/vite/issues/6393#issuecomment-1006819717}
       */
      if ((externals as string[]).includes(id)) {
        return { id, external: true };
      }
    },

    /**
     * Load hook.
     */
    load(id) {
      /**
       * # WP Interactivity Support in Vite Dev Server
       *
       * At this point the problem is resolved, but we're still getting the errors in the
       * console logs.
       *
       * eg: "Pre-transform error: Failed to load url @wordpress/interactivity
       * (resolved id: @wordpress/interactivity) in .../view.js. Does the file exist?"
       *
       * This wil prevent console log errors during dev server when doing static import.
       *
       * Inspired by {@url https://github.com/vitejs/vite/issues/6393#issuecomment-1006819717}
       */
      if ((externals as string[]).includes(id)) {
        return '';
      }
    },

    /**
     * Build Start Hook.
     */
    buildStart() {
      if (rootConfig.command === 'build') {
        // Emit all our assets.
        assets.forEach(asset => {
          const emittedAsset: EmittedAsset = {
            type: 'asset',
            name: asset.name,
            originalFileName: asset.originalFileName,
            source: fs.readFileSync(asset.filePath),
          };

          // It is mandatory in WordPress for the file to be named block.json.
          // This prevents the file name being hashed.
          if (asset.name === 'block.json') {
            emittedAsset.fileName = asset.fileName;
          }

          this.emitFile(emittedAsset);
        });
      }
    },

    /**
     * Generate Bundle Hook.
     */
    async generateBundle(bundleOptions: NormalizedOutputOptions, bundle: OutputBundle) {
      const buildFileMap = createFileMap(bundle);

      for (const module of Object.values(bundle)) {
        if (module.type === 'asset' && module.fileName.endsWith('.json') && options.manifest !== false) {
          const jsonFileName = module.fileName;
          const jsonObject = JSON.parse(module.source.toString());
          const jsonResolved = resolveHashedBlockFilePaths(jsonFileName, jsonObject, buildFileMap, bundleOptions);

          // Ensure file paths in block.json use hashed file names.
          module.source = JSON.stringify(jsonResolved, null, 2);
        }

        if (module.type === 'chunk' && module.facadeModuleId) {
          const isJsChunk = options.allowedJsExtensions.some(ext => module.facadeModuleId.endsWith(ext));
          const isInteractivity = Object.values(interactivityMap).includes(module.facadeModuleId);

          // Include code wrappers if enabled (skips for modules).
          if (isJsChunk && !isInteractivity && options.wrapper) {
            module.code = options.banner + module.code + options.footer;
          }
        }
      }

      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      fs.writeFileSync(buildCache, JSON.stringify(buildFileMap, null, 2));
    },

    /**
     * Configure Server Hook.
     */
    configureServer(server: ViteDevServer) {
      const publicDir = path.basename(dirname()) === 'src' ? path.join(dirname(), '..', 'public') : dirname();
      const { base, srcDir, outDir, css, manifest } = options;
      const indexUrls = [
        '/index.html',
        path.join(server.config.base, 'index.html'),
        server.config.base.replace(/\/$/, ''),
        server.config.base,
      ];
      const getProtocol = (req: IncomingMessage) => {
        if (req.headers['x-forwarded-proto']) {
          return (req.headers['x-forwarded-proto'] as string).split(',')[0];
        }
        return req.socket && 'encrypted' in req.socket ? 'https' : 'http';
      };

      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        const localUrl = `${getProtocol(req)}://${req.headers.host}`;

        if (req.url && req.url === `/${VITE_PLUGIN_NAME}.json`) {
          const exposed = { base, srcDir, outDir, css, manifest, buildMap: {} };
          if (fs.existsSync(buildCache)) {
            const buildMap = fs.readFileSync(buildCache, 'utf8');
            exposed.buildMap = JSON.parse(buildMap);
          }
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify(exposed, null, 2)); // Expose plugin config.
        } else if (req.url && indexUrls.includes(req.url)) {
          res.statusCode = 404;
          res.end(
            fs
              .readFileSync(path.join(publicDir, 'dev-server-index.html'))
              .toString()
              .replace(/{{ CONFIG_URL }}/g, `${localUrl}/${VITE_PLUGIN_NAME}.json`)
          );
        } else {
          next();
        }
      });
    },

    /**
     * Handle hot update for PHP files.
     */
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.php')) {
        server.ws.send({ type: 'full-reload', path: '*' });
      }
    },
  };
}

export { ViteWordPress };
