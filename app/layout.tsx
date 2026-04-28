import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Toast } from "@/components/Toast";
import { Providers } from "@/lib/providers";

export const metadata: Metadata = {
  title: "Abraxas — Real Assets. Operated Capital.",
  description: "Autonomous agents manage capital inside named vaults, defended by real-time circuit protection, settling on Solana. Turn passive assets into operating capital.",
  metadataBase: new URL("https://abraxas.app"),
  openGraph: {
    title: "Abraxas — Real Assets. Operated Capital.",
    description: "Autonomous agents manage capital inside named vaults, defended by real-time circuit protection, settling on Solana.",
    url: "https://abraxas.app",
    siteName: "Abraxas",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Abraxas — Real Assets. Operated Capital.",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Abraxas — Real Assets. Operated Capital.",
    description: "Autonomous agents manage capital inside named vaults, defended by real-time circuit protection, settling on Solana.",
    images: ["/og-image.png"],
    creator: "@pabloretroworld",
  },
  keywords: ["RWA", "real world assets", "Solana", "DeFi", "tokenization", "music royalties", "autonomous agents", "yield", "ABRA"],
  robots: { index: true, follow: true },
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