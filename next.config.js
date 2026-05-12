/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence React-Native peer dependency warnings in browser builds
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Stub out RN-only packages that get pulled in by MetaMask SDK / wagmi connectors
      // These are never used in the web runtime — aliasing to false removes the bundle error
      config.resolve.alias = {
        ...config.resolve.alias,
        "@react-native-async-storage/async-storage": false,
      };
    }
    return config;
  },

  // Required for importing data/inventory.json directly in components
  experimental: {},
};

module.exports = nextConfig;