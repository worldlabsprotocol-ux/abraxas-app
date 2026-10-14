import localFont from "next/font/local";

/** Self-hosted woff2 (OFL via @fontsource) — avoids compile-time fonts.googleapis.com fetches. */

export const plusJakartaSans = localFont({
  src: [
    { path: "./fonts/plus-jakarta-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/plus-jakarta-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/plus-jakarta-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/plus-jakarta-sans-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/plus-jakarta-sans-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const dmSans = localFont({
  src: [
    { path: "./fonts/dm-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/dm-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/dm-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/dm-sans-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-dm-sans",
  display: "swap",
});

export const jetBrainsMono = localFont({
  src: [
    { path: "./fonts/jetbrains-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/jetbrains-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/jetbrains-mono-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const abraxasFontVariables = `${plusJakartaSans.variable} ${dmSans.variable} ${jetBrainsMono.variable}`;
