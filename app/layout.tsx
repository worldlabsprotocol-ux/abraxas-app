// FILE: app/layout.tsx
// Next.js App Router root layout.
// Only exports: `metadata` (Metadata) and `default` (React component).
// No other exports. This is the contract Next.js enforces.

import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { BottomNav } from "@/components/BottomNav";
import { Toast } from "@/components/Toast";
import { Providers } from "@/lib/providers";

export const metadata: Metadata = {
  title: "Abraxas — Operate Your Real-World Assets",
  description: "Deploy capital into vaults and earn. Music royalties, real estate, receivables — operating on Solana.",
  metadataBase: new URL("https://abraxas-app.vercel.app"),
  icons: { icon: "/icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ background: "var(--void)", color: "var(--text)", margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
        <Providers>
          {/* Top nav — persistent across all routes */}
          <Nav />
          {/* Page content — padTop 56px clears the fixed nav */}
          <main style={{ paddingTop: "56px", minHeight: "100vh", paddingBottom: "80px" }}>
            {children}
          </main>
          {/* Bottom nav — app-style 3-button. Mobile first. */}
          <BottomNav />
          {/* Toast notifications */}
          <Toast />
        </Providers>
      </body>
    </html>
  );
}