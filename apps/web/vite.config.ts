import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: Number(process.env.WEB_PORT) || 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
});
