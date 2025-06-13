import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3003,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@perimeter360/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@perimeter360/utils': path.resolve(__dirname, '../../packages/utils/src')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Ensure that the build doesn't fail on warnings
    chunkSizeWarningLimit: 1000
  }
})