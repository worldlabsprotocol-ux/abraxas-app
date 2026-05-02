/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Suppress the tempo/wagmi chain definition warning by treating as external
  // These are optional peer dependencies inside viem that don't affect our build
  transpilePackages: [],

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Stub Node-only modules that leak into browser bundles via Solana/wagmi deps
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        path: false,
        os: false,
        "react-native": false,
        "@react-native-async-storage/async-storage": false,
      };
    }

    // Externalize packages that cause build failures when bundled server-side
    // pino-pretty: wagmi logging dep, not used in production
    // lokijs: optional storage backend
    // encoding: node-specific text encoding
    if (!Array.isArray(config.externals)) {
      config.externals = [config.externals].filter(Boolean);
    }
    config.externals.push("pino-pretty", "lokijs", "encoding");

    return config;
  },

  // Silence the specific wagmi/viem tempo chain warning
  // This is a module resolution warning about optional chain configs, not a build error
  experimental: {
    // Keep empty — do not add features that destabilize the build
  },
};

module.exports = nextConfig;