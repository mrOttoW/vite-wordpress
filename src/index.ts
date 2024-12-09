import { DEFAULT_OPTIONS, VITE_PLUGIN_NAME } from './constants';
import {
  AliasOptions,
  BuildOptions,
  ConfigEnv,
  DepOptimizationConfig,
  ESBuildOptions,
  Plugin,
  transformWithEsbuild,
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
  input?: string[];
  manifest?: boolean | string;
  banner?: string | AddonFunction;
  footer?: string | AddonFunction;
  globals?: GlobalsOption;
  alias?: AliasOptions;
}

function ViteWordPress(optionsParam: Options = {}): Plugin {
  const options: Options = deepmerge(DEFAULT_OPTIONS, optionsParam);

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
        const rootPath: string = userConfig.root ? path.join(process.cwd(), userConfig.root) : process.cwd();
        const globals: GlobalsOption = {
          ...PluginGlobals,
          ...options.globals,
        };
        const external: ExternalOption = Object.keys(globals); // Set externals based on globals.
        const input: InputOption = Object.fromEntries(
          (
            await fg(options.input, {
              cwd: path.join(rootPath, options.srcDir),
            })
          ).map(file => [
            file.replace(/\.js$/, ''), // fileName
            path.join(rootPath, options.srcDir, file), // filePath
          ])
        );
        const output: OutputOptions = {
          entryFileNames: options.manifest === false ? '[name].js' : '[name][hash].js',
          assetFileNames: ({ originalFileNames: [fileName] }) => {
            const extension = options.manifest === false ? '[extname]' : '[hash][extname]';
            return fileName ? fileName.replace(`${options.srcDir}/`, '').replace(/\.[^/.]+$/, extension) : `[name]${extension}`;
          },
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
          loader: 'jsx', // Allow React code within .js files instead of .jsx.
          include: /.*\.jsx?$/,
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
          target: 'es2017',
          minify: mode === 'development' ? false : 'esbuild',
          sourcemap: mode === 'development' || command === 'serve' ? 'inline' : false,
          assetsInlineLimit: 0, //Make sure to not include inline assets in CSS.
          assetsDir: '', // In WordPress, the src directory is primarily used for resources, so an additional assets directory is unnecessary.
          rollupOptions,
        };
        const preConfig: UserConfig = {
          assetsInclude: ['**/*.php'], // Allow PHP files as entries.
          optimizeDeps,
          esbuild,
          build,
          resolve: {
            alias: options.alias,
          },
        };

        userConfig = deepmerge(preConfig, userConfig);

        if (Array.isArray(userConfig.build?.rollupOptions?.plugins)) {
          // Ensures globals are NOT using "import" in the compiled files but are defined externally.
          userConfig.build.rollupOptions.plugins.push(externalGlobals(globals));
        }
        return userConfig;
      })(),

    /**
     * Handle hot update for PHP files.
     */
    handleHotUpdate({ file, server, modules }) {
      if (file.endsWith('.php')) {
        server.ws.send({ type: 'full-reload', path: '*' });
      }
    },
  };
}

export { ViteWordPress };
