// FILE: app/verification/layout.tsx
// Internal engineering dashboard — exclude from public search indexes.

import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Engineering status · Abraxas",
    description:
      "Internal verification-layer engineering checklist and bootstrap diagnostics. Not a public attestation or third-party certification.",
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
