import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jumbostar.wholesale',
  appName: 'Jumbo Star',
  webDir: 'out',
  server: {
    url: 'https://www.jumbostar.in', 
    cleartext: true,
    // Add this to allow the app to navigate properly on your domain
    allowNavigation: ['jambostar.vercel.app']
  },
  plugins: {
    App: {
      // Must be false so our custom code in Step 1 runs
      disableBackButtonHandler: false 
    }
  }
};

export default config;