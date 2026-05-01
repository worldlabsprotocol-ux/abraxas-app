// FILE: app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Toast } from "@/components/Toast";
import { Providers } from "@/lib/providers";

export const metadata: Metadata = {
  title: "Abraxas — Operate Your Real-World Assets",
  description: "Autonomous agents operate real-world assets on Solana. Music, real estate, receivables.",
  metadataBase: new URL("https://abraxas-app.vercel.app"),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={{ background: "var(--void)", color: "var(--text)", fontFamily: "'Space Grotesk', sans-serif", margin: 0 }}>
        <Providers>
          <Nav />
          <main style={{ paddingTop: "56px", minHeight: "100vh" }}>{children}</main>
          <Toast />
        </Providers>
      </body>
    </html>
  );
}