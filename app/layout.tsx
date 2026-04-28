import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Toast } from "@/components/Toast";
import { AbraStrip } from "@/components/AbraStrip";
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
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Abraxas — Real Assets. Operated Capital." }],
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
      <head>
        {/* Google Translate — enables LanguageSelector component */}
        <Script
          src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="lazyOnload"
        />
        <Script id="google-translate-init" strategy="lazyOnload">{`
          function googleTranslateElementInit() {
            new google.translate.TranslateElement(
              { pageLanguage: 'en', autoDisplay: false },
              'google_translate_element'
            );
          }
        `}</Script>
      </head>
      <body style={{ background: "var(--void)", color: "var(--text)", fontFamily: "'Space Grotesk', sans-serif" }}>
        <Providers>
          <Nav />
          <main style={{ paddingTop: "60px", minHeight: "100vh" }}>{children}</main>
          <AbraStrip />
          <Toast />
        </Providers>
      </body>
    </html>
  );
}