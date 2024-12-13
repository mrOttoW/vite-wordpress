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
} from 'vite';
import { AddonFunction, ExternalOption, GlobalsOption, InputOption, OutputOptions, RollupOptions } from 'rollup';
import deepmerge from 'deepmerge';
import fg from 'fast-glob';
import PluginGlobals from './globals';
import path from 'path';
import externalGlobals from 'rollup-plugin-external-globals';

interface Options {
  outDir?: string;
  srcDir?: string;
  base?: string;
  input?: string[];
  manifest?: boolean | string;
  banner?: string | AddonFunction;
  footer?: string | AddonFunction;
  globals?: GlobalsOption;
  alias?: AliasOptions;
  target?: 'modules' | string | string[] | false;
  preserveDirs?: boolean;
}

function ViteWordPress(optionsParam: Options = {}): Plugin {
  const options: Options = deepmerge(DEFAULT_OPTIONS, optionsParam);

  /**
   * Construct input.
   *
   * @param rootPath
   */
  const getInput = async (rootPath: string): Promise<InputOption> => {
    const inputFiles = await fg(options.input, {
      cwd: path.join(rootPath, options.srcDir),
    });

    return Object.fromEntries(
      inputFiles.map(file => {
        const fileName = (options.preserveDirs ? file : path.basename(file)).replace(/\.js$/, '');
        const filePath = path.join(rootPath, options.srcDir, file);

        return [fileName, filePath];
      })
    );
  };

  /**
   * Construct Asset Output.
   *
   * @param fileName
   */
  const getAssetFileName = (fileName: string | null) => {
    const extension = options.manifest === false ? '[extname]' : '[hash][extname]';

    return fileName && options.preserveDirs
      ? fileName.replace(`${options.srcDir}/`, '').replace(/\.[^/.]+$/, extension)
      : `[name]${extension}`;
  };

  /**
   * Construct Vite's base.
   *
   * @param command
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
          entryFileNames: options.manifest === false ? '[name].js' : '[name][hash].js',
          assetFileNames: ({ originalFileNames: [fileName] }) => getAssetFileName(fileName),
          banner: options.banner,
          footer: options.footer,
          globals,
        };
        const rollupOptions: RollupOptions = {
          input,
          output,
          external,
          plugins: [],
        };
        const esbuild: ESBuildOptions = {
          loader: 'jsx',
          include: /.*\.jsx?$/, // Allow React code within .js files instead of .jsx.
          exclude: [],
        };
        const optimizeDeps: DepOptimizationConfig = {
          esbuildOptions: {
            loader: { '.js': 'jsx' }, // Need JSX syntax for dev server
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
