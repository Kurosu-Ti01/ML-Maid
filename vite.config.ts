import { defineConfig } from 'vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import path from 'node:path'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  clearScreen: false,
  server: {
    strictPort: true,
  },
  build: {
    target: 'esnext', // Support latest ES features, including top-level await
    chunkSizeWarningLimit: 2000, // Increase chunk size warning limit to 2000 KB
  },
  plugins: [
    vue(),
    AutoImport({
      imports: [
        'vue',
        {
          'naive-ui': [
            'useDialog',
            'useMessage',
            'useNotification',
            'useLoadingBar'
          ]
        }
      ]
    }),
    Components({
      resolvers: [NaiveUiResolver()],
    }),
    VueI18nPlugin({
      include: [path.resolve(__dirname, 'src/locales/**')],
      strictMessage: false, // Allow HTML in translation strings for tooltips
    }),
  ],
})
