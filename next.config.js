/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Stub all Node/React-Native modules that leak into browser bundles
      // via Solana wallet adapters and wagmi/MetaMask SDK transitive deps
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, net: false, tls: false,
        crypto: false, stream: false, path: false, os: false,
        // React Native shims pulled in by @solana-mobile/* and @wagmi/connectors
        "react-native": false,
        "@react-native-async-storage/async-storage": false,
        "@react-native/virtualized-lists": false,
      };

      // Alias MetaMask SDK to a no-op module so wagmi connectors build cleanly.
      // @wagmi/connectors includes a MetaMask connector that imports the SDK.
      // We don't use MetaMask SDK directly — RainbowKit handles the connector.
      config.resolve.alias = {
        ...config.resolve.alias,
        "@metamask/sdk": false,
      };
    }

    // Externalize server-side packages that cause bundling issues
    if (!Array.isArray(config.externals)) {
      config.externals = [config.externals].filter(Boolean);
    }
    config.externals.push("pino-pretty", "lokijs", "encoding");

    return config;
  },
};

module.exports = nextConfig;