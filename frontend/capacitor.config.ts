import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourapp.walkreco',
  appName: 'WalkReco',
  webDir: 'dist',
  server: {
     cleartext: true,
    androidScheme: 'http',   // ← ⭐ 여기 딱 1줄이 핵심!
  },
};

export default config;
