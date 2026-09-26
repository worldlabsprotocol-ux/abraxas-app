// FILE: app/layout.tsx
// Root layout. Light default, dark via ThemeContext toggle.
// Fonts load in the browser so offline CI builds retain deterministic system fallbacks.
import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { DemoEnvironmentBanner } from "@/components/judgeDemo/JudgeDemoSandboxBanner";
import { siteMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = siteMetadata();

const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem("abraxas_theme");
    document.documentElement.setAttribute("data-theme", t === "light" ? "light" : "dark");
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
`;

const langInitScript = `
(function(){
  try {
    var pref = localStorage.getItem("abraxas_lang_v2");
    if (!pref || pref === "en") {
      document.documentElement.lang = "en";
      document.documentElement.setAttribute("translate", "no");
      var exp = "Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "googtrans=;expires=" + exp + ";path=/";
      var h = location.hostname;
      document.cookie = "googtrans=;expires=" + exp + ";path=/;domain=" + h;
      document.cookie = "googtrans=;expires=" + exp + ";path=/;domain=." + h;
      document.cookie = "googtrans=/en/en;path=/";
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      translate="no"
      suppressHydrationWarning
    >
      <head>
        <meta name="google" content="notranslate" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: langInitScript }} />
      </head>
      <body>
        <DemoEnvironmentBanner />
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
