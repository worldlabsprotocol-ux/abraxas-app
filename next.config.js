/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // Stub Node/React-Native modules that leak into browser bundles
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, net: false, tls: false,
        crypto: false, stream: false, path: false, os: false,
        "react-native": false,
        "@react-native/virtualized-lists": false,
      };

      // IgnorePlugin: suppress the missing @react-native-async-storage module
      // that @metamask/sdk's pre-bundled browser/es dist tries to require.
      // This is a transitive dep from @wagmi/connectors → @metamask/sdk.
      // We don't use MetaMask SDK directly — RainbowKit handles its own connector.
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^@react-native-async-storage\/async-storage$/,
        })
      );

      // Also ignore the dynamic expression warning from ox/tempo (viem internal)
      // by replacing the virtualMasterPool module with an empty stub
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /ox\/_esm\/tempo\/internal\/virtualMasterPool\.js/,
          require.resolve("./lib/stubs/empty.js")
        )
      );
    }

    // Server-side externals that cause bundling issues
    if (!Array.isArray(config.externals)) {
      config.externals = [config.externals].filter(Boolean);
    }
    config.externals.push("pino-pretty", "lokijs", "encoding");

    return config;
  },
};

module.exports = nextConfig;