/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@coral-xyz/anchor"],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false, net: false, tls: false, crypto: false,
        path: false, os: false, stream: false, buffer: false,
      };
    }
    // Kill WalletConnect/Reown chain — not used, causes bundle bloat
    config.resolve.alias = {
      ...config.resolve.alias,
      "@walletconnect/solana-adapter": false,
      "@reown/appkit":                 false,
      "viem":                          false,
    };
    return config;
  },
};

module.exports = nextConfig;
