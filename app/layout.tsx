// FILE: app/layout.tsx
// Root layout. Light default, dark via ThemeContext toggle.
import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono, Syne } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { siteMetadata } from "@/lib/seo/metadata";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const ibmMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = siteMetadata();

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
      className={`${syne.variable} ${dmSans.variable} ${ibmMono.variable}`}
    >
      <head>
        <meta name="google" content="notranslate" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: langInitScript }} />
      </head>
      <body>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
