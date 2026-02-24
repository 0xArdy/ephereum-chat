import react from '@vitejs/plugin-react';
import topLevelAwait from 'vite-plugin-top-level-await';
import { defineConfig } from 'vitest/config';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  root: 'apps/web',
  envDir: '.',
  plugins: [react(), wasm(), topLevelAwait()],
  optimizeDeps: {
    exclude: ['kzg-wasm'],
  },
  server: {
    proxy: {
      // Proxy Blobscan Google Cloud Storage to bypass CORS
      '/blobscan-storage': {
        target: 'https://storage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/blobscan-storage/, ''),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
