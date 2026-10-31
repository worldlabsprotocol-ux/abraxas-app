// FILE: app/verification/layout.tsx
// Keep request-oriented verification entry points out of public search indexes.

import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Review a verification request · Abraxas",
    description: "Review a partner request before choosing whether to consent or verify.",
    path: "/verification",
  }),
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function VerificationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
