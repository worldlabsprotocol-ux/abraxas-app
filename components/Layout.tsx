// FILE: app/layout.tsx
// Root layout. Now defaults to LIGHT mode.
// (Previously hardcoded data-theme="dark" with a comment pointing at
// ThemeContext.tsx. flipped here. If ThemeContext also sets/overrides
// this attribute on mount, e.g. from localStorage or a toggle, check it
// still defaults new users to "light" rather than re-forcing "dark."
// Share ThemeContext.tsx if you want that reconciled directly.)
import type { Metadata } from "next";
import "./globals.css";
import "@/styles/abraxas-theme-tokens.css";
import { ThemeProvider } from "@/components/ThemeContext";

export const metadata: Metadata = {
  title: "Abraxas, Verify Once. Transact Everywhere.",
  description: "The verification and identity layer for real-world assets onchain. Real estate, royalties, mineral rights, a business, verified once, then investable with stablecoins.",
  openGraph: {
    title: "Abraxas, Verify Once. Transact Everywhere.",
    description: "The verification and identity layer for real-world assets onchain.",
    url: "https://abraxasworld.xyz",
    siteName: "Abraxas",
    images: ["/og-image.jpg"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Abraxas, Verify Once. Transact Everywhere.",
    description: "The verification and identity layer for real-world assets onchain.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
