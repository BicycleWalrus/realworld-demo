import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  publicDir: 'public',
  server: {
    host: '0.0.0.0',
    port: 2224,
    proxy: {
      '/api': {
        target: 'http://localhost:3001'
      }
    }
  }
})
