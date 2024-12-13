import { defineConfig } from 'vite';
import { ViteWordPress } from '../src';
import { config, pluginOptions, additionalPlugins } from './vite.config.base';

config.plugins = [...[ViteWordPress(pluginOptions)], ...additionalPlugins];

export default defineConfig(config);
