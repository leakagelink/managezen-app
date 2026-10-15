import type { CapacitorConfig } from '@capacitor/cli';

// Android wrapper for the live web app. The app needs its server, so it loads the published site.
const config: CapacitorConfig = {
  appId: 'in.socilet.affiliate',
  appName: 'Socilet Affiliate',
  webDir: 'capacitor-www',
  server: { url: 'https://affiliate.socilet.in', cleartext: false, androidScheme: 'https' },
  android: { allowMixedContent: false },
};

export default config;
