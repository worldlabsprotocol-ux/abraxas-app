// FILE: app/layout.tsx
// Root layout. Light default, dark via ThemeContext toggle.
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeContext";

export const metadata: Metadata = {
  title: "Abraxas, Verify Once. Transact Everywhere.",
  description: "The verification and identity layer for real-world assets onchain. Real estate, royalties, mineral rights, a business, verified once, then investable with stablecoins.",
  openGraph: {
    title: "Abraxas, Verify Once. Transact Everywhere.",
    description: "The verification and identity layer for real-world assets onchain.",
    url: "https://abraxas-app.vercel.app",
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

const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem("abraxas_theme");
    document.documentElement.setAttribute("data-theme", t === "dark" ? "dark" : "light");
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
