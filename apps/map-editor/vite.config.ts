import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

export default defineConfig({
  plugins: [
    vue(),
    electron([
      { entry: 'electron/main.ts', vite: { build: { outDir: 'dist-electron' } } },
      { entry: 'electron/preload.ts', onstart(args) { args.reload(); }, vite: { build: { outDir: 'dist-electron' } } },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@src': resolve(__dirname, 'src'),
      '@silk-road-monopoly/env': resolve(__dirname, '../../packages/env/src/browser.ts'),
      '@silk-road-monopoly/style': resolve(__dirname, '../../packages/style/src'),
    },
  },
  server: { port: 5175 },
});
