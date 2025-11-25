import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourapp.walkreco',
  appName: 'WalkReco',
  webDir: 'dist',           // Vite build output
  bundledWebRuntime: false,

  server: {
    // 개발 중에는 웹 서버에서 띄우기 때문에 필요 (라이브 리로드)
    url: 'http://localhost:5173',
    cleartext: true,
  },

  // 안드로이드 권한 설정
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
  },

  ios: {
    contentInset: "always",
  }
};

export default config;
