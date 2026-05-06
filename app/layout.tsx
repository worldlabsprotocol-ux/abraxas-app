// FILE: app/layout.tsx
// Inter font via next/font — zero CLS, no external request at runtime.
// Icon system: Lucide (already installed as lucide-react).
// No emojis in system UI. No beta vibes.
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import { Nav } from "@/components/Nav";
import { SystemStatusBar } from "@/components/SystemStatusBar";
import { Providers } from "@/lib/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title:       "Abraxas — Sovereign AI Guardian Protocol",
  description: "AI-powered RWA + collectibles operating system on Solana.",
  openGraph: {
    title:       "Abraxas Protocol",
    description: "Autonomous AI agents. Circuit-protected vaults. Tokenized real-world assets.",
    url:         "https://abraxas-app.vercel.app",
    siteName:    "Abraxas",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <style>{`
          :root {
            --font-sans: var(--font-inter), 'Inter', system-ui, -apple-system, sans-serif;
            --void:    #000000;
            --surface: #0d0d0d;
            --line:    rgba(255,255,255,0.08);
            --text:    #f0f0f0;
            --muted:   rgba(240,240,240,0.55);
            --subtle:  rgba(240,240,240,0.3);
            --gold:    #C8A96E;
            --green:   #14F195;
          }
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html { font-size: 16px; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
          body {
            background: var(--void);
            color: var(--text);
            font-family: var(--font-sans);
            overflow-x: hidden;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.4; }
          }
          input, button, textarea, select { font-family: var(--font-sans); }
          a { color: inherit; }
          img { max-width: 100%; display: block; }
          /* Scrollbar */
          ::-webkit-scrollbar { width: 4px; height: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
        `}</style>
      </head>
      <body>
        <Providers>
          <Nav />
          <SystemStatusBar />
          <main style={{ paddingTop: "92px", paddingBottom: "128px", minHeight: "100vh" }}>
            {children}
          </main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}