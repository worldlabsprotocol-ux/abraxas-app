// FILE: app/layout.tsx
// Root layout. SessionProvider wraps everything for NextAuth.
// Solana providers are in SolanaProvider (client component, dynamic import in page).
import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";

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
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
