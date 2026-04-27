import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Toast } from "@/components/Toast";
import { Providers } from "@/lib/providers";

export const metadata: Metadata = {
  title: "Abraxas — Real Assets. Operated Capital.",
  description: "Real-world assets stop being held and start being operated. Autonomous agents. Named vaults. Circuit defense. Settling on Solana.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={{ background: "var(--void)", color: "var(--text)", fontFamily: "'Space Grotesk', sans-serif" }}>
        <Providers>
          <Nav />
          <main style={{ paddingTop: "60px", minHeight: "100vh" }}>{children}</main>
          <Toast />
        </Providers>
      </body>
    </html>
  );
}
