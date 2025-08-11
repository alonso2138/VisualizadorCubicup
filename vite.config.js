import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  // Multiple entry points for build
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'src/admin/index.html')
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/materials': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/materiales': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  publicDir: 'public'
})
