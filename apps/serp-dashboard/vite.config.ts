import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3003,
    host: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@perimeter360/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@perimeter360/utils': path.resolve(__dirname, '../../packages/utils/src')
    }
  }
})