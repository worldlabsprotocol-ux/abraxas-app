import type { CapacitorConfig } from "@capacitor/cli";

const HOST = "abraxasworld.xyz";

/** Holder-only routes and trusted auth/wallet origins for in-app WebView navigation. */
const ALLOW_NAVIGATION = [
  `${HOST}`,
  `*.${HOST}`,
  "accounts.google.com",
  "*.google.com",
  "appleid.apple.com",
  "*.walletconnect.com",
  "walletconnect.com",
  "verify.walletconnect.com",
  "phantom.app",
  "*.phantom.app",
  "solflare.com",
  "*.solflare.com",
  "chrome.google.com",
];

const config: CapacitorConfig = {
  appId: "xyz.abraxasworld.app",
  appName: "Abraxas",
  webDir: "www",
  server: {
    url: `https://${HOST}/passport`,
    cleartext: false,
    allowNavigation: ALLOW_NAVIGATION,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    CapacitorHttp: {
      enabled: false,
    },
  },
};

export default config;
