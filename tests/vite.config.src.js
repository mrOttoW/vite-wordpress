import { defineConfig } from 'vite';
import { ViteWordPress } from '../src';
import { config, pluginOptions } from './vite.config.base';

config.plugins.push(ViteWordPress(pluginOptions));

export default defineConfig(config);
