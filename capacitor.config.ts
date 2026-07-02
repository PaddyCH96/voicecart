import { CapacitorConfig } from '@capacitor/cli';

// -------------------------------------------------------------
// VoiceCart Native App Configuration
// Deploys the Next.js Web App into iOS and Android binaries.
// -------------------------------------------------------------
const config: CapacitorConfig = {
  appId: 'com.voicecart.creator',
  appName: 'VoiceCart',
  // ⚠️ NOTE: Next.js with API routes cannot use static export (`out/`).
  // For development, the app runs as a server with the dev URL below.
  // For production App Store / Play Store release:
  //   - Build Next.js: `npm run build && npm run start`
  //   - Host the Next.js server on a domain with HTTPS
  //   - Point Capacitor `server.url` to that domain
  //   - Remove `server.url` and `cleartext` to serve bundled web assets
  //     from a Next.js static export (requires no API routes — use a separate API backend).
  webDir: '.next',
  
  server: {
    // ⚠️ For Local Development ONLY:
    // Update this IP to your machine's local network IP before running on a device.
    // Comment this `url` and `cleartext` block out before building for App Store/Play Store release!
    url: 'http://192.168.0.5:3003',
    cleartext: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0A0A0A",
      showSpinner: true,
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
    },
  },
};

export default config;
