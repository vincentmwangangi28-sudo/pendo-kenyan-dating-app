import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pendo.kenyandating',
  appName: 'Pendo - Kenyan Dating',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
