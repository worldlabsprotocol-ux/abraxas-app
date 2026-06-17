"use client";
// FILE: components/PrivyWrapper.tsx
// Wraps the app with Privy — enables Google/Apple/email login that auto-creates
// a Solana embedded wallet. Users never see a seed phrase.
// Add NEXT_PUBLIC_PRIVY_APP_ID to Vercel env vars (get from privy.io dashboard).

import { PrivyProvider } from "@privy-io/react-auth";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "placeholder";

interface PrivyWrapperProps {
  children: React.ReactNode;
}

export function PrivyWrapper({ children }: PrivyWrapperProps) {
  if (PRIVY_APP_ID === "placeholder") {
    // Privy not configured yet — pass through without wrapping
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["email", "google", "apple", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#10B981",
          logo: "https://abraxas-app.vercel.app/icon-192.png",
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
          requireUserPasswordOnCreate: false,
          noPromptOnSignature: false,
        },
        defaultChain: {
          id: 101,
          name: "Solana",
          network: "mainnet-beta",
          nativeCurrency: { name: "SOL", symbol: "SOL", decimals: 9 },
          rpcUrls: {
            default: { http: ["https://api.mainnet-beta.solana.com"] },
            public:  { http: ["https://api.mainnet-beta.solana.com"] },
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
