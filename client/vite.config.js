import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    // Add environment-specific settings
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'socket.io-client'],
          ui: ['react-router-dom', 'react-hot-toast'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    strictPort: true,
  },
})
