// FILE: app/layout.tsx
// Full metadata + OG/Twitter cards + favicon. Branded green for social sharing.
import { FloatingTerminal } from "@/components/FloatingTerminal";
import { PrivyWrapper } from "@/components/PrivyWrapper";
import type { Metadata } from "next";
import Script            from "next/script";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { SolanaProvider }  from "@/components/SolanaProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://abraxas-app.vercel.app"),
  title: {
    default:  "Abraxas Protocol — Where assets become collateral.",
    template: "%s · Abraxas Protocol",
  },
  description: "Ownership infrastructure for real-world assets. Verification, collateral intelligence, and on-chain attestation on Solana.",
  keywords: [
    "Abraxas", "RWA", "real-world assets", "Solana",
    "tokenization", "verification", "collateral", "DeFi",
    "AAS-1", "ownership infrastructure",
  ],
  authors: [{ name: "Abraxas Protocol" }],
  creator: "Abraxas Protocol",
  publisher: "World Labs Protocol",

  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-32.png",  sizes: "32x32",   type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://abraxas-app.vercel.app",
    siteName: "Abraxas Protocol",
    title: "Abraxas Protocol — Where assets become collateral.",
    description: "Ownership infrastructure for real-world assets. Verification, collateral intelligence, and on-chain attestation on Solana.",
    images: [
      {
        url: "/og-banner.png",
        width: 1500,
        height: 500,
        alt: "Abraxas Protocol — Where assets become collateral.",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Abraxas Protocol — Where assets become collateral.",
    description: "Ownership infrastructure for real-world assets. Verification + collateral intelligence on Solana.",
    images: ["/og-banner.png"],
    creator: "@pabloretroworld",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Theme color matches brand green */}
        <meta name="theme-color" content="#10B981" />
        <meta name="msapplication-TileColor" content="#0A0C10" />

        {/* Google Translate widget init */}
        <Script id="gt-init" strategy="afterInteractive">{`
          window.googleTranslateElementInit = function() {
            new google.translate.TranslateElement(
              { pageLanguage:'en', autoDisplay:false },
              'gt_root'
            );
          };
        `}</Script>
        <Script
          id="gt-script"
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="afterInteractive"
        />
      </head>
      <body>
        <div id="gt_root" style={{ display:"none" }} />
        <SessionProvider>
          <SolanaProvider>
            <PrivyWrapper>{children}</PrivyWrapper>
          </SolanaProvider>
        </SessionProvider>
        <FloatingTerminal />
      </body>
    </html>
  );
}
