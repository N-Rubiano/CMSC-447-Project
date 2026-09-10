import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * vite.config.js
 *
 * Proxies all /api, /uploads, and /socket.io requests to the FastAPI
 * backend running on port 4000 during development.
 *
 * This means the React app on port 3000 never has cross-origin issues
 * with the backend, even without CORS tweaks.
 */
export default defineConfig({
  plugins: [react()],

  server: {
    port: 3000,
    proxy: {
      "/api": {
        target:      "http://localhost:4000",
        changeOrigin: true,
      },
      "/uploads": {
        target:      "http://localhost:4000",
        changeOrigin: true,
      },
      "/socket.io": {
        target:      "http://localhost:4000",
        changeOrigin: true,
        ws:          true,   // Proxy WebSocket connections for Socket.IO
      },
    },
  },
});
