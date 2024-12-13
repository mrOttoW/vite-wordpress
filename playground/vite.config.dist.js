import { defineConfig } from 'vite';
import { ViteWordPress } from '../dist';
import { config, pluginOptions } from './vite.config.base';

config.plugins.push(ViteWordPress(pluginOptions));

export default defineConfig(config);
