import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';
import { envPlugin } from '@silk-road-monopoly/env/vite-plugin';

export default defineConfig(({ mode }) => {
  const isWeb = mode === 'web' || mode === 'capacitor' || !process.env.ELECTRON;

  const plugins: any[] = [vue(), envPlugin()];

  // Electron 仅在桌面模式下启用
  if (!isWeb) {
    plugins.push(
      electron([
        { entry: 'electron/main.ts', vite: { build: { outDir: 'dist-electron' } } },
        {
          entry: 'electron/preload.ts',
          onstart(args: any) {
            args.reload();
          },
          vite: { build: { outDir: 'dist-electron' } },
        },
      ]),
      renderer()
    );
  }

  plugins.push(viteCompression({ threshold: 10240 }), visualizer({ open: false, gzipSize: true }));

  return {
    plugins,

    resolve: {
      alias: {
        '@src': resolve(__dirname, 'src'),
        '@silk-road-monopoly/env': resolve(__dirname, '../../packages/env/src/browser.ts'),
        '@silk-road-monopoly/style': resolve(__dirname, '../../packages/style/src'),
      },
    },

    define: {
      __APP_VERSION__: JSON.stringify('1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },

    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router', 'pinia'],
            'three-vendor': ['three'],
            'gsap-vendor': ['gsap'],
            'ui-common': ['ant-design-vue'],
          },
        },
      },
    },

    server: { port: 5173 },
  };
});
