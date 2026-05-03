// FILE: app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { BottomNav } from "@/components/BottomNav";
import { SystemStatusBar } from "@/components/SystemStatusBar";
import { Toast } from "@/components/Toast";
import { Providers } from "@/lib/providers";

export const metadata: Metadata = {
  title: "Abraxas — Autonomous RWA Guardian Protocol",
  description: "AI-powered agents protecting tokenized real-world assets on Solana. Circuit-monitored. Always operating.",
  metadataBase: new URL("https://abraxas-app.vercel.app"),
  icons: { icon: "/icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ background: "var(--void)", color: "var(--text)", margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
        <Providers>
          {/* Fixed top nav — 56px */}
          <Nav />
          {/* Fixed system status bar — 36px below nav */}
          <SystemStatusBar />
          {/* Page content — clears nav (56px) + status bar (36px) = 92px */}
          <main style={{ paddingTop: "92px", minHeight: "100vh", paddingBottom: "80px" }}>
            {children}
          </main>
          {/* 3-button bottom app nav */}
          <BottomNav />
          <Toast />
        </Providers>
      </body>
    </html>
  );
}