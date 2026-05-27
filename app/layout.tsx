// FILE: app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider }  from "@/components/SessionProvider";
import { SolanaProvider }   from "@/components/SolanaProvider";

export const metadata: Metadata = {
  title: "Abraxas Protocol",
  description: "Verifiable Onchain Collateral Infrastructure — Solana",
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
