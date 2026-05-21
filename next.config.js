// FILE: next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Anchor runs in Node — don't bundle it for the browser
  experimental: {
    serverComponentsExternalPackages: ["@coral-xyz/anchor", "tweetnacl"],
  },

  images: {
    remotePatterns: [
      { protocol:"https", hostname:"*.supabase.co" },
      { protocol:"https", hostname:"*.supabase.in" },
      { protocol:"https", hostname:"arweave.net" },
    ],
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, os: false, path: false, crypto: false, stream: false,
      };
    }
    // Kill WalletConnect/EVM chain that bloats the bundle
    config.resolve.alias = {
      ...config.resolve.alias,
      "@walletconnect/solana-adapter": false,
      "@reown/appkit":                 false,
      "viem":                          false,
      "wagmi":                         false,
    };
    return config;
  },
};

module.exports = nextConfig;