import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

const analyze = process.env.ANALYZE === 'true';

export default defineConfig(() => {
  return {
    /** Somente VITE_* no bundle — secrets admin em .env.scripts.local (fora do Vite). */
    envPrefix: ['VITE_'],
    /** Cópia seletiva via build-scripts/sync-public-to-dist.mjs (evita duplicar 1.2GB no build). */
    publicDir: false,
    plugins: [
      react(),
      tailwindcss(),
      analyze &&
        visualizer({
          filename: 'dist/stats.html',
          open: false,
          gzipSize: true,
          brotliSize: true,
        }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('fuse.js')) return 'vendor-search';
            if (id.includes('framer-motion') || id.includes('motion/')) return 'vendor-motion';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('i18next') || id.includes('react-i18next')) return 'vendor-i18n';
            if (id.includes('modern-screenshot') || id.includes('html2canvas') || id.includes('html-to-image'))
              return 'vendor-screenshot';
            if (id.includes('/translation/translationEngine')) return 'vendor-translate';
            if (
              /node_modules\/react\//.test(id) ||
              /node_modules\/react-dom\//.test(id) ||
              id.includes('react-router') ||
              id.includes('scheduler')
            ) {
              return 'vendor-react';
            }
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api/translate': {
          target: 'https://api.mymemory.translated.net',
          changeOrigin: true,
          rewrite: () => '/get',
        },
      },
    },
  };
});
