import { DEFAULT_OPTIONS, VITE_PLUGIN_NAME } from './constants';
import {
  AliasOptions,
  BuildOptions,
  ConfigEnv,
  DepOptimizationConfig,
  ESBuildOptions,
  Plugin,
  ServerOptions,
  UserConfig,
  ViteDevServer,
} from 'vite';
import {
  AddonFunction,
  ExternalOption,
  GlobalsOption,
  InputOption,
  NormalizedOutputOptions,
  OutputBundle,
  OutputOptions,
  PreRenderedAsset,
  PreRenderedChunk,
  RollupOptions,
  EmittedAsset,
} from 'rollup';
import { createBundleMap, resolveHashedBlockFilePaths } from './utils';
import deepmerge from 'deepmerge';
import fg from 'fast-glob';
import PluginGlobals from './globals';
import path from 'path';
import externalGlobals from 'rollup-plugin-external-globals';
import fs from 'fs';

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
  const options: Options = deepmerge(DEFAULT_OPTIONS, optionsParam);
  const assets = new Set<Asset>(); // Assets to emit.
  let command: 'build' | 'serve'; // Vite command.

  /**
   * Construct input.
   */
  const getInput = async (rootPath: string): Promise<InputOption> => {
    const inputFiles = await fg(options.input, {
      cwd: path.join(rootPath, options.srcDir),
    });

    const entries = Object.fromEntries(
      inputFiles.map(file => {
        const fileName = (options.preserveDirs ? file : path.basename(file)).replace(/\.[^/.]+$/, '');
        const filePath = path.join(rootPath, options.srcDir, file);

        return [fileName, filePath];
      })
    );

    // Ensure JSON files are emitted as assets (block.json).
    Object.entries(entries).forEach(([fileName, filePath]) => {
      if (filePath.endsWith('.json')) {
        const assetFileName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
        assets.add({
          name: path.basename(assetFileName),
          fileName: assetFileName,
          originalFileName: path.join(options.srcDir, assetFileName),
          filePath: filePath,
        });
        delete entries[fileName];
      }
    });

    return entries;
  };

  /**
   * Construct Asset Output.
   */
  const getAssetFileName = (chunkInfo: PreRenderedAsset) => {
    const extension = options.manifest === false ? '[extname]' : '.[hash][extname]';

    if (options.preserveDirs && chunkInfo.originalFileNames[0]) {
      const fileName = chunkInfo.originalFileNames[0];
      return fileName.replace(`${options.srcDir}/`, '').replace(/\.[^/.]+$/, extension);
    }

    return `[name]${extension}`;
  };

  /**
   * Construct Vite's base.
   */
  const getBase = (command: 'build' | 'serve'): string => {
    if (options.base !== '' && command === 'build') {
      return path.join(options.base, options.outDir);
    }

    return options.base;
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
        const rootPath = userConfig.root ? path.join(process.cwd(), userConfig.root) : process.cwd();
        const base: string = getBase(command);
        const globals: GlobalsOption = {
          ...PluginGlobals,
          ...options.globals,
        };
        const external: ExternalOption = Object.keys(globals); // Set externals based on globals.
        const input: InputOption = await getInput(rootPath);
        const output: OutputOptions = {
          entryFileNames: options.manifest === false ? '[name].js' : '[name].[hash].js',
          assetFileNames: (chunkInfo: PreRenderedAsset) => getAssetFileName(chunkInfo),
          globals: Object.fromEntries(Object.entries(globals).map(([key, value]) => [key.replace('@wordpress/', 'wp-'), value])),
        };
        const rollupOptions: RollupOptions = {
          input,
          output,
          external,
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
          assetsInlineLimit: 0, //Make sure to not include inline assets in CSS.
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
            extensions: ['.ts', '.tsx', '.js', '.jsx'],
            alias: options.alias,
          },
        };

        userConfig = deepmerge(preConfig, userConfig);

        const rollupPlugins = [externalGlobals(globals)];

        // Ensures globals are NOT using "import" in the compiled files but are defined externally.
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
    configResolved(config) {
      command = config.command;
    },

    /**
     * Build Start Hook.
     */
    buildStart() {
      if (command === 'build') {
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
      const bundleMap = createBundleMap(bundleOptions, bundle);

      for (const module of Object.values(bundle)) {
        if (module.type === 'asset' && module.fileName.endsWith('.json') && options.manifest !== false) {
          const jsonFileName = module.fileName;
          const jsonObject = JSON.parse(module.source.toString());

          // Ensure file paths in block.json use hashed file names.
          module.source = JSON.stringify(resolveHashedBlockFilePaths(jsonFileName, jsonObject, bundleMap, bundleOptions), null, 2);
        }

        if (module.type === 'chunk' && module.facadeModuleId) {
          const isJsChunk = options.allowedJsExtensions.some(ext => module.facadeModuleId.endsWith(ext));

          // Include code wrappers if enabled.
          if (isJsChunk && options.wrapper) {
            module.code = options.banner + module.code + options.footer;
          }
        }
      }
    },

    /**
     * Configure Server Hook.
     */
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.includes(`${VITE_PLUGIN_NAME}.json`)) {
          const { base, srcDir, outDir, css, manifest } = options;
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ base, srcDir, outDir, css, manifest }, null, 2)); // Expose plugin config.
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
