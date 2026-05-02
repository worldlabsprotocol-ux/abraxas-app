/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, net: false, tls: false,
        crypto: false, stream: false, path: false, os: false,
        "react-native": false,
        "@react-native/virtualized-lists": false,
      };

      // Suppress missing @react-native-async-storage inside @metamask/sdk browser dist
      // (@wagmi/connectors bundles MetaMask SDK as a transitive dep)
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^@react-native-async-storage\/async-storage$/,
        })
      );
    }

    if (!Array.isArray(config.externals)) {
      config.externals = [config.externals].filter(Boolean);
    }
    config.externals.push("pino-pretty", "lokijs", "encoding");

    return config;
  },
};

module.exports = nextConfig;