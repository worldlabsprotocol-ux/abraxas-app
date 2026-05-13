// FILE: app/layout.tsx
// Root layout — deterministic, hydration-safe.
// Uses next/font for Inter (no inline font injection).
// suppressHydrationWarning on html/body handles wallet extension DOM mutations.
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Abraxas Protocol — Tokenize Your Real Assets",
  description: "The RWA issuance layer on Solana. Tokenize physical assets, borrow USDC via Loopscale, trade in verified markets.",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={inter.variable}
      suppressHydrationWarning  // wallet extensions modify <html> attrs — suppress
    >
      <body
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
        suppressHydrationWarning  // wallet extensions inject scripts into <body>
      >
        {children}
      </body>
    </html>
  );
}