// FILE: app/layout.tsx
// Google Translate loaded at app level via next/script — reliable initialization
import type { Metadata } from "next";
import Script            from "next/script";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { SolanaProvider }  from "@/components/SolanaProvider";

export const metadata: Metadata = {
  title:       "Abraxas Protocol",
  description: "Verifiable Onchain Collateral Infrastructure — Solana",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google Translate widget init — fires before user interaction */}
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
        {/* Hidden Google Translate mount — must exist in DOM */}
        <div id="gt_root" style={{ display:"none" }} />
        <SessionProvider>
          <SolanaProvider>
            {children}
          </SolanaProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
