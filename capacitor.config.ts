import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jumbostar.wholesale',
  appName: 'Jumbo Star',
  webDir: 'out',
  server: {
    url: 'https://www.jumbostar.in',
    cleartext: true,
    allowNavigation: ['jambostar.vercel.app']
  },
  plugins: {
    App: {
      disableBackButtonHandler: false
    },
    Geolocation: {}
  }
};

export default config;