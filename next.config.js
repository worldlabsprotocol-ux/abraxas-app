// FILE: next.config.js
/** @type {import('next').NextConfig} */

// Keep only linux/x64 CPU ONNX + sharp binaries in serverless traces.
// Applied globally via outputFileTracingIgnores (reliable on Vercel) and per-route excludes.
const ML_TRACE_EXCLUDES = [
  "**/node_modules/onnxruntime-node/bin/napi-v3/darwin/**",
  "**/node_modules/onnxruntime-node/bin/napi-v3/win32/**",
  "**/node_modules/onnxruntime-node/bin/napi-v3/linux/arm64/**",
  "**/node_modules/onnxruntime-node/bin/napi-v3/linux/x64/libonnxruntime_providers_cuda.so",
  "**/node_modules/onnxruntime-node/bin/napi-v3/linux/x64/libonnxruntime_providers_tensorrt.so",
  "**/node_modules/onnxruntime-node/bin/napi-v3/linux/x64/libonnxruntime.so.1.21.0",
  "**/node_modules/@img/sharp-darwin-*/**",
  "**/node_modules/@img/sharp-win32-*/**",
  "**/node_modules/@img/sharp-wasm32/**",
  "**/node_modules/@img/sharp-libvips-darwin-*/**",
  "**/node_modules/@img/sharp-libvips-linuxmusl-*/**",
  "**/node_modules/@img/sharp-linuxmusl-*/**",
  "**/node_modules/@img/sharp-linux-arm*/**",
  "**/node_modules/@img/sharp-linux-ppc64/**",
  "**/node_modules/@img/sharp-linux-riscv64/**",
  "**/node_modules/@img/sharp-linux-s390x/**",
  "**/node_modules/@img/sharp-freebsd-*/**",
  "**/node_modules/@img/sharp-webcontainers-*/**",
];

const nextConfig = {
  reactStrictMode: true,
  // Next.js 14: keep native Node packages out of the server webpack graph.
  experimental: {
    serverComponentsExternalPackages: ["onnxruntime-node"],
    // Legacy key merged into outputFileTracingExcludes["**/*"] — works on Vercel when route keys do not.
    outputFileTracingIgnores: ML_TRACE_EXCLUDES,
    outputFileTracingExcludes: {
      "**/*": ML_TRACE_EXCLUDES,
      "/api/identity/documents/capture": ML_TRACE_EXCLUDES,
    },
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
