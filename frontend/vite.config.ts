import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  plugins: [react()],

  server: {
    host: true, // 🚀 Capacitor Android/iOS에서 로컬 서버 접근 용
    port: 5173,

    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/taste-records': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/taste-records/, '/api/taste-records'),
      },
      '/uploads': {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  build: {
    outDir: 'dist', // ⚡ Capacitor가 사용하는 빌드 폴더
  },
});
