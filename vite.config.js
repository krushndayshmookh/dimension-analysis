import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// The storage server's port; the same PORT variable configures both sides.
const apiPort = process.env.PORT || 3001

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: `http://localhost:${apiPort}`, changeOrigin: true },
    },
  },
})
