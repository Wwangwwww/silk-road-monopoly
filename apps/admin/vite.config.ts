import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@src': resolve(__dirname, 'src'),
      '@silk-road-monopoly/env': resolve(__dirname, '../../packages/env/src/browser.ts'),
      '@silk-road-monopoly/style': resolve(__dirname, '../../packages/style/src'),
    },
  },
  server: { port: 5174 },
  base: '/admin/',
});
