import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        // 개발할 때도 클라우드에 올려둔 실제 백엔드로 프록시
        target: 'http://113.198.66.75:13111',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://113.198.66.75:13111',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
