// FILE: app/layout.tsx
// Root layout. Both SessionProvider (NextAuth) and SolanaProvider live here.
// SolanaProvider MUST wrap everything so useWallet() works in all child components.
import type { Metadata }       from "next";
import "./globals.css";
import { SessionProvider }     from "@/components/SessionProvider";
import { SolanaProvider }      from "@/components/SolanaProvider";

export const metadata: Metadata = {
  title:       "Abraxas Protocol",
  description: "Verification + Collateral Intelligence Infrastructure for Real-World Assets on Solana",
  keywords:    ["Solana","RWA","DeFi","tokenization","real world assets","collateral"],
  openGraph: {
    title:       "Abraxas Protocol",
    description: "Institutional-grade RWA tokenization on Solana",
    url:         "https://abraxas-app.vercel.app",
    siteName:    "Abraxas",
    type:        "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <SolanaProvider>
            {children}
          </SolanaProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
