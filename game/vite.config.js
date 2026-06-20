import { defineConfig } from 'vite';

// Vite serves index.html from the project root and bundles the ES-module client
// into dist/ for production (served by the Node game server).
export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
  },
  server: {
    port: 5173,
    // During dev, proxy the WebSocket to the authoritative game server so online
    // mode works without building.
    proxy: {
      '/ws': { target: 'ws://localhost:3000', ws: true },
    },
  },
});
