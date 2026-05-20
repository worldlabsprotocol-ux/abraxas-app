// FILE: next.config.js
// Webpack aliases kill WalletConnect/Reown/viem dependency chain.
// Polyfills for browser-only Solana modules.
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack: (config, { isServer }) => {
    // Client-side: polyfill Node core modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs:     false,
        os:     false,
        path:   false,
        crypto: false,
        stream: false,
        buffer: require.resolve("buffer/"),
      };
    }

    // Kill heavy wallet-connect chains that cause build failures
    config.resolve.alias = {
      ...config.resolve.alias,
      "@walletconnect/solana-adapter": false,
      "@reown/appkit":                 false,
      "viem":                          false,
      "wagmi":                         false,
      "ox":                            false,
    };

    return config;
  },
};

module.exports = nextConfig;