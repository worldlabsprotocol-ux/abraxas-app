import { DM_Sans, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";

/** Self-hosted via next/font — avoids render-blocking fonts.googleapis.com CSS on LCP. */
export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const abraxasFontVariables = `${plusJakartaSans.variable} ${dmSans.variable} ${jetBrainsMono.variable}`;
