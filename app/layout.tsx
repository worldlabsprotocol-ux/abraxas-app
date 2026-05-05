// FILE: app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { BottomNav } from "@/components/BottomNav";
import { SystemStatusBar } from "@/components/SystemStatusBar";
import { Toast } from "@/components/Toast";
import { Providers } from "@/lib/providers";

export const metadata: Metadata = {
  title: "Abraxas — Sovereign Intelligence Protocol",
  description: "Autonomous AI agents protecting tokenized real-world assets on Solana.",
  metadataBase: new URL("https://abraxas-app.vercel.app"),
  icons: { icon: "/icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ background: "var(--void)", color: "var(--text)", margin: 0, fontFamily: "'Space Grotesk',sans-serif" }}>
        <Providers>
          <Nav />
          <SystemStatusBar />
          <main style={{ paddingTop: "92px", minHeight: "100vh", paddingBottom: "128px" }}>
            {children}
          </main>
          <BottomNav />
          <Toast />
        </Providers>
      </body>
    </html>
  );
}