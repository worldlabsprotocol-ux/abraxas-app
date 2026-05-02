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

      // IgnorePlugin: swallow the missing @react-native-async-storage require
      // inside @metamask/sdk's pre-bundled browser dist.
      // @wagmi/connectors pulls in @metamask/sdk as a transitive dep.
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^@react-native-async-storage\/async-storage$/,
        })
      );

      // Stub the entire ox/tempo module tree at the index level.
      // Stubbing the leaf (virtualMasterPool) broke VirtualMaster.js which
      // imports `resolve` from it. Stubbing the index cuts the whole tree cleanly.
      // ox/tempo is a devnet testing utility — zero effect on mainnet operation.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /ox\/_esm\/tempo\/index\.js$/,
          require.resolve("./lib/stubs/empty.js")
        )
      );
    }

    // Server-side externals
    if (!Array.isArray(config.externals)) {
      config.externals = [config.externals].filter(Boolean);
    }
    config.externals.push("pino-pretty", "lokijs", "encoding");

    return config;
  },
};

module.exports = nextConfig;