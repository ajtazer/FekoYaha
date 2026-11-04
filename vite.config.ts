import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The app is served at the domain root (feko.bihari.xyz). The GitHub Pages
// 404.html SPA fallback handles deep links like /myroom.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './app') },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
