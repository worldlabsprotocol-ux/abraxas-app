import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Trust Framework | RWA Compliance & Asset Verification — Abraxas",
  description:
    "Verification infrastructure standards for real-world assets — asset verification, reusable verification, and institutional RWA compliance across tokenization companies.",
  path: "/trust-framework",
});

export default function TrustFrameworkLayout({ children }: { children: React.ReactNode }) {
  return children;
}
