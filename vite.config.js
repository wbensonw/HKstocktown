import { defineConfig } from 'vite';
import { marketApi } from './server/marketApi.js';

export default defineConfig({
  base: './',
  plugins: [marketApi()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
});
