import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    // Run `npm run analyze` to generate stats.html showing bundle breakdown
    process.env.ROLLUP_VISUALIZER && visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'stats.html',
    }),
  ].filter(Boolean),
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split vendor libraries into a separate chunk so app code changes
        // don't bust the browser cache on react/router/axios/socket.io
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-http':  ['axios', 'socket.io-client'],
          'vendor-ui':    ['lucide-react', 'react-dropzone'],
        },
      },
    },
  },
});
