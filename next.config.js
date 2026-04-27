/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack: (config, { isServer, webpack }) => {
    // Some Solana / wagmi packages reference Node-only modules that
    // aren't actually used in the browser. Stub them out client-side.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    // wagmi optional peer — silence build warning
    config.externals = config.externals || [];
    config.externals.push("pino-pretty", "lokijs", "encoding");

    return config;
  },
};

module.exports = nextConfig;
