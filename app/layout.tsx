// FILE: app/layout.tsx
// Root layout — minimal. Providers + font. suppressHydrationWarning for wallet extensions.
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SolanaProvider } from "@/components/SolanaProvider";
import { StoreHydrator } from "@/components/StoreHydrator";
import { SessionProvider } from "@/components/SessionProvider";
import "./globals.css";


const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });


export const metadata: Metadata = {
  title: "Abraxas Protocol — Tokenize Your Real Assets",
  description: "RWA issuance layer on Solana.",
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body 
        style={{ 
          fontFamily: "var(--font-inter), sans-serif", 
          background: "#060810", 
          color: "#f0f0f0", 
          margin: 0 
        }}
        suppressHydrationWarning
      >
        <SessionProvider>
          <SolanaProvider>
            <StoreHydrator />
            {children}
          </SolanaProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
