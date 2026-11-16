import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
    }),
  ],

  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            if (err.code === 'ECONNREFUSED' && res && typeof res.writeHead === 'function' && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Backend server is starting up. Please retry momentarily.' }));
            }
          });
        }
      },
      '/uploads': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            if (err.code === 'ECONNREFUSED' && res && typeof res.writeHead === 'function' && !res.headersSent) {
              res.writeHead(503);
              res.end();
            }
          });
        }
      },
      '/socket.io': {
        target: 'http://127.0.0.1:4000',
        ws: true,
        configure: (proxy) => {
          proxy.on('error', () => {
            // Suppress noisy transient WebSocket connect race before backend opens port 4000
          });
        }
      },
    },
  },

  // ── Build: production-grade bundle splitting ────────────────────────────
  build: {
    // ES2020 target eliminates most Babel polyfills (fixes "Legacy JavaScript" audit)
    target: 'es2020',
    // Keep chunks ≤ 500 KiB to clear Lighthouse's "enormous payloads" warning
    chunkSizeWarningLimit: 500,
    // Source maps only in development
    sourcemap: mode === 'development',
    minify: 'esbuild',

    rollupOptions: {
      output: {
        // ── Manual vendor chunks ─────────────────────────────────────────
        // Each heavy dependency gets its own cacheable chunk so a change in
        // one library doesn't bust every other cached file.
        manualChunks(id) {
          // React core — smallest, loaded first, very rarely changes
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
          // Framer Motion — large animation lib, only needed for MailSlotUpload
          if (id.includes('node_modules/framer-motion') ||
              id.includes('node_modules/motion-dom') ||
              id.includes('node_modules/motion-utils')) {
            return 'vendor-framer';
          }
          // Supabase — auth & realtime, heavy but cached long-term
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          // Lucide icons — tree-shaken but still sizeable; isolate for caching
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-lucide';
          }
          // Dexie — IndexedDB offline store
          if (id.includes('node_modules/dexie')) {
            return 'vendor-dexie';
          }
          // Socket.IO client
          if (id.includes('node_modules/socket.io-client') ||
              id.includes('node_modules/engine.io-client') ||
              id.includes('node_modules/engine.io-parser')) {
            return 'vendor-socketio';
          }
          // PDF.js — only needed on blueprint canvas
          if (id.includes('node_modules/pdfjs-dist')) {
            return 'vendor-pdfjs';
          }
        },
        // Deterministic hashes → better long-term cache hit rates
        entryFileNames:  'assets/[name]-[hash].js',
        chunkFileNames:  'assets/[name]-[hash].js',
        assetFileNames:  'assets/[name]-[hash][extname]',
      },
    },
  },

  // ── esbuild: strip console.* in production ─────────────────────────────
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },

  // ── Vitest test runner configuration ──────────────────────────────────
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: false,
  },
}));

