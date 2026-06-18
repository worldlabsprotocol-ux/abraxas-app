// FILE: app/layout.tsx
// Root layout — wraps the entire app in ThemeProvider so every page
// gets light/dark mode. This is the ONLY place ThemeProvider lives.
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeContext";

export const metadata: Metadata = {
  title: "Abraxas Protocol",
  description: "Verify once. Transact everywhere.",
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
