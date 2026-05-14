/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,

        // ── Kill Ethereum/WalletConnect chain ───────────────────────────────
        // These packages are pulled in transitively through @solana/wallet-adapter-wallets
        // → @solana/wallet-adapter-walletconnect → @walletconnect/solana-adapter
        // → @reown/appkit → viem → ox/tempo (causes "Critical dependency" warning)
        // We're Solana-native only. These are never used at runtime.
        "@walletconnect/solana-adapter":       false,
        "@walletconnect/universal-provider":   false,
        "@reown/appkit":                       false,
        "viem":                                false,
        "wagmi":                               false,
        "@rainbow-me/rainbowkit":              false,

        // ── RN async-storage stub ───────────────────────────────────────────
        "@react-native-async-storage/async-storage": false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;