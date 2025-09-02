import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'src/admin/index.html'),
      },
    },
  },
  server: {
    host: true,
    allowedHosts: [/.*\.ngrok-free\.app$/],
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3000', changeOrigin: true },
      '/materials': { target: 'http://localhost:3000', changeOrigin: true },
      '/materiales': { target: 'http://localhost:3000', changeOrigin: true },
    }
  },
  publicDir: 'public',
})
