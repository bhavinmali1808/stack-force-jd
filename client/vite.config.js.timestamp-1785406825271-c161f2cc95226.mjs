// vite.config.js
import { defineConfig } from "file:///C:/Users/Admin/.gemini/antigravity-ide/scratch/stack-force-jd/client/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Admin/.gemini/antigravity-ide/scratch/stack-force-jd/client/node_modules/@vitejs/plugin-react/dist/index.js";
import { visualizer } from "file:///C:/Users/Admin/.gemini/antigravity-ide/scratch/stack-force-jd/client/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    // Run `npm run analyze` to generate stats.html showing bundle breakdown
    process.env.ROLLUP_VISUALIZER && visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: "stats.html"
    })
  ].filter(Boolean),
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        // Split vendor libraries into a separate chunk so app code changes
        // don't bust the browser cache on react/router/axios/socket.io
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-http": ["axios", "socket.io-client"],
          "vendor-ui": ["lucide-react", "react-dropzone"]
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBZG1pblxcXFwuZ2VtaW5pXFxcXGFudGlncmF2aXR5LWlkZVxcXFxzY3JhdGNoXFxcXHN0YWNrLWZvcmNlLWpkXFxcXGNsaWVudFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcQWRtaW5cXFxcLmdlbWluaVxcXFxhbnRpZ3Jhdml0eS1pZGVcXFxcc2NyYXRjaFxcXFxzdGFjay1mb3JjZS1qZFxcXFxjbGllbnRcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0FkbWluLy5nZW1pbmkvYW50aWdyYXZpdHktaWRlL3NjcmF0Y2gvc3RhY2stZm9yY2UtamQvY2xpZW50L3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcbmltcG9ydCB7IHZpc3VhbGl6ZXIgfSBmcm9tICdyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXInO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgLy8gUnVuIGBucG0gcnVuIGFuYWx5emVgIHRvIGdlbmVyYXRlIHN0YXRzLmh0bWwgc2hvd2luZyBidW5kbGUgYnJlYWtkb3duXHJcbiAgICBwcm9jZXNzLmVudi5ST0xMVVBfVklTVUFMSVpFUiAmJiB2aXN1YWxpemVyKHtcclxuICAgICAgb3BlbjogdHJ1ZSxcclxuICAgICAgZ3ppcFNpemU6IHRydWUsXHJcbiAgICAgIGJyb3RsaVNpemU6IHRydWUsXHJcbiAgICAgIGZpbGVuYW1lOiAnc3RhdHMuaHRtbCcsXHJcbiAgICB9KSxcclxuICBdLmZpbHRlcihCb29sZWFuKSxcclxuICBzZXJ2ZXI6IHtcclxuICAgIHBvcnQ6IDUxNzQsXHJcbiAgICBwcm94eToge1xyXG4gICAgICAnL2FwaSc6IHtcclxuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjUwMDAnLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgICAgJy91cGxvYWRzJzoge1xyXG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMCcsXHJcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9LFxyXG4gIGJ1aWxkOiB7XHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIC8vIFNwbGl0IHZlbmRvciBsaWJyYXJpZXMgaW50byBhIHNlcGFyYXRlIGNodW5rIHNvIGFwcCBjb2RlIGNoYW5nZXNcclxuICAgICAgICAvLyBkb24ndCBidXN0IHRoZSBicm93c2VyIGNhY2hlIG9uIHJlYWN0L3JvdXRlci9heGlvcy9zb2NrZXQuaW9cclxuICAgICAgICBtYW51YWxDaHVua3M6IHtcclxuICAgICAgICAgICd2ZW5kb3ItcmVhY3QnOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJ10sXHJcbiAgICAgICAgICAndmVuZG9yLWh0dHAnOiAgWydheGlvcycsICdzb2NrZXQuaW8tY2xpZW50J10sXHJcbiAgICAgICAgICAndmVuZG9yLXVpJzogICAgWydsdWNpZGUtcmVhY3QnLCAncmVhY3QtZHJvcHpvbmUnXSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9LFxyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE4WSxTQUFTLG9CQUFvQjtBQUMzYSxPQUFPLFdBQVc7QUFDbEIsU0FBUyxrQkFBa0I7QUFFM0IsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBO0FBQUEsSUFFTixRQUFRLElBQUkscUJBQXFCLFdBQVc7QUFBQSxNQUMxQyxNQUFNO0FBQUEsTUFDTixVQUFVO0FBQUEsTUFDVixZQUFZO0FBQUEsTUFDWixVQUFVO0FBQUEsSUFDWixDQUFDO0FBQUEsRUFDSCxFQUFFLE9BQU8sT0FBTztBQUFBLEVBQ2hCLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxNQUNoQjtBQUFBLE1BQ0EsWUFBWTtBQUFBLFFBQ1YsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLE1BQ2hCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQTtBQUFBO0FBQUEsUUFHTixjQUFjO0FBQUEsVUFDWixnQkFBZ0IsQ0FBQyxTQUFTLGFBQWEsa0JBQWtCO0FBQUEsVUFDekQsZUFBZ0IsQ0FBQyxTQUFTLGtCQUFrQjtBQUFBLFVBQzVDLGFBQWdCLENBQUMsZ0JBQWdCLGdCQUFnQjtBQUFBLFFBQ25EO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
