// FILE: next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js 14: keep native Node packages out of the server webpack graph.
  experimental: {
    serverComponentsExternalPackages: ["onnxruntime-node"],
  },
  images: {
    remotePatterns: [
      { protocol:"https", hostname:"*.supabase.co" },
      { protocol:"https", hostname:"*.supabase.in" },
      { protocol:"https", hostname:"arweave.net" },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // API routes / server bundles: require onnxruntime-node at runtime, never parse .node binaries.
      const externals = config.externals ?? [];
      config.externals = [
        ...(Array.isArray(externals) ? externals : [externals]),
        "onnxruntime-node",
      ];
    } else {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, os: false, path: false, crypto: false, stream: false,
      };
    }
    config.resolve.alias = {
      ...config.resolve.alias,
      "@walletconnect/solana-adapter": false,
      "@reown/appkit": false,
      "viem": false,
      "wagmi": false,
    };
    return config;
  },
};
module.exports = nextConfig;
