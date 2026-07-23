import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Why Verification Matters | Real World Asset Tokenization. Abraxas",
  description:
    "Why tokenization companies need verification infrastructure beyond minting. asset verification, reusable verification, and RWA compliance for tokenized real-world assets.",
  path: "/docs/why-verification",
});

export default function WhyVerificationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
