import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import xorDbPlugin from './vite-plugin-xor-db.js'

export default defineConfig({
  plugins: [react(), xorDbPlugin()],
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild'
  }
})
