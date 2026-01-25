import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8880',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8880',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
})
