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
        target: 'http://localhost:3000', // 백엔드 서버 주소/포트
        changeOrigin: true,
        secure: false,
      },
      '/taste-records': {
        target: 'http://localhost:3000', // 백엔드 서버 주소/포트
        changeOrigin: true,
        secure: false,
        // 프론트에서 /taste-records 로 호출하면 백엔드 /api/taste-records 로 전달
        rewrite: (path) => path.replace(/^\/taste-records/, '/api/taste-records'),
      },
    },
  },
})
