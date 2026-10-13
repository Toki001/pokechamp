import react from '@vitejs/plugin-react'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  build: { manifest: true, assetsInlineLimit: 0 },
  plugins: [
    react(),
    ViteImageOptimizer({
      logStats: false,
      png: {
        quality: 80,
      },
      webp: {
        lossless: false,
        quality: 80,
      },
      svg: { multipass: true },
    }),
  ],
})
