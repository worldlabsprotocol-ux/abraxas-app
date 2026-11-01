// FILE: next.config.js
/** @type {import('next').NextConfig} */

// Keep only linux/x64 CPU ONNX + sharp binaries in serverless traces.
// Applied via experimental.outputFileTracingExcludes (global **/* plus the capture route).
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

const PUBLIC_SURFACE_REDIRECTS = [
  { source: "/partner", destination: "/docs/partner-flow", permanent: false },
  { source: "/onboarding", destination: "/design-partner", permanent: false },
];

/** When set, Next.js skips in-build ESLint/TS (see Build #590). CI runs blocking validation separately. */
const skipInBuildValidation = process.env.ABRAXAS_SKIP_IN_BUILD_VALIDATION === "1";
/** Vercel standard builders (8 GB): limit static-generation workers to reduce peak RSS. */
const vercelBuild = process.env.VERCEL === "1";

const nextConfig = {
  output: process.env.ABRAXAS_STANDALONE_BUILD === "1" ? "standalone" : undefined,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: skipInBuildValidation,
  },
  eslint: {
    ignoreDuringBuilds: skipInBuildValidation,
  },
  async redirects() {
    return PUBLIC_SURFACE_REDIRECTS;
  },
  // Next.js 14: keep native Node packages out of the server webpack graph.
    experimental: {
    instrumentationHook: true,
    cpus: vercelBuild ? 1 : 2,
    workerThreads: false,
    /** Custom webpack disables default worker; keep explicit for Next 14.2 upgrades. */
    webpackBuildWorker: vercelBuild ? false : undefined,
    /** Peak RSS: avoid compiling server + edge graphs concurrently on 8 GB builders. */
    parallelServerCompiles: vercelBuild ? false : undefined,
    parallelServerBuildTraces: vercelBuild ? false : undefined,
    staticGenerationMaxConcurrency: vercelBuild ? 1 : undefined,
    optimizePackageImports: [
      "recharts",
      "framer-motion",
      "@solana/web3.js",
      "@tanstack/react-query",
    ],
    serverComponentsExternalPackages: [
      "onnxruntime-node",
      "@sqds/multisig",
      "pg",
    ],
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
    if (vercelBuild) {
      // Peak memory: one webpack compilation lane on 8 GB Vercel builders.
      config.parallelism = 1;
    }
    if (isServer) {
      // API routes / server bundles: require onnxruntime-node at runtime, never parse .node binaries.
      const externals = config.externals ?? [];
      config.externals = [
        ...(Array.isArray(externals) ? externals : [externals]),
        "onnxruntime-node",
        "pg",
        "pg-native",
      ];
    } else {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, os: false, path: false, crypto: false, stream: false,
        dns: false, net: false, tls: false, "util/types": false,
      };
      // Client bundles only — server API routes (EVM SIWE bind, gate validation) need viem.
      config.resolve.alias = {
        ...config.resolve.alias,
        "@walletconnect/solana-adapter": false,
        "@reown/appkit": false,
        "viem": false,
        "wagmi": false,
      };
    }
    return config;
  },
};
module.exports = nextConfig;
