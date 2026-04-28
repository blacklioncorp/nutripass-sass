import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.safelunch.app',
  appName: 'SafeLunch',
  webDir: 'public', 
  server: {
    url: 'https://safe-lunch.com',
    cleartext: true
  }
};

export default config;
